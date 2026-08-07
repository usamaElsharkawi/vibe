
# Agents

Agents are **large language models (LLMs)** that use **tools** in a **loop** to accomplish tasks.

These components work together:

- **LLMs** process input and decide the next action
- **Tools** extend capabilities beyond text generation (reading files, calling APIs, writing to databases)
- **Loop** orchestrates execution through:
  - **Context management** - Maintaining conversation history and deciding what the model sees (input) at each step
  - **Stopping conditions** - Determining when the loop (task) is complete

## Agent State and Context

Agents often need server-side state that should not be placed directly in the
prompt, such as tenant settings, request IDs, feature flags, credentials, or
progress through a task.

Use `runtimeContext` as the agent's shared runtime state. It flows through the
agent loop, is available in `prepareStep` and lifecycle callbacks, and can be
updated between steps. Use `toolsContext` for per-tool values such as API keys
or scoped permissions; each tool receives only its own typed `context` based on
its `contextSchema`.

Learn more in [Runtime and Tool
Context](/docs/ai-sdk-core/runtime-and-tool-context).

## ToolLoopAgent Class

The ToolLoopAgent class handles these three components. Here's an agent that uses multiple tools in a loop to accomplish a task:

```ts
import { ToolLoopAgent, tool } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const weatherAgent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    weather: tool({
      description: 'Get the weather in a location (in Fahrenheit)',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
    convertFahrenheitToCelsius: tool({
      description: 'Convert temperature from Fahrenheit to Celsius',
      inputSchema: z.object({
        temperature: z.number().describe('Temperature in Fahrenheit'),
      }),
      execute: async ({ temperature }) => {
        const celsius = Math.round((temperature - 32) * (5 / 9));
        return { celsius };
      },
    }),
  },
});

const result = await weatherAgent.generate({
  prompt: 'What is the weather in San Francisco in celsius?',
});

console.log(result.text); // agent's final answer
console.log(result.steps); // steps taken by the agent
```

The agent automatically:

1. Calls the `weather` tool to get the temperature in Fahrenheit
2. Calls `convertFahrenheitToCelsius` to convert it
3. Generates a final text response with the result

The ToolLoopAgent handles the loop, context management, and stopping conditions.

## Why Use the ToolLoopAgent?

The ToolLoopAgent is the recommended approach for building agents with the AI SDK because it:

- **Reduces boilerplate** - Manages loops and message arrays
- **Improves reusability** - Define once, use throughout your application
- **Simplifies maintenance** - Single place to update agent configuration

For most use cases, start with the ToolLoopAgent. Use core functions (`generateText`, `streamText`) when you need explicit control over each step for complex structured workflows.

## HarnessAgent Class

Use `HarnessAgent` when you want to run a preconfigured established harness,
such as Claude Code, Codex, or Pi, instead of building the loop yourself around
a language model. Harnesses are a separate abstraction from providers and
models, but stream into AI SDK-compatible result and UI primitives.

Learn more in [Harnesses](/docs/ai-sdk-harnesses) and
[HarnessAgent](/docs/ai-sdk-harnesses/harness-agent).

The rest of this section focuses on `ToolLoopAgent`, which is the AI SDK agent
class for building your own model-and-tools loop.

## Terminal UI

Use `@ai-sdk/tui` to run a `ToolLoopAgent` in an interactive terminal UI. It is
useful for local agent development, demos, and internal tools where you want
prompt input, streamed responses, tool cards, reasoning sections, scrolling, and
tool approval prompts without building a custom interface.

```ts
import { runAgentTUI } from '@ai-sdk/tui';

await runAgentTUI({
  title: 'Weather Agent',
  agent: weatherAgent,
});
```

Learn more in [Terminal UI](/docs/agents/terminal-ui).

## Structured Workflows

Agents are flexible and powerful, but non-deterministic. When you need reliable, repeatable outcomes with explicit control flow, use core functions with structured workflow patterns combining:

- Conditional statements for explicit branching
- Standard functions for reusable logic
- Error handling for robustness
- Explicit control flow for predictability

[Explore workflow patterns](/docs/agents/workflows) to learn more about building structured, reliable systems.

## Next Steps

- **[Building Agents](/docs/agents/building-agents)** - Guide to creating agents with the ToolLoopAgent
- **[Runtime and Tool Context](/docs/ai-sdk-core/runtime-and-tool-context)** - How to pass shared agent state and per-tool context
- **[Workflow Patterns](/docs/agents/workflows)** - Structured patterns using core functions for complex workflows
- **[Loop Control](/docs/agents/loop-control)** - Execution control with stopWhen and prepareStep




# Building Agents

The ToolLoopAgent provides a structured way to encapsulate LLM configuration, tools, and behavior into reusable components. It handles the agent loop for you, allowing the LLM to call tools multiple times in sequence to accomplish complex tasks. Define agents once and use them across your application.

## Why Use the ToolLoopAgent Class?

When building AI applications, you often need to:

- **Reuse configurations** - Same model settings, tools, and prompts across different parts of your application
- **Maintain consistency** - Ensure the same behavior and capabilities throughout your codebase
- **Simplify API routes** - Reduce boilerplate in your endpoints
- **Type safety** - Get full TypeScript support for your agent's tools and outputs

The ToolLoopAgent class provides a single place to define your agent's behavior.

## Creating an Agent

Define an agent by instantiating the ToolLoopAgent class with your desired configuration:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const myAgent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are a helpful assistant.',
  tools: {
    // Your tools here
  },
});
```

## Configuration Options

The ToolLoopAgent accepts all the same settings as `generateText` and `streamText`. Configure:

### Model and System Instructions

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are an expert software engineer.',
});
```

### Tools

Provide tools that the agent can use to accomplish tasks:

```ts
import { ToolLoopAgent, tool } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const codeAgent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    runCode: tool({
      description: 'Execute Python code',
      inputSchema: z.object({
        code: z.string(),
      }),
      execute: async ({ code }) => {
        // Execute code and return result
        return { output: 'Code executed successfully' };
      },
    }),
  },
});
```

### Context and Agent State

Use `runtimeContext` as the agent's shared runtime state. It flows through the
agent loop and is available in `prepareStep`, lifecycle callbacks, and final
results. If a tool needs server-side values such as credentials, scoped
permissions, or default settings, pass them through `toolsContext` and declare
them with the tool's `contextSchema`.

```ts highlight="12-15,20-27,31-40"
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    searchTickets: tool({
      description: 'Search support tickets',
      inputSchema: z.object({
        query: z.string(),
      }),
      contextSchema: z.object({
        apiKey: z.string(),
        accountId: z.string(),
      }),
      execute: async ({ query }, { context }) =>
        searchTickets(query, context.accountId, context.apiKey),
    }),
  },
  prepareStep: async ({ runtimeContext }) => {
    if (runtimeContext.escalated) {
      return { temperature: 0.1 };
    }

    return {};
  },
});

const result = await agent.generate({
  prompt: 'Find open billing tickets for this account.',
  runtimeContext: {
    requestId: 'req_abc',
    escalated: false,
  },
  toolsContext: {
    searchTickets: {
      apiKey: process.env.SUPPORT_API_KEY!,
      accountId: 'acct_123',
    },
  },
});
```

For the full model, including sensitive context filtering and where each context
value is available, see [Runtime and Tool
Context](/docs/ai-sdk-core/runtime-and-tool-context).

### Tools That Use Experimental Sandboxes

Pass `experimental_sandbox` when an agent tool needs a command or code execution
environment. The experimental sandbox is a per-call value, so provide it to `generate()`,
`stream()`, or the agent UI stream helper that invokes the agent.

```ts highlight="13,19-23,31"
const agent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are a coding assistant. Use the shell tool when needed.',
  tools: {
    shell: tool({
      description: 'Execute shell commands in the experimental sandbox.',
      inputSchema: z.object({
        command: z.string(),
        workingDirectory: z.string().optional(),
      }),
      execute: async (
        { command, workingDirectory },
        { abortSignal, experimental_sandbox },
      ) => {
        if (!experimental_sandbox) {
          throw new Error('Experimental sandbox is not available');
        }

        return experimental_sandbox.run({
          command,
          workingDirectory,
          abortSignal,
        });
      },
    }),
  },
});

const result = await agent.generate({
  prompt: `Run the tests.\n\nSandbox:\n${experimental_sandbox.description}`,
  experimental_sandbox,
});
```

The experimental sandbox description is not added to the model prompt automatically. Include
it in the prompt or instructions when the model needs to know environment
details. Passing an experimental sandbox does not sandbox the tool itself; the tool must
explicitly delegate operations to the experimental sandbox. See the
[Experimental Sandbox section in Tool Calling](/docs/ai-sdk-core/tools-and-tool-calling#experimental-sandbox)
for more details.

You can also require approval before a tool executes. Configure approval on the
`ToolLoopAgent` with `toolApproval`:

```ts
const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    runCode: tool({
      description: 'Execute Python code',
      inputSchema: z.object({
        code: z.string(),
      }),
      execute: async ({ code }) => ({ output: code }),
    }),
  },
  toolApproval: {
    runCode: 'user-approval',
  },
});
```

For manual approvals, automatic approvals and denials, dynamic policy functions,
and `useChat` integration, see [Tool
Approvals](/docs/agents/tool-approvals).

### Loop Control

By default, agents run for 20 steps (`stopWhen: isStepCount(20)`). In each step, the model either generates text or calls a tool. If it generates text, the agent completes. If it calls a tool, the AI SDK executes that tool.

You can configure `stopWhen` differently to allow more steps. After each tool execution, the agent triggers a new generation where the model can call another tool or generate text:

```ts
import { ToolLoopAgent, isStepCount } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  stopWhen: isStepCount(50), // Increase default from 20 to 50.
});
```

Each step represents one generation (which results in either text or a tool call). The loop continues until:

- A finish reasoning other than tool-calls is returned, or
- A tool that is invoked does not have an execute function, or
- A tool call needs approval, or
- A stop condition is met

You can combine multiple conditions:

```ts
import { ToolLoopAgent, isStepCount } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  stopWhen: [
    isStepCount(20), // Maximum 20 steps
    yourCustomCondition(), // Custom logic for when to stop
  ],
});
```

Learn more about [loop control and stop conditions](/docs/agents/loop-control).

### Tool Choice

Control how the agent uses tools:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    // your tools here
  },
  toolChoice: 'required', // Force tool use
  // or toolChoice: 'none' to disable tools
  // or toolChoice: 'auto' (default) to let the model decide
});
```

You can also force the use of a specific tool:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    weather: weatherTool,
    cityAttractions: attractionsTool,
  },
  toolChoice: {
    type: 'tool',
    toolName: 'weather', // Force the weather tool to be used
  },
});
```

### Structured Output

Define structured output schemas:

```ts
import { ToolLoopAgent, Output } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const analysisAgent = new ToolLoopAgent({
  model: __MODEL__,
  output: Output.object({
    schema: z.object({
      sentiment: z.enum(['positive', 'neutral', 'negative']),
      summary: z.string(),
      keyPoints: z.array(z.string()),
    }),
  }),
});

const { output } = await analysisAgent.generate({
  prompt: 'Analyze customer feedback from the last quarter',
});
```

## Define Agent Behavior with System Instructions

System instructions define your agent's behavior, personality, and constraints. They set the context for all interactions and guide how the agent responds to user queries and uses tools.

### Basic System Instructions

Set the agent's role and expertise:

```ts
const agent = new ToolLoopAgent({
  model: __MODEL__,
  instructions:
    'You are an expert data analyst. You provide clear insights from complex data.',
});
```

### Detailed Behavioral Instructions

Provide specific guidelines for agent behavior:

```ts
const codeReviewAgent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: `You are a senior software engineer conducting code reviews.

  Your approach:
  - Focus on security vulnerabilities first
  - Identify performance bottlenecks
  - Suggest improvements for readability and maintainability
  - Be constructive and educational in your feedback
  - Always explain why something is an issue and how to fix it`,
});
```

### Constrain Agent Behavior

Set boundaries and ensure consistent behavior:

```ts
const customerSupportAgent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: `You are a customer support specialist for an e-commerce platform.

  Rules:
  - Never make promises about refunds without checking the policy
  - Always be empathetic and professional
  - If you don't know something, say so and offer to escalate
  - Keep responses concise and actionable
  - Never share internal company information`,
  tools: {
    checkOrderStatus,
    lookupPolicy,
    createTicket,
  },
});
```

### Tool Usage Instructions

Guide how the agent should use available tools:

```ts
const researchAgent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: `You are a research assistant with access to search and document tools.

  When researching:
  1. Always start with a broad search to understand the topic
  2. Use document analysis for detailed information
  3. Cross-reference multiple sources before drawing conclusions
  4. Cite your sources when presenting information
  5. If information conflicts, present both viewpoints`,
  tools: {
    webSearch,
    analyzeDocument,
    extractQuotes,
  },
});
```

### Format and Style Instructions

Control the output format and communication style:

```ts
const technicalWriterAgent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: `You are a technical documentation writer.

  Writing style:
  - Use clear, simple language
  - Avoid jargon unless necessary
  - Structure information with headers and bullet points
  - Include code examples where relevant
  - Write in second person ("you" instead of "the user")

  Always format responses in Markdown.`,
});
```

## Using an Agent

Once defined, you can use your agent in three ways:

### Generate Text

Use `generate()` for one-time text generation:

```ts
const result = await myAgent.generate({
  prompt: 'What is the weather like?',
});

console.log(result.text);
```

### Stream Text

Use `stream()` for streaming responses:

```ts
const result = await myAgent.stream({
  prompt: 'Tell me a story',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

### Respond to UI Messages

Use `createAgentUIStreamResponse()` to create API responses for client applications:

```ts
// In your API route (e.g., app/api/chat/route.ts)
import { createAgentUIStreamResponse } from 'ai';

export async function POST(request: Request) {
  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent: myAgent,
    uiMessages: messages,
  });
}
```

### Lifecycle Callbacks

Agents provide lifecycle callbacks that let you hook into different phases of the agent execution.
These are useful for logging, observability, debugging, and custom telemetry.

```ts
const result = await myAgent.generate({
  prompt: 'Research and summarize the latest AI trends',

  onStart({ modelId }) {
    console.log('Agent started', { modelId });
  },

  onStepStart({ stepNumber, modelId }) {
    console.log(`Step ${stepNumber} starting`, { modelId });
  },

  onToolExecutionStart({ toolCall }) {
    console.log(`Tool call starting: ${toolCall.toolName}`);
  },

  onToolExecutionEnd({ toolCall, toolExecutionMs, toolOutput }) {
    console.log(
      `Tool call finished: ${toolCall.toolName} (${toolExecutionMs}ms)`,
      {
        success: toolOutput.type === 'tool-result',
      },
    );
  },

  onStepEnd({ stepNumber, usage, performance, finishReason, toolCalls }) {
    console.log(`Step ${stepNumber} completed:`, {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      outputTokensPerSecond: performance.effectiveOutputTokensPerSecond,
      stepTimeMs: performance.stepTimeMs,
      finishReason,
      toolsUsed: toolCalls?.map(tc => tc.toolName),
    });
  },

  onEnd({ usage, steps }) {
    console.log('Agent finished:', {
      totalSteps: steps.length,
      totalTokens: usage.totalTokens,
    });
  },
});
```

The available lifecycle callbacks are:

- **`onStart`**: Called once when the agent operation begins, before any LLM calls. Receives model info, messages, settings, and `runtimeContext`.
- **`onStepStart`**: Called before each step (LLM call). Receives the step number, model, messages being sent, tools, and prior steps.
- **`onToolExecutionStart`**: Called right before a tool's `execute` function runs. Receives the tool call object, messages, and `toolContext`.
- **`onToolExecutionEnd`**: Called right after a tool's `execute` function completes or errors. Receives the tool call, `toolExecutionMs`, and a `toolOutput` discriminated union (`type: 'tool-result'` with `output`, or `type: 'tool-error'` with `error`).
- **`onStepEnd`**: Called after each step finishes. Receives step results including usage, performance, finish reason, and tool calls.
- **`onEnd`**: Called when all steps are finished and the response is complete. Receives all step results, total usage, and `runtimeContext`.

For the full event data reference, see [Lifecycle Callbacks](/docs/ai-sdk-core/lifecycle-callbacks). `ToolLoopAgent` uses the same generation lifecycle event types for `onStart`, `onStepStart`, `onToolExecutionStart`, `onToolExecutionEnd`, `onStepEnd`, and `onEnd`.

#### Constructor vs. Method Callbacks

All lifecycle callbacks can be defined in the constructor for agent-wide tracking, in the `generate()`/`stream()` call for per-call tracking, or both. When both are provided, both are called (constructor first, then the method callback):

```ts
const agent = new ToolLoopAgent({
  model: __MODEL__,
  onStepEnd: async ({ stepNumber, usage }) => {
    // Agent-wide logging
    console.log(`Agent step ${stepNumber}:`, usage.totalTokens);
  },
});

// Method-level callback runs after constructor callback
const result = await agent.generate({
  prompt: 'Hello',
  onStepEnd: async ({ stepNumber, usage }) => {
    // Per-call tracking (e.g., for billing)
    await trackUsage(stepNumber, usage);
  },
});
```

## End-to-end Type Safety

You can infer types for your agent's `UIMessage`s:

```ts
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';

const myAgent = new ToolLoopAgent({
  // ... configuration
});

// Infer the UIMessage type for UI components or persistence
export type MyAgentUIMessage = InferAgentUIMessage<typeof myAgent>;
```

Use this type in your client components with `useChat`:

```tsx filename="components/chat.tsx"
'use client';

import { useChat } from '@ai-sdk/react';
import type { MyAgentUIMessage } from '@/agent/my-agent';

export function Chat() {
  const { messages } = useChat<MyAgentUIMessage>();
  // Full type safety for your messages and tools
}
```

## Next Steps

Now that you understand building agents, you can:

- Explore [workflow patterns](/docs/agents/workflows) for structured patterns using core functions
- Learn about [loop control](/docs/agents/loop-control) for advanced execution control
- See [manual loop examples](/cookbook/node/manual-agent-loop) for custom workflow implementations





# Workflow Patterns

Combine the building blocks from the [overview](/docs/agents/overview) with these patterns to add structure and reliability to your agents:

- [Sequential Processing](#sequential-processing-chains) - Steps executed in order
- [Parallel Processing](#parallel-processing) - Independent tasks run simultaneously
- [Evaluation/Feedback Loops](#evaluator-optimizer) - Results checked and improved iteratively
- [Orchestration](#orchestrator-worker) - Coordinating multiple components
- [Routing](#routing) - Directing work based on context

## Choose Your Approach

Consider these key factors:

- **Flexibility vs Control** - How much freedom does the LLM need vs how tightly you must constrain its actions?
- **Error Tolerance** - What are the consequences of mistakes in your use case?
- **Cost Considerations** - More complex systems typically mean more LLM calls and higher costs
- **Maintenance** - Simpler architectures are easier to debug and modify

**Start with the simplest approach that meets your needs**. Add complexity only when required by:

1. Breaking down tasks into clear steps
2. Adding tools for specific capabilities
3. Implementing feedback loops for quality control
4. Introducing multiple agents for complex workflows

Let's look at examples of these patterns in action.

## Patterns with Examples

These patterns, adapted from [Anthropic's guide on building effective agents](https://www.anthropic.com/research/building-effective-agents), serve as building blocks you can combine to create comprehensive workflows. Each pattern addresses specific aspects of task execution. Combine them thoughtfully to build reliable solutions for complex problems.

## Sequential Processing (Chains)

The simplest workflow pattern executes steps in a predefined order. Each step's output becomes input for the next step, creating a clear chain of operations. Use this pattern for tasks with well-defined sequences, like content generation pipelines or data transformation processes.

```ts
import { generateText, Output } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

async function generateMarketingCopy(input: string) {
  const model = __MODEL__;

  // First step: Generate marketing copy
  const { text: copy } = await generateText({
    model,
    prompt: `Write persuasive marketing copy for: ${input}. Focus on benefits and emotional appeal.`,
  });

  // Perform quality check on copy
  const { output: qualityMetrics } = await generateText({
    model,
    output: Output.object({
      schema: z.object({
        hasCallToAction: z.boolean(),
        emotionalAppeal: z.number().min(1).max(10),
        clarity: z.number().min(1).max(10),
      }),
    }),
    prompt: `Evaluate this marketing copy for:
    1. Presence of call to action (true/false)
    2. Emotional appeal (1-10)
    3. Clarity (1-10)

    Copy to evaluate: ${copy}`,
  });

  // If quality check fails, regenerate with more specific instructions
  if (
    !qualityMetrics.hasCallToAction ||
    qualityMetrics.emotionalAppeal < 7 ||
    qualityMetrics.clarity < 7
  ) {
    const { text: improvedCopy } = await generateText({
      model,
      prompt: `Rewrite this marketing copy with:
      ${!qualityMetrics.hasCallToAction ? '- A clear call to action' : ''}
      ${qualityMetrics.emotionalAppeal < 7 ? '- Stronger emotional appeal' : ''}
      ${qualityMetrics.clarity < 7 ? '- Improved clarity and directness' : ''}

      Original copy: ${copy}`,
    });
    return { copy: improvedCopy, qualityMetrics };
  }

  return { copy, qualityMetrics };
}
```

## Routing

This pattern lets the model decide which path to take through a workflow based on context and intermediate results. The model acts as an intelligent router, directing the flow of execution between different branches of your workflow. Use this when handling varied inputs that require different processing approaches. In the example below, the first LLM call's results determine the second call's model size and system prompt.

```ts
import { generateText, Output } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

async function handleCustomerQuery(query: string) {
  const model = __MODEL__;

  // First step: Classify the query type
  const { output: classification } = await generateText({
    model,
    output: Output.object({
      schema: z.object({
        reasoning: z.string(),
        type: z.enum(['general', 'refund', 'technical']),
        complexity: z.enum(['simple', 'complex']),
      }),
    }),
    prompt: `Classify this customer query:
    ${query}

    Determine:
    1. Query type (general, refund, or technical)
    2. Complexity (simple or complex)
    3. Brief reasoning for classification`,
  });

  // Route based on classification
  // Set model and system prompt based on query type and complexity
  const { text: response } = await generateText({
    model:
      classification.complexity === 'simple'
        ? 'openai/gpt-4o-mini'
        : 'openai/o4-mini',
    instructions: {
      general:
        'You are an expert customer service agent handling general inquiries.',
      refund:
        'You are a customer service agent specializing in refund requests. Follow company policy and collect necessary information.',
      technical:
        'You are a technical support specialist with deep product knowledge. Focus on clear step-by-step troubleshooting.',
    }[classification.type],
    prompt: query,
  });

  return { response, classification };
}
```

## Parallel Processing

Break down tasks into independent subtasks that execute simultaneously. This pattern uses parallel execution to improve efficiency while maintaining the benefits of structured workflows. For example, analyze multiple documents or process different aspects of a single input concurrently (like code review).

```ts
import { generateText, Output } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

