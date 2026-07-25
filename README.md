# Vibe – AI-Powered Full-Stack App Builder

Vibe is a full-stack AI application that enables users to generate complete web applications from a single natural language prompt.

> **📚 Documentation**: This README documents concepts and understanding. More sections will be added as we learn.

---

## 📖 Documentation

<details>
<summary><strong>🎯 What We're Building</strong></summary>

### The Big Picture
Vibe is a SaaS platform (like Lovable, Bolt, Replit AI) where users type a natural language prompt and get back a **complete, running web application**. An AI coding agent autonomously creates files, installs dependencies, and runs the app inside a secure cloud sandbox.

### The Workflow (7 Steps)
1. User submits a prompt
2. A background job is created (Inngest)
3. An AI coding agent processes it (Inngest AI Agents)
4. The agent generates/edits a full Next.js app
5. The project runs inside an isolated E2B cloud sandbox
6. A live preview URL is returned to the user
7. Project + metadata are stored in PostgreSQL (via Prisma)

### Tech Stack
| Layer | Tech |
|--------|------|
| **Frontend** | Next.js 15, React 19, Tailwind v4, ShadCN UI, TanStack Query |
| **Backend** | tRPC (type-safe API), Prisma ORM, PostgreSQL on Neon |
| **Auth & Billing** | Clerk (auth + subscription billing) |
| **AI** | OpenAI/Anthropic/Grok + Inngest AI Agents + Inngest background jobs |
| **Sandbox** | E2B Cloud Sandboxes (Docker-based isolation) |
| **Dev Workflow** | Git, GitHub PRs, CodeRabbit AI code reviews |

</details>

<details>
<summary><strong>🔑 Core Concepts</strong></summary>

## Inngest
**Inngest** is a **workflow orchestration platform** — a "serverless workflow engine" that lets you write reliable, event-driven background jobs and multi-step processes in plain TypeScript/JavaScript.

### Key Concepts
- **Functions**: Write them like normal async functions, Inngest manages retries, timeouts, and state
- **Events**: Jobs triggered by events (e.g., `app/generation_requested`)
- **Steps**: Multi-step jobs (e.g., "create project" → "install deps" → "run dev server")
- **AI Agents**: Built-in support for AI agents with tool execution

## E2B Sandbox
**E2B** is a cloud platform that provides **secure, ephemeral Linux sandboxes** for running code — temporary, isolated Docker containers you can spin up, execute code in, and tear down programmatically.

### Key Concepts
- **Sandbox**: Isolated Linux environment (like a mini VM)
- **Filesystem API**: Create, read, edit files programmatically
- **Terminal API**: Run shell commands (`npm install`, `npm run dev`)
- **Port forwarding**: Expose ports and get public URLs
- **Ephemeral**: Auto-expire after timeout (cost control)

## Full-Stack Type Safety
Types flow from the database all the way to the frontend — no guessing what shape your data has at any layer.

### How tRPC + Prisma Solve This
- **Prisma** generates TypeScript types from database schema
- **tRPC** generates TypeScript types from API endpoints
- Frontend imports these types directly — no manual type definitions

### Benefits
- **No runtime errors** from mismatched data shapes
- **No Swagger/OpenAPI docs** needed — types are self-documenting
- **Safe refactoring** — if you change a field name on backend, frontend breaks at compile time

</details>

<details>
<summary><strong>⚙️ Background Jobs in AI Applications</strong></summary>

## What Are Background Jobs?
Background jobs are tasks that run **independently of the main application flow** — they execute in the background while your main application continues serving users.

## Why AI Apps Can't Survive Without Them

### The Timeout Problem
```
Browser timeout: 30-60 seconds
AI operations: 30 seconds to 10+ minutes
```

**Without background jobs:**
- User submits prompt → request blocks → browser times out → user sees error
- Server continues working but nobody's listening
- All progress lost when user retries

**With background jobs:**
- User submits prompt → immediate response "Processing..." → background job runs → result delivered when ready

### AI Operations Are Slow and Unpredictable
```
Text generation: 5-30 seconds
Image generation: 10-60 seconds
Code generation: 30-120 seconds
Video generation: 2-10 minutes
```

