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

| Layer              | Tech                                                                |
| ------------------ | ------------------------------------------------------------------- |
| **Frontend**       | Next.js 15, React 19, Tailwind v4, ShadCN UI, TanStack Query        |
| **Backend**        | tRPC (type-safe API), Prisma ORM, PostgreSQL on Neon                |
| **Auth & Billing** | Clerk (auth + subscription billing)                                 |
| **AI**             | OpenAI/Anthropic/Grok + Inngest background jobs                     |
| **Sandbox**        | E2B Cloud Sandboxes (Docker-based isolation)                        |
| **Dev Workflow**   | Git, GitHub PRs, CodeRabbit AI code reviews                         |

</details>

<details>
<summary><strong>🔑 Core Concepts</strong></summary>

## Inngest

**Inngest** is a **workflow orchestration platform** — a "serverless workflow engine" that lets you write reliable, event-driven background jobs and multi-step processes in plain TypeScript/JavaScript.

### Key Concepts

- **Functions**: Write them like normal async functions, Inngest manages retries, timeouts, and state
- **Events**: Jobs triggered by events (e.g., `app/generation_requested`)
- **Steps**: Multi-step jobs (e.g., "create project" → "install deps" → "run dev server")

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

| Characteristic    | Challenge              | Background Job Solution    |
| ----------------- | ---------------------- | -------------------------- |
| **Slow**          | Takes seconds/minutes  | Decouple from request      |
| **Unpredictable** | Variable duration      | Retry and timeout handling |
| **Expensive**     | API costs add up       | Cost tracking and limits   |
| **Multi-step**    | Pipeline of operations | Step-by-step execution     |
| **Stateful**      | Need to track progress | Persistent job state       |

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
// Inngest functions will be defined here
```

### 3. API Route (`src/app/api/inngest/route.ts`)

```typescript
import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
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
  data: input.prompt, // String, not object
});

// ✅ CORRECT: Sending an object
inngest.send({
  name: "app/task.created",
  data: {
    prompt: input.prompt, // Object with properties
  },
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

| Concept      | What It Is                  | Example                                     |
| ------------ | --------------------------- | ------------------------------------------- |
| **Event**    | Message that triggers a job | `{ name: "app/task.created", data: {...} }` |
| **Function** | Background job definition   | `inngest.createFunction(...)`               |
| **Step**     | Discrete unit of work       | `step.run("name", () => {...})`             |
| **Trigger**  | What starts the function    | `{ event: "app/task.created" }`             |
| **Sleep**    | Pause execution             | `step.sleep("pause", "10s")`                |

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
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
});
export type AppRouter = typeof appRouter;
```

### 3. `src/trpc/server.tsx` — Server-Side Client

Used in Server Components (no `'use client'`):

```typescript
import { trpc } from "@/trpc/server";
const data = await trpc.hello.fetch({ text: "World" });
```

### 4. `src/trpc/client.tsx` — Client-Side Provider

Used in Client Components (with `'use client'`):

```typescript
"use client";
import { useTRPC } from "@/trpc/client";
const trpc = useTRPC();
const { data } = trpc.hello.useQuery({ text: "World" });
```

### Server vs Client - Key Distinction

| Feature            | Server Component                       | Client Component                          |
| ------------------ | -------------------------------------- | ----------------------------------------- |
| **Directive**      | No `'use client'`                      | Has `'use client'`                        |
| **Import**         | `import { trpc } from '@/trpc/server'` | `import { useTRPC } from '@/trpc/client'` |
| **How to call**    | `trpc.hello.fetch()`                   | `useTRPC().hello.useQuery()`              |
| **Can use hooks?** | No                                     | Yes                                       |

## Type Safety Flow

```typescript
// Backend: Define procedure
appRouter.createAI.query();

// TypeScript extracts: type AppRouter = typeof appRouter

// Frontend: Fully typed!
const trpc = useTRPC();
trpc.createAI.useQuery({ text: "Hello" /* ✅ TypeScript validates */ });
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
trpc.createAI.queryOptions({ text: "Antonio" });
// → queryKey: ['createAI', { text: "Antonio" }]

// Client (same query key!)
trpc.createAI.queryOptions({ text: "Antonio" });
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



<details>
<summary><strong>🧩 Design Patterns</strong></summary>

# Design Patterns

As Vibe grows, certain reusable design patterns emerge in the code. This section documents them so we can recognize them on sight — and apply them deliberately rather than by accident.

> This section documents the two patterns that power our Model Router: the **Registry** (how we hide providers behind a single lookup point) and the **Strategy** (how we make routing rules swappable per environment). Together they form our "Policy-Driven Failover."

---

## The Registry Pattern

### What Is a Registry?

> "A well-known object that other objects use to find common objects or services." — Martin Fowler

A Registry is a **known lookup point**. Instead of every part of the codebase holding direct references to the things it needs, those things are placed into a single shared store, and anyone who needs them asks that store by name.

> **Note on naming:** The Registry is a recognized pattern (documented by Martin Fowler and in enterprise architecture literature), though it is **not** one of the original "Gang of Four" (1994) patterns. It is most commonly implemented as a key-value store (a `Map`), but its identity comes from its **role** — a known place to look things up — not from any specific data structure.

---

### The Problem It Solves

**Without a registry**, every consumer is coupled to specific implementations:

```
agent ──imports──► GoogleProvider
agent ──imports──► OpenRouterProvider
agent ──imports──► OpenAIProvider
```

Swapping or adding a provider means editing every consumer. The codebase becomes rigid.

**With a registry**, there is one known place to ask:

```
agent ──asks──► Registry ──holds──► { Google, OpenRouter, OpenAI, ... }
```

Consumers ask by name. The registry hides *which specific objects* exist. Adding a new one no longer touches the consumers.

---

### The Two Actors

Every registry has exactly two kinds of participants:

| Actor | Responsibility | In our code | When it acts |
| --- | --- | --- | --- |
| **The Registrar** (writer) | Builds objects and puts them *into* the registry | `router/register-providers.ts` | Once, at app startup |
| **The Consumer** (reader) | Asks the registry for objects *by name* | `router/model-router.ts` | On every `getModel()` request |

The split is the whole point. The consumer never imports the things it looks up — it imports only the registry.

---

### Is a Registry Always a Key-Value Store?

**No — but it usually is.**

A Registry is defined by its **role** (a known lookup point), not its data structure. It *could* be a list you scan, or a more complex structure. In practice, a key-value store (a `Map`) is used the vast majority of the time because lookups by name are fast and natural.

So treat **key-value as the default shape, not a law**. What makes something a Registry is that it is *the* well-known place to find things — not that it happens to be a `Map`.

---

### Our Implementation: `src/ai/router/provider-registry.ts`

This file is our registry. It is small on purpose — a registry should stay a thin lookup layer, never a logic layer.

**① The shape of a registered thing**

Before anything can be stored, we define what a "registered thing" looks like. For us, that is a `Provider`:

```ts
export type Provider = {
  name: ProviderName;                       // the KEY — how we'll find it later
  isConfigured: () => boolean;              // is this provider usable right now?
  getModel: () => ProviderResult | null;    // give me a model from it
};
```

Every provider (Google, OpenRouter, OpenAI) implements this exact shape. The registry does not care about the differences between them — only that they share this contract.

**② The store**

The registry itself is a single module-scoped `Map`:

```ts
const registry = new Map<string, Provider>();
```

Because it lives at module scope, **only one instance exists** for the whole app. Anyone who imports this module shares that same map. That is what "well-known" means in code.

**③ Write — register (something puts things in)**

```ts
export function registerProvider(provider: Provider) {
  if (!provider || !provider.name) return;
  registry.set(provider.name, provider);   // key = name, value = provider
}
```

Called once per provider during bootstrap. The guard (`if (!provider || !provider.name)`) silently ignores bad input rather than crashing — defensive, because a startup crash over a misconfigured provider would be a poor experience.

**④ Read — look up (someone gets things out)**

```ts
export function getProvider(name: ProviderName): Provider | undefined {
  return registry.get(name);   // single lookup by key
}

export function getProvidersByNames(names: ProviderName[]): Provider[] {
  return names
    .map((n) => registry.get(n))   // turn each name → its Provider
    .filter((p): p is Provider => typeof p !== "undefined");
    //        ↑ quietly drop any name that wasn't registered,
    //          instead of letting `undefined` leak into callers
}

export function listRegisteredProviders(): string[] {
  return Array.from(registry.keys());   // used for debugging & error messages
}
```

`getProvidersByNames` is the function our router actually calls: it takes an *ordered list of names* (from the policy) and resolves them to real `Provider` objects, skipping any that aren't registered.

---

### The Decoupling It Buys Us

This is the payoff. Look at who imports whom:

```
register-providers.ts ──imports──► google.ts, openrouter.ts, openai.ts
        │ (writes them in)
        ▼
   provider-registry.ts  ◄──reads── model-router.ts
```

**The router imports the registry, NOT the providers.** Search `model-router.ts` and you will find zero `import { googleProvider }`. The router says: "give me whatever is registered under the name `'google'`."

That means:

- **Add a provider** (e.g. `groq.ts`) → register it in `register-providers.ts` → the router works with it automatically. **Router code unchanged.**
- **Swap a provider** (replace Google with xAI) → change the registration → **router code unchanged.**
- **Remove a provider** → stop registering it → **router code unchanged.**

The router is closed for modification, but open for extension. That is the **Open/Closed Principle**, made real by the Registry.

---

### The Mental Test

Whenever you look at a registry, ask yourself:

> *"If I add a new thing, does the code that **looks things up** have to change?"*

- **No** → it is a healthy registry. ✅
- **Yes** → the consumer is hardcoded to specific names/instances, and the abstraction is leaking.

For our registry: adding `groqProvider` changes `register-providers.ts` only. `model-router.ts` (the consumer) never changes. ✅

---

### Why We Use It in Vibe

The Model Router's central promise is: **the rest of the app never knows which provider is active.** The Registry is what makes that promise keepable.

By hiding all providers behind a single lookup point, the router can select among them by name (driven by a policy) without ever importing a specific SDK. Provider-agnosticism is not a hope — it is a structural consequence of using a Registry.

---

### Key Takeaways

- A **Registry** is a well-known object that other objects use to *find* common objects or services.
- It is defined by its **role** (a known lookup point), not its data structure — though a key-value `Map` is the common implementation.
- It always has two actors: a **Registrar** (writes once at startup) and a **Consumer** (reads by key on demand).
- The consumer imports the **registry**, never the things inside it — that decoupling is the entire benefit.
- The test of a healthy registry: **adding a new entry must not change the consumer.**
- In Vibe, the Registry makes the Model Router provider-agnostic.

---

## The Strategy Pattern

### What Is the Strategy Pattern?

> "Define a family of algorithms, encapsulate each one, and make them interchangeable. Strategy lets the algorithm vary independently from clients that use it." — Gang of Four (1994)

Strategy is about **pulling a behavior out of a class** and giving it its own object, behind a shared interface — so the behavior can be **swapped, added, or changed without touching the code that uses it**.

It rests on three connected insights.

---

### The Three Core Insights

#### 1. Composition rather than inheritance

The principle behind the pattern:

> "Favor object composition over class inheritance."

- **Inheritance** is an **IS-A** relationship (`Dog extends Animal` → "a Dog *is an* Animal"). The bond is **permanent and compile-time** — once `extends` is written, it cannot change at runtime.
- **Composition** is a **HAS-A** relationship (`class Dog { constructor(private mover: MoveBehavior) }` → "a Dog *has a* mover"). The bond is **dynamic** — the referenced object can be **swapped at runtime**.

Strategy chooses composition: instead of baking the behavior into the class by extending a superclass, the behavior is pulled **out** into its own object and handed in as a reference. The behavior becomes a **plug-in component**, not a baked-in feature.

#### 2. Inheritance is not about reuse

The deepest insight, and the one most people get wrong. Many developers reach for inheritance thinking: *"If `AdminUser extends User`, I reuse `User`'s code for free."* They use inheritance as a **code-copy machine**.

The GoF book pushes back: **inheritance is about establishing a type relationship (subtyping + polymorphism), not about scooping up code.** Code reuse is a *side effect*, not the *purpose*. Using inheritance *primarily* for reuse hits a wall.

The wall — objects that need to sort differently. The inheritance-for-reuse route:

```
User
 ├── UserByName      (sorts by name)
 ├── UserByEmail     (sorts by email)
 └── UserByDate      (sorts by date)
```

Problems erupt:

- **Rigid** — the sorting is permanently welded to the class; a `UserByName` can never sort by email.
- **Can't combine** — "sort by name *then* email" needs a new `UserByNameThenEmail` class → a combinatorial **class explosion**.
- **Fragile base class** — change `User` and every subclass may break.
- **Locked at compile time** — the behavior was chosen when `extends` was written and cannot change while the program runs.

The composition version of the same need:

```
class User {
  sortStrategy: SortStrategy        // ← a reference, swappable
}

interface SortStrategy { sort(items): Item[] }
class SortByName  implements SortStrategy { ... }
class SortByEmail implements SortStrategy { ... }
class SortByDate  implements SortStrategy { ... }
```

Now the `User` sorts by name now and by email 5 seconds later — **just swap the strategy object**. Adding `SortByAge` is one new class; `User` doesn't change. The behavior **varies independently** from `User`.

#### 3. The algorithm varies independently from the client that uses it

This is the GoF's intent statement, almost verbatim. Parse it:

- **"the algorithm"** = the behavior that might need to change.
- **"varies independently"** = you can change, add, or remove it **without touching** anything else.
- **"clients that use it"** = the code that *consumes* the algorithm.

> **I should be able to add, remove, or rewrite the algorithm WITHOUT opening the file of the code that uses it.**

The two sides are **decoupled** — they vary on separate tracks and meet only through the **shared interface** (the Strategy contract). This is the **Open/Closed Principle** again: the client is *closed* (unchanged), the algorithms are *open* (extendable), the interface is the hinge.

### Our Implementation: `src/ai/policies/`

Every piece of Strategy maps onto our code:

| Strategy concept | In our code |
| --- | --- |
| **The Strategy interface** (the shared contract) | `ModelPolicy` type |
| **A concrete Strategy** (one specific algorithm) | `developmentPolicy`, `productionPolicy` |
| **The Client** (the code that uses a strategy) | `ModelRouter.getRoutingResult()` |
| **Selection of which strategy** | `getPolicyForEnvironment(env)` |
| **The "algorithm"** | the ordered list of providers to try — `providerOrder` |

The key code, condensed:

```ts
// ── THE STRATEGY INTERFACE (the contract all strategies share) ──
export type ModelPolicy = {
  name: string;
  providerOrder: ProviderName[];   // ← the "algorithm": ordered providers to try
};

// ── CONCRETE STRATEGY A ──
export const developmentPolicy: ModelPolicy = {
  name: "development",
  providerOrder: [PROVIDERS.GOOGLE, PROVIDERS.OPENROUTER],   // free-first
};

// ── CONCRETE STRATEGY B ──
export const productionPolicy: ModelPolicy = {
  name: "production",
  providerOrder: [PROVIDERS.OPENAI, PROVIDERS.OPENROUTER, PROVIDERS.GOOGLE],
};
```

The client (`model-router.ts`) uses whichever strategy it is handed:

```ts
async getRoutingResult(context?) {
  const env = resolveEnvironment(context);
  const policy = getPolicyForEnvironment(env);             // ← gets A strategy
  const providers = getProvidersByNames(policy.providerOrder); // ← walks ITS order
  for (const prov of providers) { ... }                   // ← the loop is identical
}
```

Apply the three insights to this real code:

- **Composition, not inheritance** — `ModelRouter` does **not** extend a `DevelopmentRouter` / `ProductionRouter`. It *holds* a policy object (composition). The router *has a* policy; it isn't *a* policy.
- **Inheritance is not about reuse** — the bad version would be `DevelopmentModelRouter extends ModelRouter`, `ProductionModelRouter extends ModelRouter`, each overriding `providerOrder`. Every environment would mean a new subclass, with router logic locked into the hierarchy. We avoided all that by pulling `providerOrder` into a **plain data object** selected at runtime. The router is *one* class.
- **The algorithm varies independently** — proven next.

---

### The Decoupling It Buys Us

Add a `stagingPolicy`. What changes?

- `policies/staging.ts` → new file ✅ (the algorithm varies)
- `policies/index.ts` → register it in the selector ✅
- `router/model-router.ts` → **NOTHING. The client is untouched.** ✅

The algorithm changed on its track; the client stayed on its track; they meet only through the `ModelPolicy` interface. That is the independence, made visible.

---

### The Mental Test

Whenever you look at a Strategy, ask:

> *"Can I add a new algorithm without touching the client?"*

- **No** → the client is hardcoded to a specific algorithm; the pattern isn't doing its job.
- **Yes** → it is a healthy Strategy. ✅

For our router: adding `stagingPolicy` changes `policies/` only. `ModelRouter` never changes. ✅

---

### Why We Use It in Vibe

*Which providers to try, and in what order* is a decision that differs per environment (development wants free-first; production wants reliable-first) and may evolve over time. By making it a **Strategy**, that decision lives in its own swappable objects behind the `ModelPolicy` interface.

So we can change the order for an existing environment, invent a whole new routing strategy (e.g. cost-aware, capability-based), or add a new environment (`staging`) — **without the `ModelRouter` ever knowing.** The router stays a single, stable class; the routing rules grow on a separate track.

Together, **Registry** (hide the providers behind one lookup point) + **Strategy** (make the routing rules swappable) are the two ingredients of our "Policy-Driven Failover": the Strategy decides *which providers to try in what order*, and the Registry *resolves those names to real provider objects*. The router just walks the Strategy's order using the Registry.

---

### Key Takeaways

- **Strategy** defines a family of interchangeable algorithms behind a shared interface, letting the algorithm vary independently from the client that uses it.
- It favors **composition** (HAS-A, swappable) over **inheritance** (IS-A, permanent).
- **Inheritance is about type relationships, not code reuse** — using it for reuse causes rigidity, class explosion, and fragile base classes.
- The **client** stays unchanged when algorithms are added or swapped; they meet only through the interface (Open/Closed Principle).
- The test of a healthy Strategy: **adding a new algorithm must not touch the client.**
- In Vibe, the **routing order per environment** is a Strategy (`policies/`), so routing rules can grow without changing `ModelRouter`.

---

</details>


<details>
<summary><strong>🏗️ Major Architectural Shift: Building a Provider-Agnostic Autonomous Coding Agent</strong></summary>

# Why We Changed the Architecture

The original course implements the AI agent using **Inngest AgentKit**.

While AgentKit is an excellent framework for autonomous agents, it is primarily optimized around models with strong tool-calling capabilities (especially Claude), making it difficult to maintain a completely free development workflow.

Our goals for Vibe are:

- ✅ 100% free during development
- ✅ Provider agnostic
- ✅ Easy to switch AI models
- ✅ Fully autonomous coding agent
- ✅ Modern architecture built on the latest Vercel AI SDK

After researching the latest **Vercel AI SDK v6**, we decided to replace AgentKit with the SDK's built-in **ToolLoopAgent**.

---

# The Biggest Lesson Learned

> **An agent is not a framework. An agent is an execution loop.**

Every autonomous agent follows the exact same cycle:



Frameworks like:

- AgentKit
- Mastra
- LangGraph
- Vercel AI SDK Agents

all implement this exact same idea.

The difference is simply **how they manage the loop**, not what an agent fundamentally is.

---

# Why ToolLoopAgent?

The latest Vercel AI SDK now provides a first-class agent abstraction:

- 

It already manages:

- Multi-step reasoning
- Conversation history (during execution)
- Tool execution
- Sequential tool calls
- Stopping conditions
- Runtime context
- Tool lifecycle

This means we no longer need a dedicated agent framework.

---

# Final Architecture

<details>
<summary><strong>Model Router Deep Dive</strong></summary>

<p>A comprehensive, multi-part explanation of the Model Router used by Vibe. Expand to view Part 1 (Foundational Concepts). Additional parts will be added as collapsible sections under this parent.</p>

<details>
<summary><strong>Part 1 — Foundational Concepts</strong></summary>


### 1. What is a Model Router and why do we need it?

A Model Router is the code that chooses the right AI model provider for a request.
It sits between the app and the provider implementations and answers questions like:

- “Is Google configured?”
- “Can OpenRouter return a usable model?”
- “Which provider should I use first in development?”
- “If one provider fails, can I automatically try the next one?”

This keeps the rest of the app from having to know provider-specific details.

#### Before the router

```ts
if (process.env.NODE_ENV === "production") {
  return openai.chat("gpt-4");
} else {
  return google.chat("gemini-3.5-flash");
}
```

#### After the router

```ts
const model = await router.getModel();
await model.chat({ messages: [...] });
```

The difference is that after the router, the app no longer hardcodes which provider to use.

#### Real-world analogy

Think of the Model Router as an air traffic controller:

- The app is the passenger who needs a flight.
- Providers are airlines with different availability and price.
- The router decides which airline to book.

If Airline A is unavailable, the router can switch to Airline B without the passenger knowing.

### 2. Provider Abstraction

A provider is any implementation that can return a model for the router.
The router does not know how the provider works, only that it follows a contract.

```ts
interface Provider {
  name: string;
  isConfigured(): boolean;
  getModel(): LanguageModelV4 | null;
}
```

That contract means the router only asks two questions:

1. `isConfigured()` — is the provider ready to use?
2. `getModel()` — return the model if possible

Providers hide details like:

- API key management
- SDK initialization
- model selection
- provider-specific errors

This is what abstraction means: the router depends on **what** the provider does, not **how** it does it.

### 3. Type Safety in TypeScript

In a router design, type safety is the glue that keeps different providers aligned.

The router returns a typed model, such as `LanguageModelV4`, so the calling code can use it safely.

That means:

- providers must return the same shape
- TypeScript catches mistakes early
- the app gets autocomplete and compile-time confidence

Example typed contract:

```ts
type ProviderResult = {
  model: LanguageModelV4;
  modelId: string;
};
```

With this, the router can do:

```ts
const result = provider.getModel();
if (result) {
  return result.model;
}
```

and the caller knows the model supports the expected API.

### Visualization

```text
          App Code
             │
             ▼
       ModelRouter
             │
     ┌───────┴────────┐
     │ Provider Contract │
     │  name           │
     │  isConfigured() │
     │  getModel()     │
     └───────┬─────────┘
             │
   ┌─────────┴─────────┬──────────┐
   │                   │          │
   ▼                   ▼          ▼
GoogleProvider   OpenRouterProvider   OpenAIProvider
   │                   │          │
   └── hides details ───┴── hides details ──┘
```

### What is being abstracted?

The router does not care about:

- whether the provider is Google, OpenAI, or OpenRouter
- how the API key is read
- which SDK is initialized
- how the model is created

It only cares about:

- is the provider ready?
- can it return a model?

### Why this matters

- prevents provider-specific logic from spreading through the app
- makes the router reusable across different AI providers
- allows automatic fallback without changing application code
- improves testability by letting you mock providers

### Key Takeaways

- The Model Router centralizes provider selection.
- Provider abstraction makes the router depend on a contract, not implementation.
- `LanguageModelV4` is the shared type that keeps different provider models compatible.
- This pattern is the foundation for building a provider-agnostic AI layer.

</details>

<details>
<summary><strong>Part 2 — Registry Pattern (Summary)</strong></summary>


### Registry Pattern — Summary

> **A Registry is a central place that stores and lets you look up available providers.**

```text
                  ┌──────────────────────┐
                  │      Registry        │
                  │                      │
                  │ "google" ──► Google  │
                  │ "openrouter" ──► OR  │
                  │ "openai" ──► OpenAI  │
                  └──────────▲───────────┘
                             │
                       register()
                             │
                       New Provider

              Router
                 │
             get(name)
                 │
                 ▼
              Registry
                 │
                 ▼
          Concrete Provider
```

### In our Vibe application

- **Providers register themselves** in the registry.
- **The router asks the registry** for a provider by name.
- The router **doesn't need to know how providers are stored or created**.
- Adding a new provider means **registering it**, rather than rewriting the router.

### Interface vs. Registry

```
Provider Interface → WHAT can a provider do?
Registry            → WHICH providers are available?
```

Together:

> **Interface = interchangeability**
> 
> **Registry = discoverability**

This keeps the **Model Router generic, extensible, and decoupled from individual providers**.

</details>

<details>
<summary><strong>Part 3 — Strategy Pattern</strong></summary>

    
The Strategy pattern is the way we separate the router's decision about which providers to try from the router's actual work of trying them.

### What the Strategy pattern does here

In the Model Router, we have two separate roles:
    
1. Choose the provider order for the current environment.
2. Execute that order until a provider succeeds.

The Strategy pattern says those should be separate.
The router is responsible for execution. The policy is responsible for the choice.

### How this is represented in code

The policy is a small data object:

```ts
export type ModelPolicy = {
  name: string;
  providerOrder: ProviderName[];
};
```

And the selector chooses a policy by environment:

```ts
export function getPolicyForEnvironment(env: Environment | undefined): ModelPolicy {
  const environment = env === ENVIRONMENTS.PRODUCTION
    ? ENVIRONMENTS.PRODUCTION
    : ENVIRONMENTS.DEVELOPMENT;

  return environment === ENVIRONMENTS.PRODUCTION
    ? productionPolicy
    : developmentPolicy;
}
```

The important part is that the router does not embed provider selection logic directly. It asks a separate function for the policy.

### Why this is better than `if/else`

If the router were written as a series of hardcoded `if` statements, every new environment or new provider would require changing the router itself.
That quickly becomes hard to maintain.

With the Strategy pattern, adding a new environment or changing the provider order means changing policy data, not changing the router logic.

### What the router actually does with the policy

The router takes the policy's `providerOrder` and does this:

- Look up the corresponding provider objects.
- Loop through them in order.
- Skip providers that are not configured.
- Ask each provider for a model.
- Return the first working model.
- If none succeed, throw an error.

This means the router is always the same. The only thing that changes is the order of providers it tries.

### A concrete example

If development policy is:

```ts
const developmentPolicy = {
  name: 'development',
  providerOrder: ['google', 'openrouter', 'openai'],
};
```

then the router tries Google first, then OpenRouter, then OpenAI.

If production policy is:

```ts
const productionPolicy = {
  name: 'production',
  providerOrder: ['openai', 'openrouter', 'google'],
};
```

then the router tries OpenAI first, then OpenRouter, then Google.

The code that performs the loop is unchanged in both cases.

### Why this works for future projects

The general approach is:

- Keep the decision separate from execution.
- Represent the decision as simple data.
- Write the executor to follow that data.

This is a reusable pattern for any case where you want to choose between multiple implementations based on context.

### What to remember

- Strategy = the policy or plan.
- Executor = the generic code that follows the plan.
- Selection logic should live outside the executor.
- If you find yourself writing many environment-based branches inside the executor, that is a sign you should use this pattern.

### What's next

The next step is to document the actual router implementation and the supporting files, line by line.
That means moving from the conceptual strategy pattern to the exact code that:
- registers providers,
- selects policies,
- looks up providers by name,
- and executes the routing loop.

</details>

<details>
<summary><strong>Part 4 — Code Walkthrough: From Constants to Router</strong></summary>

> This part follows the README's stated goal: documenting every file line by line, in **dependency order** (bottom-up), so you always understand where each piece came from and how it connects to the next.

We start at the **leaves** — constants and types that have no internal dependencies — and climb upward to the **root** — the `ModelRouter` class that ties everything together.

### Dependency Map

```text
┌──────────────────────────────────────────────────────────┐
│  L1 — Constants (no internal deps)                      │
│  │ environment.ts    → ENVIRONMENTS, Environment        │
│  │ providers.ts       → PROVIDERS, ProviderName         │
│  │ models.ts          → GEMINI_MODELS, etc.             │
│  └─────────┬────────────────────────────────────────────┘
│            │ exports                                    ▲
│            ▼                                            │
│  L2 — Registry & Shared Types                         │
│  │ provider-registry.ts → Provider, ProviderResult,      │
│  │                       registry Map                   │
│  └─────────┬────────────────────────────────────────────┘
│            │ imports                                    │
│            ▼                                            │
│  L3 — Provider Implementations                         │
│  │ providers/google.ts, openai.ts, openrouter.ts         │
│  └─────────┬────────────────────────────────────────────┘
│            │ imports Provider │                            │
│            ▼                        │                        │
│  L4 — Policies                                    │                        │
│  │ policies/development.ts, production.ts, index.ts        │
│  └─────────┬────────────────────────────────────────────┘
│            │ imports Policy │                              │
│            ▼                        │                        │
│  L5 — Registration                                │                        │
│  │ router/register-providers.ts                                    │                        │
│  └─────────┬────────────────────────────────────────────┘
│            │ imports ModelRouter │                        │
│            ▼                        │                        │
│  L6 — Router (the brain)                                  │                        │
│  │ router/model-router.ts                                 │                        │
│  └─────────┬────────────────────────────────────────────┘
│            │ imports ModelRouter │                        │
│            ▼                        │                        │
│  L7 — Bootstrap                                   │                        │
│  │ ai/index.ts                                   │                        │
│  └────────────────────────────────────────────────┘                        │
│               │ the rest of the app imports from here ───────────────────────┘
│               ▼
└──────────────────────────────────────────────────────────┘
```

---

## File 1: `src/ai/constants/environment.ts`

```ts
export const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
} as const;

export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];
```

**Lines 1-4** — The constant object:

`export const ENVIRONMENTS` declares a constant object at module scope. The `export` makes it available to any importing module. The two keys `DEVELOPMENT` and `PRODUCTION` are **canonical identifiers** — every comparison elsewhere in the codebase uses `ENVIRONMENTS.DEVELOPMENT`, never the raw string `"development"`.

`as const` is TypeScript's **"const assertion."** It tells TypeScript: "Treat every property as a literal type, not a widened `string` type." Without it, `ENVIRONMENTS.DEVELOPMENT` would be typed as `string`. With it, it's typed as `"development"` — a literal type. This is what powers the next line's type derivation.

**Line 6** — The derived type:

```ts
export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];
```

Read inside-out:

1. `typeof ENVIRONMENTS` — At the type level, `typeof` reads the **type** of the *value* `ENVIRONMENTS`:
   ```ts
   { readonly DEVELOPMENT: "development"; readonly PRODUCTION: "production" }
   ```

2. `keyof typeof ENVIRONMENTS` — `keyof` produces a **union of all keys**:
   ```ts
   "DEVELOPMENT" | "PRODUCTION"
   ```

3. `(typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS]` — **Indexed access**: "Index into the object type using any of its keys." The result is a union of all the **values**:
   ```ts
   "development" | "production"
   ```

So `Environment` is the union type `"development" | "production"`.

**Why this pattern instead of a plain string or enum?** No runtime overhead (just an object), single source of truth (add `"staging"` in one place and both the value and the type update), and type safety (passing `"staging"` to an `Environment` parameter is a compile error).

**What would break if removed?** Every file importing `ENVIRONMENTS` or `Environment` would fail to compile:
- `src/ai/policies/index.ts`
- `src/ai/router/model-router.ts`

**Downstream connections:**

```
environment.ts ──► policies/index.ts        (imports ENVIRONMENTS, Environment)
environment.ts ──► router/model-router.ts    (imports ENVIRONMENTS, Environment)
```