// Example: Parallel code review with multiple specialized reviewers
async function parallelCodeReview(code: string) {
  const model = __MODEL__;

  // Run parallel reviews
  const [securityReview, performanceReview, maintainabilityReview] =
    await Promise.all([
      generateText({
        model,
        instructions:
          'You are an expert in code security. Focus on identifying security vulnerabilities, injection risks, and authentication issues.',
        output: Output.object({
          schema: z.object({
            vulnerabilities: z.array(z.string()),
            riskLevel: z.enum(['low', 'medium', 'high']),
            suggestions: z.array(z.string()),
          }),
        }),
        prompt: `Review this code:
      ${code}`,
      }),

      generateText({
        model,
        instructions:
          'You are an expert in code performance. Focus on identifying performance bottlenecks, memory leaks, and optimization opportunities.',
        output: Output.object({
          schema: z.object({
            issues: z.array(z.string()),
            impact: z.enum(['low', 'medium', 'high']),
            optimizations: z.array(z.string()),
          }),
        }),
        prompt: `Review this code:
      ${code}`,
      }),

      generateText({
        model,
        instructions:
          'You are an expert in code quality. Focus on code structure, readability, and adherence to best practices.',
        output: Output.object({
          schema: z.object({
            concerns: z.array(z.string()),
            qualityScore: z.number().min(1).max(10),
            recommendations: z.array(z.string()),
          }),
        }),
        prompt: `Review this code:
      ${code}`,
      }),
    ]);

  const reviews = [
    { ...securityReview.output, type: 'security' },
    { ...performanceReview.output, type: 'performance' },
    { ...maintainabilityReview.output, type: 'maintainability' },
  ];

  // Aggregate results using another model instance
  const { text: summary } = await generateText({
    model,
    instructions: 'You are a technical lead summarizing multiple code reviews.',
    prompt: `Synthesize these code review results into a concise summary with key actions:
    ${JSON.stringify(reviews, null, 2)}`,
  });

  return { reviews, summary };
}
```

## Orchestrator-Worker

A primary model (orchestrator) coordinates the execution of specialized workers. Each worker optimizes for a specific subtask, while the orchestrator maintains overall context and ensures coherent results. This pattern excels at complex tasks requiring different types of expertise or processing.

```ts
import { generateText, Output } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

async function implementFeature(featureRequest: string) {
  // Orchestrator: Plan the implementation
  const { output: implementationPlan } = await generateText({
    model: __MODEL__,
    output: Output.object({
      schema: z.object({
        files: z.array(
          z.object({
            purpose: z.string(),
            filePath: z.string(),
            changeType: z.enum(['create', 'modify', 'delete']),
          }),
        ),
        estimatedComplexity: z.enum(['low', 'medium', 'high']),
      }),
    }),
    instructions:
      'You are a senior software architect planning feature implementations.',
    prompt: `Analyze this feature request and create an implementation plan:
    ${featureRequest}`,
  });

  // Workers: Execute the planned changes
  const fileChanges = await Promise.all(
    implementationPlan.files.map(async file => {
      // Each worker is specialized for the type of change
      const workerSystemPrompt = {
        create:
          'You are an expert at implementing new files following best practices and project patterns.',
        modify:
          'You are an expert at modifying existing code while maintaining consistency and avoiding regressions.',
        delete:
          'You are an expert at safely removing code while ensuring no breaking changes.',
      }[file.changeType];

      const { output: change } = await generateText({
        model: __MODEL__,
        output: Output.object({
          schema: z.object({
            explanation: z.string(),
            code: z.string(),
          }),
        }),
        instructions: workerSystemPrompt,
        prompt: `Implement the changes for ${file.filePath} to support:
        ${file.purpose}

        Consider the overall feature context:
        ${featureRequest}`,
      });

      return {
        file,
        implementation: change,
      };
    }),
  );

  return {
    plan: implementationPlan,
    changes: fileChanges,
  };
}
```

## Evaluator-Optimizer

Add quality control to workflows with dedicated evaluation steps that assess intermediate results. Based on the evaluation, the workflow proceeds, retries with adjusted parameters, or takes corrective action. This creates robust workflows capable of self-improvement and error recovery.

```ts
import { generateText, Output } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

async function translateWithFeedback(text: string, targetLanguage: string) {
  let currentTranslation = '';
  let iterations = 0;
  const MAX_ITERATIONS = 3;

  // Initial translation
  const { text: translation } = await generateText({
    model: __MODEL__,
    instructions: 'You are an expert literary translator.',
    prompt: `Translate this text to ${targetLanguage}, preserving tone and cultural nuances:
    ${text}`,
  });

  currentTranslation = translation;

  // Evaluation-optimization loop
  while (iterations < MAX_ITERATIONS) {
    // Evaluate current translation
    const { output: evaluation } = await generateText({
      model: __MODEL__,
      output: Output.object({
        schema: z.object({
          qualityScore: z.number().min(1).max(10),
          preservesTone: z.boolean(),
          preservesNuance: z.boolean(),
          culturallyAccurate: z.boolean(),
          specificIssues: z.array(z.string()),
          improvementSuggestions: z.array(z.string()),
        }),
      }),
      instructions: 'You are an expert in evaluating literary translations.',
      prompt: `Evaluate this translation:

      Original: ${text}
      Translation: ${currentTranslation}

      Consider:
      1. Overall quality
      2. Preservation of tone
      3. Preservation of nuance
      4. Cultural accuracy`,
    });

    // Check if quality meets threshold
    if (
      evaluation.qualityScore >= 8 &&
      evaluation.preservesTone &&
      evaluation.preservesNuance &&
      evaluation.culturallyAccurate
    ) {
      break;
    }

    // Generate improved translation based on feedback
    const { text: improvedTranslation } = await generateText({
      model: __MODEL__,
      instructions: 'You are an expert literary translator.',
      prompt: `Improve this translation based on the following feedback:
      ${evaluation.specificIssues.join('\n')}
      ${evaluation.improvementSuggestions.join('\n')}

      Original: ${text}
      Current Translation: ${currentTranslation}`,
    });

    currentTranslation = improvedTranslation;
    iterations++;
  }

  return {
    finalTranslation: currentTranslation,
    iterationsRequired: iterations,
  };
}
```




# Loop Control

You can control both the execution flow and the settings at each step of the agent loop. The loop continues until:

- A finish reasoning other than tool-calls is returned, or
- A tool that is invoked does not have an execute function, or
- A tool call needs approval, or
- A stop condition is met

The AI SDK provides built-in loop control through two parameters: `stopWhen` for defining stopping conditions and `prepareStep` for modifying settings (model, tools, messages, and more) between steps.

## Stop Conditions

The `stopWhen` parameter controls when to stop execution when there are tool results in the last step. By default, agents stop after 20 steps using `isStepCount(20)`. This default is a safety measure to prevent runaway loops that could result in excessive API calls and costs.

When you provide `stopWhen`, the agent continues executing after tool calls until a stopping condition is met. When the condition is an array, execution stops when any of the conditions are met.

### Use Built-in Conditions

The AI SDK provides several built-in stopping conditions:

- `isStepCount(count)` — stops after a specified number of steps
- `hasToolCall(...toolNames)` — stops when any of the specified tools is called
- `isLoopFinished()` — never triggers, letting the loop run until the agent is naturally finished

### Run Up to a Maximum Number of Steps

```ts
import { ToolLoopAgent, isStepCount } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    // your tools
  },
  stopWhen: isStepCount(50), // Increasing the default of 20 to 50.
});

const result = await agent.generate({
  prompt: 'Analyze this dataset and create a summary report',
});
```

### Run Until Finished

If you want the agent to run until the model naturally stops making tool calls, use `isLoopFinished()`. This removes the default step limit:

```ts
import { ToolLoopAgent, isLoopFinished } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    // your tools
  },
  stopWhen: isLoopFinished(), // No maximum step limit.
});

const result = await agent.generate({
  prompt: 'Analyze this dataset and create a summary report',
});
```

<Note>
  Use `isLoopFinished()` with caution. Without a step limit, the agent could
  potentially run indefinitely or incur significant costs if the model keeps
  making tool calls.
</Note>

### Combine Multiple Conditions

Combine multiple stopping conditions. The loop stops when it meets any condition:

```ts
import { ToolLoopAgent, isStepCount, hasToolCall } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    // your tools
  },
  stopWhen: [
    isStepCount(20), // Maximum 20 steps
    hasToolCall('someTool', 'done'), // Stop after calling either tool
  ],
});

const result = await agent.generate({
  prompt: 'Research and analyze the topic',
});
```

### Create Custom Conditions

Build custom stopping conditions for specific requirements:

```ts
import { ToolLoopAgent, StopCondition, ToolSet } from 'ai';
__PROVIDER_IMPORT__;

const tools = {
  // your tools
} satisfies ToolSet;

const hasAnswer: StopCondition<typeof tools> = ({ steps }) => {
  // Stop when the model generates text containing "ANSWER:"
  return steps.some(step => step.text?.includes('ANSWER:')) ?? false;
};

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools,
  stopWhen: hasAnswer,
});

const result = await agent.generate({
  prompt: 'Find the answer and respond with "ANSWER: [your answer]"',
});
```

Custom conditions receive step information across all steps:

```ts
const budgetExceeded: StopCondition<typeof tools> = ({ steps }) => {
  const totalUsage = steps.reduce(
    (acc, step) => ({
      inputTokens: acc.inputTokens + (step.usage?.inputTokens ?? 0),
      outputTokens: acc.outputTokens + (step.usage?.outputTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0 },
  );

  const costEstimate =
    (totalUsage.inputTokens * 0.01 + totalUsage.outputTokens * 0.03) / 1000;
  return costEstimate > 0.5; // Stop if cost exceeds $0.50
};
```

## Prepare Step

The `prepareStep` callback runs before each step in the loop and defaults to the initial settings if you don't return any changes. Use it to modify settings, manage context, or implement dynamic behavior based on execution history.

It receives `messages` for the current step, plus `initialMessages` and `responseMessages` when you need to distinguish the original input from assistant/tool messages accumulated in earlier steps. Treat `messages` as the loop's current message state: if you return a `messages` override, that override persists as the base for later steps, together with the response messages from each completed step.

### Dynamic Model Selection

Switch models based on step requirements:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: 'openai/gpt-4o-mini', // Default model
  tools: {
    // your tools
  },
  prepareStep: async ({ stepNumber, messages }) => {
    // Use a stronger model for complex reasoning after initial steps
    if (stepNumber > 2 && messages.length > 10) {
      return {
        model: __MODEL__,
      };
    }
    // Continue with default settings
    return {};
  },
});

const result = await agent.generate({
  prompt: '...',
});
```

### Context Management

Long-running agents can accumulate large tool results, reasoning parts, and assistant messages. Use `prepareStep` to mutate the message state that will be used by later steps. This is useful for compaction, and you decide when compaction should happen.

The `messages` value contains the messages that will be sent for the current step. When you return a `messages` override from `prepareStep`, that changed list becomes the base for later steps. New assistant and tool response messages are appended to it as the loop continues. If you need to rebuild a step from the discrete pieces instead of the persisted message state, use `initialMessages` for the original input and `responseMessages` for the model/tool response messages accumulated so far.

The `pruneMessages` helper provides a built-in way to remove selected messages. You can use it inside `prepareStep` when you want a simple compaction strategy.

```ts
import { ToolLoopAgent, pruneMessages, type ModelMessage } from 'ai';
__PROVIDER_IMPORT__;

const COMPACTION_THRESHOLD = 100_000;

const estimateTokens = (messages: ModelMessage[]) => {
  return JSON.stringify(messages).length / 4;
};

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    // your tools
  },
  prepareStep: async ({ messages }) => {
    if (estimateTokens(messages) > COMPACTION_THRESHOLD) {
      return {
        messages: pruneMessages({
          messages,
          reasoning: 'all',
          toolCalls: 'before-last-3-messages',
          emptyMessages: 'remove',
        }),
      };
    }
  },
});

const result = await agent.generate({
  prompt: '...',
});
```

The token estimator above is intentionally simple and only demonstrates one way to decide when to compact. The main point is that `prepareStep` can return a new `messages` array, and that array becomes the message state for following steps. The same pattern also works with `generateText` and `streamText`.

### Tool Selection

Control which tools are available at each step:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    search: searchTool,
    analyze: analyzeTool,
    summarize: summarizeTool,
  },
  prepareStep: async ({ stepNumber, steps }) => {
    // Search phase (steps 0-2)
    if (stepNumber <= 2) {
      return {
        activeTools: ['search'],
        toolChoice: 'required',
      };
    }

    // Analysis phase (steps 3-5)
    if (stepNumber <= 5) {
      return {
        activeTools: ['analyze'],
      };
    }

    // Summary phase (step 6+)
    return {
      activeTools: ['summarize'],
      toolChoice: 'required',
    };
  },
});

const result = await agent.generate({
  prompt: '...',
});
```

You can also force a specific tool to be used:

```ts
prepareStep: async ({ stepNumber }) => {
  if (stepNumber === 0) {
    // Force the search tool to be used first
    return {
      toolChoice: { type: 'tool', toolName: 'search' },
    };
  }

  if (stepNumber === 5) {
    // Force the summarize tool after analysis
    return {
      toolChoice: { type: 'tool', toolName: 'summarize' },
    };
  }

  return {};
};
```

### Message Modification

Transform messages before sending them to the model. Returned messages carry forward to later steps, so later `messages` values include your transformed messages plus the assistant/tool response messages from completed steps:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    // your tools
  },
  prepareStep: async ({ messages, stepNumber }) => {
    // Summarize tool results to reduce token usage
    const processedMessages = messages.map(msg => {
      if (msg.role === 'tool' && msg.content.length > 1000) {
        return {
          ...msg,
          content: summarizeToolResult(msg.content),
        };
      }
      return msg;
    });

    return { messages: processedMessages };
  },
});

const result = await agent.generate({
  prompt: '...',
});
```

### Experimental Sandbox Selection

Switch the experimental sandbox used for tool execution in a single step:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    runCommand,
  },
  experimental_sandbox: defaultSandbox,
  prepareStep: async ({ stepNumber }) => {
    if (stepNumber === 0) {
      return {
        experimental_sandbox: setupSandbox,
      };
    }

    return {};
  },
});

const result = await agent.generate({
  prompt: '...',
});
```

Unlike `runtimeContext` and `toolsContext`, an experimental sandbox returned from `prepareStep`
only applies to tool execution in that step. Later steps use the top-level
`experimental_sandbox` unless they return their own experimental sandbox override.

## Access Step Information

Both `stopWhen` and `prepareStep` receive detailed information about the current execution:

```ts
prepareStep: async ({
  model, // Current model configuration
  stepNumber, // Current step number (0-indexed)
  steps, // All previous steps with their results
  messages, // Messages to be sent to the model
}) => {
  // Access previous tool calls and results
  const previousToolCalls = steps.flatMap(step => step.toolCalls);
  const previousResults = steps.flatMap(step => step.toolResults);

  // Make decisions based on execution history
  if (previousToolCalls.some(call => call.toolName === 'dataAnalysis')) {
    return {
      toolChoice: { type: 'tool', toolName: 'reportGenerator' },
    };
  }

  return {};
},
```

## Forced Tool Calling

You can force the agent to always use tools by combining `toolChoice: 'required'` with a `done` tool that has no `execute` function. This pattern ensures the agent uses tools for every step and stops only when it explicitly signals completion.

```ts
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';
__PROVIDER_IMPORT__;

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: {
    search: searchTool,
    analyze: analyzeTool,
    done: tool({
      description: 'Signal that you have finished your work',
      inputSchema: z.object({
        answer: z.string().describe('The final answer'),
      }),
      // No execute function - stops the agent when called
    }),
  },
  toolChoice: 'required', // Force tool calls at every step
});

const result = await agent.generate({
  prompt: 'Research and analyze this topic, then provide your answer.',
});

// extract answer from done tool call
const toolCall = result.staticToolCalls[0]; // tool call from final step
if (toolCall?.toolName === 'done') {
  console.log(toolCall.input.answer);
}
```

Key aspects of this pattern:

- **`toolChoice: 'required'`**: Forces the model to call a tool at every step instead of generating text directly. This ensures the agent follows a structured workflow.
- **`done` tool without `execute`**: A tool that has no `execute` function acts as a termination signal. When the agent calls this tool, the loop stops because there's no function to execute.
- **Accessing results**: The final answer is available in `result.staticToolCalls`, which contains tool calls that weren't executed.

This pattern is useful when you want the agent to always use specific tools for operations (like code execution or data retrieval) rather than attempting to answer directly.

## Manual Loop Control

For scenarios requiring complete control over the agent loop, you can use AI SDK Core functions (`generateText` and `streamText`) to implement your own loop management instead of using `stopWhen` and `prepareStep`. This approach provides maximum flexibility for complex workflows.

### Implementing a Manual Loop

Build your own agent loop when you need full control over execution:

```ts
import { generateText, ModelMessage } from 'ai';
__PROVIDER_IMPORT__;

const messages: ModelMessage[] = [{ role: 'user', content: '...' }];

let step = 0;
const maxSteps = 10;

while (step < maxSteps) {
  const result = await generateText({
    model: __MODEL__,
    messages,
    tools: {
      // your tools here
    },
  });

  messages.push(...result.responseMessages);

  if (result.text) {
    break; // Stop when model generates text
  }

  step++;
}
```

This manual approach gives you complete control over:

- Message history management
- Step-by-step decision making
- Custom stopping conditions
- Dynamic tool and model selection
- Error handling and recovery

[Learn more about manual agent loops in the cookbook](/cookbook/node/manual-agent-loop).





# Configuring Call Options

Call options allow you to pass type-safe structured inputs to your agent. Use them to dynamically modify any agent setting based on the specific request.

## Why Use Call Options?

When you need agent behavior to change based on runtime inputs:

- **Add dynamic context** - Inject retrieved documents, user preferences, or session data into prompts
- **Select models dynamically** - Choose faster or more capable models based on request complexity
- **Configure tools per request** - Pass user location to search tools or adjust tool behavior
- **Customize provider options** - Set reasoning effort, temperature, or other provider-specific settings

Without call options, you'd need to create multiple agents or handle configuration logic outside the agent.

## How It Works

Define call options in three steps:

1. **Define the schema** - Specify what inputs you accept using `callOptionsSchema`
2. **Configure with `prepareCall`** - Use those inputs to modify agent settings
3. **Pass options at runtime** - Provide the options when calling `generate()` or `stream()`

## Basic Example

Add user context to your agent's prompt at runtime:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const supportAgent = new ToolLoopAgent({
  model: __MODEL__,
  callOptionsSchema: z.object({
    userId: z.string(),
    accountType: z.enum(['free', 'pro', 'enterprise']),
  }),
  instructions: 'You are a helpful customer support agent.',
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions:
      settings.instructions +
      `\nUser context:
- Account type: ${options.accountType}
- User ID: ${options.userId}

Adjust your response based on the user's account level.`,
  }),
});

// Call the agent with specific user context
const result = await supportAgent.generate({
  prompt: 'How do I upgrade my account?',
  options: {
    userId: 'user_123',
    accountType: 'free',
  },
});
```

The `options` parameter is now required and type-checked. If you don't provide it or pass incorrect types, TypeScript will error.

## Modifying Agent Settings

Use `prepareCall` to modify any agent setting. Return only the settings you want to change.

### Dynamic Model Selection

Choose models based on request characteristics:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: __MODEL__, // Default model
  callOptionsSchema: z.object({
    complexity: z.enum(['simple', 'complex']),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    model:
      options.complexity === 'simple' ? 'openai/gpt-4o-mini' : 'openai/o1-mini',
  }),
});

// Use faster model for simple queries
await agent.generate({
  prompt: 'What is 2+2?',
  options: { complexity: 'simple' },
});

// Use more capable model for complex reasoning
await agent.generate({
  prompt: 'Explain quantum entanglement',
  options: { complexity: 'complex' },
});
```

### Dynamic Tool Configuration

Configure tools based on runtime inputs:

```ts
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const newsAgent = new ToolLoopAgent({
  model: __MODEL__,
  callOptionsSchema: z.object({
    userCity: z.string().optional(),
    userRegion: z.string().optional(),
  }),
  tools: {
    web_search: openai.tools.webSearch(),
  },
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    tools: {
      web_search: openai.tools.webSearch({
        searchContextSize: 'low',
        userLocation: {
          type: 'approximate',
          city: options.userCity,
          region: options.userRegion,
          country: 'US',
        },
      }),
    },
  }),
});

await newsAgent.generate({
  prompt: 'What are the top local news stories?',
  options: {
    userCity: 'San Francisco',
    userRegion: 'California',
  },
});
```

### Provider-Specific Options

Configure provider settings dynamically:

```ts
import { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai';
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: 'openai/o3',
  callOptionsSchema: z.object({
    taskDifficulty: z.enum(['low', 'medium', 'high']),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    providerOptions: {
      openai: {
        reasoningEffort: options.taskDifficulty,
      } satisfies OpenAILanguageModelResponsesOptions,
    },
  }),
});

await agent.generate({
  prompt: 'Analyze this complex scenario...',
  options: { taskDifficulty: 'high' },
});
```

## Advanced Patterns

### Retrieval Augmented Generation (RAG)

Fetch relevant context and inject it into your prompt:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const ragAgent = new ToolLoopAgent({
  model: __MODEL__,
  callOptionsSchema: z.object({
    query: z.string(),
  }),
  prepareCall: async ({ options, ...settings }) => {
    // Fetch relevant documents (this can be async)
    const documents = await vectorSearch(options.query);

    return {
      ...settings,
      instructions: `Answer questions using the following context:

${documents.map(doc => doc.content).join('\n\n')}`,
    };
  },
});

await ragAgent.generate({
  prompt: 'What is our refund policy?',
  options: { query: 'refund policy' },
});
```

The `prepareCall` function can be async, enabling you to fetch data before configuring the agent.

### Combining Multiple Modifications

Modify multiple settings together:

```ts
import { ToolLoopAgent } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: __MODEL__,
  callOptionsSchema: z.object({
    userRole: z.enum(['admin', 'user']),
    urgency: z.enum(['low', 'high']),
  }),
  tools: {
    readDatabase: readDatabaseTool,
    writeDatabase: writeDatabaseTool,
  },
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    // Upgrade model for urgent requests
    model: options.urgency === 'high' ? __MODEL__ : settings.model,
    // Limit tools based on user role
    activeTools:
      options.userRole === 'admin'
        ? ['readDatabase', 'writeDatabase']
        : ['readDatabase'],
    // Adjust instructions
    instructions: `You are a ${options.userRole} assistant.
${options.userRole === 'admin' ? 'You have full database access.' : 'You have read-only access.'}`,
  }),
});

