# Dynamic Model Selection Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION STARTUP                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  User requests AI generation  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      ModelRouter.getModel()    │
                    │                                │
                    │  1. Resolve environment        │
                    │     (dev or prod?)             │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
           ┌────────▼────────┐            ┌─────────▼──────────┐
           │  Development?   │            │   Production?      │
           └────────┬────────┘            └─────────┬──────────┘
                    │                                │
                    ▼                                ▼
      ┌─────────────────────────┐       ┌───────────────────────┐
      │ developmentPolicy       │       │  productionPolicy      │
      │                         │       │                        │
      │ providerOrder:          │       │  providerOrder:        │
      │  [OPENROUTER]          │       │   [OPENAI]            │
      └─────────┬───────────────┘       └───────────┬───────────┘
                │                                    │
                ▼                                    ▼
┌───────────────────────────────┐      ┌──────────────────────────┐
│   OpenRouter Provider         │      │   OpenAI Provider        │
│                               │      │                          │
│ isConfigured() ✓              │      │  isConfigured() ✓        │
│ getModel() async              │      │  getModel()              │
└───────────────┬───────────────┘      └──────────┬───────────────┘
                │                                  │
                │                                  │
                ▼                                  ▼
┌────────────────────────────────┐     ┌──────────────────────────┐
│  getModelFallbackChain()       │     │  Return gpt-4o-mini      │
│                                │     │  (single reliable model) │
│  Try dynamic fetching first    │     └──────────────────────────┘
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────────┐
│              fetchAndRankFreeModels()                              │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Check Cache                                              │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │ Is cached? (timestamp < 1 hour ago)             │    │    │
│  │  └─────────────┬───────────────────────────────────┘    │    │
│  │                │                                          │    │
│  │       ┌────────┴────────┐                                │    │
│  │       │                 │                                │    │
│  │      YES               NO                                │    │
│  │       │                 │                                │    │
│  │       │                 ▼                                │    │
│  │       │    ┌──────────────────────────────────┐         │    │
│  │       │    │ HTTP GET to OpenRouter API       │         │    │
│  │       │    │ https://openrouter.ai/api/v1/models│       │    │
│  │       │    └──────────────┬───────────────────┘         │    │
│  │       │                   │                              │    │
│  │       │                   ▼                              │    │
│  │       │    ┌──────────────────────────────────┐         │    │
│  │       │    │ Filter free models               │         │    │
│  │       │    │ (pricing.prompt === "0")         │         │    │
│  │       │    └──────────────┬───────────────────┘         │    │
│  │       │                   │                              │    │
│  │       │                   ▼                              │    │
│  │       │    ┌──────────────────────────────────────────┐ │    │
│  │       │    │ Rank models by score:                   │ │    │
│  │       │    │                                          │ │    │
│  │       │    │ • Code capability (up to 50 pts)       │ │    │
│  │       │    │ • Context length (up to 30 pts)        │ │    │
│  │       │    │ • Model size (up to 20 pts)            │ │    │
│  │       │    │ • Provider reputation (up to 15 pts)   │ │    │
│  │       │    └──────────────┬───────────────────────────┘ │    │
│  │       │                   │                              │    │
│  │       │                   ▼                              │    │
│  │       │    ┌──────────────────────────────────┐         │    │
│  │       │    │ Sort by score (descending)       │         │    │
│  │       │    └──────────────┬───────────────────┘         │    │
│  │       │                   │                              │    │
│  │       │                   ▼                              │    │
│  │       │    ┌──────────────────────────────────┐         │    │
│  │       │    │ Cache rankings (1 hour TTL)      │         │    │
│  │       │    └──────────────┬───────────────────┘         │    │
│  │       │                   │                              │    │
│  │       └───────────────────┤                              │    │
│  │                           │                              │    │
│  │                           ▼                              │    │
│  │         ┌──────────────────────────────────────┐        │    │
│  │         │ Return ranked model list:            │        │    │
│  │         │                                      │        │    │
│  │         │ [BestModel1, BestModel2, ...]       │        │    │
│  │         └──────────────┬───────────────────────┘        │    │
│  └─────────────────────────┘                               │    │
│                                                             │    │
│  On error: fallback to OPENROUTER_FALLBACK_MODELS         │    │
└───────────────┬────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────┐
│              Try Models Sequentially (Failover Loop)           │
│                                                                │
│  FOR each model in ranked list:                               │
│                                                                │
│    ┌──────────────────────────────────────────────┐          │
│    │ Try: inst.chat(modelId)                      │          │
│    └─────────────┬────────────────────────────────┘          │
│                  │                                            │
│        ┌─────────┴──────────┐                                │
│        │                    │                                │
│    SUCCESS               FAILS                               │
│        │                    │                                │
│        │        ┌───────────┴──────────────┐                │
│        │        │                          │                │
│        │    Rate Limited              Other Error            │
│        │        │                          │                │
│        │        ▼                          ▼                │
│        │   Log warning                Log warning            │
│        │   Continue to next          Continue to next        │
│        │                                                     │
│        ▼                                                     │
│  ┌──────────────────────────────────┐                       │
│  │ Return ProviderResult:           │                       │
│  │  - model: LanguageModelV4       │                       │
│  │  - modelId: string              │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
│  If all models fail → return null                           │
└───────────────┬──────────────────────────────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ Model is ready!   │
        │                   │
        │ Use for:          │
        │ • Code generation │
        │ • Text completion │
        │ • Agent tasks     │
        └───────────────────┘


═════════════════════════════════════════════════════════════════════

                         EXAMPLE EXECUTION

═════════════════════════════════════════════════════════════════════

Request #1 (Cold Start - No Cache)
───────────────────────────────────
Time: 0ms
├─ ModelRouter.getModel()
├─ Env: development → OpenRouter Provider
├─ fetchAndRankFreeModels()
│  ├─ Cache miss
│  ├─ HTTP GET openrouter.ai/api/v1/models (1200ms)
│  ├─ Found 47 free models
│  ├─ Ranked by score
│  │  1. nvidia/nemotron-3-ultra-550b (score: 115)
│  │  2. cohere/north-mini-code (score: 105)
│  │  3. poolside/laguna-s-2.1 (score: 95)
│  │  ...
│  └─ Cached (1 hour TTL)
│
├─ Try model #1: nvidia/nemotron-3-ultra-550b → SUCCESS! ✓
│
└─ Total time: ~1.2 seconds


Request #2 (Cached - 10 minutes later)
───────────────────────────────────────
Time: 0ms
├─ ModelRouter.getModel()
├─ Env: development → OpenRouter Provider
├─ fetchAndRankFreeModels()
│  └─ Cache hit! (instant)
│
├─ Try model #1: nvidia/nemotron-3-ultra-550b → SUCCESS! ✓
│
└─ Total time: ~50ms


Request #3 (Rate Limited Scenario)
────────────────────────────────────
Time: 0ms
├─ ModelRouter.getModel()
├─ Env: development → OpenRouter Provider
├─ fetchAndRankFreeModels()
│  └─ Cache hit!
│
├─ Try model #1: nvidia/nemotron-3-ultra-550b → RATE LIMITED ✗
├─ Try model #2: cohere/north-mini-code → RATE LIMITED ✗
├─ Try model #3: poolside/laguna-s-2.1 → SUCCESS! ✓
│
└─ Total time: ~150ms (3 attempts)


Request #4 (Production)
───────────────────────
Time: 0ms
├─ ModelRouter.getModel()
├─ Env: production → OpenAI Provider
├─ Try model: gpt-4o-mini → SUCCESS! ✓
│
└─ Total time: ~50ms (no dynamic fetching in prod)
```