> **Key Takeaway**
> - `as const` makes object property values into literal types.
> - `typeof X` at the type level reads the *type* of a *value*.
> - `keyof X` produces a union of the object's keys.
> - `X[keyof X]` indexes an object type to get a union of its values.
> - This "type inference from values" pattern generates union types from constant objects — no enums needed.

## File 2: `src/ai/constants/providers.ts`

```ts
export const PROVIDERS = {
  GOOGLE: "google",
  OPENROUTER: "openrouter",
  OPENAI: "openai",
} as const;

export type ProviderName = (typeof PROVIDERS)[keyof typeof PROVIDERS];
```

Structurally identical to `environment.ts` — same `as const` + `typeof/keyof/[]` pattern, different domain. Instead of environments, it defines **provider names** as literal string union values.

**Why not just use string literals everywhere?**

```ts
// BAD: raw strings scattered everywhere
if (name === "google") ...
if (name === "opneai") ... // ← typo! Not caught until runtime
```

```ts
// GOOD: canonical constants + type-checked
if (name === PROVIDERS.GOOGLE) ... // typo → compile error
```

The `ProviderName` type (`"google" | "openrouter" | "openai"`) is consumed by **four** downstream files:

```
providers.ts ──► provider-registry.ts  (Provider.name type)
providers.ts ──► policies/index.ts     (providerOrder type)
providers.ts ──► policies/development.ts (PROVIDERS.GOOGLE, PROVIDERS.OPENROUTER)
providers.ts ──► policies/production.ts   (all three PROVIDERS.*)
```

This is the **canonical source of provider identity**. Every comparison, every lookup, every registration key flows from here. If you add a new provider, you add one entry here and the `ProviderName` type updates automatically.

> **Key Takeaway**
> - Provider names are the **keys** in the registry Map. They must be consistent everywhere.
> - This file enforces that consistency at compile time, not just by convention.
> - The `typeof`/`keyof/[]` pattern derives a union type from a constant object.

---

## File 3: `src/ai/constants/models.ts`

```ts
// OpenAI Models
export const OPENAI_MODELS = {
  DEFAULT: "gpt-4o-mini",
} as const;

// OpenRouter Free Models (as of August 2026)
export const OPENROUTER_MODELS = {
  PRIMARY: "nvidia/nemotron-3-ultra-550b-a55b:free",
  FALLBACK_1: "poolside/laguna-s-2.1:free",
  FALLBACK_2: "nvidia/nemotron-3-super-120b-a12b:free",
  FALLBACK_3: "cohere/north-mini-code:free",
  FALLBACK_4: "google/gemma-4-26b-a4b:free",
  FALLBACK_5: "openai/gpt-oss-20b:free",
} as const;

// Google Gemini Models (valid as of August 2026)
export const GEMINI_MODELS = {
  DEFAULT: "gemini-3.5-flash",
  LITE: "gemini-3.5-flash-lite",
  PRO: "gemini-2.5-pro",
  FLASH_2_5: "gemini-2.5-flash",
} as const;

// OpenRouter fallback chain for development
export const OPENROUTER_FALLBACK_MODELS = [
  OPENROUTER_MODELS.PRIMARY,
  OPENROUTER_MODELS.FALLBACK_1,
  OPENROUTER_MODELS.FALLBACK_2,
  OPENROUTER_MODELS.FALLBACK_3,
  OPENROUTER_MODELS.FALLBACK_4,
  OPENROUTER_MODELS.FALLBACK_5,
] as const;
```

### Why `as const` on every object and array?

The `as const` assertion turns every value into a **literal type**. For example:

```ts
export const GEMINI_MODELS = {
  DEFAULT: "gemini-3.5-flash",
} as const;
```

Without `as const`, `GEMINI_MODELS.DEFAULT` has type `string` (widened). With `as const`, it has type `"gemini-3.5-flash"` — a literal type. This matters because `inst.chat(GEMINI_MODELS.DEFAULT)` passes the model name to the AI SDK. The SDK's `chat()` method accepts a `string`, but keeping the literal type means TypeScript can track the exact model identity through the call chain.

### Why group by provider (one object per provider)?

Two competing forces:

1. **Flat list** — All model names in one array. Simple, but no grouping. Hard to read which models belong to which provider. Hard to add provider-specific metadata.
2. **Grouped by provider** — `OPENAI_MODELS`, `OPENROUTER_MODELS`, `GEMINI_MODELS`. Each provider owns its set of model IDs.

The grouped approach wins because:
- It **mirrors the file structure** — `google.ts` imports `GEMINI_MODELS`, `openai.ts` imports `OPENAI_MODELS`, `openrouter.ts` imports `OPENROUTER_FALLBACK_MODELS`.
- It's **extensible** — if Google adds a "thinking" model variant, you add a key to `GEMINI_MODELS` — no changes elsewhere.
- It's **self-documenting** — the comment `// OpenRouter Free Models (as of August 2026)` tells you these are real model IDs from a real source.

### The `OPENROUTER_FALLBACK_MODELS` array — a derived chain

```ts
export const OPENROUTER_FALLBACK_MODELS = [
  OPENROUTER_MODELS.PRIMARY,
  OPENROUTER_MODELS.FALLBACK_1,
  ...
] as const;
```

This is interesting because it **references** `OPENROUTER_MODELS` values rather than re-declaring strings. Two benefits:

1. **No duplication** — The actual string `"nvidia/nemotron-3-ultra-550b-a55b:free"` appears once (in `OPENROUTER_MODELS.PRIMARY`). Change it in one place.
2. **Ordering** — The array defines the **fallback order**. The first element is the preferred model; the rest are tried in sequence if earlier ones fail.

The `as const` on the array makes it a **readonly tuple** of literal types. TypeScript knows exactly which strings are in the chain and in what order — no elements can be added, removed, or reordered at runtime.

### Which files consume these constants?

```
models.ts ──► providers/google.ts     (GEMINI_MODELS.DEFAULT)
models.ts ──► providers/openai.ts     (OPENAI_MODELS.DEFAULT)
models.ts ──► providers/openrouter.ts (OPENROUTER_FALLBACK_MODELS)
```

This is the **last layer of pure data**. Nothing in `models.ts` imports from any other file in the project. It is the bottom of the dependency pyramid — if these constants are wrong, everything above is wrong, but if they're right, everything below can build on solid ground.

> **Key Takeaway**
> - Model names are strings, but grouping them in `as const` objects makes them type-safe and self-documenting.
> - The fallback chain is a **derived array** — it pulls values from the model objects, so there's a single source of truth per model ID.
> - These are the **leaf constants** — the foundation that everything else builds on.

---

## File 4: `src/ai/router/provider-registry.ts`

This is where the system transitions from "just constants" to "runtime logic." The registry is the **central lookup table** the router queries.

```ts
import type { LanguageModelV4 } from "@ai-sdk/provider";
import type { ProviderName } from "../constants/providers";

export type ProviderResult = {
  model: LanguageModelV4;
  modelId?: string;
};

export type Provider = {
  name: ProviderName;
  isConfigured: () => boolean;
  getModel: () => ProviderResult | null;
};

const registry = new Map<string, Provider>();

export function registerProvider(provider: Provider) {
  if (!provider || !provider.name) return;
  registry.set(provider.name, provider);
}

export function getProvider(name: ProviderName): Provider | undefined {
  return registry.get(name);
}

export function getProvidersByNames(names: ProviderName[]): Provider[] {
  return names
    .map((n) => registry.get(n))
    .filter((p): p is Provider => typeof p !== "undefined");
}

export function listRegisteredProviders(): string[] {
  return Array.from(registry.keys());
}
```

### Lines 1-2: Imports — `import type` vs `import`

```ts
import type { LanguageModelV4 } from "@ai-sdk/provider";
import type { ProviderName } from "../constants/providers";
```

`import type` is a **type-only import**. TypeScript erases it at compile time — it never becomes a runtime `import` statement. This matters because:

- `LanguageModelV4` is an interface (exists only at the type level). Nothing to import at runtime.
- `ProviderName` is a type alias. Again, type-level only.
- Using `import type` prevents **accidental runtime circular dependencies**. The registry imports the type from the providers constant file, and if someone added a runtime import from a provider implementation into the registry, it would create a dangerous circular dependency. `import type` makes that impossible by design.

`LanguageModelV4` is the **common interface** from the Vercel AI SDK. Every provider (Google, OpenAI, OpenRouter) returns a model object conforming to this interface. It's the shared contract that lets the router treat all providers uniformly.

### Lines 4-7: `ProviderResult` — the return envelope

```ts
export type ProviderResult = {
  model: LanguageModelV4;
  modelId?: string;
};
```

Wraps two things:
- `model: LanguageModelV4` — The actual model object you call `.generateText()`, `.streamText()`, etc. on.
- `modelId?: string` — The string identifier of which model was selected (e.g., `"gemini-3.5-flash"`). Optional because not every provider needs to expose it; it's primarily for debugging and error messages.

**Why a wrapper type instead of returning `LanguageModelV4` directly?** Because the router needs to know **which provider and which model** was selected — not just the model object. The `modelId` travels alongside the model as metadata.

### Lines 9-16: `Provider` — the contract (abstract interface)

```ts
export type Provider = {
  name: ProviderName;
  isConfigured: () => boolean;
  getModel: () => ProviderResult | null;
};
```

This is the abstract contract from Part 1. Every concrete provider implements this exact shape. The registry doesn't care *how* a provider works — it only cares that it has these three members:

| Member | Purpose | Called by |
|--------|---------|-----------|
| `name` | The key under which this provider is stored | `registry.set(provider.name, ...)` |
| `isConfigured()` | Quick boolean check: "Is the API key present?" | Router, before calling `getModel()` |
| `getModel()` | Actually create and return a model object | Router, when this provider is the active choice |

The `null` return on `getModel()` is the **silent failure** pattern. If a provider can't produce a model (e.g., invalid model name at runtime), it returns `null` instead of throwing. The router moves on to the next provider. This enables **automatic failover** without try/catch in the router.

### Line 18: The registry Map — module scope

```ts
const registry = new Map<string, Provider>();
```

`registry` is **module-scoped**. This means:
1. It is created **once** when this module is first imported.
2. It is **shared by all importers** — exactly one registry instance in the entire application.
3. It is **not exported** — nobody can directly manipulate it. They can only interact through the exported functions.

This is the essence of the **Registry Pattern**: a single, well-known location that everyone agrees to use. If you need a provider, you ask the registry — not the provider's source file directly.

### Lines 20-23: `registerProvider` — the writer

```ts
export function registerProvider(provider: Provider) {
  if (!provider || !provider.name) return;
  registry.set(provider.name, provider);
}
```

- The guard `if (!provider || !provider.name) return` is **defensive programming**. If someone passes `undefined`, `null`, or an object without a `name`, we silently skip it rather than crashing. This function is called during **app bootstrap** — a crash here would kill the entire application.
- `registry.set(provider.name, provider)` stores the provider object, keyed by its name (e.g., `"google"` → the google provider object).

### Lines 25-27: `getProvider` — single lookup

```ts
export function getProvider(name: ProviderName): Provider | undefined {
  return registry.get(name);
}
```

Returns `Provider | undefined` — if the name isn't registered, you get `undefined`, not an error. The caller must handle the undefined case. Currently **not used** by the router (it uses `getProvidersByNames` instead), but available for cases where you need a single provider by name.

### Lines 29-33: `getProvidersByNames` — the router's primary entry point

```ts
export function getProvidersByNames(names: ProviderName[]): Provider[] {
  return names
    .map((n) => registry.get(n))
    .filter((p): p is Provider => typeof p !== "undefined");
}
```

This is the function the router calls. Trace with `names = ['google', 'openrouter']`:

1. **`names.map((n) => registry.get(n))`** — Turns each name into a `Provider | undefined`. If `'openai'` isn't registered, it becomes `undefined`. Result: `(Provider | undefined)[]`.

2. **`.filter((p): p is Provider => typeof p !== "undefined")`** — The `(p): p is Provider` syntax is a **user-defined type guard**. It tells TypeScript: "After this filter returns `true`, narrow `p` from `Provider | undefined` to just `Provider`." Without this annotation, TypeScript would think the result is still `(Provider | undefined)[]`, forcing every consumer to handle `undefined`. The filter **silently drops** unregistered providers — intentional, because the policy might list providers not yet registered.

**Why filter instead of throw?** The policy might list all three providers, but only Google and OpenRouter are registered. The router should try the available ones and skip the rest. Throwing would abort the entire routing process.

### Lines 35-37: `listRegisteredProviders` — debugging helper

```ts
export function listRegisteredProviders(): string[] {
  return Array.from(registry.keys());
}
```

Used **only for error messages** in `model-router.ts` (line 69). When the router exhausts all providers, it includes what *is* registered so the developer can debug: *"Registered providers: [google, openrouter]"*.

### Import direction (the critical decoupling)

```
register-providers.ts ──imports──► google.ts, openrouter.ts, openai.ts
       │ (writes them into the registry)
       ▼
provider-registry.ts ◄──reads── model-router.ts
```

The **router imports the registry, NOT the providers**. The router says: "give me whatever is registered under the name `'google'`." Search `model-router.ts` and you'll find zero `import { googleProvider }`. The router has zero knowledge of the concrete provider files.

> **Key Takeaway**
> - The registry is a **singleton Map** at module scope — one instance, shared everywhere.
> - `import type` imports are erased at compile time — zero runtime overhead, prevents circular deps.
> - Type predicates (`(p): p is Provider`) let TypeScript narrow union types inside filter callbacks.
> - `registerProvider` silently ignores bad input — defensive during bootstrap.
> - `getProvidersByNames` converts an ordered name list to provider objects, silently skipping unregistered ones.
> - The router imports the registry, not the providers — this is the **decoupling** that makes the system extensible.

---

## File 5: `src/ai/providers/google.ts` — First Concrete Provider

```ts
import { createGoogle } from "@ai-sdk/google";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { GEMINI_MODELS } from "../constants/models";

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export function isGeminiConfigured(): boolean {
  return typeof GOOGLE_API_KEY === "string" && GOOGLE_API_KEY.trim().length > 0;
}

function createGoogleProviderInstance() {
  return createGoogle({
    apiKey: GOOGLE_API_KEY,
    name: "google.generative-ai",
  });
}

export const googleProvider: Provider = {
  name: PROVIDERS.GOOGLE,
  isConfigured: () => isGeminiConfigured(),
  getModel: () => {
    if (!isGeminiConfigured()) return null;
    const inst = createGoogleProviderInstance();
    return {
      model: inst.chat(GEMINI_MODELS.DEFAULT),
      modelId: GEMINI_MODELS.DEFAULT,
    };
  },
};

// Backwards-compat helper function kept so external callers don't break.
export function createGeminiModel() {
  return googleProvider.getModel()?.model ?? null;
}
```

### Lines 1-4: Imports — the dependency triangle

```ts
import { createGoogle } from "@ai-sdk/google";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { GEMINI_MODELS } from "../constants/models";
```

Three different kinds of imports, each serving a distinct purpose:

1. **`import { createGoogle } from "@ai-sdk/google"`** — A **runtime import** from the actual AI SDK package. Real executable code that creates the Google provider factory function.
2. **`import type { Provider } from "../router/provider-registry"`** — A **type-only import**. The provider imports the `Provider` type so TypeScript verifies `googleProvider` conforms to it. This is **not** a runtime import — erased by TypeScript. Critically, **there is no circular dependency**: the registry imports `ProviderName` from constants (type-only), and the provider imports `Provider` from the registry (type-only). At runtime, neither depends on the other's module loading.
3. **`import { PROVIDERS }` and `import { GEMINI_MODELS }`** — **Runtime imports** of constant values (actual strings like `"google"`, `"gemini-3.5-flash"`).