await agent.generate({
  prompt: 'Update the user record',
  options: {
    userRole: 'admin',
    urgency: 'high',
  },
});
```

## Using with createAgentUIStreamResponse

Pass call options through API routes to your agent:

```ts filename="app/api/chat/route.ts"
import { createAgentUIStreamResponse } from 'ai';
import { myAgent } from '@/ai/agents/my-agent';

export async function POST(request: Request) {
  const { messages, userId, accountType } = await request.json();

  return createAgentUIStreamResponse({
    agent: myAgent,
    messages,
    options: {
      userId,
      accountType,
    },
  });
}
```

## Next Steps

- Learn about [loop control](/docs/agents/loop-control) for execution management
- Explore [workflow patterns](/docs/agents/workflows) for complex multi-step processes








# Memory

Memory lets your agent save information and recall it later. Without memory, every conversation starts fresh. With memory, your agent builds context over time, recalls previous interactions, and adapts to the user.

## Three Approaches

You can add memory to your agent with the AI SDK in three ways, each with different tradeoffs:

| Approach                                          | Effort | Flexibility | Provider Lock-in           |
| ------------------------------------------------- | ------ | ----------- | -------------------------- |
| [Provider-Defined Tools](#provider-defined-tools) | Low    | Medium      | Yes                        |
| [Memory Providers](#memory-providers)             | Low    | Low         | Depends on memory provider |
| [Custom Tool](#custom-tool)                       | High   | High        | No                         |

## Provider-Defined Tools

[Provider-defined tools](/docs/foundations/tools#types-of-tools) are tools where the provider specifies the tool's `inputSchema` and `description`, but you provide the `execute` function. The model has been trained to use these tools, which can result in better performance compared to custom tools.

### Anthropic Memory Tool

The [Anthropic Memory Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) gives Claude a structured interface for managing a `/memories` directory. Claude reads its memory before starting tasks, creates and updates files as it works, and references them in future conversations.

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { ToolLoopAgent } from 'ai';

const memory = anthropic.tools.memory_20250818({
  execute: async action => {
    // `action` contains `command`, `path`, and other fields
    // depending on the command (view, create, str_replace,
    // insert, delete, rename).
    // Implement your storage backend here.
    // Return the result as a string.
  },
});

const agent = new ToolLoopAgent({
  model: 'anthropic/claude-haiku-4.5',
  tools: { memory },
});

const result = await agent.generate({
  prompt: 'Remember that my favorite editor is Neovim',
});
```

The tool receives structured commands (`view`, `create`, `str_replace`, `insert`, `delete`, `rename`), each with a `path` scoped to `/memories`. Your `execute` function maps these to your storage backend (the filesystem, a database, or any other persistence layer).

**When to use this**: you want memory with minimal implementation effort and are already using Anthropic models. The tradeoff is provider lock-in, since this tool only works with Claude.

## Memory Providers

Another approach is to use a provider that has memory built in. These providers wrap an external memory service and expose it through the AI SDK's standard interface. Memory storage, retrieval, and injection happen transparently, and you do not define any tools yourself.

### Letta

