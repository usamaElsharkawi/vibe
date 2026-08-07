/**
 * Model Router Usage Examples
 * 
 * This file demonstrates how to use the Model Router in different scenarios.
 * Copy these examples into your actual implementation files.
 */

import { generateText, streamText } from "ai";
import { ModelRouter } from "@/ai";

// ============================================================
// Example 1: Basic Usage - Get a model and generate text
// ============================================================

async function basicUsage() {
  const router = new ModelRouter();
  const model = await router.getModel();

  const { text } = await generateText({
    model,
    prompt: "Explain quantum computing in simple terms",
  });

  console.log(text);
}

// ============================================================
// Example 2: Environment-Specific Routing
// ============================================================

async function environmentSpecificUsage() {
  const router = new ModelRouter();

  // Force development environment (uses free models)
  const devModel = await router.getModel({
    environment: "development",
  });

  // Force production environment (uses reliable models)
  const prodModel = await router.getModel({
    environment: "production",
  });

  // Use appropriate model
  const { text } = await generateText({
    model: process.env.NODE_ENV === "production" ? prodModel : devModel,
    prompt: "Generate a React component",
  });
}

// ============================================================
// Example 3: Streaming with Router
// ============================================================

async function streamingUsage() {
  const router = new ModelRouter();
  const model = await router.getModel();

  const result = streamText({
    model,
    prompt: "Write a short story about a time traveler",
  });

  // Stream the response
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
}

// ============================================================
// Example 4: Getting Routing Details
// ============================================================

async function getRoutingDetails() {
  const router = new ModelRouter();

  // Get full routing result
  const result = await router.getRoutingResult();

  console.log("Selected Provider:", result.provider); // e.g., "google"
  console.log("Model ID:", result.modelId); // e.g., "gemini-3.5-flash"
  console.log("Model Object:", typeof result.model); // "object"

  // Use the model
  const { text } = await generateText({
    model: result.model,
    prompt: "Hello, which model are you?",
  });

  console.log("Response:", text);
}

// ============================================================
// Example 5: Error Handling
// ============================================================

async function withErrorHandling() {
  const router = new ModelRouter();

  try {
    const model = await router.getModel();

    const { text } = await generateText({
      model,
      prompt: "Generate code",
    });

    return text;
  } catch (error) {
    if (error instanceof Error) {
      // Router throws if no providers are configured
      if (error.message.includes("failed to select a model")) {
        console.error("No AI providers configured. Please set API keys in .env");
        throw new Error("AI service unavailable - missing configuration");
      }

      // Other errors (rate limits, network issues, etc.)
      console.error("AI generation failed:", error.message);
      throw error;
    }

    throw error;
  }
}

// ============================================================
// Example 6: Integration with Inngest Agent
// ============================================================

async function inngestAgentIntegration() {
  // In your Inngest function
  const router = new ModelRouter();
  const model = await router.getModel({
    // Use production for actual user requests
    environment: "production",
  });

  // Use with agent
  const { text } = await generateText({
    model,
    system: "You are a helpful coding assistant",
    prompt: "Create a Next.js API route",
  });

  return { generatedCode: text };
}

// ============================================================
// Example 7: Multiple Requests with Same Router
// ============================================================

async function multipleRequests() {
  const router = new ModelRouter();

  // Router can be reused - it will use the same routing policy
  const model = await router.getModel();

  // First request
  const result1 = await generateText({
    model,
    prompt: "What is React?",
  });

  // Second request - same model, same provider
  const result2 = await generateText({
    model,
    prompt: "What is Next.js?",
  });

  // Both use the same selected model
  return [result1.text, result2.text];
}

// ============================================================
// Example 8: Conditional Model Selection
// ============================================================

async function conditionalModelSelection(isUserRequest: boolean) {
  const router = new ModelRouter();

  // Production models for user-facing requests
  // Development models for internal operations
  const model = await router.getModel({
    environment: isUserRequest ? "production" : "development",
  });

  return model;
}

// ============================================================
// Example 9: With Tool Calling / Function Calling
// ============================================================

async function withToolCalling() {
  const router = new ModelRouter();
  const model = await router.getModel();

  const { text, toolCalls } = await generateText({
    model,
    prompt: "What's the weather in San Francisco?",
    tools: {
      getWeather: {
        description: "Get the weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string" },
          },
          required: ["location"],
        },
        execute: async ({ location }) => {
          // Your weather API logic
          return { temperature: 72, condition: "sunny" };
        },
      },
    },
  });

  return { text, toolCalls };
}

// ============================================================
// Example 10: Testing/Development Helper
// ============================================================

async function developmentHelper() {
  const router = new ModelRouter();

  // In development, this logs which provider/model was selected
  const result = await router.getRoutingResult();

  console.log("=== Model Router Debug Info ===");
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Selected Provider:", result.provider);
  console.log("Selected Model:", result.modelId);
  console.log("==============================");

  return result.model;
}

// ============================================================
// Export examples (optional - for documentation purposes)
// ============================================================

export const examples = {
  basicUsage,
  environmentSpecificUsage,
  streamingUsage,
  getRoutingDetails,
  withErrorHandling,
  inngestAgentIntegration,
  multipleRequests,
  conditionalModelSelection,
  withToolCalling,
  developmentHelper,
};

// ============================================================
// Quick Start Template
// ============================================================

/**
 * Copy this template to start using the router:
 */
/*
import { generateText } from "ai";
import { ModelRouter } from "@/ai";

export async function generateAIResponse(prompt: string) {
  const router = new ModelRouter();
  const model = await router.getModel();
  
  const { text } = await generateText({
    model,
    prompt,
  });
  
  return text;
}
*/
