# Prefetching Concepts

## Overview

Prefetching is the practice of fetching data **before** it's actually needed, so that when a user navigates to a page, the data is already available and the page renders instantly.

## Your Project's Pattern

Your project uses a **two-tier prefetch strategy** split across a client "trigger" page and a server-rendered detail page:

### 1. Trigger Page — `app/page.tsx` (Client Component)

The root page is a `"use client"` component. On submit it fires `project.create` and, in `onSuccess`, navigates to the new project's route:

```tsx
const createProject = useMutation(
  trpc.project.create.mutationOptions({
    onSuccess: (data) => {
      toast.success("Build started!");
      setPrompt("");
      router.push(`/projects/${data.id}`);   // ← navigate (no manual refetch needed)
    },
    onError: (error) => {
      toast.error(`Failed to start build: ${error.message}`);
    },
  }),
);
```

> Note: This page does **not** manually refetch the project or its messages. It trusts the *destination page* (`/projects/[id]`) to prefetch its own data on load — see the next section.

### 2. Detail Page — `app/projects/[projectId]/page.tsx` (Server Component)

This is where the real prefetch work happens. The page is a **Server Component** (no `"use client"`), so it pre-fetches both the project and its messages **during SSR** and ships the hydrated cache to the client. This advanced pattern is fully documented below in **The SSR + Suspense Prefetch Pattern**.

## Prefetching Strategies

| Strategy | When it Happens | Best For |
|---|---|---|
| **Link prefetch** | When link renders/hovered | Navigation between pages |
| **`router.prefetch()`** | Called manually | Conditional/programmatic |
| **`useQuery` on queryOptions** | On component mount | Data depending on URL params |
| **`generateStaticParams`** | At build time | Known static routes only |

## Key Takeaways

- ✅ **Server speed**: `page.tsx` prefetches messages (and validates project via getOne) during SSR, results hydrated into client cache
- ✅ **Client flexibility**: `message-card.tsx` is a `use client` component using `useSuspenseQuery` — fully interactive, no extra fetch for messages
- ✅ **Best of both**: Fast initial render from SSR data + reactive client UI with zero double-fetch for the consumed (messages) query
- ✅ **Cache isolation**: Each request gets its own `QueryClient`; each `[projectId]` fetch is keyed separately

---

## The SSR + Suspense Prefetch Pattern

Boss, this is the **advanced pattern** now in your codebase — combining Server-Side Prefetching with React `Suspense` and `useSuspenseQuery`. It gives you **the speed of server-side rendering and the flexibility of client-side components**.

### Where It Lives

- **Server Component**: `src/app/projects/[projectId]/page.tsx`
- **Client Component**: `src/modules/projects/ui/views/project-view.tsx`

### The Implementation

```tsx
// ┌─────────────────────────────────────────────┐
// │  SERVER: page.tsx (Server Component)         │
// └─────────────────────────────────────────────┘
async function Page({ params }) {
  const { projectId } = await params;
  const queryClient = getQueryClient();

  // Fixed flow (see docs): await + fetchQuery + notFound()
  await queryClient.prefetchQuery(
    trpc.messages.getMany.queryOptions({ projectId }),
  );

  try {
    await queryClient.fetchQuery(            // 🔹 Required: await + throw on error
      trpc.project.getOne.queryOptions({ id: projectId }),
    );
  } catch (error) {
    if (
      (error instanceof TRPCError && error.code === "NOT_FOUND") ||
      (error instanceof Error && (error as any).code === "NOT_FOUND")
    ) {
      notFound();                            // 🔸 Unknown project → real 404
    }
    throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>  // 🔹 Serialize cache
      <Suspense fallback="loading...">                  // 🔸 Safety-net fallback
        <ProjectView projectId={projectId} />          // 🔹 Client layout
      </Suspense>
    </HydrationBoundary>
  );
}

// ┌─────────────────────────────────────────────┐
// │  CLIENT: project-view.tsx ("use client")    │
// │  NOTE: ProjectView is a LAYOUT only. It     │
// │  does NOT query project.getOne itself.      │
// └─────────────────────────────────────────────┘
function ProjectView({ projectId }) {
  return (
    <ResizablePanelGroup>
      <ResizablePanel>
        <Suspense fallback={<p>loading messages...</p>}>
          <MessageContainer projectId={projectId} />  // 🔹 owns messages.getMany
        </Suspense>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>TODO: preview</ResizablePanel>
    </ResizablePanelGroup>
  );
}

// Inside MessageContainer (the real query owner):
//   const { data: messages } = useSuspenseQuery(
//     trpc.messages.getMany.queryOptions({ projectId }),
//   );
```