[Letta](https://letta.com) provides agents with persistent long-term memory. You create an agent on Letta's platform (cloud or self-hosted), configure its memory there, and use the AI SDK provider to interact with it. Letta's agent runtime handles memory management (core memory, archival memory, recall).

```bash
pnpm add @letta-ai/vercel-ai-sdk-provider
```

```ts
import { lettaCloud } from '@letta-ai/vercel-ai-sdk-provider';
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: lettaCloud(),
  providerOptions: {
    letta: {
      agent: { id: 'your-agent-id' },
    },
  },
});

const result = await agent.generate({
  prompt: 'Remember that my favorite editor is Neovim',
});
```

You can also use Letta's built-in memory tools alongside custom tools:

```ts
import { lettaCloud } from '@letta-ai/vercel-ai-sdk-provider';
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: lettaCloud(),
  tools: {
    core_memory_append: lettaCloud.tool('core_memory_append'),
    memory_insert: lettaCloud.tool('memory_insert'),
    memory_replace: lettaCloud.tool('memory_replace'),
  },
  providerOptions: {
    letta: {
      agent: { id: 'your-agent-id' },
    },
  },
});

const stream = agent.stream({
  prompt: 'What do you remember about me?',
});
```

See the [Letta provider documentation](/providers/community-providers/letta) for full setup and configuration.

### Mem0

[Mem0](https://mem0.ai) adds a memory layer on top of any supported LLM provider. It automatically extracts memories from conversations, stores them, and retrieves relevant ones for future prompts.

```bash
pnpm add @mem0/vercel-ai-provider
```

```ts
import { createMem0 } from '@mem0/vercel-ai-provider';
import { ToolLoopAgent } from 'ai';

const mem0 = createMem0({
  provider: 'openai',
  mem0ApiKey: process.env.MEM0_API_KEY,
  apiKey: process.env.OPENAI_API_KEY,
});

const agent = new ToolLoopAgent({
  model: mem0('gpt-4.1', { user_id: 'user-123' }),
});

const { text } = await agent.generate({
  prompt: 'Remember that my favorite editor is Neovim',
});
```

Mem0 works across multiple LLM providers (OpenAI, Anthropic, Google, Groq, Cohere). You can also manage memories explicitly:

```ts
import { addMemories, retrieveMemories } from '@mem0/vercel-ai-provider';

await addMemories(messages, { user_id: 'user-123' });
const context = await retrieveMemories(prompt, { user_id: 'user-123' });
```

See the [Mem0 provider documentation](/providers/community-providers/mem0) for full setup and configuration.

### Supermemory

[Supermemory](https://supermemory.ai) is a long-term memory platform that adds persistent, self-growing memory to your AI applications. It provides tools that handle saving and retrieving memories automatically through semantic search.

```bash
pnpm add @supermemory/tools
```

```ts
__PROVIDER_IMPORT__;
import { supermemoryTools } from '@supermemory/tools/ai-sdk';
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY!),
});

const result = await agent.generate({
  prompt: 'Remember that my favorite editor is Neovim',
});
```

Supermemory works with any AI SDK provider. The tools give the model `addMemory` and `searchMemories` operations that handle storage and retrieval.

See the [Supermemory provider documentation](/providers/community-providers/supermemory) for full setup and configuration.

### Hindsight

[Hindsight](/providers/community-providers/hindsight) provides agents with persistent memory through five tools: `retain`, `recall`, `reflect`, `getMentalModel`, and `getDocument`. It can be self-hosted with Docker or used as a cloud service.

```bash
pnpm add @vectorize-io/hindsight-ai-sdk @vectorize-io/hindsight-client
```

```ts
__PROVIDER_IMPORT__;
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { createHindsightTools } from '@vectorize-io/hindsight-ai-sdk';
import { ToolLoopAgent } from 'ai';
import { openai } from '@ai-sdk/openai';

const client = new HindsightClient({ baseUrl: process.env.HINDSIGHT_API_URL });

const agent = new ToolLoopAgent({
  model: __MODEL__,
  tools: createHindsightTools({ client, bankId: 'user-123' }),
  instructions: 'You are a helpful assistant with long-term memory.',
});

const result = await agent.generate({
  prompt: 'Remember that my favorite editor is Neovim',
});
```

The `bankId` identifies the memory store and is typically a user ID. In multi-user apps, call `createHindsightTools` inside your request handler so each request gets the right bank. Hindsight works with any AI SDK provider.

See the [Hindsight provider documentation](/providers/community-providers/hindsight) for full setup and configuration.

### MongoDB

[`@mongodb-developer/vercel-ai-memory`](https://www.npmjs.com/package/@mongodb-developer/vercel-ai-memory) provides MongoDB Atlas-backed persistent memory with five structured tiers: **Session**, **Semantic**, **Procedural**, **Episodic**, and **Scratchpad**. Retrieval is powered by Atlas Vector Search using any AI SDK embedding model, with automatic index creation and per-type retention policies.

```bash
pnpm add @mongodb-developer/vercel-ai-memory
```

This integration targets AI SDK v6 because it relies on v6 APIs such as `ModelMessage`, `ToolLoopAgent`, and `isLoopFinished()`:

```json
{
  "peerDependencies": {
    "ai": "^6.0.0",
    "mongodb": "^6.0.0",
    "zod": "^3.0.0"
  }
}
```

```ts
import { createMongoDBMemory } from '@mongodb-developer/vercel-ai-memory';
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent, isLoopFinished } from 'ai';

// Create the memory instance once at module/server level
const mongodbMemory = createMongoDBMemory({
  uri: process.env.MONGODB_URI!,
  embedder: openai.embedding('text-embedding-3-small'),
});

// Scope to a user and session per request
const agent = new ToolLoopAgent({
  model: openai('gpt-4.1'),
  tools: mongodbMemory({ userId: 'alice', sessionId: 'sess-001' }),
  stopWhen: isLoopFinished(),
});

const result = await agent.generate({
  prompt: 'My name is Alice and I love hiking. Remember that.',
});
```

`isLoopFinished()` lets the agent keep running until the tool loop naturally finishes, which is useful when memory tools need to read and write before the final response.

Session memory supports two modes: **tool-driven** (the LLM decides when to read/write — good for prototypes) and **hook-driven** (the runtime persists every turn via `prepareCall` + `onEnd` hooks — recommended for production). The other memory tiers (semantic, procedural, episodic, scratchpad) are always LLM-controlled and selective by design.

MongoDB memory works with any AI SDK model and embedding provider, with no vendor lock-in beyond MongoDB Atlas.

**When to use memory providers**: these providers are a good fit when you want memory without building any storage infrastructure. The tradeoff is that the provider controls memory behavior, so you have less visibility into what gets stored and how it is retrieved. You also take on a dependency on an external service.

## Custom Tool

Building your own memory tool from scratch is the most flexible approach. You control the storage format, the interface, and the retrieval logic. This requires the most upfront work but gives you full ownership of how memory works, with no provider lock-in and no external dependencies.

There are two common patterns:

- **Structured actions**: you define explicit operations (`view`, `create`, `update`, `search`) and handle structured input yourself. Safe by design since you control every operation.
- **Bash-backed**: you give the model a sandboxed bash environment to compose shell commands (`cat`, `grep`, `sed`, `echo`) for flexible memory access. More powerful but requires command validation for safety.

For a full walkthrough of implementing a custom memory tool with a bash-backed interface, AST-based command validation, and filesystem persistence, see the **[Build a Custom Memory Tool](/cookbook/guides/custom-memory-tool)** recipe.







# Policy-Based Tool Approvals

[Tool Approvals](/docs/agents/tool-approvals) let you approve or deny tool calls with a function in your agent setup. `@ai-sdk/policy-opa` moves those rules out of code and into [Open Policy Agent](https://www.openpolicyagent.org/) (OPA) policies written in `.rego`.

Use it when you want authorization to be:

- Written as a separate, reviewable artifact instead of a function buried in agent setup.
- Testable in CI with `opa test`, independent of the SDK.
- Editable without a code deploy (when served from a running OPA instance).

The package sits entirely on top of the public `toolApproval` callback. Nothing changes on the wire: the same `tool-approval-request` / `tool-approval-response` flow as built-in approvals.

## What you can enforce

OPA is a general policy engine. If you can express a rule as code over structured input, you can enforce it at the tool boundary. Common categories:

- Security and access: scopes, roles, permissions, tenant isolation, allowlists of tools, hosts, or paths.
- Business rules: who can do what, on which resources, under which conditions (for example, payments above a threshold need approval).
- Cost and usage: deny or require approval for calls that exceed a budget, token ceiling, or per-user quota.
- Compliance and change control: gate destructive or regulated actions on the right approver, environment, or time window.

The decision is not limited to the current call's arguments. The policy `input` also carries `messages`, the full model and tool-call history for the run, so a rule can factor in what already happened: prior tool calls, the sequence of actions so far, or a running total across the conversation. Examples:

- Require approval once a run has already performed N writes.
- Deny a second irreversible action (a push, a delete) in the same conversation.
- Track cumulative spend or token usage across steps and stop at a ceiling.

### Best fit: deterministic checks

Policy enforcement is strongest when the decision is deterministic and verifiable from structured fields, whether those fields come from the current call or the history in `messages`. The policy extracts a value and compares it, so the answer is the same every time.

- Strong fits: scopes, permissions, numeric thresholds, allowlists, time windows, and history-aware checks like counts, sequences, and running totals.
- Weak fits: content-based or semantic filtering such as "do not use bad language" or "block toxic content". These are best-effort, hard to verify, and easy to bypass. Use a dedicated moderation or classification step for them, and keep policy for the deterministic gate around it.

Rule of thumb: if you can point at a field in the `input` object and write an exact check on it, this is the right tool. If the rule depends on judging free-form meaning, do not lean on policy alone.

## Install

```sh
pnpm add @ai-sdk/policy-opa
# pick one (or both) OPA backends:
pnpm add @open-policy-agent/opa-wasm   # in-process WASM evaluation
pnpm add @open-policy-agent/opa        # HTTP client to a running OPA server
```

- The backends are optional peer dependencies.
- Only the backend you import is loaded.

## How it works

The policy is consulted before every tool dispatch and maps to one of the standard approval statuses:

- `allow` runs the tool.
- `deny` returns a denied result the model can reason about (no human needed).
- `requires-approval` pauses the run and waits for a human `tool-approval-response`.
- No matching rule normalizes to `not-applicable`, which the SDK treats as allow. Add `default decision := { "decision": "deny" }` to your policy to default-deny instead.

## Quick start

```ts
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { opaPolicy, wasmPolicyClient } from '@ai-sdk/policy-opa';
import { readFile } from 'node:fs/promises';

// 1. Load the compiled policy bundle.
const wasm = await readFile('./policy.wasm');
const client = await wasmPolicyClient({ wasm });

// 2. Build the toolApproval configuration.
const toolApproval = opaPolicy({
  client,
  path: 'agent/call/decision',
});

// 3. Pass it to generateText (or streamText / ToolLoopAgent). Everything else is normal.
const result = await generateText({
  model: anthropic('claude-sonnet-4-5'),
  tools: { git, bash, queryLogs },
  toolApproval,
  prompt: 'find the failing test and push the fix',
});
```

## Writing the Rego policy

The policy emits a decision object. `reason` is optional and is surfaced back to the model (for `deny`) or to the human approver (for `requires-approval`).

```rego
package agent.call

# Default to "not-applicable" so unmatched calls fall through.
# Use { decision: "deny" } to default-deny instead.
default decision := { "decision": "not-applicable" }

# Hard deny: pushes are never allowed automatically.
decision := { "decision": "deny", "reason": "pushes require human review" } {
  input.tool.name == "git"
  input.args.args[0] == "push"
}

# Auto-allow: read-only git operations.
decision := { "decision": "allow" } {
  input.tool.name == "git"
  input.args.args[0] in {"status", "log", "diff", "show"}
}

# Human-in-the-loop: kubectl by oncall.
decision := { "decision": "requires-approval", "reason": "kubectl by oncall" } {
  input.tool.name == "kubectl"
  input.runtimeContext.role == "sre-oncall"
}
```

Notes:

- The legacy boolean shape (`{ "allow": true | false, "reason": "..." }`) is also accepted, so existing rules migrate without rewriting.
- The default OPA `input` shape is `{ tool: { name }, args, messages, runtimeContext }`.
- Override the input shape with `toInput`:

```ts
opaPolicy({
  client,
  path: 'agent/call/decision',
  toInput: ({ toolCall, runtimeContext }) => ({
    action: toolCall.toolName,
    principal: runtimeContext.role,
    resource: toolCall.input,
  }),
});
```

### Test the policy in CI

OPA ships its own test framework. These tests run without the SDK, which is the main reason policy-as-code beats policy-in-application-code.

```rego
# policy_test.rego
package agent.call

test_push_denied {
  decision.decision == "deny" with input as {
    "tool": { "name": "git" },
    "args": { "args": ["push", "origin", "main"] }
  }
}
```

Run with `opa test policy.rego policy_test.rego`.

### Errors fail closed

- If the backend errors (server unreachable, WASM fault, misbuilt bundle), `opaPolicy` returns `denied` with the error message as the reason.
- The error never rejects out of the callback and never aborts the run.
- A backend outage blocks the affected call rather than silently allowing it.
- This is distinct from a rule that returns no match, which normalizes to `not-applicable` (allow). Use a `default ... deny` rule if you want unmatched calls denied too.

## Loading the policy

### Option A: WASM (in-process)

Compile the `.rego` to WASM ahead of time:

```sh
opa build -t wasm -e 'agent/call/decision' -o bundle.tar.gz policy.rego
tar -xzf bundle.tar.gz /policy.wasm
```

```ts
import { wasmPolicyClient, opaPolicy } from '@ai-sdk/policy-opa';
import { readFile } from 'node:fs/promises';

const wasm = await readFile('./policy.wasm');
const client = await wasmPolicyClient({ wasm });
const toolApproval = opaPolicy({ client, path: 'agent/call/decision' });
```

- No network call per decision.
- Good fit when you ship the policy with the app, or fetch it from object storage at startup.
- Hot-reload means rebuilding the WASM and re-instantiating the client.

### Option B: HTTP (running OPA server)

```ts
import { httpPolicyClient, opaPolicy } from '@ai-sdk/policy-opa';

const client = httpPolicyClient({ url: 'http://localhost:8181' });
const toolApproval = opaPolicy({ client, path: 'agent/call/decision' });
```

- One HTTP round-trip per decision.
- Good fit when policies change frequently and you want hot-reload without redeploying, or when multiple services share one OPA.
- Pass `headers` for Styra DAS / EOPA authentication.

## Bring in external data and integrations

Policies are not limited to the tool-call input. OPA can decide based on external data such as role-to-permission mappings, IDP group memberships, entitlement lists, or allowlists, and that data can update without redeploying your app.

How OPA sources data is OPA's concern, not this package's. The common approaches:

- Static data at load time: pass `data` to `wasmPolicyClient({ wasm, data })`. It is handed to the bundle's `setData`, so the policy can read it under `data.*`.
- Bundles: point a running OPA server (the HTTP backend) at a bundle service so it periodically pulls fresh policy and data. Role mappings and IDP groups update without a code deploy.
- Lookups during evaluation: a policy can call out to an external service (for example an IDP or entitlements API) while it evaluates a decision.

Learn the details from OPA, not here:

- [Policy reference](https://www.openpolicyagent.org/docs/policy-reference)
- [External data](https://www.openpolicyagent.org/docs/external-data) (including connecting to an IDP)

This package only maps the resulting decision to the SDK's approval status. The `input` it passes is what your policy combines with whatever data OPA already has.

## Roll out safely with shadow mode

Do not ship a new policy straight to enforce. The first version almost always denies things you did not mean to. `shadow(approval, opts)` evaluates the policy and reports the decision via `onDecision`, but tells the SDK every call is approved until you flip `enforce: true`.

```ts
import { opaPolicy, shadow, wasmPolicyClient } from '@ai-sdk/policy-opa';

const client = await wasmPolicyClient({ wasm });

const toolApproval = shadow(
  opaPolicy({ client, path: 'agent/call/decision' }),
  {
    enforce: process.env.ENFORCE_POLICY === 'true',
    onDecision: event => {
      logger.info('policy.decision', {
        tool: event.toolCall.toolName,
        decision: event.decision.type,
        reason: event.decision.reason,
        enforced: event.enforced,
        wouldBlock: event.decision.type === 'denied',
      });
    },
  },
);
```

Recommended rollout:

1. Write the policy and test it with `opa test`.
2. Wrap it in `shadow(...)` with `enforce: false` (the default) and wire `onDecision` to your logs/metrics.
3. Run in your real environment. Inspect events where `decision.type` is `denied` or `user-approval`: those are the calls the policy would have changed.
4. Fix the policy and iterate.
5. When the only `denied` / `user-approval` events are ones you want, set `enforce: true`.

Telemetry semantics:

- `onDecision` is fire-and-forget. A slow or throwing logger cannot block or break enforcement, and thrown errors are swallowed.
- The contract is enforcement first, observability second.
- For the opposite (enforcement waits for the audit log), log from inside the underlying `toolApproval` instead of through `shadow`.

## Send decisions to your observability platform

`onDecision` is not only for rollout. Keep `shadow` in place with `enforce: true` and every decision flows to your logging, metrics, or tracing stack while the policy stays load-bearing.

```ts
const toolApproval = shadow(
  opaPolicy({ client, path: 'agent/call/decision' }),
  {
    enforce: true, // enforcing AND observing
    onDecision: event => {
      metrics.increment('agent.policy.decision', {
        tool: event.toolCall.toolName,
        decision: event.decision.type, // approved | denied | user-approval | not-applicable
        enforced: String(event.enforced),
      });
    },
  },
);
```

- Each `PolicyDecisionEvent` carries the tool call, the policy `decision` (type and reason), `enforced`, and `effective` (what the SDK acted on). Compare `decision` against `effective` to spot drift.
- `onDecision` is fire-and-forget; see the telemetry semantics under shadow mode.

When you use the HTTP backend, OPA can also emit [decision logs](https://www.openpolicyagent.org/docs/management-decision-logs) natively, shipping every evaluation to a remote service for a full audit trail without any application code.

## Capability scoping at the model boundary

`opaCapabilityMiddleware` enforces policy earlier than `toolApproval`: before the model is even told a tool exists. This is defense in depth, plus it saves tokens and improves jailbreak rejection.

```ts
import { wrapLanguageModel } from 'ai';
import { wasmPolicyClient, opaCapabilityMiddleware } from '@ai-sdk/policy-opa';

const client = await wasmPolicyClient({ wasm });

const wrappedModel = wrapLanguageModel({
  model: anthropic('claude-sonnet-4-5'),
  middleware: opaCapabilityMiddleware({ client, path: 'agent/tools/allowed' }),
});
```

- The rule at `path` returns a `string[]` of allowed tool names, or `{ tools: string[] }`.
- Tools not in the allowlist are dropped before the model sees them.
- Fails closed: on a malformed response or evaluator error, `params.tools` is set to `undefined` so the model is told it has no tools. For fail-open, write the fallback in Rego.

## Scoping a discovered tool surface

When tools come from MCP discovery or a plugin registry, you cannot write per-tool rules ahead of time, and any tool you forgot is silently allowed. `wrapMcpTools` makes the approval total over the discovered surface by routing unmatched tools to a configurable default.

```ts
import { opaPolicy, wasmPolicyClient, wrapMcpTools } from '@ai-sdk/policy-opa';

const discovered = await mcpClient.tools();
const client = await wasmPolicyClient({ wasm });

const { tools, toolApproval } = wrapMcpTools(
  discovered,
  opaPolicy({ client, path: 'agent/call/decision' }),
  { default: 'user-approval' }, // anything OPA does not match needs a human
);

await generateText({ model, tools, toolApproval, prompt });
```

Defaults for uncovered tools:

- `'user-approval'` (default): require a human. Good when you trust the source but want a safety net.
- `'denied'`: hard allowlist mode. The policy enumerates what is allowed; everything else is rejected.
- `'approved'`: allow. Only when the discovery source is fully trusted.

Despite the name, it works on any `Record<string, Tool>`.

## Allow-all when no policy is configured

`optionalOpaPolicy` returns `undefined` when `client` is `undefined`, which is the same as not passing `toolApproval` (the SDK approves every call). Useful for local dev or CI where the policy file is absent.

```ts
import { optionalOpaPolicy, wasmPolicyClient } from '@ai-sdk/policy-opa';
import { readFile } from 'node:fs/promises';

const wasm = process.env.POLICY_WASM_PATH
  ? await readFile(process.env.POLICY_WASM_PATH)
  : undefined;

const client = wasm ? await wasmPolicyClient({ wasm }) : undefined;

const toolApproval = optionalOpaPolicy({ client, path: 'agent/call/decision' });
```

- `POLICY_WASM_PATH` unset: `toolApproval` is `undefined`, all calls allowed, OPA modules never loaded.
- `POLICY_WASM_PATH` set: policy loads, enforcement on.
- For stricter behavior (refuse to start without a policy), use `opaPolicy` directly and let the missing bytes throw at startup.

## Transitive enforcement: composite tools

`toolApproval` only fires when the model calls a tool directly. A coarse dispatcher tool (a `bash` tool that can run `git push`, an HTTP tool, an MCP proxy) lets the model bypass a per-action rule by routing through it.

The fix lives inside the dispatcher's `toolApproval` entry: parse the dispatcher input down to a logical `(name, args)` pair, then evaluate it against the same rule the direct tool uses.

```ts
const bashApproval = opaPolicy({
  client,
  path: 'agent/action/decision',
  toInput: ({ toolCall }) => {
    const { command } = toolCall.input as { command: string };
    const [bin, ...rest] = command.split(/\s+/);
    return { kind: bin, args: rest };
  },
});
```

Guidance:

- Keep the matching logic in one place: either a shared Rego helper rule (both approvals call `opaPolicy` with the same `path`) or a shared TypeScript predicate.
- Deny anything you cannot reduce to a clean invocation. Shell input is adversarial to parse, so "cannot prove it is safe" means deny.
- Honest limitation: this gates dispatch at the model's call boundary. It does not stop a tool that, once approved, performs extra side effects beyond what its input describes. For that, run untrusted execution in an out-of-band sandbox (Vercel Sandbox, Firecracker, containers) and treat the sandbox as the trust boundary.

Worked examples for SQL, HTTP, MCP, browser, and shell dispatchers live in the [package README](https://github.com/vercel/ai/tree/main/packages/policy-opa).

## Example application

The [ai-sdk-slackbot](https://github.com/vercel-labs/ai-sdk-slackbot) example wires this package into a real agent end to end. It shows:

- Every tool call gated by Rego in `policies/decision.rego`, editable without touching TypeScript.
- Real tools under policy: a web search scoped to a domain, a weather tool with a city allowlist, and a `bash` tool restricted to a read-only command allowlist (transitive enforcement).
- Switching backends with one env var (`POLICY_MODE`): in-process WASM by default, or a live OPA HTTP server for hot-reloading policies in dev.
- Policy code tested independently with OPA-native tests in `policies/decision_test.rego`.

See [`policies/`](https://github.com/vercel-labs/ai-sdk-slackbot/tree/main/policies) and [`lib/policy/load.ts`](https://github.com/vercel-labs/ai-sdk-slackbot/blob/main/lib/policy/load.ts) for how the policy is loaded and applied.

## API reference

Everything is exported from the package root, `@ai-sdk/policy-opa`.

Engine-neutral core:

- `shadow(approval, opts?)`: wrap any approval so it is evaluated and reported but not enforced until `opts.enforce: true`. Recommended starting point for any new policy.
- `wrapMcpTools(tools, approval, opts?)`: make an approval total over a discovered tool set. `opts.default` controls uncovered tools.
- `PolicyClient`: the `evaluate(path, input)` interface every backend implements. The seam for non-OPA engines.
- Helper types: `PolicyDecision`, `WrappedMcpTools`, `PolicyDecisionEvent`.

OPA backend and adapters:

- `wasmPolicyClient({ wasm, data? })`: async; loads a compiled OPA WASM bundle in-process.
- `httpPolicyClient({ url, headers? })`: sync; client against a running OPA server.
- `opaPolicy({ client, path, toInput? })`: returns a `toolApproval` configuration. Fails closed.
- `optionalOpaPolicy({ client, path, toInput? })`: like `opaPolicy` but returns `undefined` when `client` is `undefined`.
- `opaCapabilityMiddleware({ client, path, toInput? })`: a `LanguageModelV4Middleware` that narrows `params.tools` to an allowlist. Fails closed.
- `normalizeOpaDecision(result)`: standalone result normalization, for users who call OPA themselves.

## Related

- [Tool Approvals](/docs/agents/tool-approvals): the underlying `toolApproval` callback this package plugs into.
- [Building Agents](/docs/agents/building-agents)
- [ai-sdk-slackbot example](https://github.com/vercel-labs/ai-sdk-slackbot): a full agent with policy-gated tools.
- [Open Policy Agent documentation](https://www.openpolicyagent.org/docs/)









# Subagents

A subagent is an agent that a parent agent can invoke. The parent delegates work via a tool, and the subagent executes autonomously before returning a result.

## How It Works

1. **Define a subagent** with its own model, instructions, and tools
2. **Create a tool that calls it** for the main agent to use
3. **Subagent runs independently with its own context window**
4. **Return a result** (optionally streaming progress to the UI)
5. **Control what the model sees** using `toModelOutput` to summarize

## When to Use Subagents

Subagents add latency and complexity. Use them when the benefits outweigh the costs:

| Use Subagents When                              | Avoid Subagents When           |
| ----------------------------------------------- | ------------------------------ |
| Tasks require exploring large amounts of tokens | Tasks are simple and focused   |
| You need to parallelize independent research    | Sequential processing suffices |
| Context would grow beyond model limits          | Context stays manageable       |
| You want to isolate tool access by capability   | All tools can safely coexist   |

## Why Use Subagents?

### Offloading Context-Heavy Tasks

Some tasks require exploring large amounts of information—reading files, searching codebases, or researching topics. Running these in the main agent consumes context quickly, making the agent less coherent over time.

With subagents, you can:

- Spin up a dedicated agent that uses hundreds of thousands of tokens
- Have it return only a focused summary (perhaps 1,000 tokens)
- Keep your main agent's context clean and coherent

The subagent does the heavy lifting while the main agent stays focused on orchestration.

### Parallelizing Independent Work

For tasks like exploring a codebase, you can spawn multiple subagents to research different areas simultaneously. Each returns a summary, and the main agent synthesizes the findings—without paying the context cost of all that exploration.

### Specialized Orchestration

A less common but valid pattern is using a main agent purely for orchestration, delegating to specialized subagents for different types of work. For example:

- An exploration subagent with read-only tools for researching codebases
- A coding subagent with file editing tools
- An integration subagent with tools for a specific platform or API

This creates a clear separation of concerns, though context offloading and parallelization are the more common motivations for subagents.

## Basic Subagent Without Streaming

The simplest subagent pattern requires no special machinery. Your main agent has a tool that calls another agent in its `execute` function:

```ts
import { ToolLoopAgent, tool } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

// Define a subagent for research tasks
const researchSubagent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: `You are a research agent.
Summarize your findings in your final response.`,
  tools: {
    read: readFileTool, // defined elsewhere
    search: searchTool, // defined elsewhere
  },
});

// Create a tool that delegates to the subagent
const researchTool = tool({
  description: 'Research a topic or question in depth.',
  inputSchema: z.object({
    task: z.string().describe('The research task to complete'),
  }),
  execute: async ({ task }, { abortSignal }) => {
    const result = await researchSubagent.generate({
      prompt: task,
      abortSignal,
    });
    return result.text;
  },
});

// Main agent uses the research tool
const mainAgent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: 'You are a helpful assistant that can delegate research tasks.',
  tools: {
    research: researchTool,
  },
});
```

This works well when you don't need to show the subagent's progress in the UI. The tool call blocks until the subagent completes, then returns the final text response.

### Handling Cancellation

When the user cancels a request, the `abortSignal` propagates to the subagent. Always pass it through to ensure cleanup:

```ts
execute: async ({ task }, { abortSignal }) => {
  const result = await researchSubagent.generate({
    prompt: task,
    abortSignal, // Cancels subagent if main request is aborted
  });
  return result.text;
},
```

If you abort the signal, the subagent stops executing and throws an `AbortError`. The main agent's tool execution fails, which stops the main loop.

To avoid errors about incomplete tool calls in subsequent messages, use `convertToModelMessages` with `ignoreIncompleteToolCalls`:

```ts
import { convertToModelMessages } from 'ai';

const modelMessages = await convertToModelMessages(messages, {
  ignoreIncompleteToolCalls: true,
});
```

This filters out tool calls that don't have corresponding results. Learn more in the [convertToModelMessages](/docs/reference/ai-sdk-ui/convert-to-model-messages) reference.

## Streaming Subagent Progress

When you want to show incremental progress as the subagent works, use [**preliminary tool results**](/docs/ai-sdk-core/tools-and-tool-calling#preliminary-tool-results). This pattern uses a generator function that yields partial updates to the UI.

### How Preliminary Tool Results Work

Change your `execute` function from a regular function to an async generator (`async function*`). Each `yield` sends a preliminary result to the frontend:

```ts
execute: async function* ({ /* input */ }) {
  // ... do work ...
  yield partialResult;
  // ... do more work ...
  yield updatedResult;
}
```

### Building the Complete Message

Each `yield` **replaces** the previous output entirely (it does not append). This means you need a way to accumulate the subagent's response into a complete message that grows over time.

The `readUIMessageStream` utility handles this. It reads each chunk from the stream and builds an ever-growing `UIMessage` containing all parts received so far:

```ts
import { readUIMessageStream, toUIMessageStream, tool } from 'ai';
import { z } from 'zod';

const researchTool = tool({
  description: 'Research a topic or question in depth.',
  inputSchema: z.object({
    task: z.string().describe('The research task to complete'),
  }),
  execute: async function* ({ task }, { abortSignal }) {
    // Start the subagent with streaming
    const result = await researchSubagent.stream({
      prompt: task,
      abortSignal,
    });

    // Each iteration yields a complete, accumulated UIMessage
    for await (const message of readUIMessageStream({
      stream: toUIMessageStream({ stream: result.stream }),
    })) {
      yield message;
    }
  },
});
```

Each yielded `message` is a complete `UIMessage` containing all the subagent's parts up to that point (text, tool calls, and tool results). The frontend simply replaces its display with each new message.

## Controlling What the Model Sees

Here's where subagents become powerful for context management. The full `UIMessage` with all the subagent's work is stored in the message history and displayed in the UI. But you can control what the main agent's model actually sees using `toModelOutput`.

### How It Works

The `toModelOutput` function maps the tool's output to the tokens sent to the model:

```ts
const researchTool = tool({
  description: 'Research a topic or question in depth.',
  inputSchema: z.object({
    task: z.string().describe('The research task to complete'),
  }),
  execute: async function* ({ task }, { abortSignal }) {
    const result = await researchSubagent.stream({
      prompt: task,
      abortSignal,
    });

    for await (const message of readUIMessageStream({
      stream: toUIMessageStream({ stream: result.stream }),
    })) {
      yield message;
    }
  },
  toModelOutput: ({ output: message }) => {
    // Extract just the final text as a summary
    const lastTextPart = message?.parts.findLast(p => p.type === 'text');
    return {
      type: 'text',
      value: lastTextPart?.text ?? 'Task completed.',
    };
  },
});
```

With this setup:

- **Users see**: The full subagent execution—every tool call, every intermediate step
- **The model sees**: Just the final summary text

The subagent might use 100,000 tokens exploring and reasoning, but the main agent only consumes the summary. This keeps the main agent coherent and focused.

### Write Subagent Instructions for Summarization

For `toModelOutput` to extract a useful summary, your subagent must produce one. Add explicit instructions like this:

```ts
const researchSubagent = new ToolLoopAgent({
  model: __MODEL__,
  instructions: `You are a research agent. Complete the task autonomously.

IMPORTANT: When you have finished, write a clear summary of your findings as your final response.
This summary will be returned to the main agent, so include all relevant information.`,
  tools: {
    read: readFileTool,
    search: searchTool,
  },
});
```

Without this instruction, the subagent might not produce a comprehensive summary. It could simply say "Done", leaving `toModelOutput` with nothing useful to extract.

## Rendering Subagents in the UI (with useChat)

To display streaming progress, check the tool part's `state` and `preliminary` flag.

### Tool Part States

| State              | Description                                |
| ------------------ | ------------------------------------------ |
| `input-streaming`  | Tool input being generated                 |
| `input-available`  | Tool ready to execute                      |
| `output-available` | Tool produced output (check `preliminary`) |
| `output-error`     | Tool execution failed                      |

### Detecting Streaming vs Complete

```tsx
const hasOutput = part.state === 'output-available';
const isStreaming = hasOutput && part.preliminary === true;
const isComplete = hasOutput && !part.preliminary;
```

### Type Safety for Subagent Output

Export types alongside your agents for use in UI components:

```ts filename="lib/agents.ts"
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';

export const mainAgent = new ToolLoopAgent({
  // ... configuration with researchTool
});

// Export the main agent message type for the chat UI
export type MainAgentMessage = InferAgentUIMessage<typeof mainAgent>;
```

### Render Messages and Subagent Output

This example uses the types defined above to render both the main agent's messages and the subagent's streamed output:

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import type { MainAgentMessage } from '@/lib/agents';

export function Chat() {
  const { messages } = useChat<MainAgentMessage>();

  return (
    <div>
      {messages.map(message =>
        message.parts.map((part, i) => {
          switch (part.type) {
            case 'text':
              return <p key={i}>{part.text}</p>;
            case 'tool-research':
              return (
                <div>
                  {part.state !== 'input-streaming' && (
                    <div>Research: {part.input.task}</div>
                  )}
                  {part.state === 'output-available' && (
                    <div>
                      {part.output.parts.map((nestedPart, i) => {
                        switch (nestedPart.type) {
                          case 'text':
                            return <p key={i}>{nestedPart.text}</p>;
                          default:
                            return null;
                        }
                      })}
                    </div>
                  )}
                </div>
              );
            default:
              return null;
          }
        }),
      )}
    </div>
  );
}
```

## Caveats

### No Tool Approvals in Subagents

Subagent tools cannot use approval flows such as `toolApproval` (or the
deprecated `needsApproval`). All tools must execute automatically without user
confirmation.

### Subagent Context is Isolated

Each subagent invocation starts with a fresh context window. This is one of the key benefits of subagents: they don't inherit the accumulated context from the main agent, which is exactly what allows them to do heavy exploration without bloating the main conversation.

If you need to give a subagent access to the conversation history, the `messages` are available in the tool's execute function alongside `abortSignal`:

```ts
execute: async ({ task }, { abortSignal, messages }) => {
  const result = await researchSubagent.generate({
    messages: [
      ...messages, // The main agent's conversation history
      { role: 'user', content: task }, // The specific task for this invocation
    ],
    abortSignal,
  });
  return result.text;
},
```

Use this sparingly since passing full history defeats some of the context isolation benefits.

### Streaming Adds Complexity

The basic pattern (no streaming) is simpler to implement and debug. Only add streaming when you need to show real-time progress in the UI.









# WorkflowAgent

The `WorkflowAgent` from `@ai-sdk/workflow` is designed for building **durable, resumable agents** that run inside a [workflow](https://vercel.com/docs/workflow). It provides the same agent loop as the [`ToolLoopAgent`](/docs/agents/building-agents), but adds automatic state persistence, tool schema serialization, and built-in tool approval flows that survive workflow step boundaries.

## Why Durable Agents?

A standard `ToolLoopAgent` runs entirely in memory — if the process crashes, all progress is lost. For production agents that make multiple tool calls, this creates problems:

- **Statefulness** — Long-running agent loops need to persist state across process boundaries
- **Resumability** — If a step fails, you want to retry from the last checkpoint, not restart from scratch
- **Human-in-the-loop** — Tools that require user approval need to pause the agent and resume later
- **Observability** — Each tool call runs as a discrete workflow step, visible in dashboards

`WorkflowAgent` solves these by running inside a workflow, where each tool execution is a durable step with automatic retries.

## When to Use WorkflowAgent vs ToolLoopAgent

|                         | ToolLoopAgent             | WorkflowAgent                                   |
| ----------------------- | ------------------------- | ----------------------------------------------- |
| **Package**             | `ai`                      | `@ai-sdk/workflow`                              |
| **Runtime**             | In-memory                 | Workflow                                        |
| **Durability**          | Lost on crash             | Survives restarts                               |
| **Tool retries**        | Manual                    | Automatic (via workflow steps)                  |
| **Human approval**      | Built-in                  | Built-in + survives suspension                  |
| **`generate()` method** | Available                 | Not available                                   |
| **`stream()` method**   | Available                 | Primary API                                     |
| **Stream output**       | `streamText` return value | `writable` parameter with `ModelCallStreamPart` |

For simpler use cases that don't need durability, use [`ToolLoopAgent`](/docs/agents/building-agents) from the `ai` package.

## Installation

```bash
npm install @ai-sdk/workflow workflow
```

`@ai-sdk/workflow` requires the `ai` package and `zod` as peer dependencies. The `workflow` package provides the Workflow DevKit runtime (`getWritable`, `'use workflow'`, `'use step'`).

## Creating a WorkflowAgent

Define an agent by instantiating the `WorkflowAgent` class with a model, instructions, and tools:

```ts
import { WorkflowAgent } from '@ai-sdk/workflow';
import { tool } from 'ai';
import { z } from 'zod';

const agent = new WorkflowAgent({
  model: 'anthropic/claude-sonnet-4-6',
  instructions: 'You are a helpful assistant.',
  tools: {
    weather: tool({
      description: 'Get weather for a location',
      inputSchema: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72,
      }),
    }),
  },
});
```

### Model Resolution

The `model` parameter accepts two forms:

```ts
// String — AI Gateway model ID
new WorkflowAgent({ model: 'anthropic/claude-sonnet-4-6' });

// Provider instance
import { openai } from '@ai-sdk/openai';
new WorkflowAgent({ model: openai('gpt-4o') });
```

## Using the Agent in a Workflow

`WorkflowAgent` is designed to run inside a workflow function. The key integration points are:

1. Mark your function with `'use workflow'`
2. Pass `getWritable()` to the agent's `stream()` method
3. Start the workflow from your API route

### End-to-End Example

```ts filename="workflow/agent-chat.ts"
import { WorkflowAgent, type ModelCallStreamPart } from '@ai-sdk/workflow';
import { convertToModelMessages, tool, type UIMessage } from 'ai';
import { getWritable } from 'workflow';
import { z } from 'zod';

export async function chat(messages: UIMessage[]) {
  'use workflow';

  const modelMessages = await convertToModelMessages(messages);

  const agent = new WorkflowAgent({
    model: 'anthropic/claude-sonnet-4-6',
    instructions: 'You are a flight booking assistant.',
    tools: {
      searchFlights: tool({
        description: 'Search for available flights',
        inputSchema: z.object({
          origin: z.string(),
          destination: z.string(),
          date: z.string(),
        }),
        execute: searchFlightsStep,
      }),
      bookFlight: tool({
        description: 'Book a specific flight',
        inputSchema: z.object({
          flightId: z.string(),
          passengerName: z.string(),
        }),
        execute: bookFlightStep,
      }),
    },
  });

  const result = await agent.stream({
    messages: modelMessages,
    writable: getWritable<ModelCallStreamPart>(),
  });

  return { messages: result.messages };
}
```

```ts filename="app/api/chat/route.ts"
import { createModelCallToUIChunkTransform } from '@ai-sdk/workflow';
import { createUIMessageStreamResponse, type UIMessage } from 'ai';
import { start } from 'workflow/api';
import { chat } from '@/workflow/agent-chat';

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const run = await start(chat, [messages]);

  return createUIMessageStreamResponse({
    stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
  });
}
```

### Message Conversion

`WorkflowAgent.stream()` expects `ModelMessage[]`, not `UIMessage[]`. When receiving messages from the client (via `useChat`), convert them first:

```ts
import { convertToModelMessages, type UIMessage } from 'ai';

export async function chat(messages: UIMessage[]) {
  'use workflow';

  const modelMessages = await convertToModelMessages(messages);

  const result = await agent.stream({
    messages: modelMessages,
    // ...
  });
}
```

### Writable Streams

Unlike `ToolLoopAgent` where you consume the returned stream, `WorkflowAgent` writes raw `ModelCallStreamPart` chunks to a `writable` stream provided by the workflow runtime via `getWritable()`. At the response boundary, use `createModelCallToUIChunkTransform()` to convert these into `UIMessageChunk` objects for the client:

```ts
import { createModelCallToUIChunkTransform } from '@ai-sdk/workflow';
import { createUIMessageStreamResponse } from 'ai';

// Convert raw model stream parts → UI message chunks
return createUIMessageStreamResponse({
  stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
});
```

## Resumable Streaming with WorkflowChatTransport

Workflow functions can time out or be interrupted by network failures. `WorkflowChatTransport` is a [`ChatTransport`](/docs/ai-sdk-ui/transport) implementation that handles these interruptions automatically — it detects when a stream ends without a `finish` event and reconnects to resume from where it left off.

```tsx filename="app/page.tsx"
'use client';

import { useChat } from '@ai-sdk/react';
import { WorkflowChatTransport } from '@ai-sdk/workflow';
import { useMemo } from 'react';

export default function Chat() {
  const transport = useMemo(
    () =>
      new WorkflowChatTransport({
        api: '/api/chat',
        maxConsecutiveErrors: 5,
        initialStartIndex: -50, // On page refresh, fetch last 50 chunks
      }),
    [],
  );

  const { messages, sendMessage } = useChat({ transport });

  // ... render chat UI
}
```

The transport requires your POST endpoint to return an `x-workflow-run-id` response header, and a GET endpoint at `{api}/{runId}/stream` for reconnection:

```ts filename="app/api/chat/route.ts"
import { createModelCallToUIChunkTransform } from '@ai-sdk/workflow';
import { createUIMessageStreamResponse, type UIMessage } from 'ai';
import { start } from 'workflow/api';
import { chat } from '@/workflow/agent-chat';

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const run = await start(chat, [messages]);

  return createUIMessageStreamResponse({
    stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
    headers: {
      'x-workflow-run-id': run.runId,
    },
  });
}
```

```ts filename="app/api/chat/[runId]/stream/route.ts"
import { createModelCallToUIChunkTransform } from '@ai-sdk/workflow';
import type { NextRequest } from 'next/server';
import { getRun } from 'workflow/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const startIndex = Number(
    new URL(request.url).searchParams.get('startIndex') ?? '0',
  );

  const run = await getRun(runId);
  const readable = run
    .getReadable({ startIndex })
    .pipeThrough(createModelCallToUIChunkTransform());

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'x-workflow-run-id': runId,
    },
  });
}
```

For the full API reference, see [`WorkflowChatTransport`](/docs/reference/ai-sdk-workflow/workflow-chat-transport).

## Tools as Workflow Steps

Mark tool execute functions with `'use step'` to make them durable workflow steps. This gives each tool call:

- **Automatic retries** — Failed tool calls are retried automatically (default: 3 attempts)
- **Persistence** — Results survive process restarts
- **Observability** — Each tool call appears as a discrete step in the workflow dashboard

```ts
async function searchFlightsStep(input: {
  origin: string;
  destination: string;
  date: string;
}) {
  'use step';
  const response = await fetch(`https://api.flights.example/search?...`);
  return response.json();
}

async function bookFlightStep(input: {
  flightId: string;
  passengerName: string;
}) {
  'use step';
  const response = await fetch('https://api.flights.example/book', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.json();
}
```

Tools without `'use step'` still work but run as regular in-memory functions without durability guarantees.

## Tool Approval

For `WorkflowAgent`, human approval is configured on the tool definition with
`needsApproval`. This is specific to `WorkflowAgent`; for `generateText`,
`streamText`, and `ToolLoopAgent`, use `toolApproval` instead. When a workflow
tool has `needsApproval` set, the agent pauses and emits an approval request to
the writable stream. The workflow suspends until the user approves or denies:

```ts
const agent = new WorkflowAgent({
  model: 'anthropic/claude-sonnet-4-6',
  tools: {
    bookFlight: tool({
      description: 'Book a flight',
      inputSchema: z.object({
        flightId: z.string(),
        passengerName: z.string(),
      }),
      needsApproval: true, // Always require approval
      execute: bookFlightStep,
    }),
    cancelBooking: tool({
      description: 'Cancel a booking',
      inputSchema: z.object({ bookingId: z.string() }),
      // Conditional approval based on input
      needsApproval: async input => {
        return input.bookingId.startsWith('VIP-');
      },
      execute: cancelBookingStep,
    }),
  },
});
```

Because the workflow is durable, the approval request survives process restarts — the user can approve hours later and the agent will resume.

## Loop Control

Control how many steps the agent can take:

```ts
import { isStepCount } from 'ai';

const result = await agent.stream({
  messages,
  stopWhen: isStepCount(10), // Stop after 10 LLM calls
});
```

If you want the agent to keep running until it has finished calling tools, you can also use `isLoopFinished()`:

```ts
import { isLoopFinished } from 'ai';

const result = await agent.stream({
  messages,
  stopWhen: isLoopFinished(),
});
```

`isLoopFinished()` lets the agent run until all tool calls have completed, but you should still pair it with `maxSteps` to avoid runaway loops. See https://ai-sdk.dev/v7/docs/reference/ai-sdk-core/loop-finished#isloopfinished.

By default, the agent loops until the model stops calling tools (no maximum).

## Structured Output

Parse agent responses into typed objects using `Output`:

```ts
import { Output } from '@ai-sdk/workflow';
import { z } from 'zod';

const result = await agent.stream({
  messages,
  output: Output.object({
    schema: z.object({
      sentiment: z.enum(['positive', 'neutral', 'negative']),
      summary: z.string(),
    }),
  }),
});

console.log(result.output); // { sentiment: 'positive', summary: '...' }
```

## Configuration Options

`WorkflowAgent` accepts the same generation settings as `ToolLoopAgent` (`temperature`, `maxOutputTokens`, `topP`, etc.) plus workflow-specific options.

### runtimeContext and toolsContext

Pass server-side state through the agent loop without putting it into the prompt. Use these instead of the previous `experimental_context` option.

- `runtimeContext` is shared agent state that flows through `prepareStep`, lifecycle callbacks, and `onEnd`. Treat it as immutable; return a new value from `prepareStep` to update it for the current and subsequent steps.
- `toolsContext` is a per-tool map keyed by tool name. Each tool's `execute` only sees its own validated entry as `context`. Tools that declare a `contextSchema` validate their entry against the schema before execution.

```ts filename="workflow/agent-chat.ts"
import { WorkflowAgent } from '@ai-sdk/workflow';
import { tool } from 'ai';
import { z } from 'zod';

const agent = new WorkflowAgent({
  model: 'anthropic/claude-sonnet-4-6',
  tools: {
    weather: tool({
      description: 'Get the weather for a city.',
      inputSchema: z.object({ city: z.string() }),
      contextSchema: z.object({
        defaultUnit: z.enum(['celsius', 'fahrenheit']),
      }),
      execute: async ({ city }, { context }) => ({
        city,
        unit: context.defaultUnit,
      }),
    }),
  },

  // Shared agent state — available in `prepareStep`, lifecycle callbacks, and `onEnd`.
  runtimeContext: {
    tenantId: 'tenant_123',
    requestId: 'req_abc',
    plan: 'enterprise',
  },

  // Per-tool context — each tool sees only its own validated entry.
  toolsContext: {
    weather: { defaultUnit: 'celsius' },
  },

  prepareStep: ({ runtimeContext }) => {
    if (runtimeContext.plan === 'enterprise') {
      return { temperature: 0.2 };
    }
    return {};
  },
});
```

`runtimeContext` and `toolsContext` can also be passed per-call to `stream()`, where they override the constructor-level defaults.

Because `WorkflowAgent` runs inside the Workflow runtime, context values may be persisted and replayed across workflow and step boundaries. Keep `runtimeContext`, `toolsContext`, and any context values returned from `prepareStep` serializable. Use plain data such as strings, numbers, booleans, arrays, plain objects, dates, URLs, maps, sets, and other Workflow-supported structured data. Do not put functions, class instances, symbols, `WeakMap`, `WeakSet`, database clients, or SDK clients in context. Pass identifiers or configuration data instead, and recreate non-serializable resources inside step functions.

This differs from `ToolLoopAgent`, which runs in memory and can carry richer JavaScript values for the lifetime of a single process. With `WorkflowAgent`, treating context as durable data keeps workflow replay and step execution reliable.

### experimental_sandbox

Pass a sandbox session when tools need an execution environment. The sandbox is
available to tool `execute` functions as `experimental_sandbox` and to
`prepareStep`, where you can override it for the current step:

```ts
const agent = new WorkflowAgent({
  model: 'anthropic/claude-sonnet-4-6',
  tools: {
    shell: tool({
      description: 'Run a shell command in the sandbox.',
      inputSchema: z.object({ command: z.string() }),
      execute: async ({ command }, { experimental_sandbox }) => {
        if (!experimental_sandbox) {
          throw new Error('Sandbox is not available');
        }

        return experimental_sandbox.run({ command });
      },
    }),
  },
  experimental_sandbox: sandbox,
});

await agent.stream({
  messages,
  writable: getWritable(),
  experimental_sandbox: requestSandbox, // Overrides the constructor default.
});
```

`experimental_sandbox` is a live runtime handle, not durable context. Do not
store it in `runtimeContext` or `toolsContext`. If a tool runs as a separate
workflow step, pass serializable sandbox identifiers or configuration and
reattach inside that step.

### prepareCall

Called once before the agent loop starts. Use it to transform model, instructions, or other settings based on runtime context:

```ts
const agent = new WorkflowAgent({
  model: 'anthropic/claude-sonnet-4-6',
  prepareCall: async ({ model, tools, messages }) => {
    return {
      instructions: `Current time: ${new Date().toISOString()}`,
    };
  },
});
```

### prepareStep

Called before each step (LLM call). Use it to modify settings, manage context, or inject messages dynamically:

```ts
const agent = new WorkflowAgent({
  model: 'anthropic/claude-sonnet-4-6',
  prepareStep: async ({ stepNumber, experimental_sandbox }) => {
    if (stepNumber > 5) {
      return { toolChoice: 'none' }; // Force text response after 5 steps
    }
    if (experimental_sandbox) {
      return { temperature: 0.2 };
    }
    return {};
  },
});
```

Both `prepareCall` and `prepareStep` can also be passed per-call in `stream()`.

## Lifecycle Callbacks

Agents provide lifecycle callbacks for logging, observability, and custom telemetry. All callbacks can be defined in the constructor (agent-wide) or in `stream()` (per-call). When both are provided, both fire (constructor first):

```ts
const agent = new WorkflowAgent({
  model: 'anthropic/claude-sonnet-4-6',

  experimental_onStart({ modelId, messages }) {
    console.log('Agent started');
  },

  experimental_onStepStart({ stepNumber }) {
    console.log(`Step ${stepNumber} starting`);
  },

  onToolExecutionStart({ toolCall }) {
    console.log(`Calling tool: ${toolCall.toolName}`);
  },

  onToolExecutionEnd({ toolCall, toolOutput }) {
    console.log(`Tool finished: ${toolCall.toolName}`);
  },

  onStepEnd({ usage, finishReason }) {
    console.log('Step done:', { finishReason });
  },

  onEnd({ steps, totalUsage }) {
    console.log(`Completed in ${steps.length} steps`);
  },
});
```

## Type Inference

Infer the UI message type for type-safe client components:

```ts
import { WorkflowAgent, InferWorkflowAgentUIMessage } from '@ai-sdk/workflow';

const myAgent = new WorkflowAgent({
  // ... configuration
});

export type MyAgentUIMessage = InferWorkflowAgentUIMessage<typeof myAgent>;
```

## Migrating from `DurableAgent`

`WorkflowAgent` replaces the Workflow DevKit's [`DurableAgent`](https://workflow-sdk.dev/docs/api-reference/workflow-ai/durable-agent). The two share the same core idea — a durable agent loop that runs inside a workflow — but `WorkflowAgent` moves the class into the AI SDK, tightens typing, and introduces first-class tool approval. If you are using `DurableAgent` today, follow the steps below to switch.

### Change the import and class name

`DurableAgent` was exported from `workflow/ai`. `WorkflowAgent` is exported from `@ai-sdk/workflow`, alongside its helpers.

```diff
- import { DurableAgent } from 'workflow/ai';
+ import { WorkflowAgent, type ModelCallStreamPart } from '@ai-sdk/workflow';

- const agent = new DurableAgent({
+ const agent = new WorkflowAgent({
    model: 'anthropic/claude-sonnet-4-6',
    instructions: 'You are a helpful assistant.',
    tools: { /* ... */ },
  });
```

Install the new package alongside `workflow`:

```bash
npm install @ai-sdk/workflow
```

### Write `ModelCallStreamPart`, not `UIMessageChunk`

`DurableAgent` wrote `UIMessageChunk` objects directly to the writable returned by `getWritable()`. `WorkflowAgent` writes the lower-level `ModelCallStreamPart` shape and leaves the conversion to a transform at the response boundary. This keeps the durable stream provider-shaped and avoids baking a UI protocol into the workflow payload.

```diff
  // Inside the workflow
  await agent.stream({
    messages,
-   writable: getWritable<UIMessageChunk>(),
+   writable: getWritable<ModelCallStreamPart>(),
  });
```

```diff
  // Inside the route handler
+ import { createModelCallToUIChunkTransform } from '@ai-sdk/workflow';

  return createUIMessageStreamResponse({
-   stream: run.readable,
+   stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
  });
```

### Replace `maxSteps` with `stopWhen`

`DurableAgent` accepted `maxSteps` directly. `WorkflowAgent` uses the AI SDK's shared `stopWhen` conditions so the same stop logic works across `ToolLoopAgent`, `generateText`, and `streamText`.

```diff
+ import { isStepCount } from 'ai';

  await agent.stream({
    messages,
-   maxSteps: 10,
+   stopWhen: isStepCount(10),
  });
```

See [Loop Control](/docs/agents/loop-control) for the full list of stop conditions.

### Replace `experimental_output` with `output`

```diff
+ import { Output } from '@ai-sdk/workflow';

  await agent.stream({
    messages,
-   experimental_output: Output.object({ schema }),
+   output: Output.object({ schema }),
  });
```

The returned value is now on `result.output` (previously `result.experimental_output`).

### WorkflowAgent: Use `needsApproval` for human-in-the-loop tools

With `DurableAgent`, tool approval was implemented by calling a Hook from inside the tool's `execute` function. `WorkflowAgent` makes approval a first-class tool property — the agent emits the approval request, suspends the workflow, and resumes automatically when the user responds.

```diff
  bookFlight: tool({
    description: 'Book a flight',
    inputSchema: z.object({ flightId: z.string() }),
+   needsApproval: true,
-   execute: async (input) => {
-     const approved = await waitForApprovalHook(input);
-     if (!approved) throw new Error('Denied');
-     return bookFlightStep(input);
-   },
+   execute: bookFlightStep,
  }),
```

`needsApproval` also accepts an async function so you can decide per-input
whether approval is required (see [Tool Approval](#tool-approval) above).

### `uiMessages` / `collectUIMessages` is gone

`DurableAgent.stream()` returned accumulated `uiMessages` when `collectUIMessages: true` was set. `WorkflowAgent.stream()` returns `ModelMessage[]` on `result.messages` instead.

For persistence, store `UIMessage[]` as your source of truth and call [`convertToModelMessages`](/docs/reference/ai-sdk-ui/convert-to-model-messages) before passing them to the agent — this is the pattern described in [Chatbot Message Persistence](/docs/ai-sdk-ui/chatbot-message-persistence). There is no built-in `ModelMessage` → `UIMessage` conversion, so avoid persisting `result.messages` as your only copy if you need to render the conversation in the UI later.

```diff
  const result = await agent.stream({
    messages,
    writable: getWritable<ModelCallStreamPart>(),
-   collectUIMessages: true,
  });

- return { uiMessages: result.uiMessages };
+ return { messages: result.messages };
```

### No `generate()` method

`WorkflowAgent` only exposes `stream()`. If you were calling `agent.generate()`, switch to `stream()` and read `result.messages` / `result.output` once the promise resolves.

### Replace `experimental_context` with `runtimeContext` and `toolsContext`

`WorkflowAgent` no longer accepts `experimental_context`. Split the value into shared agent state (`runtimeContext`) and per-tool state (`toolsContext`); each tool's `execute` then receives only its own validated entry as `context`. See [runtimeContext and toolsContext](#runtimecontext-and-toolscontext) for the full shape.

```diff
  const agent = new WorkflowAgent({
    model: 'anthropic/claude-sonnet-4-6',
    tools: { weather: weatherTool },
-   experimental_context: { tenantId: 'tenant_123', apiKey: 'sk-...' },
+   runtimeContext: { tenantId: 'tenant_123' },
+   toolsContext: { weather: { apiKey: 'sk-...' } },
  });
```

### Everything else

Other options carry over with the same names: `prepareStep`, `onStepEnd`, `onEnd`, `onError`, `toolChoice`, `activeTools`, `timeout`, `repairToolCall`, `experimental_sandbox`, and the usual generation settings (`temperature`, `maxOutputTokens`, `topP`, …). `WorkflowAgent` additionally adds `prepareCall` (runs once before the loop) and the `experimental_onStart` / `experimental_onStepStart` / `onToolExecutionStart` / `onToolExecutionEnd` lifecycle callbacks documented above.

## Next Steps

- [WorkflowAgent API Reference](/docs/reference/ai-sdk-workflow/workflow-agent) for detailed parameter documentation
- [WorkflowChatTransport API Reference](/docs/reference/ai-sdk-workflow/workflow-chat-transport) for stream reconnection options
- [Building Agents](/docs/agents/building-agents) for the in-memory `ToolLoopAgent` alternative
- [Loop Control](/docs/agents/loop-control) for advanced stop conditions








# Terminal UI

The `@ai-sdk/tui` package lets you run a local `ToolLoopAgent` or connect to a
remote agent through a `ChatTransport` in an interactive terminal interface.
It is useful for local development, demos, and internal tools where a terminal
experience is enough and you do not want to build a custom UI.

The terminal UI handles prompt input, streamed assistant responses, markdown
rendering, tool cards, reasoning sections, scrolling, and tool approval prompts.

## Installation

Install `@ai-sdk/tui` alongside `ai` and the provider package you use:

<Snippet text={`pnpm add @ai-sdk/tui ai @ai-sdk/openai`} prompt={false} />

## Running an Agent

Create a `ToolLoopAgent` and pass it to `runAgentTUI`:

```ts
import { openai } from '@ai-sdk/openai';
import { runAgentTUI } from '@ai-sdk/tui';
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: openai('gpt-5'),
  instructions:
    'You are a helpful terminal assistant. Answer in markdown and use tools when they help.',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72,
      }),
    }),
  },
});

await runAgentTUI({
  title: 'Weather Agent',
  agent,
});
```

`runAgentTUI` runs until the user exits with `Esc` or `Ctrl+C`.

## Connecting to a Remote Agent

Pass a `ChatTransport` instead of an `agent` to connect the terminal UI to a
remote AI SDK UI message endpoint:

```ts
import { runAgentTUI } from '@ai-sdk/tui';
import { DefaultChatTransport } from 'ai';

await runAgentTUI({
  title: 'Remote Agent',
  transport: new DefaultChatTransport({
    api: 'https://example.com/api/chat',
  }),
});
```

The transport controls the endpoint, authentication, request body, and other
remote communication behavior. The terminal UI keeps its internal chat id and
message history private to the transport contract.

## Sandbox

Pass a sandbox session with the `sandbox` option when your agent tools need an
execution environment:

```ts
import { createJustBashSandbox } from '@ai-sdk/sandbox-just-bash';

const sandboxSession = await createJustBashSandbox({
  cwd: '/home/user',
}).createSession();

await runAgentTUI({
  title: 'Sandbox Agent',
  agent,
  sandbox: sandboxSession.restricted(),
});
```

The terminal UI forwards the sandbox to every agent call as
`experimental_sandbox`. Tool description functions and tool `execute` functions
can read it from their options and delegate command or file operations to it.
Add the sandbox description to your agent instructions if the model should know
details such as the working directory, public hostname, or exposed ports.

## Display Options

You can control how tool calls, reasoning, and response statistics are shown:

```ts
await runAgentTUI({
  title: 'Weather Agent',
  agent,
  tools: 'auto-collapsed',
  reasoning: 'collapsed',
  responseStatistics: 'outputTokensPerSecond',
  contextSize: 200_000,
});
```

Settings:

- `tools`: Controls tool call rendering. Use `"full"` to show tool input and
  output, `"collapsed"` to show only tool cards, `"auto-collapsed"` to show the
  latest tool expanded until another visible section appears, or `"hidden"` to
  omit tool calls. Defaults to `"auto-collapsed"`.
- `reasoning`: Controls reasoning rendering. Use `"full"` to show reasoning,
  `"collapsed"` to show only reasoning cards, `"auto-collapsed"` to show the
  latest reasoning expanded until another visible section appears, or `"hidden"`
  to omit reasoning. Defaults to `"auto-collapsed"`.
- `responseStatistics`: Use `"outputTokensPerSecond"` to show output token
  throughput or `"outputTokenCount"` to show output token count. Defaults to
  `"outputTokensPerSecond"`.
- `contextSize`: When provided, the terminal UI shows total token usage as a
  percentage of the model context window.

## Tool Approvals

`runAgentTUI` supports `ToolLoopAgent` tool approval flows. When an agent emits a
manual approval request, the terminal UI prompts the user to approve or deny the
tool call before the agent continues.

```ts
const agent = new ToolLoopAgent({
  model: openai('gpt-5'),
  tools: { weather },
  toolApproval: {
    weather: ({ location }) =>
      location.toLowerCase().includes('san francisco')
        ? 'approved'
        : 'user-approval',
  },
});

await runAgentTUI({ title: 'Weather Agent', agent });
```

## Compatibility

When using the `agent` option, the agent must be runnable directly from terminal
user input. It must not require per-call options and must not use structured
output, because the terminal UI cannot infer those values from a free-form
prompt. Use a `transport` for remote agents that need custom request handling.

Use `agent.generate()` or `agent.stream()` directly for examples or apps that
need fixed prompts, call options, structured output, custom result inspection, or
custom stream processing.

## Controls

- `Enter`: submit prompt
- `y` / `n`: approve or deny tool calls
- `Up` / `Down`: scroll transcript
- `PageUp` / `PageDown`: scroll transcript by a full page
- `Ctrl+L`: repaint
- `Esc` / `Ctrl+C`: exit

## Next Steps

- [Building Agents](/docs/agents/building-agents) for creating `ToolLoopAgent`
  instances
- [Tool Approvals](/docs/agents/tool-approvals) for configuring human review of
  tool calls
- [runAgentTUI API Reference](/docs/reference/ai-sdk-tui/run-agent-tui) for
  detailed parameter documentation










# Tool Calling

As covered under Foundations, [tools](/docs/foundations/tools) are objects that can be called by the model to perform a specific task.
Function tools and dynamic tools contain several core elements:

- **`description`**: An optional description of the tool that can influence when the tool is picked. It can be a string or a function that derives the description from the tool's context and experimental sandbox.
- **`inputSchema`**: A [Zod schema](/docs/foundations/tools#schemas) or a [JSON schema](/docs/reference/ai-sdk-core/json-schema) that defines the input parameters. The schema is consumed by the LLM, and also used to validate the LLM tool calls.
- **`execute`**: An optional async function that is called with the inputs from the tool call. It produces a value of type `RESULT` (generic type). It is optional because you might want to forward tool calls to the client or to a queue instead of executing them in the same process.
- **`strict`**: _(optional, boolean)_ Enables strict tool calling when supported by the provider

<Note className="mb-2">
  You can use the [`tool`](/docs/reference/ai-sdk-core/tool) helper function to
  infer the types of the `execute` parameters.
</Note>

The `tools` parameter of `generateText` and `streamText` is an object that has the tool names as keys and the tools as values:

```ts highlight="7-18"
import { z } from 'zod';
import { generateText, tool, isStepCount } from 'ai';
__PROVIDER_IMPORT__;

const result = await generateText({
  model: __MODEL__,
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  stopWhen: isStepCount(5),
  prompt: 'What is the weather in San Francisco?',
});
```

<Note>
  When a model uses a tool, it is called a "tool call" and the output of the
  tool is called a "tool result".
</Note>

Tool calling is not restricted to only text generation.
You can also use it to render user interfaces (Generative UI).

## Dynamic Descriptions

Tool descriptions can be fixed strings or functions. Use a function when the
description sent to the model should depend on the current tool context or
experimental sandbox, such as a tenant, project, environment, or workspace.

The description function is resolved before the tool definition is sent to the
model for each generation step. It receives the matching tool `context` from
`toolsContext` and the current `experimental_sandbox`, if one was provided. If `prepareStep`
updates `toolsContext` or `experimental_sandbox`, the next step uses those updated values.

```ts highlight="5-16,32-35"
import { generateText, tool } from 'ai';
import { z } from 'zod';

const shell = tool({
  contextSchema: z.object({
    projectName: z.string(),
  }),
  description: ({ context, experimental_sandbox }) =>
    [
      `Run shell commands for the ${context.projectName} project.`,
      experimental_sandbox != null
        ? `Sandbox: ${experimental_sandbox.description}`
        : undefined,
    ]
      .filter(Boolean)
      .join('\n'),
  inputSchema: z.object({
    command: z.string(),
  }),
  execute: async ({ command }, { experimental_sandbox }) => {
    if (!experimental_sandbox) {
      throw new Error('Experimental sandbox is not available');
    }

    return experimental_sandbox.run({ command });
  },
});

const result = await generateText({
  model: __MODEL__,
  tools: { shell },
  toolsContext: {
    shell: { projectName: 'web-app' },
  },
  experimental_sandbox,
  prompt: 'List the project files.',
});
```

## Strict Mode

When enabled, language model providers that support strict tool calling will only generate tool calls that are valid according to your defined `inputSchema`.
This increases the reliability of tool calling.
However, not all schemas may be supported in strict mode, and what is supported depends on the specific provider.

By default, strict mode is disabled. You can enable it per-tool by setting `strict: true`:

```ts
tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string(),
  }),
  strict: true, // Enable strict validation for this tool
  execute: async ({ location }) => ({
    // ...
  }),
});
```

<Note>
  Not all providers or models support strict mode. For those that do not, this
  option is ignored.
</Note>

## Input Examples

You can specify example inputs for your tools to help guide the model on how input data should be structured.
When supported by providers, input examples can help when JSON schema itself does not fully specify the intended
usage or when there are optional values.

```ts
tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  inputExamples: [
    { input: { location: 'San Francisco' } },
    { input: { location: 'London' } },
  ],
  execute: async ({ location }) => {
    // ...
  },
});
```

<Note>
  Only the Anthropic providers supports tool input examples natively. Other
  providers ignore the setting.
</Note>

## Tool Execution Approval

By default, tools with an `execute` function run automatically as the model calls them. Configure approval with `toolApproval` on `generateText`, `streamText`, or `ToolLoopAgent`.

`toolApproval` can be either:

- A `GenericToolApprovalFunction` for all tool calls
- A per-tool map of statuses and/or `SingleToolApprovalFunction` callbacks (either function may return `undefined` for the same effect as `'not-applicable'`)

The older `needsApproval` property on `tool()` definitions is deprecated. Existing code still works, but new code should move approval logic to `toolApproval`.

### Configure `toolApproval`

```ts highlight="4-6"
const result = await generateText({
  model: __MODEL__,
  tools: { runCommand },
  toolApproval: {
    runCommand: 'user-approval',
  },
  prompt: 'Remove the most recent file in the downloads folder',
});
```

In the per-tool object form, each key can be one of four statuses, either as a
string or as an object with a `type` field:

- `'not-applicable'`: the tool is executed without an approval flow. This is the default behavior.
- `'approved'`: record an automatic approval by emitting approval request/response parts in the output, then execute the tool
- `'denied'`: record an automatic denial by emitting approval request/response parts in the output, then surface a denied tool output
- `'user-approval'`: emit an approval request and wait for an explicit response

For automatic approvals and denials, you can also return an object to include a
reason:

```ts
toolApproval: {
  runCommand: {
    type: 'denied',
    reason: 'blocked by policy',
  },
}
```

#### Generic `toolApproval` function

Pass a `GenericToolApprovalFunction` as `toolApproval` to handle every tool
call in one place. The callback receives `toolCall`, `tools`, `toolsContext`,
`messages`, and `runtimeContext` (the same `runtimeContext` you pass to
`generateText` or `streamText`, typed as the second `ToolApprovalConfiguration`
type parameter; it defaults to `Context`). It may return `undefined` for the same effect as `'not-applicable'`.

```ts highlight="4-10"
const result = await generateText({
  model: __MODEL__,
  tools: { runCommand },
  toolApproval: ({
    toolCall,
    tools,
    toolsContext,
    messages,
    runtimeContext,
  }) => {
    if (toolCall.toolName === 'runCommand' && !toolCall.dynamic) {
      // Inspect toolCall.input, cross-tool state, messages, or runtimeContext for policy.
      return 'user-approval';
    }
    return undefined; // or 'not-applicable'
  },
  prompt: 'Remove the most recent file in the downloads folder',
});
```

The same pattern works for `streamText` and for `toolApproval` on
[`ToolLoopAgent`](/docs/agents/building-agents#tools) when you need one policy
across all tools.

For a per-tool object instead, each key can be a `SingleToolApprovalFunction`
that receives the tool input and options `toolCallId`, `messages`, `toolContext`
(the same shape as tool execution `context`, without `abortSignal`), and
`runtimeContext`. Return `undefined` for the same effect as `'not-applicable'`.

This is useful for tools that perform sensitive operations like executing commands, processing payments, modifying data, and more potentially dangerous actions.

### How It Works

When a tool requires manual approval, `generateText` and `streamText` don't pause execution. Instead, they complete and return `tool-approval-request` parts in the result content. This means the manual approval flow requires two calls to the model: the first returns the approval request, and the second (after receiving the approval response) either executes the tool or informs the model that approval was denied.

Manual approval comes from `toolApproval` returning `'user-approval'`. If the
tool should just execute normally, use `'not-applicable'`, return `undefined`
from a `GenericToolApprovalFunction` or `SingleToolApprovalFunction`, or omit
the setting entirely. If `toolApproval` returns `'approved'` or `'denied'` or
their object forms, the SDK records that decision automatically in the same
generation by emitting approval request/response parts. When you provide a
`reason` on an automatic approval or denial, that reason is included in the
emitted approval response and can be rendered in the UI.

Here's the manual approval flow:

1. Call `generateText` or `streamText` with `toolApproval`
2. The model generates a tool call
3. The call returns `tool-approval-request` parts in `result.content`
4. Your app requests approval and collects the user's decision
5. Add a `tool-approval-response` to the messages array
6. Call `generateText` or `streamText` again with the updated messages
7. If approved, the tool runs and returns a result. If denied, the model sees the denial and responds accordingly.

### Handling Approval Requests

After calling `generateText` or `streamText`, check `result.content` for `tool-approval-request` parts:

```ts
import { type ModelMessage, generateText } from 'ai';