### Line 6: API key — read once at module load

```ts
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
```

Reads the env var **once at module load time**, not on every call. Why?

- **Performance**: `process.env` lookups are slower than local variables. Caching avoids repeated lookups.
- **Immutability**: Environment variables are set before the Node.js process starts and don't change during runtime.

Note the env var name: `GOOGLE_GENERATIVE_AI_API_KEY`. This is the **standard** env var name that `@ai-sdk/google` looks for. Setting `GOOGLE_API_KEY` instead would not be found by the SDK's automatic detection.

### Lines 8-10: `isGeminiConfigured` — the health check

```ts
export function isGeminiConfigured(): boolean {
  return typeof GOOGLE_API_KEY === "string" && GOOGLE_API_KEY.trim().length > 0;
}
```

Two checks:
1. **`typeof GOOGLE_API_KEY === "string"`** — `process.env.X` returns `string | undefined`. If the env var isn't set, it's `undefined`. This ensures we have a string.
2. **`GOOGLE_API_KEY.trim().length > 0`** — Ensures the key isn't empty or whitespace-only. An env var set to `"   "` (spaces) would pass check 1 but fail check 2.

Exported so other code can check configuration status directly (used in `ai/index.ts` public API exports).

### Lines 12-17: `createGoogleProviderInstance` — the SDK factory wrapper

```ts
function createGoogleProviderInstance() {
  return createGoogle({
    apiKey: GOOGLE_API_KEY,
    name: "google.generative-ai",
  });
}
```

- `createGoogle` is the factory from `@ai-sdk/google`. Returns a provider instance with `.chat()`, `.textEmbedding()`, etc.
- `apiKey` is passed explicitly (the SDK also auto-detects from env, but explicit is clearer and testable).
- `name` is a human-readable label used by the AI SDK in logging/debugging.

This is a **private** function (not exported). It's separated from `getModel()` for **lazy initialization** — the SDK instance is only created when `getModel()` is actually called, not when the module loads.

### Lines 19-30: `googleProvider` — the concrete Provider object

```ts
export const googleProvider: Provider = {
  name: PROVIDERS.GOOGLE,
  isConfigured: () => isGeminiConfigured(),
  getModel: () => {
    if (!isGeminiConfigured()) return null;
    const inst = createGoogleProviderInstance();
    return {
      model: inst.chat(GEMINI_MODELS.DEFAULT),
      modelId: GEMINI_MODELS.DEFAULT,
    };
  },
};
```

- `: Provider` — The type annotation **forces** TypeScript to verify this object matches the `Provider` interface. Add a field not in `Provider`? Remove one that is? Compile error.
- `name: PROVIDERS.GOOGLE` — Uses the canonical constant, not a raw string. Ensures the registry key matches what the policy expects.
- `isConfigured: () => isGeminiConfigured()` — Closure delegating to the health check. The router calls this **before** `getModel()`, avoiding SDK instance creation unnecessarily.
- `getModel: () => { ... }` — **Lazy initialization** pattern:

```text
getModel() called
    │
    ├── isGeminiConfigured()  ──► No ──► return null (router skips this provider)
    │                         ──► Yes ──► continue
    ▼
createGoogleProviderInstance()  ──► SDK instance created (only now!)
    │
    ▼
inst.chat(GEMINI_MODELS.DEFAULT) ──► Returns LanguageModelV4
    │
    ▼
return { model, modelId }
```

**Why return `null` instead of throwing?** If the API key is missing, `getModel()` returns `null`. The router sees `null`, treats it as "this provider can't help," and moves on to the next provider. Clean signal = "skip me." If it threw, the router's try/catch would catch it but pollute the error array unnecessarily.

### Lines 32-35: Backwards-compat helper

```ts
export function createGeminiModel() {
  return googleProvider.getModel()?.model ?? null;
}
```

- `?.model` — Optional chaining: if `getModel()` returns `null`, short-circuits to `undefined`.
- `?? null` — Nullish coalescing: if left side is `null`/`undefined`, returns `null`.
- This is a **backwards compatibility shim** — old code calling `createGeminiModel()` directly still works, while internally routing through the new provider pattern.

> **Key Takeaway**
> - Provider imports `Provider` via `import type` (no runtime circular dep), constants via runtime imports.
> - `isConfigured()` is a fast pre-check; `getModel()` is the actual model factory. Separating them is the **lazy initialization** pattern.
> - Returning `null` from `getModel()` when unconfigured is a **clean signal** that the router skips.
> - The `: Provider` type annotation is a **compile-time contract** — TypeScript verifies conformance at the declaration site.

---

## File 6: `src/ai/providers/openai.ts` — Second Concrete Provider

```ts
import { createOpenAI } from "@ai-sdk/openai";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { OPENAI_MODELS } from "../constants/models";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export function isOpenAIConfigured(): boolean {
  return typeof OPENAI_API_KEY === "string" && OPENAI_API_KEY.trim().length > 0;
}

function createOpenAIProviderInstance() {
  if (!isOpenAIConfigured()) return null;
  return createOpenAI({
    apiKey: OPENAI_API_KEY,
    name: "openai",
  });
}

export const openaiProvider: Provider = {
  name: PROVIDERS.OPENAI,
  isConfigured: () => isOpenAIConfigured(),
  getModel: () => {
    const inst = createOpenAIProviderInstance();
    if (!inst) return null;
    return {
      model: inst.chat(OPENAI_MODELS.DEFAULT),
      modelId: OPENAI_MODELS.DEFAULT,
    };
  },
};

export function createOpenAIModel() {
  return openaiProvider.getModel()?.model ?? null;
}
```

### Lines 1-4: Imports — same pattern, different provider

```ts
import { createOpenAI } from "@ai-sdk/openai";     // runtime: SDK factory function
import type { Provider } from "../router/provider-registry";  // type-only: contract
import { PROVIDERS } from "../constants/providers";           // runtime: "openai"
import { OPENAI_MODELS } from "../constants/models";          // runtime: "gpt-4o-mini"
```

**Same structure as `google.ts`** — this is the **contract working**. Both providers follow the exact same import pattern: one SDK import, one type import, two constant imports. This uniformity is intentional and makes the system predictable.

### Lines 6-10: Identical health check pattern

```ts
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export function isOpenAIConfigured(): boolean {
  return typeof OPENAI_API_KEY === "string" && OPENAI_API_KEY.trim().length > 0;
}
```

Compare with Google:
```ts
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
export function isGeminiConfigured(): boolean { ... }
```

**Same logic, different env var name** — `OPENAI_API_KEY` vs `GOOGLE_GENERATIVE_AI_API_KEY`. This is because each SDK looks for its own standard env var name. The pattern is identical: read once at module load, check `typeof === "string"` AND `.trim().length > 0`.

### Lines 12-18: `createOpenAIProviderInstance` — subtle difference

```ts
function createOpenAIProviderInstance() {
  if (!isOpenAIConfigured()) return null;  // ← NOTE: null check here too
  return createOpenAI({
    apiKey: OPENAI_API_KEY,
    name: "openai",
  });
}
```

**Key difference from Google**: Google's `createGoogleProviderInstance` does **not** check `isConfigured()` — it just creates the instance. OpenAI's version **does** check and returns `null` if not configured.

Why the difference? In Google's `getModel()`, the configuration check happens at the top:
```ts
getModel: () => {
  if (!isGeminiConfigured()) return null;  // checked here
  const inst = createGoogleProviderInstance();
  ...
}
```

In OpenAI's `getModel()`, the check is deferred to `createOpenAIProviderInstance()`:
```ts
getModel: () => {
  const inst = createOpenAIProviderInstance();  // checks internally, may return null
  if (!inst) return null;
  ...
}
```

Both approaches achieve the same result, but OpenAI's is slightly **more defensive** — if someone calls `createOpenAIProviderInstance()` directly (it's not exported, but hypothetically), they won't get a broken instance with `undefined` as the API key.

### Lines 20-32: `openaiProvider` — same shape, different model

```ts
export const openaiProvider: Provider = {
  name: PROVIDERS.OPENAI,
  isConfigured: () => isOpenAIConfigured(),
  getModel: () => {
    const inst = createOpenAIProviderInstance();
    if (!inst) return null;
    return {
      model: inst.chat(OPENAI_MODELS.DEFAULT),    // "gpt-4o-mini"
      modelId: OPENAI_MODELS.DEFAULT,
    };
  },
};
```

Identical structure to `googleProvider`:
- `name` uses `PROVIDERS.OPENAI`
- `isConfigured` delegates to the health check
- `getModel` lazily creates the instance, calls `.chat()` with the default model

The only difference is the constants used: `OPENAI_MODELS.DEFAULT` instead of `GEMINI_MODELS.DEFAULT`, and `PROVIDERS.OPENAI` instead of `PROVIDERS.GOOGLE`.

### Lines 34-37: Backwards-compat helper

Same pattern as Google:
```ts
export function createOpenAIModel() {
  return openaiProvider.getModel()?.model ?? null;
}
```

> **Key Takeaway**
> - `openai.ts` mirrors `google.ts` exactly — this **proves the contract works**. Same shape, same interface, different constants.
> - The OpenAI provider wraps the `null` check inside `createOpenAIProviderInstance()` rather than in `getModel()`. Both are valid; the contract only cares about the *external* behavior (return `ProviderResult | null`), not the internal organization.

---

## File 7: `src/ai/providers/openrouter.ts` — With Fallback Chain Logic

```ts
import { createOpenAI } from "@ai-sdk/openai";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { OPENROUTER_FALLBACK_MODELS } from "../constants/models";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_DEFAULT_BASE_URL;

export function isOpenRouterConfigured(): boolean {
  return (
    typeof OPENROUTER_API_KEY === "string" &&
    OPENROUTER_API_KEY.trim().length > 0
  );
}

function createOpenRouterProviderInstance() {
  if (!isOpenRouterConfigured()) return null;
  return createOpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    name: "openrouter",
  });
}

export const openrouterProvider: Provider = {
  name: PROVIDERS.OPENROUTER,
  isConfigured: () => isOpenRouterConfigured(),
  getModel: () => {
    if (!isOpenRouterConfigured()) return null;
    const inst = createOpenRouterProviderInstance();
    if (!inst) return null;
    for (const modelId of OPENROUTER_FALLBACK_MODELS) {
      try {
        const model = inst.chat(modelId);
        return { model, modelId };
      } catch (error) {
        console.warn(`OpenRouter model ${modelId} failed to initialize:`, error instanceof Error ? error.message : String(error));
        continue;
      }
    }
    console.error("OpenRouter: All fallback models failed to initialize");
    return null;
  },
};

export function createOpenRouterModel(modelId: string) {
  const inst = createOpenRouterProviderInstance();
  if (!inst) return null;
  return inst.chat(modelId);
}
```

### Lines 1-4: Imports — note the shared SDK

```ts
import { createOpenAI } from "@ai-sdk/openai";  // ← SAME SDK factory as OpenAI!
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { OPENROUTER_FALLBACK_MODELS } from "../constants/models";
```

**Key insight**: OpenRouter uses `createOpenAI` from `@ai-sdk/openai` — the **same** factory as OpenAI. Why? Because OpenRouter is **OpenAI-compatible** — it speaks the same API. The only difference is the `baseURL`:

```
OpenAI:      https://api.openai.com/v1
OpenRouter:  https://openrouter.ai/v1
```

By reusing `createOpenAI`, we avoid a separate `@ai-sdk/openrouter` dependency.

### Lines 7-9: Base URL resolution with optional chaining

```ts
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_DEFAULT_BASE_URL;
```

- `OPENROUTER_API_KEY` — Read once, same pattern as other providers.
- `OPENROUTER_BASE_URL` — Uses **optional chaining** (`?.`) + **logical OR** (`||`):
  1. `process.env.OPENROUTER_BASE_URL?.trim()` — If the env var exists, trim it. If `undefined`, the whole expression is `undefined` (thanks to `?.`).
  2. `... || OPENROUTER_DEFAULT_BASE_URL` — If left side is falsy (`undefined`, empty string), fall back to the default URL.
  This allows overriding the OpenRouter endpoint (useful for testing/proxies/self-hosted) while defaulting to production.

### Lines 27-60: `openrouterProvider` — the fallback chain

```ts
getModel: () => {
  if (!isOpenRouterConfigured()) return null;
  const inst = createOpenRouterProviderInstance();
  if (!inst) return null;

  // Try each model in the fallback chain
  for (const modelId of OPENROUTER_FALLBACK_MODELS) {
    try {
      const model = inst.chat(modelId);
      return { model, modelId };
    } catch (error) {
      console.warn(`OpenRouter model ${modelId} failed:`, error instanceof Error ? error.message : String(error));
      continue;
    }
  }

  console.error("OpenRouter: All fallback models failed to initialize");
  return null;
},
```

#### The fallback loop — the heart of failover

```text
getModel() called
  │
  ├── isConfigured() ──► No ──► return null
  │
  ▼
createOpenRouterProviderInstance() ──► null? ──► return null
  │
  │ YES (instantiated)
  ▼
┌─────────────────────────────────────────────┐
│ for (const modelId of OPENROUTER_FALLBACK_MODELS) │
│                                             │
│   [1] "nvidia/nemotron-3-ultra-550b:free"   │
│       ├── inst.chat(modelId)                │
│       ├── SUCCESS ──► return { model, id }  │ ← FIRST WINNER
│       └── FAILS ──► console.warn + continue  │
│                                             │
│   [2] "poolside/laguna-s-2.1:free"          │
│       ├── inst.chat(modelId)                │
│       ├── SUCCESS ──► return { model, id }  │
│       └── FAILS ──► console.warn + continue  │
│                                             │
│   [3-6] ... more fallbacks ...              │
│                                             │
│   All failed ──► console.error + return null│
└─────────────────────────────────────────────┘
```

#### Key design decisions in the fallback loop

1. **Why try-catch inside the loop?** Because `inst.chat(modelId)` can throw if the model name is invalid or the API rejects it. Each model is tried independently — a failure for one model should **not** prevent trying the next.

2. **Why `continue` instead of `break`?** `continue` moves to the **next** model in the chain. `break` would stop the loop entirely. We want to try all models, so `continue` is correct.

3. **Why return on the first success?** The fallback chain is **ordered by preference**. The first model (`PRIMARY`) is the best choice. If it works, we use it. Only if it fails do we consider fallbacks. Returning the first success respects the priority order.

4. **Why `console.warn` for individual failures but `console.error` for total failure?** Individual model failures are expected (a model might be temporarily down) — `warn` is appropriate. But if **all** models fail, that's a real problem — `error` is appropriate. However, the function still returns `null` (not throw), because the router will handle the "no model available" case by trying the next provider.

5. **Why return `null` at the end instead of throwing?** Same principle as other providers: return `null` to signal "I couldn't produce a model." The router will then try the next provider in its policy order.

### Lines 62-67: Backwards-compat helper with parameter

```ts
export function createOpenRouterModel(modelId: string) {
  const inst = createOpenRouterProviderInstance();
  if (!inst) return null;
  return inst.chat(modelId);
}
```

Note this takes a `modelId` parameter — unlike Google/OpenAI helpers which use the default. Because OpenRouter supports many models, a caller might want a specific one. Returns the raw `LanguageModelV4` directly (not wrapped in `ProviderResult`).

> **Key Takeaway**
> - OpenRouter reuses `createOpenAI` because it's OpenAI-compatible — only `baseURL` differs.
> - The fallback loop: try one model, catch errors, `continue` to next. First success wins.
> - `console.warn` per failure, `console.error` for total failure — but still returns `null`.
> - Returning `null` (not throwing) lets the router's failover mechanism work.

---

