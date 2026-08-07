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