const messages: ModelMessage[] = [
  { role: 'user', content: 'Remove the most recent file' },
];
const result = await generateText({
  model: __MODEL__,
  tools: { runCommand },
  messages,
});

messages.push(...result.responseMessages);

for (const part of result.content) {
  if (part.type === 'tool-approval-request' && !part.isAutomatic) {
    console.log(part.approvalId); // Unique ID for this approval request
    console.log(part.toolCall); // Contains toolName, input, etc.
  }
}
```

To respond, create a `tool-approval-response` and add it to your messages:

```ts
import { type ToolApprovalResponse } from 'ai';

const approvals: ToolApprovalResponse[] = [];

for (const part of result.content) {
  if (part.type === 'tool-approval-request' && !part.isAutomatic) {
    const response: ToolApprovalResponse = {
      type: 'tool-approval-response',
      approvalId: part.approvalId,
      approved: true, // or false to deny
      reason: 'User confirmed the command', // Optional context for the model
    };
    approvals.push(response);
  }
}

// add approvals to messages
messages.push({ role: 'tool', content: approvals });
```

Then call `generateText` or `streamText` again with the updated messages. If approved, the tool executes. If denied, the model receives the denial and can respond accordingly.

When the tool should execute without any approval metadata in the output, use
`'not-applicable'`, return `undefined` from an approval function, or omit `toolApproval`. Use `'approved'`, `'denied'`, or
their object forms only when you want the result to include an automatic
`tool-approval-request` with `isAutomatic: true` followed by a
`tool-approval-response`, so you can inspect or render the decision without
prompting the user again.

<Note>
  When a tool execution is denied, consider adding a system instruction like
  "When a tool execution is not approved, do not retry it" to prevent the model
  from attempting the same call again.
</Note>

<Note>
  Provider-executed tools are executed provider-side without considering the
  tool approval setting. `toolApproval` (and the deprecated `needsApproval`)
  only control tools that the AI SDK executes locally.
</Note>

### Dynamic Approval

You can make approval decisions based on tool input by providing an async
function in a per-tool `toolApproval` object:

```ts
const paymentTool = tool({
  description: 'Process a payment',
  inputSchema: z.object({
    amount: z.number(),
    recipient: z.string(),
  }),
  execute: async ({ amount, recipient }) => {
    return await processPayment(amount, recipient);
  },
});