Same prompt can take different times due to:
- API rate limiting
- Network latency
- Model load
- Queue depth

## The Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   User      │    │   Web App    │    │   Job Queue  │    │   Worker     │
│             │    │              │    │              │    │              │
│ Submits    │───>│ Receives     │───>│ Stores job   │───>│ Picks up     │
│ prompt     │    │ request      │    │ in queue     │    │ job          │
│             │    │              │    │              │    │              │
│             │    │ Returns      │    │              │    │ Runs AI      │
│             │<───│ "Processing" │    │              │    │ generation   │
│             │    │ instantly    │    │              │    │ (2+ minutes) │
│             │    │              │    │              │    │              │
│             │    │              │    │              │    │ Saves result │
│             │    │              │    │              │    │ to database  │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## Key Benefits for AI Applications

### 1. **No Timeouts**
- Request returns immediately
- Job continues in background
- User gets notification when complete

### 2. **Progress Tracking**
```javascript
{
  "jobId": "job_abc123",
  "status": "processing",
  "currentStep": 3,
  "totalSteps": 5,
  "message": "Generating React components..."
}
```

### 3. **Retry Logic**
- If AI API rate limits → auto-retry
- If network fails → retry with backoff
- If step fails → retry that specific step

### 4. **Persistence**
- Job survives server restarts
- Progress saved to database
- Can resume from last successful step

### 5. **Cost Management**
- Track cost per job
- Budget limits per user
- Queue prioritization

## The Vibe Example

### Without Background Jobs
```
User: "Create a todo app with authentication"
    ↓
Server starts (takes ~4.5 minutes):
  1. Create project (10s)
  2. Install deps (30s)
  3. AI generate code (75s)
  4. Start server (5s)
  5. Wait for ready (10s)
    ↓
Browser timeout at 60s ❌
User sees error
Server finishes but nobody listening
```

### With Background Jobs
```
User: "Create a todo app with authentication"
    ↓
Server immediately returns:
{
  "jobId": "job_xyz789",
  "status": "queued"
}
    ↓
User sees progress page:
  ⬜ Create project
  ⬜ Install dependencies
  ⬜ Generate authentication code
  ⬜ Generate todo components
  ⬜ Start server
    ↓
Background worker processes each step
    ↓
When complete:
{
  "status": "completed",
  "previewUrl": "https://preview.vibe.dev/job_xyz789"
}
```

## Why It's Critical for AI Apps

AI operations have **inherent characteristics** that make background jobs essential:

| Characteristic | Challenge | Background Job Solution |
|----------------|-----------|------------------------|
| **Slow** | Takes seconds/minutes | Decouple from request |
| **Unpredictable** | Variable duration | Retry and timeout handling |
| **Expensive** | API costs add up | Cost tracking and limits |
| **Multi-step** | Pipeline of operations | Step-by-step execution |
| **Stateful** | Need to track progress | Persistent job state |

## The Bottom Line

Background jobs transform AI applications from "impossible" to "usable":

- **Without**: Requests timeout, users frustrated, no progress tracking
- **With**: Instant feedback, reliable execution, progress visibility, retry logic

This is why every serious AI platform (ChatGPT, Midjourney, GitHub Copilot) uses background jobs — it's not optional, it's **fundamental architecture**.

</details>

<details>
<summary><strong>🛠️ Inngest Implementation</strong></summary>

## What We Built

### 1. Inngest Client (`src/inngest/client.ts`)
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "vibe-development" });
```

### 2. Inngest Function (`src/inngest/functions.ts`)
```typescript
import { inngest } from "./client";

export const processTask = inngest.createFunction(
  { id: "process-task", triggers: { event: "app/task.created" } },
  async ({ event, step }) => {
    const result = await step.run("handle-task", async () => {
      return { processed: true, id: event.data.id };
    });

    await step.sleep("pause", "10s");

    return { message: `Task ${event.data.id} complete`, result };
  },
);
```

### 3. API Route (`src/app/api/inngest/route.ts`)
```typescript
import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { processTask } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processTask],
});
```

## Connecting to tRPC

### Router (`src/trpc/routers/_app.ts`)
```typescript
generateApp: baseProcedure
  .input(z.object({ prompt: z.string() }))
  .mutation(async ({ input }) => {
    await inngest.send({
      name: "app/task.created",
      data: {
        prompt: input.prompt,  // ✅ Must be an object
      },
    });

    return {
      success: true,
      message: "Job queued successfully",
    };
  }),