### Step-by-Step Flow

1. **Request** — Browser navigates to `/projects/<id>`
2. **Server render** — Next.js renders `page.tsx` server-side
3. **Shared cache** — `getQueryClient()` returns a single `QueryClient` for this request
4. **Direct execution** — `prefetchQuery` (messages) + `fetchQuery` (getOne) run resolvers **in-process** (`findUnique`/`findMany`) — no HTTP hop
5. **Validate + populate** — `getOne` NOT_FOUND → `notFound()`; otherwise both results land in the server cache
6. **Dehydrate** — cache is serialized to a JSON blob (`dehydrate`)
7. **Transport** — JSON blob ships to browser embedded in the SSR'd HTML
8. **Re-hydrate** — `HydrationBoundary` injects the JSON into the client-side QueryClient
9. **Consume** — `MessageContainer`'s `useSuspenseQuery(messages)` reads the **already-populated** hydrated cache
10. **Instant** — data present → resolves immediately → no suspension, no spinner

> Note: `project.getOne` is currently fetched for **404 validation** on the server; it is **not** consumed by a client component yet. It will be read by the future `ProjectHeader` via `useSuspenseQuery`.

### Why This Gives You "Server-Side Speed" + "Client-Side Flexibility"

Boss, this is why your instructor called it the best of both worlds:

| Component Layer | Type | What It Gives You |
|---|---|---|
| `page.tsx` | **Server Component** | Runs resolvers during SSR, close to DB, zero client-network latency. Data is baked into the HTML. |
| `project-view.tsx` | **Client Component** (`"use client"`) | Full browser runtime: `useState`, `useEffect`, event handlers, interactive UI — **without a second data fetch** |

So you get **fast initial render** (data fetched on server during SSR) plus **interactive client components** (since the view is a `"use client"` component), all without an extra loading flash.

### What `useSuspenseQuery` + `<Suspense>` Actually Do

- **`useSuspenseQuery`** (TanStack Query)
  Instead of returning `{ data, isLoading }`, it **throws a Promise** when data is missing. This lets React's Suspense system take over and render the `fallback`.
  But since your server already pre-fetched and hydrated the data, **the cache is populated and it resolves instantly** — it typically suspends *only* on cache misses.

- **`<Suspense fallback>`** (React)
  A declarative boundary: if any child suspends, React shows `fallback`. Here it's `loading...` — a safety net so the UX never breaks, even in edge cases where the cache wasn't seeded.

### A Note About the Fallback

```tsx
<Suspense fallback="loading...">
```

The `loading...` is a **intentional placeholder**, not a bug. In the normal happy path (server pre-fetched and hydrated everything), `useSuspenseQuery` finds the data and **never suspends** — users never see the fallback. It exists purely as a guard.

### Key Takeaway

This pattern means:

> **Server speed** (resolvers run during SSR, results sent to the client) + **Client flexibility** (the view is a real `"use client"` component that can be interactive) — all without a wasteful double-fetch.

The server fetches data close to the source of truth (the database) — that's the **speed of Server Components**. The view runs in the browser and can be fully interactive — that's the **flexibility of Client Components**.

---

## The "Use `useSuspenseQuery` in Deeper Components" Principle