const result = await generateText({
  model: __MODEL__,
  tools: {
    processPayment: paymentTool,
  },
  toolApproval: {
    processPayment: async ({ amount }) =>
      amount > 1000 ? 'user-approval' : undefined,
  },
  prompt: 'Send $1500 to the contractor',
});
```

In this example, only transactions over $1000 require approval. Smaller
transactions execute automatically.

You can use a `SingleToolApprovalFunction` in a per-tool `toolApproval` object when you want to return
`'not-applicable'`, `undefined` (equivalent to `'not-applicable'`), `'approved'`, `'denied'`, or `'user-approval'` at call time
instead of defining the default on the tool itself. For automatic approvals and
denials, the callback can also return `{ type, reason }`, for example
`{ type: 'denied', reason: 'blocked by policy' }`. For decisions that need the full `toolCall` or
several tools at once, pass a `GenericToolApprovalFunction` as `toolApproval` instead
of a per-tool map. The generic function can return `undefined` the same way.

### Tool Execution Approval with useChat

When using `useChat`, the approval flow is handled through UI state. See [Chatbot Tool Usage](/docs/ai-sdk-ui/chatbot-tool-usage#tool-execution-approval) for details on handling approvals in your UI with `addToolApprovalResponse`.

## Multi-Step Calls (using stopWhen)

With the `stopWhen` setting, you can enable multi-step calls in `generateText` and `streamText`. When `stopWhen` is set and the model generates a tool call, the AI SDK will trigger a new generation passing in the tool result until there are no further tool calls or the stopping condition is met.

The AI SDK provides several built-in stopping conditions:

- `isStepCount(count)` — stops after a specified number of steps (default: `isStepCount(20)`)
- `hasToolCall(...toolNames)` — stops when any of the specified tools is called
- `isLoopFinished()` — never triggers, letting the loop run until naturally finished

You can also combine multiple conditions in an array or create custom conditions. See [Loop Control](/docs/agents/loop-control) for more details.

<Note>
  The `stopWhen` conditions are only evaluated when the last step contains tool
  results.
</Note>

By default, when you use `generateText` or `streamText`, it triggers a single generation. This works well for many use cases where you can rely on the model's training data to generate a response. However, when you provide tools, the model now has the choice to either generate a normal text response, or generate a tool call. If the model generates a tool call, its generation is complete and that step is finished.

You may want the model to generate text after the tool has been executed, either to summarize the tool results in the context of the users query. In many cases, you may also want the model to use multiple tools in a single response. This is where multi-step calls come in.

You can think of multi-step calls in a similar way to a conversation with a human. When you ask a question, if the person does not have the requisite knowledge in their common knowledge (a model's training data), the person may need to look up information (use a tool) before they can provide you with an answer. In the same way, the model may need to call a tool to get the information it needs to answer your question where each generation (tool call or text generation) is a step.

### Example

In the following example, there are two steps:

1. **Step 1**
   1. The prompt `'What is the weather in San Francisco?'` is sent to the model.
   1. The model generates a tool call.
   1. The tool call is executed.
1. **Step 2**
   1. The tool result is sent to the model.
   1. The model generates a response considering the tool result.

```ts highlight="19-20"
import { z } from 'zod';
import { generateText, tool, isStepCount } from 'ai';
__PROVIDER_IMPORT__;

const { text, steps } = await generateText({
  model: __MODEL__,
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  stopWhen: isStepCount(5), // stop after a maximum of 5 steps if tools were called
  prompt: 'What is the weather in San Francisco?',
});
```

<Note>You can use `streamText` in a similar way.</Note>

### Steps

To access intermediate tool calls and results, you can use the `steps` property in the result object
or the `streamText` `onEnd` callback.
It contains all the text, tool calls, tool results, per-step `performance`, and more from each step.

#### Example: Extract tool results from all steps

```ts highlight="4,10-11"
import { generateText } from 'ai';
__PROVIDER_IMPORT__;

const { steps } = await generateText({
  model: __MODEL__,
  stopWhen: isStepCount(10),
  // ...
});

// extract all tool calls from the steps:
const allToolCalls = steps.flatMap(step => step.toolCalls);
```

### `onStepEnd` callback

When using `generateText` or `streamText`, you can provide an `onStepEnd` callback that
is triggered when a step is finished,
i.e. all text deltas, tool calls, and tool results for the step are available.
When you have multiple steps, the callback is triggered for each step.

The callback receives a `stepNumber` (zero-based) to identify which step just completed:

```tsx highlight="5-8"
import { generateText } from 'ai';

const result = await generateText({
  // ...
  onStepEnd({
    stepNumber,
    text,
    toolCalls,
    toolResults,
    finishReason,
    usage,
    performance,
  }) {
    console.log(`Step ${stepNumber} finished (${finishReason})`, {
      usage,
      performance,
    });
    // your own logic, e.g. for saving the chat history or recording usage
  },
});
```

### Tool execution lifecycle callbacks

You can use `onToolExecutionStart` and `onToolExecutionEnd` to observe tool execution.
These callbacks are called right before and after each tool's `execute` function, giving you
visibility into tool execution timing, inputs, outputs, and errors:

```tsx highlight="5-14"
import { generateText } from 'ai';

const result = await generateText({
  // ... model, tools, prompt
  onToolExecutionStart({ toolCall }) {
    console.log(`Calling tool: ${toolCall.toolName}`, {
      toolCallId: toolCall.toolCallId,
      input: toolCall.input,
    });
  },
  onToolExecutionEnd({ toolCall, toolExecutionMs, toolOutput }) {
    if (toolOutput.type === 'tool-error') {
      console.error(
        `Tool ${toolCall.toolName} failed after ${toolExecutionMs}ms:`,
        toolOutput.error,
      );
    } else {
      console.log(
        `Tool ${toolCall.toolName} completed in ${toolExecutionMs}ms`,
        {
          output: toolOutput.output,
        },
      );
    }
  },
});
```

Errors thrown inside these callbacks are silently caught and do not break the generation flow.

### `prepareStep` callback

The `prepareStep` callback is called before a step is started.

It is called with the following parameters:

- `model`: The model that was passed into `generateText`.
- `stopWhen`: The stopping condition that was passed into `generateText`.
- `stepNumber`: The number of the step that is being executed.
- `steps`: The steps that have been executed so far.
- `instructions`: The instructions that will be sent to the model for the current step. If `prepareStep` returns an `instructions` override, those instructions carry forward as the default for later steps.
- `initialInstructions`: The instructions that were passed into `generateText` or `streamText`.
- `messages`: The messages that will be sent to the model for the current step. Treat this as the loop's current message state. If `prepareStep` returns a `messages` override, those messages carry forward as the base for later steps.
- `initialMessages`: The messages that were passed into `generateText` or `streamText`.
- `responseMessages`: The accumulated assistant/tool response messages so far, including any tool results generated before the first model step from approved tool calls in the input messages.
- `runtimeContext`: The runtime context passed via the `runtimeContext` setting.
- `toolsContext`: The per-tool context map passed via the `toolsContext` setting.
- `experimental_sandbox`: The experimental sandbox passed via the `experimental_sandbox` setting.

You can use it to provide different settings for a step, including modifying the input messages.

```tsx highlight="5-7"
import { generateText } from 'ai';

const result = await generateText({
  // ...
  prepareStep: async ({ model, stepNumber, steps, messages }) => {
    if (stepNumber === 0) {
      return {
        // use a different model for this step:
        model: modelForThisParticularStep,
        // force a tool choice for this step:
        toolChoice: { type: 'tool', toolName: 'tool1' },
        // limit the tools that are available for this step:
        activeTools: ['tool1'],
      };
    }

    // when nothing is returned, the default settings are used
  },
});
```

If you return `instructions`, those instructions carry forward to later steps until `prepareStep` returns another `instructions` or `system` override. Use `initialInstructions` when you need to restore or compare against the top-level instructions from the original call.

#### Message Modification for Longer Agentic Loops

In longer agentic loops, you can use the `messages` parameter to mutate the message state that will be used by later steps. This is particularly useful for context compaction, and you decide when compaction should happen.

The `messages` parameter contains the messages for the current step. By default, this is `initialMessages` followed by the accumulated `responseMessages`. If a previous `prepareStep` returned `messages`, later steps use those persisted messages plus the response messages from the previous step.

Use `initialMessages` when you need the original input messages and `responseMessages` when you need the discrete assistant/tool response messages from the model so far.

The `pruneMessages` helper provides a built-in way to remove selected messages or message parts. You can use it inside `prepareStep` when you want a simple compaction strategy.

```tsx
import { generateText, pruneMessages, type ModelMessage } from 'ai';

const COMPACTION_THRESHOLD = 100_000;

const estimateTokens = (messages: ModelMessage[]) => {
  return JSON.stringify(messages).length / 4;
};

const result = await generateText({
  // ...
  prepareStep: ({ messages }) => {
    if (estimateTokens(messages) > COMPACTION_THRESHOLD) {
      return {
        messages: pruneMessages({
          messages,
          reasoning: 'all',
          toolCalls: 'before-last-3-messages',
          emptyMessages: 'remove',
        }),
      };
    }
  },
});
```

This example uses an estimated token threshold, but you can use any trigger. The key behavior is that returning `messages` mutates the message state for later steps.

Returned message changes persist across steps. If you want to derive each step's messages from the original input plus the discrete response messages instead of the persisted message state, rebuild them from `initialMessages` and `responseMessages` each time:

```tsx
prepareStep: ({ initialMessages, responseMessages, stepNumber }) => {
  if (stepNumber > 0) {
    return {
      messages: [...initialMessages, ...responseMessages.slice(-10)],
    };
  }
},
```

#### Provider Options for Step Configuration

You can use `providerOptions` in `prepareStep` to pass provider-specific configuration for each step. This is useful for features like Anthropic's code execution container persistence:

```tsx
import { forwardAnthropicContainerIdFromLastStep } from '@ai-sdk/anthropic';

// Propagate container ID from previous step for code execution continuity
prepareStep: forwardAnthropicContainerIdFromLastStep,
```

## Response Messages

Adding the generated assistant and tool messages to your conversation history is a common task,
especially if you are using multi-step tool calls.

Both `generateText` and `streamText` have a `responseMessages` property that you can use to
add the assistant and tool messages to your conversation history.
It is also available in the `onEnd` callback of `streamText`.

The `responseMessages` property contains the accumulated response messages from the call as an array of `ModelMessage` objects that you can add to your conversation history:

```ts
import { generateText, ModelMessage } from 'ai';

const messages: ModelMessage[] = [
  // ...
];

const { responseMessages } = await generateText({
  // ...
  messages,
});

// add the response messages to your conversation history:
messages.push(...responseMessages); // streamText: ...(await result.responseMessages)
```

## Dynamic Tools

AI SDK Core supports dynamic tools for scenarios where tool schemas are not known at compile time. This is useful for:

- MCP (Model Context Protocol) tools without schemas
- User-defined functions at runtime
- Tools loaded from external sources

### Using dynamicTool

The `dynamicTool` helper creates tools with unknown input/output types:

```ts
import { dynamicTool } from 'ai';
import { z } from 'zod';

const customTool = dynamicTool({
  description: 'Execute a custom function',
  inputSchema: z.object({}),
  execute: async input => {
    // input is typed as 'unknown'
    // You need to validate/cast it at runtime
    const { action, parameters } = input as any;

    // Execute your dynamic logic
    return { result: `Executed ${action}` };
  },
});
```

### Type-Safe Handling

When using both static and dynamic tools, use the `dynamic` flag for type narrowing:

```ts
const result = await generateText({
  model: __MODEL__,
  tools: {
    // Static tool with known types
    weather: weatherTool,
    // Dynamic tool
    custom: dynamicTool({
      /* ... */
    }),
  },
  onStepEnd: ({ toolCalls, toolResults }) => {
    // Type-safe iteration
    for (const toolCall of toolCalls) {
      if (toolCall.dynamic) {
        // Dynamic tool: input is 'unknown'
        console.log('Dynamic:', toolCall.toolName, toolCall.input);
        continue;
      }

      // Static tool: full type inference
      switch (toolCall.toolName) {
        case 'weather':
          console.log(toolCall.input.location); // typed as string
          break;
      }
    }
  },
});
```

## Preliminary Tool Results

You can return an `AsyncIterable` over multiple results.
In this case, the last value from the iterable is the final tool result.

This can be used in combination with generator functions to e.g. stream status information
during the tool execution:

```ts
tool({
  description: 'Get the current weather.',
  inputSchema: z.object({
    location: z.string(),
  }),
  async *execute({ location }) {
    yield {
      status: 'loading' as const,
      text: `Getting weather for ${location}`,
      weather: undefined,
    };

    await new Promise(resolve => setTimeout(resolve, 3000));

    const temperature = 72 + Math.floor(Math.random() * 21) - 10;

    yield {
      status: 'success' as const,
      text: `The weather in ${location} is ${temperature}°F`,
      temperature,
    };
  },
});
```

## Tool Choice

You can use the `toolChoice` setting to influence when a tool is selected.
It supports the following settings:

- `auto` (default): the model can choose whether and which tools to call.
- `required`: the model must call a tool. It can choose which tool to call.
- `none`: the model must not call tools
- `{ type: 'tool', toolName: string (typed) }`: the model must call the specified tool

```ts highlight="19"
import { z } from 'zod';
import { generateText, tool } from 'ai';
__PROVIDER_IMPORT__;