## Files 8-9: `src/ai/policies/development.ts` and `production.ts` — The Strategy Data

These two files define the **routing strategies** as simple data objects.

### `src/ai/policies/development.ts`

```ts
import type { ModelPolicy } from "./index";
import { PROVIDERS } from "../constants/providers";

export const developmentPolicy: ModelPolicy = {
  name: "development",
  providerOrder: [PROVIDERS.GOOGLE, PROVIDERS.OPENROUTER],
};
```

### `src/ai/policies/production.ts`

```ts
import type { ModelPolicy } from "./index";
import { PROVIDERS } from "../constants/providers";

export const productionPolicy: ModelPolicy = {
  name: "production",
  providerOrder: [PROVIDERS.OPENAI, PROVIDERS.OPENROUTER, PROVIDERS.GOOGLE],
};
```

> **Note**: The README's Part 3 summary showed `developmentPolicy` with `providerOrder: ['google', 'openrouter', 'openai']` (three providers). The **actual code** has only two (`GOOGLE`, `OPENROUTER`) — OpenAI is excluded from development. This is a deliberate design choice: development uses free/cheap providers (Google free tier, OpenRouter free models), while production uses paid/higher-quality providers (OpenAI first).

### Line 1: Type-only import from sibling

```ts
import type { ModelPolicy } from "./index";
```

Both policy files import the `ModelPolicy` type from `./index` (their own folder's barrel file). This is a **type-only import** — erased at runtime. The `ModelPolicy` type lives in `index.ts` (we'll cover that next), and these files reference it to get type checking on their objects.

### Line 2: Provider constants

```ts
import { PROVIDERS } from "../constants/providers";
```

Runtime import — brings the actual string values (`"google"`, `"openrouter"`, `"openai"`) so they can be used as array elements.

### The `providerOrder` arrays — the Strategy in data form

**development**: `[PROVIDERS.GOOGLE, PROVIDERS.OPENROUTER]`
- Try Google first (free tier during development).
- Fall back to OpenRouter (free models during development).
- OpenAI is **not** in the list — because in development you want free options.

**production**: `[PROVIDERS.OPENAI, PROVIDERS.OPENROUTER, PROVIDERS.GOOGLE]`
- Try OpenAI first (paid, high-quality, most reliable for production).
- Fall back to OpenRouter (free/paid, OpenAI-compatible).
- Fall back to Google (gemini, as last resort).

**Why use `PROVIDERS.GOOGLE` instead of `"google"`?**

```ts
// What the code does:
providerOrder: [PROVIDERS.GOOGLE, PROVIDERS.OPENROUTER]

// vs. what it could have done:
providerOrder: ["google", "openrouter"]
```

