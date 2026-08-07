# Model Router Quick Reference

## Import

```typescript
import { ModelRouter } from "@/ai";
```

## Basic Usage

```typescript
const router = new ModelRouter();
const model = await router.getModel();

// Use with Vercel AI SDK
const { text } = await generateText({ model, prompt: "..." });
```

## Environment Selection

```typescript
// Auto-detect (uses NODE_ENV)
const model = await router.getModel();

// Force development
const model = await router.getModel({ environment: "development" });

// Force production
const model = await router.getModel({ environment: "production" });
```

## Get Routing Details

```typescript
const result = await router.getRoutingResult();
// result.provider - e.g., "google", "openrouter", "openai"
// result.modelId  - e.g., "gemini-3.5-flash"
// result.model    - LanguageModelV4 instance
```

## Routing Policies

| Environment | Provider Order | Goal |
|------------|---------------|------|
| Development | Google → OpenRouter | Zero cost |
| Production | OpenAI → OpenRouter → Google | Reliability |

## Valid Models

### Google Gemini
- `gemini-3.5-flash` ⭐ (default)
- `gemini-3.5-flash-lite`
- `gemini-2.5-flash`
- `gemini-2.5-pro`

### OpenRouter (Free)
- `nvidia/nemotron-3-ultra-550b-a55b:free` ⭐ (primary)
- `poolside/laguna-s-2.1:free`
- `nvidia/nemotron-3-super-120b-a12b:free`
- `cohere/north-mini-code:free`
- `google/gemma-4-26b-a4b-it:free`
- `openai/gpt-oss-20b:free`

### OpenAI
- `gpt-4o-mini` ⭐ (default)

## Environment Variables

Required (at least one):

```bash
GOOGLE_GENERATIVE_AI_API_KEY=...  # Free tier available
OPENROUTER_API_KEY=...            # Free models available
OPENAI_API_KEY=...                # Paid service
```

## Testing

```bash
npm run test:router
```

## Key Features

✅ Provider agnostic  
✅ Automatic failover  
✅ Environment aware  
✅ Type safe  
✅ Zero configuration (after API keys set)  

## Error Handling

```typescript
try {
  const model = await router.getModel();
} catch (error) {
  // No providers configured or all providers failed
  console.error("Router failed:", error.message);
}
```

## Best Practices

1. **Reuse router instance** - Create once, use multiple times
2. **Set environment explicitly** for user-facing requests
3. **Use development mode** for testing to save costs
4. **Configure multiple providers** for better failover
5. **Monitor which provider is used** in production

## Common Patterns

### For Agents
```typescript
const router = new ModelRouter();
const model = await router.getModel({ environment: "production" });
// Use in agent loop
```

### For Development Testing
```typescript
const router = new ModelRouter();
const model = await router.getModel({ environment: "development" });
// Uses free models
```

### With Error Recovery
```typescript
let model;
try {
  model = await router.getModel();
} catch (error) {
  // Fallback logic or error reporting
  throw new Error("AI service unavailable");
}
```

## Documentation

- **Architecture**: `docs/architecture/model-router.md`
- **Testing**: `scripts/README-MODEL-ROUTER-TEST.md`
- **Summary**: `MODEL-ROUTER-IMPLEMENTATION-SUMMARY.md`
- **Examples**: `examples/model-router-usage.ts`

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "No providers configured" | Add at least one API key to `.env` |
| "Routing failed" | Check API key is valid and provider is accessible |
| Wrong model in dev | Verify `NODE_ENV` or pass explicit environment |
| Rate limited | Router will auto-failover to next provider |

## Support

Run tests to verify configuration:
```bash
npm run test:router
```

All tests should pass (8/8) before using in production.