```

### Frontend Usage (`src/app/page.tsx`)
```typescript
const invoke = useMutation(trpc.generateApp.mutationOptions());

// Trigger the job
invoke.mutate({ prompt: "Create a todo app" });
```

## Common Pitfalls & Fixes

### 1. Inngest Event Data Format
```typescript
// ❌ WRONG: Sending a string
inngest.send({
  name: "app/task.created",
  data: input.prompt  // String, not object
});

// ✅ CORRECT: Sending an object
inngest.send({
  name: "app/task.created",
  data: {
    prompt: input.prompt  // Object with properties
  }
});
```

### 2. The 400 Bad Request Error
When you see `POST http://localhost:3000/api/trpc/generateApp?batch=1 400 (Bad Request)`:

**Cause:** The mutation handler throws an error (usually from Inngest rejecting malformed data), and tRPC converts it to a 400 response.

**Fix:** Check the `data` field in `inngest.send()` — it must be an object, not a string or primitive.

### 3. Missing `await`
```typescript
// ❌ Without await: Function might return before Inngest processes
inngest.send({ name: "...", data: {...} });

// ✅ With await: Ensures the event is sent before continuing
await inngest.send({ name: "...", data: {...} });
```

## Inngest Dev Tools

When running `npm run dev`, Inngest automatically starts a **dev server** at `http://localhost:8288` where you can:

- View queued events
- See function execution in real-time
- Check logs and errors
- Manually retry failed events
- Inspect step-by-step progress

## Key Concepts Recap

| Concept | What It Is | Example |
|---------|-----------|---------|
| **Event** | Message that triggers a job | `{ name: "app/task.created", data: {...} }` |
| **Function** | Background job definition | `inngest.createFunction(...)` |
| **Step** | Discrete unit of work | `step.run("name", () => {...})` |
| **Trigger** | What starts the function | `{ event: "app/task.created" }` |
| **Sleep** | Pause execution | `step.sleep("pause", "10s")` |

## Testing Your Setup

1. Start dev server: `npm run dev`
2. Visit `http://localhost:8288` (Inngest dev UI)
3. Click your button in the app
4. Watch the event appear in Inngest dev UI
5. See the function execute step-by-step

</details>

<details>
<summary><strong>🧭 tRPC Deep Dive</strong></summary>

## What is tRPC?
tRPC allows you to call **backend functions directly from your frontend** — like importing a function, but it's actually making an HTTP request under the hood. And the best part: **it's fully type-safe end-to-end**.

### Mental Model
```
Frontend → HTTP Request → Backend Router → Procedure → Typed Response
```

## Your tRPC Setup (File by File)

### 1. `src/trpc/init.ts` — The Foundation
- Creates the tRPC "t-object" with `initTRPC.create()`
- Configures `superjson` for complex types
- Exports `baseProcedure`, `createTRPCRouter`, `createTRPCContext`

### 2. `src/trpc/routers/_app.ts` — API Definition
```typescript
export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(z.object({ text: z.string() }))
    .query((opts) => {
      return { greeting: `hello ${opts.input.text}` };
    }),
});
export type AppRouter = typeof appRouter;
```

### 3. `src/trpc/server.tsx` — Server-Side Client
Used in Server Components (no `'use client'`):
```typescript
import { trpc } from '@/trpc/server';
const data = await trpc.hello.fetch({ text: 'World' });
```

### 4. `src/trpc/client.tsx` — Client-Side Provider
Used in Client Components (with `'use client'`):
```typescript
'use client';
import { useTRPC } from '@/trpc/client';
const trpc = useTRPC();
const { data } = trpc.hello.useQuery({ text: 'World' });
```

### Server vs Client - Key Distinction