Using `PROVIDERS.GOOGLE` instead of the raw string `"google"` means:
- If someone misspells it, TypeScript catches it (it's an autocomplete-assisted constant, not a free-form string).
- If you rename a provider, you change it in one place (`providers.ts`) and all references update.
- It visually documents that these are provider names from the canonical `PROVIDERS` object.

### How this enables the Strategy pattern

The router code is **identical** regardless of environment. It always does:
1. Get the policy for the environment.
2. Loop through `policy.providerOrder`.
3. Try each provider.

The **only thing that changes** between dev and prod is the data in `providerOrder`. This is the Strategy pattern: **the algorithm is fixed; the strategy (data) varies.**

> **Key Takeaway**
> - Policies are **pure data** — no logic, just a name and an ordered list of provider names.
> - Development policy has 2 providers (free options); production has 3 (paid options first).
> - Using `PROVIDERS.*` constants instead of raw strings gives compile-time safety.
> - Changing the strategy = changing data, not rewriting code.

---

## File 10: `src/ai/policies/index.ts` — Policy Type & Environment Selector

```ts
import { developmentPolicy } from "./development";
import { productionPolicy } from "./production";
import { ENVIRONMENTS, type Environment } from "../constants/environment";
import type { ProviderName } from "../constants/providers";

export type ModelPolicy = {
  name: string;
  providerOrder: ProviderName[]; // ordered list of provider names
};

export function getPolicyForEnvironment(env: Environment | undefined): ModelPolicy {
  const environment = env === ENVIRONMENTS.PRODUCTION
    ? ENVIRONMENTS.PRODUCTION
    : ENVIRONMENTS.DEVELOPMENT;

  return environment === ENVIRONMENTS.PRODUCTION
    ? productionPolicy
    : developmentPolicy;
}

export { developmentPolicy, productionPolicy };
```

### Lines 1-4: Imports — pulling it all together

```ts
import { developmentPolicy } from "./development";
import { productionPolicy } from "./production";
import { ENVIRONMENTS, type Environment } from "../constants/environment";
import type { ProviderName } from "../constants/providers";
```

This file is the **bridge** between the constants layer and the policies layer:

1. **`import { developmentPolicy }` / `import { productionPolicy }`** — Runtime imports of the two policy data objects we just studied. These are the **concrete strategies**.

2. **`import { ENVIRONMENTS, type Environment } from "../constants/environment"`** — A **mixed import**: `ENVIRONMENTS` is a runtime value (the object with `"production"` and `"development"`), while `Environment` is a type (the union `"production" | "development"`). This syntax (`import { value, type TypeName } from "..."`) is TypeScript 4.5+ feature that allows mixing type and value imports from the same module in a single statement.

3. **`import type { ProviderName } from "../constants/providers"`** — Type-only import. Used in the `ModelPolicy` type definition to constrain `providerOrder` to valid provider names.

### Lines 6-9: The `ModelPolicy` type

```ts
export type ModelPolicy = {
  name: string;
  providerOrder: ProviderName[]; // ordered list of provider names
};
```

This is the **Strategy interface**. It defines the shape that every policy must have:

- `name: string` — A human-readable label (e.g., `"development"`, `"production"`). Used for logging/debugging.
- `providerOrder: ProviderName[]` — An **ordered array** of provider names. The order is the priority: index 0 is tried first, index 1 is the first fallback, etc.

**Why `ProviderName[]` and not `string[]`?** Because `ProviderName` is `"google" | "openrouter" | "openai"`. If someone accidentally writes `providerOrder: ["googgle", "openrouter"]`, TypeScript catches the typo. With `string[]`, any string would be accepted, including invalid provider names.

### Lines 11-15: `getPolicyForEnvironment` — the strategy selector

```ts
export function getPolicyForEnvironment(env: Environment | undefined): ModelPolicy {
  const environment = env === ENVIRONMENTS.PRODUCTION
    ? ENVIRONMENTS.PRODUCTION
    : ENVIRONMENTS.DEVELOPMENT;

  return environment === ENVIRONMENTS.PRODUCTION
    ? productionPolicy
    : developmentPolicy;
}
```

This function embodies two key design decisions:

**Decision 1: Default to development**

```ts
const environment = env === ENVIRONMENTS.PRODUCTION
  ? ENVIRONMENTS.PRODUCTION
  : ENVIRONMENTS.DEVELOPMENT;
```

If `env` is `"production"`, use production. If `env` is **anything else** (including `undefined`, `"development"`, `"staging"`, etc.), default to **development**. This is a **safe fallback**: development policies use free/cheap providers, so if you're unsure or not in production, you won't accidentally charge money.

**Decision 2: Simple ternary lookup**

```ts
return environment === ENVIRONMENTS.PRODUCTION
  ? productionPolicy
  : developmentPolicy;
```

Two environments → two policies → a single ternary. This is intentionally simple. If we had more environments (staging, qa, etc.), this is where we'd replace the ternary with a lookup table or switch statement.

**What would break if removed?** The router imports `ModelPolicy` and `getPolicyForEnvironment` from here. Without this file, the router has no way to:
- Know the shape of a policy (no `ModelPolicy` type)
- Select a policy for a given environment (no `getPolicyForEnvironment`)

### Lines 17: Re-export

```ts
export { developmentPolicy, productionPolicy };
```

Re-exports the two policies so consumers can import them directly from `./policies` without importing from the individual files. This is a **barrel file** pattern — `index.ts` aggregates and re-exports everything from the folder.

**Who uses these re-exports?** Potentially tests, or code that wants to explicitly select a policy outside the environment-based default. The router itself doesn't use these directly — it goes through `getPolicyForEnvironment`.

> **Key Takeaway**
> - `ModelPolicy` is the **Strategy interface** — just a name + ordered provider list.
> - `getPolicyForEnvironment` defaults to development (safe: don't charge in non-prod).
> - `ProviderName[]` (not `string[]`) in the type catches typos at compile time.
> - This file is the **bridge**: it imports constants (runtime + type) and policies (runtime), and exports the type + selector.
> - `index.ts` barrel file pattern — consumers import from the folder, not individual files.

---

## File 11: `src/ai/router/register-providers.ts` — The Composition Root for Registration

```ts
import { registerProvider } from "./provider-registry";
import { googleProvider } from "../providers/google";
import { openrouterProvider } from "../providers/openrouter";
import { openaiProvider } from "../providers/openai";

let builtInProvidersRegistered = false;

export function registerBuiltInProviders() {
  if (builtInProvidersRegistered) return;

  registerProvider(googleProvider);
  registerProvider(openrouterProvider);
  registerProvider(openaiProvider);

  builtInProvidersRegistered = true;
}

// This module should be imported and executed once during app bootstrap.
// It is intentionally kept separate from ModelRouter so the router remains pure.

export { registerProvider } from "./provider-registry";
```

### Lines 1-4: Imports — the registration chain

```ts
import { registerProvider } from "./provider-registry";
import { googleProvider } from "../providers/google";
import { openrouterProvider } from "../providers/openrouter";
import { openaiProvider } from "../providers/openai";
```

This file is the **only** place that imports concrete provider implementations (`googleProvider`, `openrouterProvider`, `openaiProvider`). Every other file stays decoupled:

```
register-providers.ts ──imports──► google.ts, openrouter.ts, openai.ts
       │ (writes them into the registry)
       ▼
provider-registry.ts ◄──reads── model-router.ts
```

The router never imports the concrete providers. It only interacts with the registry. `register-providers.ts` is the **bridge** that injects concrete providers into the generic registry.

### Line 6: The idempotency guard

```ts
let builtInProvidersRegistered = false;
```

This is a **module-scoped boolean** that tracks whether registration has already happened. It starts `false` and is set to `true` after the first registration.

### Lines 8-16: `registerBuiltInProviders` — idempotent registration

```ts
export function registerBuiltInProviders() {
  if (builtInProvidersRegistered) return;

  registerProvider(googleProvider);
  registerProvider(openrouterProvider);
  registerProvider(openaiProvider);

  builtInProvidersRegistered = true;
}
```

**Idempotency** means "calling this function multiple times has the same effect as calling it once." The guard at the top (`if (builtInProvidersRegistered) return`) ensures that even if this function is called 10 times, the providers are registered exactly once.

**Why do we need idempotency?** Because `ai/index.ts` calls `registerBuiltInProviders()` at module scope (line 40), and that module might be imported from multiple places in the application. Without the guard, every import would re-register all providers, potentially creating duplicate registry entries.

**What would happen without the guard?** The `Map.set()` in `registerProvider` would overwrite the existing entry with the same key, so it wouldn't create duplicates per se — but it would be wasteful (re-importing provider modules, re-creating provider objects). The guard is an optimization and a safety measure.

### Line 21: Re-export for convenience

```ts
export { registerProvider } from "./provider-registry";
```

Re-exports `registerProvider` so external code (e.g., plugins, tests) can register custom providers through the same path: `import { registerProvider } from "@/ai"` → register-providers.ts → provider-registry.ts.

> **Key Takeaway**
> - `register-providers.ts` is the **only** file that imports concrete provider implementations.
> - The idempotency guard (`builtInProvidersRegistered`) prevents double-registration.
> - Called once at app bootstrap (via `ai/index.ts`), but safe to call multiple times.
> - Re-exports `registerProvider` so external code can register custom providers.

---

## File 12: `src/ai/router/model-router.ts` — THE Core Router

```ts
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { getPolicyForEnvironment, type ModelPolicy } from "../policies";
import {
  getProvidersByNames,
  listRegisteredProviders,
  type Provider,
} from "./provider-registry";
import { ENVIRONMENTS, type Environment } from "../constants/environment";

export type ModelRouterEnvironment = Environment;

export interface ModelRouterContext {
  environment?: ModelRouterEnvironment;
}

export type RoutingResult = {
  model: LanguageModelV4;
  provider: string;
  modelId?: string;
};

function resolveEnvironment(context?: ModelRouterContext): ModelRouterEnvironment {
  if (context?.environment === ENVIRONMENTS.PRODUCTION)
    return ENVIRONMENTS.PRODUCTION;
  if (context?.environment === ENVIRONMENTS.DEVELOPMENT)
    return ENVIRONMENTS.DEVELOPMENT;
  return process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION
    ? ENVIRONMENTS.PRODUCTION
    : ENVIRONMENTS.DEVELOPMENT;
}

export class ModelRouter {
  async getModel(context?: ModelRouterContext): Promise<LanguageModelV4> {
    return (await this.getRoutingResult(context)).model;
  }

  async getRoutingResult(context?: ModelRouterContext): Promise<RoutingResult> {
    const environment = resolveEnvironment(context);
    const policy: ModelPolicy = getPolicyForEnvironment(environment);
    const providers: Provider[] = getProvidersByNames(policy.providerOrder);

    const errors: Array<Error | string> = [];

    for (const prov of providers) {
      try {
        if (!prov.isConfigured()) {
          continue;
        }
        const result = prov.getModel();
        if (result) {
          return {
            model: result.model,
            provider: prov.name,
            modelId: result.modelId,
          };
        }
      } catch (err) {
        errors.push(err instanceof Error ? err : String(err));
      }
    }

    const registered = listRegisteredProviders().join(", ");
    const errorDetail =
      errors.length > 0
        ? ` Errors: ${errors.map((e) => String(e)).join("; ")}`
        : "";

    throw new Error(
      `ModelRouter failed to select a model for environment '${environment}'. Registered providers: [${registered}].` +
        errorDetail,
    );
  }
}
```

### Lines 1-8: Imports — the full stack assembled

```ts
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { getPolicyForEnvironment, type ModelPolicy } from "../policies";
import {
  getProvidersByNames,
  listRegisteredProviders,
  type Provider,
} from "./provider-registry";
import { ENVIRONMENTS, type Environment } from "../constants/environment";
```

This is where **all the layers converge**. The router imports from five different places:

1. **`import type { LanguageModelV4 } from "@ai-sdk/provider"`** — Type-only. The return type of `getModel()`. Every provider returns this type. This is the **common contract**.
2. **`import { getPolicyForEnvironment, type ModelPolicy } from "../policies"`** — Mixed import. `getPolicyForEnvironment` is a runtime function (the strategy selector); `ModelPolicy` is a type (the strategy interface). The router uses the function to pick a strategy, and the type to annotate the variable.
3. **`import { getProvidersByNames, listRegisteredProviders, type Provider } from "./provider-registry"`** — Mixed import. Two runtime functions (`getProvidersByNames` for resolving provider names to objects, `listRegisteredProviders` for error messages) and one type (`Provider`, used to type the `providers` array).
4. **`import { ENVIRONMENTS, type Environment } from "../constants/environment"`** — Mixed import. `ENVIRONMENTS` is the runtime constant object (for string comparisons); `Environment` is the type (for `resolveEnvironment`'s return type).

**Critical observation**: The router imports **zero** provider implementations. No `import { googleProvider }`. It only knows about providers through the **registry's** `getProvidersByNames` function. This is the **decoupling** in action.

### Lines 10-20: Public types

```ts
export type ModelRouterEnvironment = Environment;

export interface ModelRouterContext {
  environment?: ModelRouterEnvironment;
}

export type RoutingResult = {
  model: LanguageModelV4;
  provider: string;
  modelId?: string;
};
```

**`ModelRouterEnvironment`** — A **type alias** re-export of `Environment`. This lets consumers import the type from the router module without needing to know about the constants layer. It's a **facade** — the router's public API doesn't leak the internal constant structure.

**`ModelRouterContext`** — The input to `getModel()` and `getRoutingResult()`. Currently only has one field: `environment?`. This allows the caller to explicitly specify which environment's policy to use. If omitted, the router auto-detects via `process.env.NODE_ENV`.

**`RoutingResult`** — The full output of the routing decision. It includes:
- `model: LanguageModelV4` — The actual model object to use.
- `provider: string` — Which provider was selected (e.g., `"google"`, `"openrouter"`).
- `modelId?: string` — Which specific model was selected (e.g., `"gemini-3.5-flash"`).

This is richer than what `getModel()` returns (just the `LanguageModelV4`). The `getRoutingResult()` method exists for callers who need to know **which** provider/model was chosen — for logging, metrics, or cost tracking.

### Lines 22-32: `resolveEnvironment` — the decision function

```ts
function resolveEnvironment(context?: ModelRouterContext): ModelRouterEnvironment {
  if (context?.environment === ENVIRONMENTS.PRODUCTION)
    return ENVIRONMENTS.PRODUCTION;
  if (context?.environment === ENVIRONMENTS.DEVELOPMENT)
    return ENVIRONMENTS.DEVELOPMENT;
  return process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION
    ? ENVIRONMENTS.PRODUCTION
    : ENVIRONMENTS.DEVELOPMENT;
}
```

This function implements a **3-level priority** for environment resolution:

```text
resolveEnvironment() called
  │
  ├── Level 1: Explicit context override
  │   context?.environment === "production" ──► "production"
  │   context?.environment === "development" ──► "development"
  │
  ├── Level 2: Auto-detect from NODE_ENV
  │   process.env.NODE_ENV === "production" ──► "production"
  │   otherwise ──► "development" (safe default)
  │
  └── Result: always "production" or "development"
```

- **Level 1** uses `context?.environment` (optional chaining) — if the caller explicitly says "production," we respect that.
- **Level 2** falls back to `process.env.NODE_ENV` — if the Node.js runtime is in production mode, use the production policy.
- **Level 3** defaults to **development** — safe default (free providers, won't charge money).

The function is **private** (not exported). It's an internal implementation detail of the router. External code calls `getModel()` or `getRoutingResult()` and passes a `ModelRouterContext`; the environment resolution is the router's job.

### Lines 34-37: `getModel` — the simple public API

```ts
export class ModelRouter {
  async getModel(context?: ModelRouterContext): Promise<LanguageModelV4> {
    return (await this.getRoutingResult(context)).model;
  }
```

`getModel()` is a **thin wrapper** around `getRoutingResult()`. It exists for the common case where the caller just wants the model and doesn't care about which provider/model was selected. The return type is `Promise<LanguageModelV4>` — the exact type the AI SDK expects for calling `.generateText()`, `.streamText()`, etc.

**Why `await` inside?** Because `getRoutingResult()` is `async` (returns a Promise), we must `await` it before accessing `.model`. The `await` suspends this function until the routing is complete.

> **Key Takeaway**
> - `ModelRouterEnvironment` is a type alias — a facade so consumers don't need to import from constants.
> - `ModelRouterContext` has an optional `environment` field — explicit override capability.
> - `RoutingResult` includes provider and modelId metadata (richer than just the model).
> - `resolveEnvironment` is a 3-level cascade: explicit context → NODE_ENV → default to development.
> - `getModel` is a convenience wrapper returning just the model for simple use cases.

### Lines 39-79: `getRoutingResult` — the routing engine

```ts
async getRoutingResult(context?: ModelRouterContext): Promise<RoutingResult> {
  const environment = resolveEnvironment(context);
  const policy: ModelPolicy = getPolicyForEnvironment(environment);
  const providers: Provider[] = getProvidersByNames(policy.providerOrder);

  const errors: Array<Error | string> = [];

  for (const prov of providers) {
    try {
      if (!prov.isConfigured()) {
        continue;
      }
      const result = prov.getModel();
      if (result) {
        return {
          model: result.model,
          provider: prov.name,
          modelId: result.modelId,
        };
      }
    } catch (err) {
      errors.push(err instanceof Error ? err : String(err));
    }
  }

  const registered = listRegisteredProviders().join(", ");
  const errorDetail =
    errors.length > 0
      ? ` Errors: ${errors.map((e) => String(e)).join("; ")}`
      : "";

  throw new Error(
    `ModelRouter failed to select a model for environment '${environment}'. Registered providers: [${registered}].` +
      errorDetail,
  );
}
```

This is the **core algorithm** — the execution engine that follows the Strategy pattern's plan. Let me walk through every line:

#### Step 1-3: Resolve environment → policy → providers

```ts
const environment = resolveEnvironment(context);           // "production" or "development"
const policy: ModelPolicy = getPolicyForEnvironment(environment);  // The strategy data
const providers: Provider[] = getProvidersByNames(policy.providerOrder);  // → [Provider, Provider, ...]
```

This is a **3-level transformation chain**:

```text
context? ──► resolveEnvironment() ──► "production" | "development"
                  │
                  ▼
    getPolicyForEnvironment() ──► ModelPolicy { name, providerOrder: ["openai", "openrouter", "google"] }
                  │
                  ▼
getProvidersByNames(providerOrder) ──► [openaiProvider, openrouterProvider, googleProvider]
                  │
                  ▼
         The routing loop below iterates over these Provider objects
```

- `resolveEnvironment` decides which environment we're in (from the context or NODE_ENV).
- `getPolicyForEnvironment` picks the right **Strategy** (the data: which providers to try, in what order).
- `getProvidersByNames` **resolves** those provider names into actual `Provider` objects by looking them up in the registry.

At this point, the router has everything it needs: a concrete list of `Provider` objects to try, in priority order.

#### Step 4: Error collection array

```ts
const errors: Array<Error | string> = [];
```

This array collects errors from providers that **throw** during `getModel()`. But note: most failures are handled by returning `null` (not throwing), so this array is usually empty. It's a **safety net** for unexpected runtime errors.

**Why `Array<Error | string>`?** Because JavaScript's `catch` clause catches `unknown` in strict TypeScript. We convert every caught value to either an `Error` object or a `string`:
```ts
errors.push(err instanceof Error ? err : String(err));
```
This normalizes the error types so we can `.join("; ")` them later in the error message.

#### Step 5: The routing loop — the failover engine

```ts
for (const prov of providers) {
  try {
    if (!prov.isConfigured()) {
      continue;              // ← Skip: provider not configured
    }
    const result = prov.getModel();
    if (result) {
      return {              // ← SUCCESS: return the model
        model: result.model,
        provider: prov.name,
        modelId: result.modelId,
      };
    }
    // ← null result: try next provider
  } catch (err) {
    errors.push(err instanceof Error ? err : String(err));  // ← Error: collect and continue
  }
}
```

The loop implements **3 possible outcomes per provider**:

| Outcome | How | What happens |
|---------|-----|-------------|
| **Not configured** | `isConfigured()` returns `false` | `continue` — skip to next provider silently |
| **Configured but failed** | `getModel()` returns `null` | Fall through to next iteration — no error recorded |
| **Configured but threw** | `getModel()` throws | Caught by `catch`, error collected, continue to next |
| **Success** | `getModel()` returns a `ProviderResult` | **Return immediately** with the model |

**Why `continue` for unconfigured instead of throwing?** Because an unconfigured provider is an **expected state**, not an error. In development, only Google and OpenRouter might be set up — OpenAI is simply skipped, not an error. Throwing would make the entire system fragile.

**Why collect errors but not log them inside the loop?** Because the router's job is to **route**, not to **report**. If the first provider fails but the second succeeds, the caller never needs to know about the failure. Logging errors silently when a fallback eventually works would create noise.

#### Step 6: Error reporting — the "all providers failed" case

```ts
const registered = listRegisteredProviders().join(", ");
const errorDetail =
  errors.length > 0
    ? ` Errors: ${errors.map((e) => String(e)).join("; ")}`
    : "";

throw new Error(
  `ModelRouter failed to select a model for environment '${environment}'. Registered providers: [${registered}].` +
    errorDetail,
);
```

If the loop completes without returning (all providers failed), we throw an **informative error**:

1. `listRegisteredProviders().join(", ")` — Lists what providers **are** registered (e.g., `"google, openrouter"`). Tells the developer: "You have these providers, but none could produce a model."
2. `errors.map((e) => String(e)).join("; ")` — If any providers **threw** (not just returned null), their error messages are joined and appended. This is the **only** time errors are surfaced to the caller.
3. The **concatenated message** gives the developer everything needed to debug: environment, registered providers, and any errors.

**Why throw here?** Unlike per-provider `null` returns (which mean "try the next provider"), reaching this point means **all** providers were exhausted. There is no fallback left. Throwing is correct — the caller needs to know routing failed entirely.

> **Key Takeaway**
> - The 3-step chain: `resolveEnvironment` → `getPolicyForEnvironment` → `getProvidersByNames` transforms context into a list of Provider objects.
> - The loop has 4 outcomes per provider: skip (not configured), try-next (null), return (success), catch+collect (threw).
> - Errors are collected silently during the loop — only surfaced if **all** providers fail.
> - `continue` for unconfigured = "expected state, not an error."
> - Throwing at the end = "all fallbacks exhausted, caller must handle."

---

## File 13: `src/ai/index.ts` — The Bootstrap / Composition Root

```ts
import { registerBuiltInProviders } from "./router/register-providers";

export { ModelRouter } from "./router/model-router";

export {
  createGeminiModel,
  isGeminiConfigured,
  googleProvider,
} from "./providers/google";
export {
  createOpenRouterModel,
  isOpenRouterConfigured,
  openrouterProvider,
} from "./providers/openrouter";
export {
  createOpenAIModel,
  isOpenAIConfigured,
  openaiProvider,
} from "./providers/openai";
export {
  registerBuiltInProviders,
  registerProvider,
  registerProvider as registerProviders,
} from "./router/register-providers";

registerBuiltInProviders();
```

### Line 9: Import the registration function

```ts
import { registerBuiltInProviders } from "./router/register-providers";
```

Standard runtime import of the idempotent function from File 11.

### Line 11: Export the router

```ts
export { ModelRouter } from "./router/model-router";
```

The **primary public export**. The rest of the app does:

```ts
import { ModelRouter } from "@/ai";
const router = new ModelRouter();
const model = await router.getModel();
```

The barrel file (`index.ts`) re-exports `ModelRouter` so consumers import from `@/ai` (clean) instead of `@/ai/router/model-router` (deep, fragile path).

### Lines 14-33: Re-export backwards-compat helpers

These re-export the **backwards-compatibility helpers** and **health check functions** from each provider. This preserves the existing public API — code that previously imported `createGeminiModel` from `@/ai/providers/google` can now import from `@/ai`.

### Lines 35-37: Re-export registration utilities

```ts
export {
  registerBuiltInProviders,
  registerProvider,
  registerProvider as registerProviders,
} from "./router/register-providers";
```

`registerProvider as registerProviders` is an **alias** — exports the same function under a plural name for API ergonomics.

### Line 40: `registerBuiltInProviders()` — the bootstrap trigger

```ts
registerBuiltInProviders();
```

**The most important line in the file.** It calls registration at **module scope** — it runs **immediately when this module is first imported**.

```text
App imports "@/ai/index.ts"
    │
    ▼
registerBuiltInProviders() executes  (guarded: runs only once)
    │
    ├── imports google.ts → creates googleProvider
    ├── imports openrouter.ts → creates openrouterProvider
    ├── imports openai.ts → creates openaiProvider
    │
    ├── registerProvider(googleProvider)      → registry Map: "google" → googleProvider
    ├── registerProvider(openrouterProvider)  → registry Map: "openrouter" → openrouterProvider
    ├── registerProvider(openaiProvider)      → registry Map: "openai" → openaiProvider
    │
    └── builtInProvidersRegistered = true
```

**Why at module scope?** Automatic registration — the moment anything imports from `@/ai`, providers are registered. No manual setup step. The composition root is the only place that knows about both providers and the registry — everything else stays decoupled.

> **Key Takeaway**
> - `index.ts` is the **barrel file** — clean imports (`@/ai`) instead of deep paths.
> - `registerBuiltInProviders()` at module scope = automatic registration on first import.
> - The composition root is the only file that imports both providers and the registry.
> - The `builtInProvidersRegistered` guard (in File 11) makes this safe even if `@/ai` is imported from multiple places.

---

## File 14: Request Flow — `const model = await router.getModel()`

This diagram traces a **successful request** from the caller all the way through the router to the model:

```text
Caller: const model = await router.getModel()

  ┌─────────────────────────────────────────────────────────┐
  │ Step 1: resolveEnvironment(context?)                     │
  │   context?.environment === "production"  ──► "production"│
  │   context?.environment === "development" ──► "development"│
  │   (no context) → process.env.NODE_ENV === "production" │
  │                                   ──► "production"      │
  │                          else ──► "development" (default)│
  └───────────────┬─────────────────────────────────────────┘
                  │ environment = "production"
                  ▼
  ┌─────────────────────────────────────────────────────────┐
  │ Step 2: getPolicyForEnvironment(environment)             │
  │   "production" ──► productionPolicy                        │
  │                  { name: "production",                      │
  │                    providerOrder: ["openai","openrouter",  │
  │                                  "google"] }               │
  └───────────────┬─────────────────────────────────────────┘
                  │ policy = productionPolicy
                  ▼
  ┌─────────────────────────────────────────────────────────┐
  │ Step 3: getProvidersByNames(policy.providerOrder)       │
  │   "openai"      ──► registry.get("openai")     ──► openaiProvider  │
  │   "openrouter"  ──► registry.get("openrouter") ──► openrouterProvider│
  │   "google"      ──► registry.get("google")     ──► googleProvider   │
  │   Result: [openaiProvider, openrouterProvider, googleProvider]│
  └───────────────┬─────────────────────────────────────────┘
                  │ providers = [Provider, Provider, Provider]
                  ▼
  ┌─────────────────────────────────────────────────────────┐
  │ Step 4: Loop through providers (FAILOVER ENGINE)        │
  │                                                         │
  │   ┌── Provider 1: openaiProvider                        │
  │   │   isConfigured() ──► false (no OPENAI_API_KEY)      │
  │   │   continue  (skip silently — not an error)          │
  │   └────────────────────────────────────────────────────│
  │                                                         │
  │   ┌── Provider 2: openrouterProvider                    │
  │   │   isConfigured() ──► true (OPENROUTER_API_KEY set)    │
  │   │   getModel() ──► try model 1 ──► SUCCESS             │
  │   │   ──► return { model, provider: "openrouter",       │
  │   │            modelId: "nvidia/nemotron-3-ultra:free" } │
  │   └──────────────────────────────────────────────────│
  │                                                         │
  │   Provider 3: googleProvider (never reached)            │
  │   (loop returns on first success, so we skip the rest)   │
  └───────────────┬─────────────────────────────────────────┘
                  │ routingResult = { model, provider, modelId }
                  ▼
  ┌─────────────────────────────────────────────────────────┐
  │ Step 5: getModel() extracts routingResult.model          │
  │   return routingResult.model  (type: LanguageModelV4)    │
  └─────────────────────────────────────────────────────────┘

Caller receives: model (LanguageModelV4)
  → can now call: model.generateText(...), model.streamText(...), etc.
```

### What if OpenRouter also fails?

```text
  ┌── Provider 1: openaiProvider
  │   isConfigured() ──► false ──► continue
  │
  ┌── Provider 2: openrouterProvider
  │   isConfigured() ──► true
  │   getModel()
  │     ├── try "nvidia/nemotron-3-ultra:free" ──► throws → catch → console.warn + continue
  │     ├── try "poolside/laguna-s-2.1:free" ──► throws → catch → console.warn + continue
  │     ├── try "nvidia/nemotron-3-super-120b:free" ──► throws → catch
  │     ├── try "cohere/north-mini-code:free" ──► throws → catch
  │     ├── try "google/gemma-4-26b:free" ──► throws → catch
  │     ├── try "openai/gpt-oss-20b:free" ──► throws → catch
  │     └── All models failed ──► return null
  │   result === null ──► continue (try next provider)
  │
  ┌── Provider 3: googleProvider
  │   isConfigured() ──► true
  │   getModel() ──► SUCCESS
  │   ──► return { model, provider: "google", modelId: "gemini-3.5-flash" }
  │
  └── Caller receives Google model (total failover: openai → openrouter → google)
```

---

## File 15: Registration Flow — App Startup

When does registration happen? **Exactly once per application lifetime**, triggered by the first import of `@/ai`.

```text
[App Startup]
     │
     ▼
Something imports from "@/ai" (e.g., the coding agent)
     │
     ▼
Node.js resolves → src/ai/index.ts
     │
     ├── Module body begins executing
     │
     ├── Line 9: import registerBuiltInProviders from "../router/register-providers"
     │     │
     │     ├── Node.js resolves register-providers.ts
     │     │     ├── Line 1: import registerProvider from "../router/provider-registry"
     │     │     │     → Loads provider-registry.ts (creates the Map, defines functions)
     │     │     │
     │     │     ├── Line 2: import googleProvider from "../providers/google"
     │     │     │     → Loads google.ts (reads env vars, creates googleProvider object)
     │     │     │
     │     │     ├── Line 3: import openrouterProvider from "../providers/openrouter"
     │     │     │     → Loads openrouter.ts (reads env vars, creates openrouterProvider object)
     │     │     │
     │     │     ├── Line 4: import openaiProvider from "../providers/openai"
     │     │     │     → Loads openai.ts (reads env vars, creates openaiProvider object)
     │     │     │
     │     │     └── Built-in providers module fully loaded
     │     │
     │     └── register-providers.ts fully loaded
     │
     ├── Index module continues loading
     ├── Line 11: export ModelRouter (re-export)
     ├── Lines 14-33: re-export all backwards-compat helpers
     ├── Line 35-37: re-export registration utilities
     │
     └── LAST LINE: registerBuiltInProviders()
             │
             ├── Guard check: builtInProvidersRegistered? ──► false (first time)
             │
             ├── registerProvider(googleProvider)
             │     → registry.set("google", googleProvider)
             │     → registry Map now: { "google" → googleProvider }
             │
             ├── registerProvider(openrouterProvider)
             │     → registry Map now: { "google" → ..., "openrouter" → ... }
             │
             ├── registerProvider(openaiProvider)
             │     → registry Map now: { "google" → ..., "openrouter" → ..., "openai" → ... }
             │
             └── builtInProvidersRegistered = true
                 (future calls to registerBuiltInProviders() return early)

[Registry is now populated — all subsequent router calls can find providers by name]
```

**Order of operations during startup:**

1. **Module loading** — Node.js resolves and executes `index.ts` (and its import chain). Provider modules are loaded, which reads environment variables at module-scope.
2. **Object creation** — Each provider module creates its `Provider` object (e.g., `googleProvider`). These objects contain closures that reference env vars but **don't** create SDK instances yet (lazy initialization).
3. **Registration** — `registerBuiltInProviders()` is called, which inserts each provider object into the registry `Map`.
4. **Ready** — The registry is now populated. `new ModelRouter()` can be called anywhere, and `router.getModel()` will find providers.

**Second import of `@/ai`** (from a different file):

```text
Someone else imports "@/ai"
     │
     ▼
Node.js returns the CACHED module (modules are cached by default)
     │
     ▼
No code re-executes. registerBuiltInProviders() is NOT called again.
(Even if it were, the idempotency guard would skip it.)
```

> **Key Takeaway**
> - Registration happens **once** at first import of `@/ai`, via `registerBuiltInProviders()` at module scope.
> - Node.js **module caching** ensures the import chain only runs once.
> - The idempotency guard is a **belt-and-suspenders** safety: even if module caching were bypassed (unlikely), double registration is prevented.
> - Provider objects are created during module loading but SDK instances are **lazily** created in `getModel()`.

---

## File 16: Practical Scenarios

### Scenario A: Development environment, Google configured, OpenRouter configured

**Setup:** `NODE_ENV=development`, `GOOGLE_GENERATIVE_AI_API_KEY` set, `OPENROUTER_API_KEY` set, `OPENAI_API_KEY` not set.

**Step-by-step:**

1. `router.getModel()` called with no context.
2. `resolveEnvironment(undefined)` → no explicit context → `NODE_ENV !== "production"` → `"development"`.
3. `getPolicyForEnvironment("development")` → `developmentPolicy` → `providerOrder: ["google", "openrouter"]`.
4. `getProvidersByNames(["google", "openrouter"])` → `[googleProvider, openrouterProvider]`.
5. **Iteration 1**: `googleProvider` → `isConfigured() = true` → `getModel()` → success → **return** Google's `gemini-3.5-flash` model.
6. **Iteration 2**: Never reached.

**Result**: Caller gets Google's `gemini-3.5-flash`. **Why Google?** Development policy puts Google first. First configured + working provider wins.

---

### Scenario B: Production environment, only OpenRouter configured

**Setup:** `NODE_ENV=production`, `OPENAI_API_KEY` not set, `OPENROUTER_API_KEY` set, `GOOGLE_GENERATIVE_AI_API_KEY` not set.

1. `resolveEnvironment()` → `"production"`.
2. `getPolicyForEnvironment("production")` → `providerOrder: ["openai", "openrouter", "google"]`.
3. `getProvidersByNames(["openai", "openrouter", "google"])` → all three providers.
4. **Iteration 1**: `openaiProvider` → `isConfigured() = false` → `continue` (silently skipped).
5. **Iteration 2**: `openrouterProvider` → `isConfigured() = true` → `getModel()` → first fallback model succeeds → **return**.
6. **Iteration 3**: Never reached.

**Result**: Caller gets OpenRouter's model, even though OpenAI was first. **Why doesn't it fail?** Unconfigured providers are silently skipped — the policy defines *priority order*, not *requirement*.

---

### Scenario C: Development, Google throws error, OpenRouter works

**Setup:** `NODE_ENV=development`, `GOOGLE_GENERATIVE_AI_API_KEY` set (so `isConfigured() = true`), but Google API is **rate-limited** — `inst.chat(...)` throws. `OPENROUTER_API_KEY` set.

1. `resolveEnvironment()` → `"development"`.
2. `getPolicyForEnvironment("development")` → `providerOrder: ["google", "openrouter"]`.
3. `getProvidersByNames(["google", "openrouter"])` → `[googleProvider, openrouterProvider]`.
4. **Iteration 1**: `googleProvider`
   - `isConfigured()` → `true` (API key present)
   - `getModel()` called inside `try` block
   - Inside `getModel()`: creates SDK instance → `inst.chat(...)` → **throws** (rate-limited)
   - `catch (err)` catches it → `errors.push(err)` — Google's error collected
   - `result` never assigned → `if (result)` never reached → loop continues
5. **Iteration 2**: `openrouterProvider`
   - `isConfigured()` → `true`
   - `getModel()` → first fallback model succeeds → **return** OpenRouter model
6. **Result**: OpenRouter model returned. The `errors` array had 1 entry (Google's error), but since OpenRouter succeeded, the error is **discarded** — the final `throw` is never reached.

**Failover in action**: Google was configured and tried first, but it threw. Error was caught and collected. Router silently moved to OpenRouter, which succeeded. Caller never knows Google failed.

**The `errors` array** in this scenario has 1 entry. But since the loop returns successfully on the second provider, the errors are never surfaced. They're only used if all providers fail.

---

### Scenario D: No providers configured

**Setup:** `NODE_ENV=development`, none of the API keys are set. All three provider objects are still registered (because `registerBuiltInProviders()` always runs at import).

1. `resolveEnvironment()` → `"development"`.
2. `getPolicyForEnvironment("development")` → `providerOrder: ["google", "openrouter"]`.
3. `getProvidersByNames(["google", "openrouter"])` → both providers returned (they're registered).
4. **Iteration 1**: `googleProvider` → `isConfigured() = false` → `continue` (silently skipped).
5. **Iteration 2**: `openrouterProvider` → `isConfigured() = false` → `continue` (silently skipped).
6. **Loop exits** — all providers exhausted.
7. **Error path**:
   - `registered = listRegisteredProviders().join(", ")` → `"google, openrouter, openai"` (all three are *registered*)
   - `errors.length === 0` → `errorDetail = ""` (no errors thrown, just nulls returned)
   - **Throws**: `Error("ModelRouter failed to select a model for environment 'development'. Registered providers: [google, openrouter, openai].")`

**Why this is correct**: The error message includes:
- The environment (`'development'`) — which policy was used
- Registered providers (`[google, openrouter, openai]`) — providers are registered but not configured
- No error details (since no errors were thrown)

This tells the developer: *"I'm in development mode, my providers are registered, but I probably forgot to set my API keys."*

---

## File 17: Design Decisions (Advanced)

#### 18. Why async methods when providers are synchronous?

```ts
async getModel(context?: ModelRouterContext): Promise<LanguageModelV4> {
  return (await this.getRoutingResult(context)).model;
}
```

The methods are `async` and return `Promise<>`, but `resolveEnvironment()`, `getPolicyForEnvironment()`, `getProvidersByNames()`, and `prov.getModel()` are all **synchronous**. So why `async`?

**Future-proofing for async provider initialization.** The current providers read `process.env` synchronously, but a future provider might need to:
- Fetch configuration from a remote API
- Validate API keys asynchronously
- Warm up a connection pool

By making the router `async` now, future async providers can be added **without changing the router's interface**. Every caller already `await`s `getModel()`.

**API consistency.** If some methods were sync and others async, callers would have to remember which ones to `await`. Making everything `Promise`-based is predictable.

#### 19. Why return `null` from providers instead of throwing?

The router's loop has two failure channels:

| Signal | Meaning | Router behavior |
|--------|---------|----------------|
| `null` return | "I'm not available — try the next" | Silently skip to next provider |
| `throw` | "Something went wrong — try the next" | Catch, collect error, continue |

Providers return `null` for **expected** conditions (API key missing, env var not set). They throw for **unexpected** conditions (SDK initialization failed, model name is wrong).

The router's `catch` block collects thrown errors but **discards them if a later provider succeeds**. If all providers throw, the errors are included in the final error message. If all providers return `null`, the error message says "none were configured."

This is **separation of concerns**: providers report **availability**, the router decides **what to do**.

#### 20. Why collect errors but not log them in the router?

```ts
const errors: Array<Error | string> = [];
// ... errors collected in catch blocks ...
// ... only if ALL providers fail:
throw new Error(... + (errors.length > 0 ? `Errors: ${errors.join("; ")}` : ""));
```

The router **collects** errors silently and **only surfaces them** in the final thrown error (when all providers fail). Why not `console.error` each failure as it happens?

Because the router's job is to **route**, not to **report**. If the first provider fails but the second succeeds, the caller never needs to know. Logging would create noise on every failover. Errors are only shown when there's a **total failure** and the developer needs to debug.

Note: OpenRouter **does** log its own per-model failures (`console.warn`) inside `getModel()`. That's appropriate because those are internal to the provider — the provider is trying multiple models and the developer should see which ones failed. The router, by contrast, is trying different *providers* — if one fails and another succeeds, that's a **normal failover**, not a debugging signal.

#### 21. Why not just use if-else statements instead of policies?

```ts
// What NOT to do:
if (env === "production") {
  if (isConfigured("openai")) return openai.chat("gpt-4o-mini");
  if (isConfigured("openrouter")) return openrouter.chat("...");
} else {
  if (isConfigured("google")) return google.chat("gemini-3.5-flash");
  if (isConfigured("openrouter")) return openrouter.chat("...");
}
```

Problems with this approach:
- **Violates Open/Closed Principle**: To add a new environment (staging), you must modify the router. Every new environment = new `if/else` branch.
- **Hard to test**: You can't easily inject a fake policy. You'd have to mock env vars.
- **Logic scattered**: Environment selection is mixed with provider iteration.
- **Can't change dynamically**: The order is hardcoded; can't read it from a config file.

With policies as data:
- **Open/Closed**: Add a new environment = create a new policy file → no router changes.
- **Testable**: Inject a fake policy object directly.
- **Separated concerns**: Router executes; policy decides.
- **Extensible**: `providerOrder` could come from a database in the future.

> **Key Takeaway**
> - `async`/`Promise` is **future-proofing** — today's providers are sync, but tomorrow's might need async init.
> - `null` = "not available" (expected, silent); `throw` = "error" (unexpected, collected). Separation of concerns.
> - Errors collected silently, only surfaced on total failure — clean failover without noise.
> - Policies as data (not if/else) = Open/Closed Principle, testability, dynamic configurability.

---

## File 18: Extension Points — How to Add New Providers and Environments

### 23. How to add a new provider (e.g., Anthropic)

**Step-by-step guide:**

#### Step 1: Add the provider name to constants

```ts
// src/ai/constants/providers.ts
export const PROVIDERS = {
  GOOGLE: "google",
  OPENROUTER: "openrouter",
  OPENAI: "openai",
  ANTHROPIC: "anthropic",       // ← NEW
} as const;
```

The `ProviderName` type automatically updates to include `"anthropic"`.

#### Step 2: Add model constants

```ts
// src/ai/constants/models.ts
export const ANTHROPIC_MODELS = {
  DEFAULT: "claude-3-5-sonnet-20241022",
} as const;
```

#### Step 3: Create the provider implementation

```ts
// src/ai/providers/anthropic.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Provider } from "../router/provider-registry";
import { PROVIDERS } from "../constants/providers";
import { ANTHROPIC_MODELS } from "../constants/models";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export function isAnthropicConfigured(): boolean {
  return typeof ANTHROPIC_API_KEY === "string" && ANTHROPIC_API_KEY.trim().length > 0;
}

function createAnthropicProviderInstance() {
  if (!isAnthropicConfigured()) return null;
  return createAnthropic({ apiKey: ANTHROPIC_API_KEY, name: "anthropic" });
}

export const anthropicProvider: Provider = {
  name: PROVIDERS.ANTHROPIC,
  isConfigured: () => isAnthropicConfigured(),
  getModel: () => {
    const inst = createAnthropicProviderInstance();
    if (!inst) return null;
    return {
      model: inst.chat(ANTHROPIC_MODELS.DEFAULT),
      modelId: ANTHROPIC_MODELS.DEFAULT,
    };
  },
};
```

This is a copy-paste of `openai.ts` with provider-specific names changed. The **contract** is identical — that's the point.

#### Step 4: Register the provider

```ts
// src/ai/router/register-providers.ts
export function registerBuiltInProviders() {
  if (builtInProvidersRegistered) return;

  registerProvider(googleProvider);
  registerProvider(openrouterProvider);
  registerProvider(openaiProvider);
  registerProvider(anthropicProvider);   // ← NEW
  builtInProvidersRegistered = true;
}
```

Import and register it.

#### Step 5: Add to policies (optional, if you want it in the failover chain)

```ts
// src/ai/policies/production.ts
providerOrder: [PROVIDERS.ANTHROPIC, PROVIDERS.OPENAI, PROVIDERS.OPENROUTER, PROVIDERS.GOOGLE],
```

**What stays unchanged?**

| File | Status |
|------|--------|
| `provider-registry.ts` | **Unchanged** — the `Provider` type and registry functions never change. |
| `model-router.ts` | **Unchanged** — the routing loop is provider-agnostic. |
| `ai/index.ts` | Only needs to re-export new provider helpers (optional). |
| `policies/index.ts` | **Unchanged** — `ModelPolicy` type doesn't change. |
| `policies/development.ts` | **Unchanged** — unless you want Anthropic in dev. |

**The rule**: You only touch the files that are **unique** to the new provider. Everything else is generic and stays the same. This is the **Open/Closed Principle** in action.

---

### 24. How to add a new environment (e.g., "staging")

**Step-by-step:**

#### Step 1: Add the environment constant

```ts
// src/ai/constants/environment.ts
export const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  STAGING: "staging",       // ← NEW
} as const;
```

The `Environment` type automatically updates to include `"staging"`.

#### Step 2: Create the policy file

```ts
// src/ai/policies/staging.ts
import type { ModelPolicy } from "./index";
import { PROVIDERS } from "../constants/providers";

export const stagingPolicy: ModelPolicy = {
  name: "staging",
  providerOrder: [PROVIDERS.OPENAI, PROVIDERS.GOOGLE, PROVIDERS.OPENROUTER],
};
```

#### Step 3: Wire it into the selector

```ts
// src/ai/policies/index.ts
import { stagingPolicy } from "./staging";

export function getPolicyForEnvironment(env: Environment | undefined): ModelPolicy {
  if (env === ENVIRONMENTS.PRODUCTION) return productionPolicy;
  if (env === ENVIRONMENTS.STAGING) return stagingPolicy;       // ← NEW
  return developmentPolicy;
}
```

**What stays unchanged?**
- `model-router.ts` — No changes. The router calls `getPolicyForEnvironment()` and gets back a `ModelPolicy`. It doesn't care how many environments exist.
- The `ModelPolicy` type — Still just `{ name, providerOrder }`.
- All provider implementations — Unchanged.

**This is extensibility**: adding a new environment touches only the environment constants, a new policy file, and the selector. The router stays the same.

---

### 25. How to add provider-specific logic (e.g., retry logic)

**Where does it go?** Inside the **provider file**, not in the router.

```ts
// src/ai/providers/openrouter.ts (concept)
getModel: () => {
  if (!isOpenRouterConfigured()) return null;
  const inst = createOpenRouterProviderInstance();
  if (!inst) return null;

  for (const modelId of OPENROUTER_FALLBACK_MODELS) {
    // RETRY LOGIC:
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = inst.chat(modelId);
        return { model, modelId };
      } catch (error) {
        if (attempt < 2) {
          console.warn(`Retrying ${modelId} (attempt ${attempt + 1}/3)...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        console.warn(`OpenRouter model ${modelId} failed after 3 attempts`);
        continue;  // try next model in the fallback chain
      }
    }
  }
  return null;
},
```

**Why keep it in the provider, not the router?**

1. **Encapsulation** — Retry logic is specific to OpenRouter's API (rate limits, model availability). The router shouldn't know about these provider-specific concerns.
2. **Single Responsibility** — The router's job is to pick a provider. Each provider's job is to be the best representative of that provider's API.
3. **Provider independence** — Google might not need retry logic; only OpenRouter does. Keeping it in the provider means only OpenRouter pays the complexity cost.
4. **The contract stays the same** — `getModel()` still returns `ProviderResult | null`. The router doesn't need to change to support retries.

> **Key Takeaway**
> - Adding a provider: 4 steps (constants, models, provider file, register). Router untouched.
> - Adding an environment: 3 steps (constant, policy file, selector). Router untouched.
> - Provider-specific logic (retries, rate-limit handling) lives **inside the provider**, not the router.
> - The `Provider` interface is the stable contract — everything else is extensible.

---

## File 19: Common Pitfalls (What Beginners Get Wrong)

### Pitfall 1: Importing providers directly instead of using the router

```ts
// ❌ WRONG: bypasses the router entirely
import { googleProvider } from "@/ai/providers/google";
const model = googleProvider.getModel()?.model;
```

**Why it's wrong:** No failover — if Google fails, the app crashes instead of trying OpenRouter. No environment awareness — always uses Google. Bypasses the abstraction — calling code is coupled to a specific provider.

```ts
// ✅ CORRECT: go through the router
import { ModelRouter } from "@/ai";
const router = new ModelRouter();
const model = await router.getModel();
```

### Pitfall 2: Forgetting to `await` async methods

```ts
// ❌ WRONG: getModel() returns a Promise, not the model
const model = router.getModel();
await model.generateText(...);  // TypeError: model.generateText is not a function
```

`getModel()` is `async` — returns `Promise<LanguageModelV4>`, not `LanguageModelV4`. You must `await` it.

### Pitfall 3: Not understanding why providers return `null`

**Null is intentional** — it means "I'm not available, try the next provider." Throwing on `null` destroys the failover mechanism.

### Pitfall 4: Coupling application code to specific providers

If you later want to use OpenRouter instead of Google, you have to find and change every import. The abstraction leaks.

### Pitfall 5: Adding provider logic to the router

```ts
// ❌ WRONG: provider-specific logic leaks into the router
if (prov.name === "openrouter") { /* retry logic */ }
if (prov.name === "google") { /* fallback logic */ }
```

This destroys the abstraction. The router should be **generic** — it doesn't know or care what each provider is.

> **Key Takeaway**
> - Always go through the router, never import providers directly.
> - Always `await` async methods — `getModel()` returns a `Promise`.
> - `null` from a provider = "skip me," not "error." Don't throw on it.
> - Keep provider-specific knowledge in the provider file, not the router.
> - The router is intentionally generic — don't add provider `if` checks to it.

## File 20: Summary & Mental Models

### How all 13 files connect (the complete picture)

| # | File | Layer | Role | Imports from | Exports |
|---|------|-------|------|-------------|---------|
| 1 | `constants/environment.ts` | L1 | Env names | — | `ENVIRONMENTS`, `Environment` |
| 2 | `constants/providers.ts` | L1 | Provider names | — | `PROVIDERS`, `ProviderName` |
| 3 | `constants/models.ts` | L1 | Model IDs | — | `GEMINI_MODELS`, `OPENAI_MODELS`, `OPENROUTER_*` |
| 4 | `router/provider-registry.ts` | L2 | Contract + Map lookup | `LanguageModelV4` (type), `ProviderName` (type) | `Provider`, `ProviderResult`, `registerProvider`, `getProvidersByNames` |
| 5 | `providers/google.ts` | L3 | Google impl | `createGoogle`, `Provider` (type), `PROVIDERS`, `GEMINI_MODELS` | `googleProvider`, `isGeminiConfigured` |
| 6 | `providers/openai.ts` | L3 | OpenAI impl | `createOpenAI`, `Provider` (type), `PROVIDERS`, `OPENAI_MODELS` | `openaiProvider`, `isOpenAIConfigured` |
| 7 | `providers/openrouter.ts` | L3 | OpenRouter + fallback | `createOpenAI`, `Provider` (type), `PROVIDERS`, `OPENROUTER_FALLBACK_MODELS` | `openrouterProvider`, `isOpenRouterConfigured` |
| 8 | `policies/development.ts` | L4 | Dev strategy | `ModelPolicy` (type), `PROVIDERS` | `developmentPolicy` |
| 9 | `policies/production.ts` | L4 | Prod strategy | `ModelPolicy` (type), `PROVIDERS` | `productionPolicy` |
| 10 | `policies/index.ts` | L4 | Policy type + selector | policies, `ENVIRONMENTS`, `ProviderName` (type) | `ModelPolicy`, `getPolicyForEnvironment` |
| 11 | `router/register-providers.ts` | L5 | Registration bootstrap | `registerProvider`, all 3 providers | `registerBuiltInProviders` (idempotent) |
| 12 | `router/model-router.ts` | L6 | Router class | `LanguageModelV4` (type), `ModelPolicy`, `getPolicyForEnvironment`, `getProvidersByNames`, `Provider` (type), `ENVIRONMENTS` | `ModelRouter`, `ModelRouterContext`, `RoutingResult` |
| 13 | `ai/index.ts` | L7 | Composition root + barrel | `registerBuiltInProviders`, `ModelRouter`, all helpers | Everything re-exported + calls `registerBuiltInProviders()` |

**Golden rule**: each layer imports only from layers **below** it (lower numbers). No lateral or upward imports.

### Clear mental models

| Component | Like a... | Why |
|-----------|-----------|-----|
| **The Registry** | A warehouse | You put providers in by name ("google" → google shelf), router asks the warehouse for a specific shelf. Warehouse doesn't care what's on the shelf. |
| **The Router** | An air traffic controller | Planes (providers) have different availability. Controller tries preferred runway first, redirects if closed. Passenger (app) just wants to land. |
| **The Policy** | A recipe | Says "try ingredient A first, then B, then C." Chef (router) follows the recipe. Change the recipe = no code changes. |
| **Providers** | Specialized workers | Each has a badge (name), self-check (isConfigured), and specialty (getModel). They hide their tools. |
| **`as const`** | A precision stamp | Stamps the type as "literal" so TypeScript knows the exact value, not "some string." |
| **`import type`** | A blueprint | Blueprint (type) gets torn up after construction — zero runtime weight. |
| **Type predicate** | A bouncer | `(p): p is Provider` checks IDs: "You're `Provider \| undefined`? `undefined` — stay out. `Provider` — come through." |
| **Idempotency guard** | A "seen" stamp | Second call? "Already done, skip it." |

### Design Principles in Action

| Principle | Where it lives |
|-----------|----------------|
| **Dependency Inversion** | Router depends on `Provider` (interface), not `googleProvider` (implementation) |
| **Open/Closed** | Adding a provider → touch 4 files. Router untouched. |
| **Single Responsibility** | Registry = lookup. Providers = API calls. Policies = strategy data. Router = orchestration. |
| **Separation of Concerns** | Error collection (router) vs. logging (provider). Routing (router) vs. strategy (policy). |
| **Composition Root** | `index.ts` is the only place that wires concrete providers into the abstract registry |

### When to use this pattern (and when NOT to)

**Use when:**
- ✅ Multiple interchangeable services providing the same capability
- ✅ Automatic failover between services needed
- ✅ Services should be swappable without touching consumer code
- ✅ Environment-specific routing strategies needed

**Don't use when:**
- ❌ Exactly one service, never changing (unnecessary indirection)
- ❌ Need provider-specific APIs (abstraction hides features)
- ❌ Microsecond-level performance critical (registry lookup overhead)
- ❌ Services fundamentally different in capability

> **Final Key Takeaway**
> - The Model Router is a **layered architecture**: constants → registry → providers → policies → registration → router → bootstrap.
> - Each layer imports only from layers **below** it — no lateral or upward dependencies.
> - The **composition root** (`index.ts`) is the only file that knows about **all** layers.
> - Every pattern (Registry, Strategy, Composition Root, Open/Closed, Dependency Inversion) is independently motivated and serves a specific purpose.

</details>

</details>

---

# Responsibility of Each Layer

## Next.js + tRPC

Responsible for:

- Receiving user prompts
- Input validation
- Triggering background jobs

It should **never** execute long-running AI tasks.

---

## Inngest

Responsible for long-running execution.

It manages:

- Background jobs
- Retries
- Scheduling
- Error recovery
- Job orchestration

It does **not** perform reasoning.

---

## ToolLoopAgent

This is the brain of the workflow.

Its responsibility is:



The agent continues until it decides the task is complete.

---

## LLM

The LLM is responsible **only for reasoning**.

It decides:

- Which tool should be called
- In what order
- With what arguments

The model **never executes code directly**.

---

## Custom Tools

Every capability exposed to the AI is implemented as a normal TypeScript function.

Examples:



The model simply decides **when** to invoke them.

---

## E2B

E2B acts as the remote development machine.

It is responsible for:

- Creating isolated environments
- Writing files
- Running shell commands
- Installing packages
- Running development servers
- Returning preview URLs

---

# Dynamic Model Routing

Instead of binding the agent to a single model, we introduce a dedicated **Model Router**.

The agent never communicates directly with Gemini or OpenRouter.

Instead:



This makes the entire AI layer provider-agnostic.

---

# Why a Model Router?

The router gives us complete flexibility.

It can:

- Switch providers
- Handle rate limits
- Support future models
- Select models dynamically

without changing the rest of the application.

---

# Runtime Failover

One of the biggest improvements in our architecture is automatic provider failover.

Example:



The user never notices the switch.

The agent simply continues.

---

# Why This Works

The conversation history is **owned by the ToolLoopAgent**, not by the AI provider.

The provider is only responsible for generating the next reasoning step.

Conceptually:



Changing providers does **not** mean losing the conversation.

---

# Runtime Memory vs Persistent Memory

An important architectural distinction.

## Runtime Memory

Owned by ToolLoopAgent.

Contains:

- Messages
- Tool calls
- Tool results
- Intermediate reasoning

This memory exists **only while the current agent execution is running**.

When the execution finishes, this memory disappears.

---

## Persistent Memory

Owned by our application.

Stored inside PostgreSQL.

Examples:

- Projects
- Generations
- Conversations
- Tool execution logs
- Sandbox IDs
- Generated files
- Preview URLs

Persistent memory allows users to:

- Continue a project later
- Replay generations
- Resume failed executions
- View previous agent activity

---

# Why OpenRouter?

During development we will primarily use OpenRouter's free models.

Benefits:

- Avoid Gemini free-tier rate limits.
- Easily switch between different free models.
- Provider-agnostic architecture.
- No application code changes when switching providers.

Only the router configuration changes.

---

# Future Expansion

The architecture allows adding any future provider without changing the agent.

Examples:

- Gemini
- OpenRouter
- Groq
- OpenAI
- Anthropic
- xAI
- DeepSeek

The rest of the system remains identical.

---

# Why We Like This Architecture

Compared to using AgentKit directly, our architecture provides:

- ✅ Completely provider agnostic
- ✅ Free development workflow
- ✅ Dynamic model failover
- ✅ Clean separation of concerns
- ✅ Modern Vercel AI SDK Agent API
- ✅ Easy future migration to any provider
- ✅ Full compatibility with Inngest
- ✅ Easier debugging
- ✅ Easier testing
- ✅ Better understanding of autonomous agents

---

# Core Mental Models

## An agent is a loop



---

## Inngest is **not** the agent

Inngest is responsible for **running** the workflow.

ToolLoopAgent is responsible for **thinking**.

---

## The LLM is **not** the computer

The model cannot:

- create files
- install packages
- execute commands

It only decides **which tool** should perform those actions.

---

## Tools are normal TypeScript functions

There is nothing magical about tools.

A tool is simply a function that the AI is allowed to invoke.

---

## The provider is replaceable

The agent should never know whether it is talking to:

- Gemini
- OpenRouter
- Claude
- GPT
- Groq

Only the Model Router knows this.

---

# Final Design Principles

1. Keep the AI layer provider-agnostic.
2. Separate reasoning from execution.
3. Let ToolLoopAgent own the execution loop.
4. Let Inngest own background processing.
5. Let E2B own code execution.
6. Let the Model Router own provider selection and failover.
7. Persist project state in the database, not inside the agent.
8. Build every capability as a reusable tool.
9. Design for extensibility from day one.
10. Optimize for understanding first, implementation second.

> **Final Takeaway**
>
> We are not building an application around a specific AI model.
>
> We are building an autonomous coding platform where the **agent**, **model provider**, **execution environment**, and **background orchestration** are all independent, replaceable layers.
>
> This modular architecture makes Vibe easier to maintain, cheaper to develop, and ready to adopt future AI models with minimal changes.

</details>

---

_This README documents our current understanding. More sections will be added as we continue._