Boss, this is a core best practice from your instructor: **if you can, always prefer to put `useSuspenseQuery` in a *deeper* component** — not at the top level of a page or parent view. The page should be a *thin orchestrator*; each deeper component should *own its own data requirement*.

### The Mental Model

| What | Page (`[projectId]/page.tsx`) | Deeper Components (e.g. `ProjectHeader`, `MessageContainer`) |
| --- | --- | --- |
| Role | Thin orchestrator: prefetch + layout | Own + render their own data |
| Data | Prepares the cache for children | Consumes from cache via `useSuspenseQuery` |
| Fetching | `prefetchQuery` (server) | `useSuspenseQuery` (client, reads hydrated cache) |

### Before vs After

```tsx
// ❌ BEFORE: all queries hoisted to one parent → everything blocks together
function ProjectView({ projectId }) {
  const { data: project } = useSuspenseQuery(projectOpts);   // fast: 5ms
  const { data: messages } = useSuspenseQuery(messagesOpts); // slow: 500ms
  return <CombinedView project={project} messages={messages} />;
}

// ✅ AFTER: distributed into deeper components → load independently
function ProjectLayout({ projectId }) {
  return (
    <div>
      <Suspense fallback={<ProjectHeaderSkeleton/>}>
        <ProjectHeader projectId={projectId} />   // ← renders in 5ms
      </Suspense>
      <Suspense fallback={<MessageListSkeleton/>}>
        <MessageList projectId={projectId} />     // ← renders in 500ms
      </Suspense>
    </div>
  );
}
```

### Why This Is Better

1. **Independent Loading States** — Each deeper component wrapped in its own `<Suspense>` renders as soon as *its* data is ready. The whole tree no longer blocks on the slowest query. Users see the fast parts immediately.

2. **Composability / Reusability** — A deeper component that fetches its own data is self-contained and can be dropped anywhere (dashboard, modal, another page). Page-level data fetches are not reusable.

3. **Clean Separation of Concerns** — The page decides "what to prepare + how to lay out"; the deeper component decides "what data I need + how to render it". Keeps the page readable.

4. **Each Component Declares Its Own Requirements** — Data needs are pushed down to the components that actually use them ("bottom-up" design), instead of the parent guessing every child's data need.

5. **Error Isolation** — Wrapped in its own `<Suspense>` / `<ErrorBoundary>`, a failing part doesn't break the rest of the UI.

6. **Automatic Parallel Fetching** — Sibling deeper components calling `useSuspenseQuery` fetch concurrently instead of sequentially.

### How It Interacts With Your Prefetch Pipeline

A deeper component still benefits from the server prefetch described above:

1. Server prefetches + hydrates the cache (page.tsx)
2. Deeper component calls `useSuspenseQuery` → **checks the cache first**
3. **Cache hit** → renders instantly, no network request
4. **Cache miss** (stale / navigation) → throws Promise → its own `<Suspense>` shows the fallback

Putting the query deeper does **not** lose the prefetch optimization — it just gives you granular loading boundaries on top.

### Planned Example (Project Header)

For the future `ProjectHeader` in our codebase:

```tsx
// src/modules/projects/ui/components/project-header.tsx
"use client";

function ProjectHeader({ projectId }: { projectId: string }) {
  const { data: project } = useSuspenseQuery(
    trpc.project.getOne.queryOptions({ id: projectId }),   // reads hydrated cache instantly
  );
  return <header>{/* project.name etc. */}</header>;
}
```

- File convention: `src/modules/projects/ui/components/project-header.tsx` (mirrors `messages-container.tsx`)
- `project.getOne` is already prefetched + dehydrated in `page.tsx`, so this header renders instantly from cache
- It can be wrapped in its own `<Suspense>` so it loads independently of the message list

### Bottom Line

> "Pages are thin; components own their data."

Using `useSuspenseQuery` in deeper components gives you granular loading states, true composability, clean separation, parallel fetching, and error isolation — while still riding on the server prefetch for speed.