| Feature | Server Component | Client Component |
|---------|-----------------|------------------|
| **Directive** | No `'use client'` | Has `'use client'` |
| **Import** | `import { trpc } from '@/trpc/server'` | `import { useTRPC } from '@/trpc/client'` |
| **How to call** | `trpc.hello.fetch()` | `useTRPC().hello.useQuery()` |
| **Can use hooks?** | No | Yes |

## Type Safety Flow
```typescript
// Backend: Define procedure
appRouter.createAI.query()

// TypeScript extracts: type AppRouter = typeof appRouter

// Frontend: Fully typed!
const trpc = useTRPC();
trpc.createAI.useQuery({ text: "Hello" /* ✅ TypeScript validates */ })
```

</details>

<details>
<summary><strong>⚡ Prefetching Pattern</strong></summary>

## What is Prefetching?
**Prefetching** = **Fetching data or resources before they are needed so they are ready when requested.**

## Why Prefetch?
- Eliminates loading spinners
- Faster perceived performance
- Better SEO (content in initial HTML)
- Reduces network requests

## The Pattern
```
SERVER:                              CLIENT:
1. Predict needed data               
2. Fetch from database               
3. Store in server cache             
4. Serialize (dehydrate)             
5. Embed in HTML                     ┐
                                      │ Network Transfer
                                      ┘
6. Parse HTML                       
7. Deserialize                        
8. Hydrate client cache              
9. Read from cache (instant!)        
10. Render data                      
```

## Two Caches
There are **two separate caches**: server cache (dies after request) and client cache (persists in browser).

## The Bridge: Dehydrate & Hydrate
- **Dehydrate** (server): Convert cache → plain serializable object
- **Transfer**: Embed in HTML
- **Hydrate** (client): Restore serialized data → client cache

## Implementation Example

### Server Component
```typescript
const Page = async () => {
  const queryClient = getQueryClient();
  
  void queryClient.prefetchQuery(
    trpc.createAI.queryOptions({ text: "Antonio" })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<p>Loading...</p>}>
        <Client />
      </Suspense>
    </HydrationBoundary>
  );
};
```

### Client Component
```typescript
"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Client = () => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.createAI.queryOptions({ text: "Antonio" })
  );
  return <div>{JSON.stringify(data)}</div>;
};
```

## Query Keys Must Match
```typescript
// Server
trpc.createAI.queryOptions({ text: "Antonio" })
// → queryKey: ['createAI', { text: "Antonio" }]

// Client (same query key!)
trpc.createAI.queryOptions({ text: "Antonio" })
// ✅ Finds prefetched data in cache
```

## useQuery vs useSuspenseQuery
- `useQuery`: Shows loading state
- `useSuspenseQuery`: Suspends until data ready (works with `<Suspense>`)

</details>

<details>
<summary><strong>🌍 Software Concepts</strong></summary>

## Pull Requests (PR)
A PR is a way to propose changes to code and ask for review before merging.

### PR Flow
1. Create branch
2. Make changes
3. Push branch
4. Open PR
5. Review & approve
6. Merge

### Branch Naming
```
feat/add-user-authentication
fix/resolve-login-error
chore/update-dependencies
docs/improve-readme
refactor/simplify-api-client
```

### Commit Message Format (Conventional Commits)
```
feat(auth): add Google OAuth login

- Add Google OAuth provider to Clerk config
- Create callback route
```

## Git Best Practices

### Branching
- Feature branches from `main`
- Hotfixes from latest release tag
- One branch = one feature/task
- Keep branches small

### Committing
- Commit frequently with logical units
- Write messages for your future self
- Include "why" in the message

### GitHub Workflow
- Use GitHub Issues for everything
- Enable branch protection (require reviews, CI checks)
- Use Draft PRs when still working
- Link PRs to issues: "Closes #123"

### PR Size Rule
- **Under 400 lines** = easy review
- **Over 1000 lines** = split it up
- **Over 50 files** = definitely split

### Emergency Commands
```bash
git reset --soft HEAD~1   # Undo last commit (keep changes)
git reset --hard HEAD~1   # Undo last commit and changes
git push --force-with-lease  # Safe force push
```

</details>

---

*This README documents our current understanding. More sections will be added as we continue.*