const result = await generateText({
  model: __MODEL__,
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  toolChoice: 'required', // force the model to call a tool
  prompt: 'What is the weather in San Francisco?',
});
```

## Tool Execution Options

When tools are called, they receive additional options as a second parameter.

### Tool Call ID

The ID of the tool call is forwarded to the tool execution.
You can use it e.g. when sending tool-call related information with stream data.

```ts highlight="15-21"
import {
  streamText,
  tool,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        // ...
        messages,
        tools: {
          myTool: tool({
            // ...
            execute: async (args, { toolCallId }) => {
              // return e.g. custom status for tool call
              writer.write({
                type: 'data-tool-status',
                id: toolCallId,
                data: {
                  name: 'myTool',
                  status: 'in-progress',
                },
              });
              // ...
            },
          }),
        },
      });

      writer.merge(toUIMessageStream({ stream: result.stream }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

### Messages

The messages that were sent to the language model to initiate the response that contained the tool call are forwarded to the tool execution.
You can access them in the second parameter of the `execute` function.
In multi-step calls, the messages contain the text, tool calls, and tool results from all previous steps.

```ts highlight="8-9"
import { generateText, tool } from 'ai';

const result = await generateText({
  // ...
  tools: {
    myTool: tool({
      // ...
      execute: async (args, { messages }) => {
        // use the message history in e.g. calls to other language models
        return { ... };
      },
    }),
  },
});
```

### Abort Signals

The abort signals from `generateText` and `streamText` are forwarded to the tool execution.
You can access them in the second parameter of the `execute` function and e.g. abort long-running computations or forward them to fetch calls inside tools.

```ts highlight="7,12,15"
import { z } from 'zod';
import { generateText, tool } from 'ai';
__PROVIDER_IMPORT__;

const result = await generateText({
  model: __MODEL__,
  abortSignal: myAbortSignal, // signal that will be forwarded to tools
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({ location: z.string() }),
      execute: async ({ location }, { abortSignal }) => {
        return fetch(
          `https://api.weatherapi.com/v1/current.json?q=${location}`,
          { signal: abortSignal }, // forward the abort signal to fetch
        );
      },
    }),
  },
  prompt: 'What is the weather in San Francisco?',
});
```

### Experimental Sandbox

Pass `experimental_sandbox` to `generateText`, `streamText`, or a `ToolLoopAgent`
call when a tool needs to run commands or code in an execution environment. The experimental sandbox is available to tool description functions and on the second parameter of the tool's `execute` function.

<Note type="warning">
  This API is experimental and can change in patch releases. Passing an
  experimental sandbox does not sandbox the tool itself.
</Note>

Tool code still runs wherever your application runs. Only the operations that your tool explicitly delegates to
the experimental sandbox, such as `experimental_sandbox.run(...)`,
run in the experimental sandbox environment.

```ts highlight="7-15,21"
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: __MODEL__,
  tools: {
    shell: tool({
      inputSchema: z.object({
        command: z.string(),
        workingDirectory: z.string().optional(),
      }),
      execute: async (
        { command, workingDirectory },
        { abortSignal, experimental_sandbox },
      ) => {
        if (!experimental_sandbox) {
          throw new Error('Experimental sandbox is not available');
        }

        return experimental_sandbox.run({
          command,
          workingDirectory,
          abortSignal,
        });
      },
    }),
  },
  experimental_sandbox,
  prompt: 'List the files in the project.',
});
```

The experimental sandbox description is not added to the model prompt automatically. If the model should know about details such as the root directory, exposed ports, or public hostname, include `experimental_sandbox.description` in your system prompt,
instructions, user-visible context, or a tool description function.

`run` also accepts an optional `workingDirectory`, `env`, and `abortSignal`.
Use `workingDirectory` when a tool needs to run a command from a directory other
than the experimental sandbox implementation's default working directory. Use `env`
to set environment variables for the command. Forward
`abortSignal` from the tool execution options so the experimental sandbox can cancel the command if the overall operation is aborted or times out.

The AI SDK forwards your experimental sandbox object but does not create or isolate one for you.

The `Experimental_SandboxSession` interface is only a contract. Its isolation guarantees depend on your implementation or experimental sandbox provider. A local implementation that uses
`child_process.exec` with a working directory is not a security boundary because
commands can still access paths outside that directory. For untrusted commands
or user-directed coding agents, use a real isolation provider, restrict
available commands, set command timeouts, and combine experimental sandbox usage with [tool approval](#tool-execution-approval) for sensitive actions.

### Runtime Context

You can pass in arbitrary runtime context from `generateText` or `streamText` via the `runtimeContext` setting.
This runtime context is available in `prepareStep`.

To avoid confusion with prompt context or retrieved context, the docs refer to this feature as runtime context.

This is useful for values like tenant information, feature flags, session data, or other server-side state that should influence step preparation without being embedded into the prompt.

Tool execution context is now separate. If a tool needs server-side values such as API keys, pass them via `toolsContext`, keyed by tool name. Each tool then receives only its own typed `context` value based on its `contextSchema`.

For the full mental model, examples, lifecycle details, and guidance on choosing
between prompt context, runtime context, and tool context, see
[Runtime and Tool Context](/docs/ai-sdk-core/runtime-and-tool-context).

### Tool Context Telemetry

Tool context often contains server-side values such as API keys, access tokens, or internal identifiers.
Use `telemetry.includeToolsContext` to include selected top-level context properties in telemetry integrations:

```ts highlight="24-30"
const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string(),
  }),
  contextSchema: z.object({
    weatherApiKey: z.string(),
    defaultUnit: z.enum(['celsius', 'fahrenheit']),
  }),
  execute: async ({ location }, { context }) => {
    return fetchWeather({
      location,
      apiKey: context.weatherApiKey,
      unit: context.defaultUnit,
    });
  },
});

const result = await generateText({
  model: __MODEL__,
  tools: { weather: weatherTool },
  toolsContext: {
    weather: {
      weatherApiKey: process.env.WEATHER_API_KEY,
      defaultUnit: 'fahrenheit',
    },
  },
  prompt: 'What is the weather in San Francisco?',
  telemetry: {
    includeToolsContext: {
      weather: {
        defaultUnit: true,
      },
    },
  },
});
```

Telemetry integrations receive the `weather` tool context as `{ defaultUnit: 'fahrenheit' }`.
Properties set to `false` or omitted are excluded. If `telemetry.includeToolsContext` is omitted, no tool context properties are included.

<Note>
  `telemetry.includeToolsContext` only filters telemetry integrations. Tool
  execution, lifecycle callbacks, and returned results still receive the full
  typed tool context. See [Runtime and Tool
  Context](/docs/ai-sdk-core/runtime-and-tool-context) for how tool context
  flows through execution and telemetry.
</Note>

## Tool Input Lifecycle Hooks

The following tool input lifecycle hooks are available:

- **`onInputStart`**: Called when the model starts generating the input (arguments) for the tool call
- **`onInputDelta`**: Called for each chunk of text as the input is streamed
- **`onInputAvailable`**: Called when the complete input is available and validated

`onInputStart` is always called before `onInputAvailable`, including when using `generateText`. `onInputDelta` is only called in streaming contexts (when using `streamText`).

### Example

```ts highlight="16-24"
import { streamText, tool } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const result = streamText({
  model: __MODEL__,
  tools: {
    getWeather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
      onInputStart: () => {
        console.log('Tool call starting');
      },
      onInputDelta: ({ inputTextDelta }) => {
        console.log('Received input chunk:', inputTextDelta);
      },
      onInputAvailable: ({ input }) => {
        console.log('Complete input:', input);
      },
    }),
  },
  prompt: 'What is the weather in San Francisco?',
});
```

## Types

Modularizing your code often requires defining types to ensure type safety and reusability.
To enable this, the AI SDK provides several helper types for tools, tool calls, and tool results.

You can use them to strongly type your variables, function parameters, and return types
in parts of the code that are not directly related to `streamText` or `generateText`.

Each tool call is typed with `ToolCall<NAME extends string, ARGS>`, depending
on the tool that has been invoked.
Similarly, the tool results are typed with `ToolResult<NAME extends string, ARGS, RESULT>`.

The tools in `streamText` and `generateText` are defined as a `ToolSet`.
The type inference helpers `TypedToolCall<TOOLS extends ToolSet>`
and `TypedToolResult<TOOLS extends ToolSet>` can be used to
extract the tool call and tool result types from the tools.

```ts highlight="18-19,23-24"
import { TypedToolCall, TypedToolResult, generateText, tool } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

const myToolSet = {
  firstTool: tool({
    description: 'Greets the user',
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => `Hello, ${name}!`,
  }),
  secondTool: tool({
    description: 'Tells the user their age',
    inputSchema: z.object({ age: z.number() }),
    execute: async ({ age }) => `You are ${age} years old!`,
  }),
};

type MyToolCall = TypedToolCall<typeof myToolSet>;
type MyToolResult = TypedToolResult<typeof myToolSet>;

async function generateSomething(prompt: string): Promise<{
  text: string;
  toolCalls: Array<MyToolCall>; // typed tool calls
  toolResults: Array<MyToolResult>; // typed tool results
}> {
  return generateText({
    model: __MODEL__,
    tools: myToolSet,
    prompt,
  });
}
```

## Handling Errors

The AI SDK has three tool-call related errors:

- [`NoSuchToolError`](/docs/reference/ai-sdk-errors/ai-no-such-tool-error): the model tries to call a tool that is not defined in the tools object
- [`InvalidToolInputError`](/docs/reference/ai-sdk-errors/ai-invalid-tool-input-error): the model calls a tool with inputs that do not match the tool's input schema
- [`ToolCallRepairError`](/docs/reference/ai-sdk-errors/ai-tool-call-repair-error): an error that occurred during tool call repair

When tool execution fails (errors thrown by your tool's `execute` function), the AI SDK adds them as `tool-error` content parts to enable automated LLM roundtrips in multi-step scenarios.

### `generateText`

`generateText` throws errors for tool schema validation issues and other errors, and can be handled using a `try`/`catch` block. Tool execution errors appear as `tool-error` parts in the result steps:

```ts
try {
  const result = await generateText({
    //...
  });
} catch (error) {
  if (NoSuchToolError.isInstance(error)) {
    // handle the no such tool error
  } else if (InvalidToolInputError.isInstance(error)) {
    // handle the invalid tool inputs error
  } else {
    // handle other errors
  }
}
```

Tool execution errors are available in the result steps:

```ts
const { steps } = await generateText({
  // ...
});

// check for tool errors in the steps
const toolErrors = steps.flatMap(step =>
  step.content.filter(part => part.type === 'tool-error'),
);

toolErrors.forEach(toolError => {
  console.log('Tool error:', toolError.error);
  console.log('Tool name:', toolError.toolName);
  console.log('Tool input:', toolError.input);
});
```

### `streamText`

`streamText` sends errors as part of the `stream` result. Tool execution errors appear as `tool-error` parts, while other errors appear as `error` parts.

When using `toUIMessageStream`, you can pass an `onError` function to extract the error message from the error part and forward it as part of the stream response:

```ts
const result = streamText({
  // ...
});

return createUIMessageStreamResponse({
  stream: toUIMessageStream({
    stream: result.stream,
    onError: error => {
      if (NoSuchToolError.isInstance(error)) {
        return 'The model tried to call a unknown tool.';
      } else if (InvalidToolInputError.isInstance(error)) {
        return 'The model called a tool with invalid inputs.';
      } else {
        return 'An unknown error occurred.';
      }
    },
  }),
});
```

## Tool Call Repair

Language models sometimes fail to generate valid tool calls,
especially when the input schema is complex or the model is smaller.

If you use multiple steps, those failed tool calls will be sent back to the LLM
in the next step to give it an opportunity to fix it.
However, you may want to control how invalid tool calls are repaired without requiring
additional steps that pollute the message history.

You can use the `repairToolCall` function to attempt to repair the tool call
with a custom function.

You can use different strategies to repair the tool call:

- Use a model with structured outputs to generate the inputs.
- Send the messages, instructions, and tool schema to a stronger model to generate the inputs.
- Provide more specific repair instructions based on which tool was called.

### Example: Use a model with structured outputs for repair

```ts
import { openai } from '@ai-sdk/openai';
import { generateText, NoSuchToolError, Output, tool } from 'ai';

const result = await generateText({
  model,
  tools,
  prompt,

  repairToolCall: async ({ toolCall, tools, inputSchema, error }) => {
    if (NoSuchToolError.isInstance(error)) {
      return null; // do not attempt to fix invalid tool names
    }

    const tool = tools[toolCall.toolName as keyof typeof tools];

    const { output: repairedArgs } = await generateText({
      model: __MODEL__,
      output: Output.object({ schema: tool.inputSchema }),
      prompt: [
        `The model tried to call the tool "${toolCall.toolName}"` +
          ` with the following inputs:`,
        JSON.stringify(toolCall.input),
        `The tool accepts the following schema:`,
        JSON.stringify(await inputSchema({ toolName: toolCall.toolName })),
        'Please fix the inputs.',
      ].join('\n'),
    });

    return { ...toolCall, input: JSON.stringify(repairedArgs) };
  },
});
```

### Example: Use the re-ask strategy for repair

```ts
import { openai } from '@ai-sdk/openai';
import { generateText, NoSuchToolError, tool } from 'ai';

const result = await generateText({
  model,
  tools,
  prompt,

  repairToolCall: async ({
    toolCall,
    tools,
    error,
    messages,
    instructions,
  }) => {
    const result = await generateText({
      model,
      instructions,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              input: toolCall.input,
            },
          ],
        },
        {
          role: 'tool' as const,
          content: [
            {
              type: 'tool-result',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              output: error.message,
            },
          ],
        },
      ],
      tools,
    });

    const newToolCall = result.toolCalls.find(
      newToolCall => newToolCall.toolName === toolCall.toolName,
    );

    return newToolCall != null
      ? {
          type: 'tool-call' as const,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: JSON.stringify(newToolCall.input),
        }
      : null;
  },
});
```

## Active Tools

Language models can only handle a limited number of tools at a time, depending on the model.
To allow for static typing using a large number of tools and limiting the available tools to the model at the same time,
the AI SDK provides the `activeTools` property.

It is an array of tool names that are currently active.
By default, the value is `undefined` and all tools are active.

```ts highlight="8"
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
__PROVIDER_IMPORT__;

const { text } = await generateText({
  model: __MODEL__,
  tools: myToolSet,
  activeTools: ['firstTool'],
});
```

## Tool Order

Some providers include tool definitions in the cached portion of a request.
If the order of those definitions changes between otherwise similar requests,
the provider may not be able to reuse the cached prefix as effectively.

Use `toolOrder` when you want a stable provider request shape for caching or
debugging. The list can be partial: tools listed in `toolOrder` are sent first
in that order, and any remaining tools are sent afterwards in alphabetical
order. Tool names are typed from your `tools` object.

```ts highlight="7"
import { generateText } from 'ai';
__PROVIDER_IMPORT__;

const { text } = await generateText({
  model: __MODEL__,
  tools: myToolSet,
  toolOrder: ['search', 'readFile'],
  prompt: 'Summarize the latest project notes.',
});
```

`toolOrder` controls only the order of tool definitions sent to the provider.
It does not force the model to call a tool. Use [`toolChoice`](#tool-choice) to
control tool selection, and use [`activeTools`](#active-tools) when you want to
limit which tools are available. When both `activeTools` and `toolOrder` are
provided, `activeTools` filters the available tools first and `toolOrder`
orders the remaining tools.

## Multi-modal Tool Results

<Note type="warning">
  Multi-modal tool results are experimental and supported by Anthropic, OpenAI,
  and Google (Gemini 3 models).
</Note>

For Google, use base64 inline-data file parts
(`{ type: 'file', mediaType, data: { type: 'data', data } }`) or base64
`data:` URLs in URL-style file parts
(`{ type: 'file', mediaType, data: { type: 'url', url: new URL('data:...') } }`).
Remote HTTP(S) URLs in tool-result URL parts are not supported.

In order to send multi-modal tool results, e.g. screenshots, back to the model,
they need to be converted into a specific format.

AI SDK Core tools have an optional `toModelOutput` function
that converts the tool result into a content part.

Here is an example for converting a screenshot into a content part:

```ts highlight="23-38"
const result = await generateText({
  model: __MODEL__,
  tools: {
    computer: anthropic.tools.computer_20241022({
      // ...
      async execute({ action, coordinate, text }) {
        switch (action) {
          case 'screenshot': {
            return {
              type: 'file',
              mediaType: 'image',
              data: fs
                .readFileSync('./data/screenshot-editor.png')
                .toString('base64'),
            };
          }
          default: {
            return `executed ${action}`;
          }
        }
      },

      // map to tool result content for LLM consumption:
      toModelOutput({ output }) {
        return {
          type: 'content',
          value:
            typeof output === 'string'
              ? [{ type: 'text', text: output }]
              : [
                  {
                    type: 'file',
                    mediaType: 'image/png',
                    data: { type: 'data', data: output.data },
                  },
                ],
        };
      },
    }),
  },
  // ...
});
```

## Extracting Tools

Once you start having many tools, you might want to extract them into separate files.
The `tool` helper function is crucial for this, because it ensures correct type inference.

Here is an example of an extracted tool:

```ts filename="tools/weather-tool.ts" highlight="1,4-5"
import { tool } from 'ai';
import { z } from 'zod';

// the `tool` helper function ensures correct type inference:
export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});
```

## MCP Tools

The AI SDK supports connecting to Model Context Protocol (MCP) servers to access their tools.
MCP enables your AI applications to discover and use tools across various services through a standardized interface.

For detailed information about MCP tools, including initialization, transport options, and usage patterns, see the [MCP Tools documentation](/docs/ai-sdk-core/mcp-tools).

### AI SDK Tools vs MCP Tools

In most cases, you should define your own AI SDK tools for production applications. They provide full control, type safety, and optimal performance. MCP tools are best suited for rapid development iteration and scenarios where users bring their own tools.

| Aspect                 | AI SDK Tools                                              | MCP Tools                                             |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| **Type Safety**        | Full static typing end-to-end                             | Dynamic discovery at runtime                          |
| **Execution**          | Same process as your request (low latency)                | Separate server (network overhead)                    |
| **Prompt Control**     | Full control over descriptions and schemas                | Controlled by MCP server owner                        |
| **Schema Control**     | You define and optimize for your model                    | Controlled by MCP server owner                        |
| **Version Management** | Full visibility over updates                              | Can update independently (version skew risk)          |
| **Authentication**     | Same process, no additional auth required                 | Separate server introduces additional auth complexity |
| **Best For**           | Production applications requiring control and performance | Development iteration, user-provided tools            |

## Examples

You can see tools in action using various frameworks in the following examples:

<ExampleLinks
  examples={[
    {
      title: 'Learn to use tools in Node.js',
      link: '/cookbook/node/call-tools',
    },
    {
      title: 'Learn to use tools in Next.js with Route Handlers',
      link: '/cookbook/next/call-tools',
    },
    {
      title: 'Learn to use MCP tools in Node.js',
      link: '/cookbook/node/mcp-tools',
    },
  ]}
/>












# Next.js App Router Quickstart

The AI SDK is a powerful TypeScript library designed to help developers build AI-powered applications.

In this quickstart tutorial, you'll build a simple agent with a streaming chat user interface. Along the way, you'll learn key concepts and techniques that are fundamental to using the AI SDK in your own projects.

If you are unfamiliar with the concepts of [Prompt Engineering](/docs/advanced/prompt-engineering) and [HTTP Streaming](/docs/foundations/streaming), you can optionally read these documents first.

## Prerequisites

To follow this quickstart, you'll need:

- Node.js 22+ and pnpm installed on your local development machine.
- A [ Vercel AI Gateway ](https://vercel.com/ai-gateway) API key.

If you haven't obtained your Vercel AI Gateway API key, you can do so by [signing up](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai&title=Go+to+AI+Gateway) on the Vercel website.

## Create Your Application

Start by creating a new Next.js application. This command will create a new directory named `my-ai-app` and set up a basic Next.js application inside it.

<div className="mb-4">
  <Note>
    Be sure to select yes when prompted to use the App Router and Tailwind CSS.
    If you are looking for the Next.js Pages Router quickstart guide, you can
    find it [here](/docs/getting-started/nextjs-pages-router).
  </Note>
</div>

<Snippet text="pnpm create next-app@latest my-ai-app" />

Navigate to the newly created directory:

<Snippet text="cd my-ai-app" />

### Install dependencies

Install `ai` and `@ai-sdk/react`, the AI package and AI SDK's React hooks. The AI SDK's [ Vercel AI Gateway provider ](/providers/ai-sdk-providers/ai-gateway) ships with the `ai` package. You'll also install `zod`, a schema validation library used for defining tool inputs.

<Note>
  This guide uses the Vercel AI Gateway provider so you can access hundreds of
  models from different providers with one API key, but you can switch to any
  provider or model by installing its package. Check out available [AI SDK
  providers](/providers/ai-sdk-providers) for more information.
</Note>

<InstallPackages packages="ai @ai-sdk/react zod" />

### Configure your AI Gateway API key

Create a `.env.local` file in your project root and add your AI Gateway API key. This key authenticates your application with Vercel AI Gateway.

<Snippet text="touch .env.local" />

Edit the `.env.local` file:

```env filename=".env.local"
AI_GATEWAY_API_KEY=xxxxxxxxx
```

Replace `xxxxxxxxx` with your actual Vercel AI Gateway API key.

<Note className="mb-4">
  The AI SDK's Vercel AI Gateway Provider will default to using the
  `AI_GATEWAY_API_KEY` environment variable.
</Note>

## Create a Route Handler

Create a route handler, `app/api/chat/route.ts` and add the following code:

```tsx filename="app/api/chat/route.ts"
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';
__PROVIDER_IMPORT__;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: __MODEL__,
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

Let's take a look at what is happening in this code:

1. Define an asynchronous `POST` request handler and extract `messages` from the body of the request. The `messages` variable contains a history of the conversation between you and the chatbot and provides the chatbot with the necessary context to make the next generation. The `messages` are of UIMessage type, which are designed for use in application UI - they contain the entire message history and associated metadata like timestamps.
2. Call [`streamText`](/docs/reference/ai-sdk-core/stream-text), which is imported from the `ai` package. This function accepts a configuration object that contains a `model` provider and `messages` (defined in step 1). You can pass additional [settings](/docs/ai-sdk-core/settings) to further customize the model's behavior. The `messages` key expects a `ModelMessage[]` array. This type is different from `UIMessage` in that it does not include metadata, such as timestamps or sender information. To convert between these types, we use the `convertToModelMessages` function, which strips the UI-specific metadata and transforms the `UIMessage[]` array into the `ModelMessage[]` format that the model expects.
3. The `streamText` function returns a [`StreamTextResult`](/docs/reference/ai-sdk-core/stream-text#result-object). Pass its `stream` to `toUIMessageStream` and return it with `createUIMessageStreamResponse` to create a streamed response object.
4. Finally, return the result to the client to stream the response.

This Route Handler creates a POST request endpoint at `/api/chat`.

## Choosing a Provider

The AI SDK supports dozens of model providers through [first-party](/providers/ai-sdk-providers), [OpenAI-compatible](/providers/openai-compatible-providers), and [ community ](/providers/community-providers) packages.

This quickstart uses the [Vercel AI Gateway](https://vercel.com/ai-gateway) provider, which is the default [global provider](/docs/ai-sdk-core/provider-management#global-provider-configuration). This means you can access models using a simple string in the model configuration:

```ts
model: __MODEL__;
```

You can also explicitly import and use the gateway provider in two other equivalent ways:

```ts
// Option 1: Import from 'ai' package (included by default)
import { gateway } from 'ai';
model: gateway('anthropic/claude-sonnet-4.5');

// Option 2: Install and import from '@ai-sdk/gateway' package
import { gateway } from '@ai-sdk/gateway';
model: gateway('anthropic/claude-sonnet-4.5');
```

### Using other providers

To use a different provider, install its package and create a provider instance. For example, to use OpenAI directly:

<InstallPackages packages="@ai-sdk/openai" />

```ts
import { openai } from '@ai-sdk/openai';

model: openai('gpt-5.1');
```

#### Updating the global provider

You can change the default global provider so string model references use your preferred provider everywhere in your application. Learn more about [provider management](/docs/ai-sdk-core/provider-management#global-provider-configuration).

Pick the approach that best matches how you want to manage providers across your application.

## Wire up the UI

Now that you have a Route Handler that can query an LLM, it's time to setup your frontend. The AI SDK's [ UI ](/docs/ai-sdk-ui) package abstracts the complexity of a chat interface into one hook, [`useChat`](/docs/reference/ai-sdk-ui/use-chat).

Update your root page (`app/page.tsx`) with the following code to show a list of chat messages and provide a user message input:

```tsx filename="app/page.tsx"
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
            }
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
```

<Note>
  Make sure you add the `"use client"` directive to the top of your file. This
  allows you to add interactivity with JavaScript.
</Note>

This page utilizes the `useChat` hook, which will, by default, use the `POST` API route you created earlier (`/api/chat`). The hook provides functions and state for handling user input and form submission. The `useChat` hook provides multiple utility functions and state variables:

- `messages` - the current chat messages (an array of objects with `id`, `role`, and `parts` properties).
- `sendMessage` - a function to send a message to the chat API.

The component uses local state (`useState`) to manage the input field value, and handles form submission by calling `sendMessage` with the input text and then clearing the input field.

The LLM's response is accessed through the message `parts` array. Each message contains an ordered array of `parts` that represents everything the model generated in its response. These parts can include plain text, reasoning tokens, and more that you will see later. The `parts` array preserves the sequence of the model's outputs, allowing you to display or process each component in the order it was generated.

## Running Your Application

With that, you have built everything you need for your chatbot! To start your application, use the command:

<Snippet text="pnpm run dev" />

Head to your browser and open http://localhost:3000. You should see an input field. Test it out by entering a message and see the AI chatbot respond in real-time! The AI SDK makes it fast and easy to build AI chat interfaces with Next.js.

## Enhance Your Chatbot with Tools

While large language models (LLMs) have incredible generation capabilities, they struggle with discrete tasks (e.g. mathematics) and interacting with the outside world (e.g. getting the weather). This is where [tools](/docs/ai-sdk-core/tools-and-tool-calling) come in.

Tools are actions that an LLM can invoke. The results of these actions can be reported back to the LLM to be considered in the next response.

For example, if a user asks about the current weather, without tools, the model would only be able to provide general information based on its training data. But with a weather tool, it can fetch and provide up-to-date, location-specific weather information.

Let's enhance your chatbot by adding a simple weather tool.

### Update Your Route Handler

Modify your `app/api/chat/route.ts` file to include the new weather tool:

```tsx filename="app/api/chat/route.ts" highlight="1-8,18-32"
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: __MODEL__,
    messages: await convertToModelMessages(messages),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

In this updated code:

1. You import the `tool` function from the `ai` package and `z` from `zod` for schema validation.
2. You define a `tools` object with a `weather` tool. This tool:
   - Has a description that helps the model understand when to use it.
   - Defines `inputSchema` using a Zod schema, specifying that it requires a `location` string to execute this tool. The model will attempt to extract this input from the context of the conversation. If it can't, it will ask the user for the missing information.
   - Defines an `execute` function that simulates getting weather data (in this case, it returns a random temperature). This is an asynchronous function running on the server so you can fetch real data from an external API.

Now your chatbot can "fetch" weather information for any location the user asks about. When the model determines it needs to use the weather tool, it will generate a tool call with the necessary input. The `execute` function will then be automatically run, and the tool output will be added to the `messages` as a `tool` message.

Try asking something like "What's the weather in New York?" and see how the model uses the new tool.

Notice the blank response in the UI? This is because instead of generating a text response, the model generated a tool call. You can access the tool call and subsequent tool result on the client via the `tool-weather` part of the `message.parts` array.

<Note>
  Tool parts are always named `tool-{toolName}`, where `{toolName}` is the key
  you used when defining the tool. In this case, since we defined the tool as
  `weather`, the part type is `tool-weather`.
</Note>

### Update the UI

To display the tool invocation in your UI, update your `app/page.tsx` file:

```tsx filename="app/page.tsx" highlight="18-22"
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
              case 'tool-weather':
                return (
                  <pre key={`${message.id}-${i}`}>
                    {JSON.stringify(part, null, 2)}
                  </pre>
                );
            }
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
```

With this change, you're updating the UI to handle different message parts. For text parts, you display the text content as before. For weather tool invocations, you display a JSON representation of the tool call and its result.

Now, when you ask about the weather, you'll see the tool call and its result displayed in your chat interface.

## Enabling Multi-Step Tool Calls

You may have noticed that while the tool is now visible in the chat interface, the model isn't using this information to answer your original query. This is because once the model generates a tool call, it has technically completed its generation.

To solve this, you can enable multi-step tool calls using `stopWhen`. By default, `stopWhen` is set to `isStepCount(1)`, which means generation stops after the first step when there are tool results. By changing this condition, you can allow the model to automatically send tool results back to itself to trigger additional generations until your specified stopping condition is met. In this case, you want the model to continue generating so it can use the weather tool results to answer your original question.

### Update Your Route Handler

Modify your `app/api/chat/route.ts` file to include the `stopWhen` condition:

```tsx filename="app/api/chat/route.ts" highlight="19"
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  isStepCount,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: __MODEL__,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
    onStepEnd: ({ toolResults }) => {
      console.log(toolResults);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

In this updated code:

1. You set `stopWhen` to be when `isStepCount` 5, allowing the model to use up to 5 "steps" for any given generation.
2. You add an `onStepEnd` callback to log any `toolResults` from each step of the interaction, helping you understand the model's tool usage.

Head back to the browser and ask about the weather in a location. You should now see the model using the weather tool results to answer your question.

By setting `stopWhen: isStepCount(5)`, you're allowing the model to use up to 5 "steps" for any given generation. This enables more complex interactions and allows the model to gather and process information over several steps if needed. You can see this in action by adding another tool to convert the temperature from Celsius to Fahrenheit.

### Add another tool

Update your `app/api/chat/route.ts` file to add a new tool to convert the temperature from Fahrenheit to Celsius:

```tsx filename="app/api/chat/route.ts" highlight="34-47"
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  isStepCount,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: __MODEL__,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
      convertFahrenheitToCelsius: tool({
        description: 'Convert a temperature in fahrenheit to celsius',
        inputSchema: z.object({
          temperature: z
            .number()
            .describe('The temperature in fahrenheit to convert'),
        }),
        execute: async ({ temperature }) => {
          const celsius = Math.round((temperature - 32) * (5 / 9));
          return {
            celsius,
          };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

### Update Your Frontend

update your `app/page.tsx` file to render the new temperature conversion tool:

```tsx filename="app/page.tsx" highlight="19"
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
              case 'tool-weather':
              case 'tool-convertFahrenheitToCelsius':
                return (
                  <pre key={`${message.id}-${i}`}>
                    {JSON.stringify(part, null, 2)}
                  </pre>
                );
            }
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
```

This update handles the new `tool-convertFahrenheitToCelsius` part type, displaying the temperature conversion tool calls and results in the UI.

Now, when you ask "What's the weather in New York in celsius?", you should see a more complete interaction:

1. The model will call the weather tool for New York.
2. You'll see the tool output displayed.
3. It will then call the temperature conversion tool to convert the temperature from Fahrenheit to Celsius.
4. The model will then use that information to provide a natural language response about the weather in New York.

This multi-step approach allows the model to gather information and use it to provide more accurate and contextual responses, making your chatbot considerably more useful.

This simple example demonstrates how tools can expand your model's capabilities. You can create more complex tools to integrate with real APIs, databases, or any other external systems, allowing the model to access and process real-world data in real-time. Tools bridge the gap between the model's knowledge cutoff and current information.

## Where to Next?

You've built an AI chatbot using the AI SDK! From here, you have several paths to explore:

- To learn more about the AI SDK, read through the [documentation](/docs).
- If you're interested in diving deeper with guides, check out the [RAG (retrieval-augmented generation)](/cookbook/guides/rag-chatbot) and [multi-modal chatbot](/cookbook/guides/multi-modal-chatbot) guides.
- To jumpstart your first AI project, explore available [templates](https://vercel.com/templates?type=ai).









# Tools

While [large language models (LLMs)](/docs/foundations/overview#large-language-models) have incredible generation capabilities,
they struggle with discrete tasks (e.g. mathematics) and interacting with the outside world (e.g. getting the weather).

Tools are actions that an LLM can invoke.
The results of these actions can be reported back to the LLM to be considered in the next response.

For example, when you ask an LLM for the "weather in London", and there is a weather tool available, it could call a tool
with London as the argument. The tool would then fetch the weather data and return it to the LLM. The LLM can then use this
information in its response.

## What is a tool?

A tool is an object that can be called by the model to perform a specific task.
You can use tools with [`generateText`](/docs/reference/ai-sdk-core/generate-text)
and [`streamText`](/docs/reference/ai-sdk-core/stream-text) by passing one or more tools to the `tools` parameter.

A tool consists of three properties:

- **`description`**: An optional description of the tool that can influence when the tool is picked. Function and dynamic tools can use either a string or a function that derives the description from the tool's context and experimental sandbox.
- **`inputSchema`**: A [Zod schema](/docs/reference/ai-sdk-core/zod-schema) or a [JSON schema](/docs/reference/ai-sdk-core/json-schema) that defines the input required for the tool to run. The schema is consumed by the LLM, and also used to validate the LLM tool calls.
- **`execute`**: An optional async function that is called with the arguments from the tool call.

<Note>
  `streamUI` uses UI generator tools with a `generate` function that can return
  React components.
</Note>

If the LLM decides to use a tool, it will generate a tool call.
Tools with an `execute` function are run automatically when these calls are generated.
The output of the tool calls are returned using tool result objects.

You can automatically pass tool results back to the LLM
using [multi-step calls](/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls-using-stopwhen) with `streamText` and `generateText`.

## Types of Tools

The AI SDK supports four types of tools, each with different trade-offs:

### Function Tools

Function tools are tools you define entirely yourself, including the description, input schema, and optional execute function. They are provider-agnostic and give you full control.

```ts
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => {
    // Your implementation
    return { temperature: 72, conditions: 'sunny' };
  },
});
```

**When to use**: When you need full control, want provider portability, or are implementing application-specific functionality.

### Dynamic Tools

Dynamic tools are function-style tools where the input and output types are not known at development time. They are useful for tools loaded from external sources, such as MCP servers, user-defined functions, or databases.

```ts
import { dynamicTool } from 'ai';
import { z } from 'zod';

const runtimeTool = dynamicTool({
  description: 'Execute a tool loaded at runtime',
  inputSchema: z.object({}),
  execute: async input => {
    // input is typed as unknown
    return runRuntimeTool(input);
  },
});
```

**When to use**: When tools are discovered or generated at runtime and their exact TypeScript input/output types are not known when you write the code.

### Provider-Defined Tools

Provider-defined tools are tools where the provider specifies the tool's `inputSchema` and `description`, but you provide the `execute` function. These are sometimes called "client tools" because execution happens on your side.

Examples include Anthropic's `bash` and `text_editor` tools. The model has been specifically trained to use these tools effectively, which can result in better performance for supported tasks.

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

const result = await generateText({
  model: anthropic('claude-opus-4-5'),
  tools: {
    bash: anthropic.tools.bash_20250124({
      execute: async ({ command }) => {
        // Your implementation to run the command
        return runCommand(command);
      },
    }),
  },
  prompt: 'List files in the current directory',
});
```

**When to use**: When the provider offers a tool the model is trained to use well, and you want better performance for that specific task.

### Provider-Executed Tools

Provider-executed tools are tools that run entirely on the provider's servers. You configure them, but the provider handles execution. These are sometimes called "server-side tools".

Examples include OpenAI's web search and Anthropic's code execution. These provide out-of-the-box functionality without requiring you to set up infrastructure.

```ts
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-5.2'),
  tools: {
    web_search: openai.tools.webSearch(),
  },
  prompt: 'What happened in the news today?',
});
```

**When to use**: When you want powerful functionality (like web search or sandboxed code execution) without managing the infrastructure yourself.

### Comparison

| Aspect             | Function Tools           | Dynamic Tools                 | Provider-Defined Tools | Provider-Executed Tools |
| ------------------ | ------------------------ | ----------------------------- | ---------------------- | ----------------------- |
| **Execution**      | Your code                | Your code                     | Your code              | Provider's servers      |
| **Schema**         | You define               | Runtime-defined               | Provider defines       | Provider defines        |
| **Portability**    | Works with any provider  | Works with any provider       | Provider-specific      | Provider-specific       |
| **Model Training** | General tool use         | General tool use              | Optimized for the tool | Optimized for the tool  |
| **Setup**          | You implement everything | You load or generate the tool | You implement execute  | Configuration only      |

<Note>
  Provider-defined and provider-executed tools are documented in each provider's
  page. See [Anthropic Provider](/providers/ai-sdk-providers/anthropic) and
  [OpenAI Provider](/providers/ai-sdk-providers/openai) for examples.
</Note>

## Schemas

Schemas are used to define and validate the [tool input](/docs/ai-sdk-core/tools-and-tool-calling), tools outputs, and structured output generation.

The AI SDK supports the following schemas:

- [Zod](https://zod.dev/) v3 and v4 directly or via [`zodSchema()`](/docs/reference/ai-sdk-core/zod-schema)
- [Valibot](https://valibot.dev/) via [`valibotSchema()`](/docs/reference/ai-sdk-core/valibot-schema) from `@ai-sdk/valibot`
- [Standard JSON Schema](https://standardschema.dev/json-schema) compatible schemas
- Raw JSON schemas via [`jsonSchema()`](/docs/reference/ai-sdk-core/json-schema)

<Note>
  You can also use schemas for structured output generation with
  [`generateText`](/docs/reference/ai-sdk-core/generate-text) and
  [`streamText`](/docs/reference/ai-sdk-core/stream-text) using the `output`
  setting.
</Note>

## Refining Tool Inputs

Different LLM providers can generate slightly different tool inputs for the same
tool input type. For example, one provider might produce `null` for an optional
field while another produces an empty string.

When you do not own the tool, such as with tools from a third-party package, you
may not be able to change the tool's `inputSchema` to accept both shapes. In
these cases, you can use the experimental `experimental_refineToolInput` option
to normalize a parsed tool input before it is executed and before it appears in
outputs, lifecycle callbacks, and telemetry.

```ts
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: 'openai/gpt-5-mini',
  tools: {
    search: tool({
      inputSchema: z.object({
        query: z.string(),
        category: z.string().nullable(),
      }),
      execute: async ({ query, category }) => {
        return search({ query, category });
      },
    }),
  },
  experimental_refineToolInput: {
    search: input => ({
      ...input,
      category: input.category === '' ? null : input.category,
    }),
  },
  prompt: 'Search for ski jackets with no category.',
});
```

Refinement functions are typed per tool. Each function receives the typed input
for its tool and must return an input with the same type shape.

## Tool Packages

Given tools are JavaScript objects, they can be packaged and distributed through npm like any other library. This makes it easy to share reusable tools across projects and with the community.

### Using Ready-Made Tool Packages

Install a tool package and import the tools you need:

```bash
pnpm add some-tool-package
```

Then pass them directly to `generateText`, `streamText`, or your agent definition:

```ts highlight="2, 8"
import { generateText, isStepCount } from 'ai';
import { searchTool } from 'some-tool-package';

const { text } = await generateText({
  model: 'anthropic/claude-haiku-4.5',
  prompt: 'When was Vercel Ship AI?',
  tools: {
    webSearch: searchTool,
  },
  stopWhen: isStepCount(10),
});
```

### Publishing Your Own Tools

You can publish your own tool packages to npm for others to use. Simply export your tool objects from your package:

```ts filename="my-tools/index.ts"
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'A helpful tool',
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // your tool logic
    return result;
  },
});
```

Anyone can then install and use your tools by importing them.

To get started, you can use the [AI SDK Tool Package Template](https://github.com/vercel-labs/ai-sdk-tool-as-package-template) which provides a ready-to-use starting point for publishing your own tools.

## Toolsets

When you work with tools, you typically need a mix of application-specific tools and general-purpose tools. The community has created various toolsets and resources to help you build and use tools.

### Ready-to-Use Tool Packages

These packages provide pre-built tools you can install and use immediately:

- **[@exalabs/ai-sdk](https://www.npmjs.com/package/@exalabs/ai-sdk)** - Web search tool that lets AI search the web and get real-time information.
- **[@parallel-web/ai-sdk-tools](https://www.npmjs.com/package/@parallel-web/ai-sdk-tools)** - Web search and extract tools powered by Parallel Web API for real-time information and content extraction.
- **[@perplexity-ai/ai-sdk](https://www.npmjs.com/package/@perplexity-ai/ai-sdk)** - Search the web with real-time results and advanced filtering powered by Perplexity's Search API.
- **[@tavily/ai-sdk](https://www.npmjs.com/package/@tavily/ai-sdk)** - Search, extract, crawl, and map tools for enterprise-grade agents to explore the web in real-time.
- **[Stripe agent tools](https://docs.stripe.com/agents?framework=vercel)** - Tools for interacting with Stripe.
- **[StackOne ToolSet](https://docs.stackone.com/agents/typescript/frameworks/vercel-ai-sdk)** - Agentic integrations for hundreds of [enterprise SaaS](https://www.stackone.com/integrations) platforms.
- **[agentic](https://docs.agentic.so/marketplace/ts-sdks/ai-sdk)** - A collection of 20+ tools that connect to external APIs such as [Exa](https://exa.ai/) or [E2B](https://e2b.dev/).
- **[Amazon Bedrock AgentCore](https://github.com/aws/bedrock-agentcore-sdk-typescript)** - Fully managed AI agent services including [**Browser**](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/built-in-tools.html) (a fast and secure cloud-based browser runtime to enable agents to interact with web applications, fill forms, navigate websites, and extract information) and [**Code Interpreter**](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/built-in-tools.html) (an isolated sandbox environment for agents to execute code in Python, JavaScript, and TypeScript, enhancing accuracy and expanding ability to solve complex end-to-end tasks).
- **[@airweave/vercel-ai-sdk](https://www.npmjs.com/package/@airweave/vercel-ai-sdk)** - Unified semantic search across 35+ data sources (Notion, Slack, Google Drive, databases, and more) for AI agents.
- **[Composio](https://docs.composio.dev/providers/vercel)** - 250+ tools like GitHub, Gmail, Salesforce and [more](https://composio.dev/tools).
- **[JigsawStack](http://www.jigsawstack.com/docs/integration/vercel)** - Over 30+ small custom fine-tuned models available for specific uses.
- **[AI Tools Registry](https://ai-tools-registry.vercel.app)** - A Shadcn-compatible tool definitions and components registry for the AI SDK.
- **[Toolhouse](https://docs.toolhouse.ai/toolhouse/toolhouse-sdk/using-vercel-ai)** - AI function-calling in 3 lines of code for over 25 different actions.
- **[bash-tool](https://www.npmjs.com/package/bash-tool)** - Provides `bash`, `readFile`, and `writeFile` tools for AI agents. Supports [@vercel/sandbox](https://vercel.com/docs/vercel-sandbox) for full VM isolation.

### MCP Tools

These are pre-built tools available as MCP servers:

- **[Smithery](https://smithery.ai/docs/integrations/vercel_ai_sdk)** - An open marketplace of 6,000+ MCPs, including [Browserbase](https://browserbase.com/) and [Exa](https://exa.ai/).
- **[Pipedream](https://pipedream.com/docs/connect/mcp/ai-frameworks/vercel-ai-sdk)** - Developer toolkit that lets you easily add 3,000+ integrations to your app or AI agent.
- **[Apify](https://docs.apify.com/platform/integrations/vercel-ai-sdk)** - Apify provides a [marketplace](https://apify.com/store) of thousands of tools for web scraping, data extraction, and browser automation.

### Tool Building Tutorials

These tutorials and guides help you build your own tools that integrate with specific services:

- **[browserbase](https://docs.browserbase.com/integrations/vercel/introduction#vercel-ai-integration)** - Tutorial for building browser tools that run a headless browser.
- **[browserless](https://docs.browserless.io/ai-integrations/vercel-ai-sdk)** - Guide for integrating browser automation (self-hosted or cloud-based).
- **[AI Tool Maker](https://github.com/nihaocami/ai-tool-maker)** - A CLI utility to generate AI SDK tools from OpenAPI specs.
- **[Interlify](https://www.interlify.com/docs/integrate-with-vercel-ai)** - Guide for converting APIs into tools.
- **[DeepAgent](https://deepagent.amardeep.space/docs/vercel-ai-sdk)** - A suite of 50+ AI tools and integrations, seamlessly connecting with APIs like Tavily, E2B, Airtable and [more](https://deepagent.amardeep.space/docs).

<Note>
  Do you have open source tools or tool libraries that are compatible with the
  AI SDK? Please [file a pull request](https://github.com/vercel/ai/pulls) to
  add them to this list.
</Note>

## Learn more

The AI SDK Core [Tool Calling](/docs/ai-sdk-core/tools-and-tool-calling)
and [Agents](/docs/agents) documentation has more information about tools and tool calling.
