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

### 2 vs 3 - Key Distinction

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
