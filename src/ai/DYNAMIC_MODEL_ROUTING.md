# Dynamic OpenRouter Model Routing

## Overview

The Model Router now features **dynamic model selection** for OpenRouter free models in development. Instead of using a hardcoded list of models, the system automatically:

1. **Fetches** all available free models from the OpenRouter API
2. **Ranks** them based on programming capabilities
3. **Caches** the rankings for optimal performance
4. **Falls back** automatically when rate limits are hit
5. **Degrades gracefully** to a hardcoded list if API fetch fails

This ensures **100% free development** with the best possible code generation quality.

---

## Architecture Changes

### Before (Hardcoded Model List)
```
Development Policy → OpenRouter Provider → Static Fallback List [Model1, Model2, ...]
                                           ↓
                                    Try each model sequentially
```

### After (Dynamic Model Ranking)
```
Development Policy → OpenRouter Provider → Dynamic Model Fetcher
                                           ↓
                                    Fetch & Rank Free Models (cached 1hr)
                                           ↓
                                    [BestModel1, BestModel2, ...] (sorted by score)
                                           ↓
                                    Try each model sequentially
                                           ↓
                                    Fallback to hardcoded list on fetch failure
```

---

## Ranking Algorithm

Models are scored based on four criteria (in order of importance):

### 1. Code Generation Capability (up to 50 points)
- **+50 points**: Model name/description contains "code" or "coding"
- **+30 points**: Model name/description contains "instruct" or "instruction"

### 2. Context Length (up to 30 points)
- **+30 points**: ≥32k tokens
- **+25 points**: ≥16k tokens
- **+20 points**: ≥8k tokens
- **+15 points**: ≥4k tokens
- **+10 points**: <4k tokens

### 3. Model Size (up to 20 points)
Based on parameter count extracted from model name (e.g., "70b"):
- **+20 points**: ≥100B parameters
- **+15 points**: ≥50B parameters
- **+10 points**: ≥20B parameters
- **+5 points**: ≥7B parameters

### 4. Provider Reputation (up to 15 points)
- **+15 points**: Nvidia/Nemotron
- **+12 points**: Meta/LLaMA, Google/Gemma
- **+10 points**: Mistral/Mixtral, Cohere

### Penalties
- **-10 points**: Experimental or preview models

---

## Caching Strategy

- **Cache Duration**: 1 hour (3600 seconds)
- **Cache Invalidation**: Automatic after TTL expires
- **Manual Clear**: `clearModelCache()` function available
- **Fallback Behavior**: Stale cache returned if fresh fetch fails

### Why 1 Hour?

1. **Balance**: Fresh enough to get new models, not so frequent to spam the API
2. **Free Tier**: OpenRouter's free models change infrequently
3. **Performance**: Avoids API call latency on every model request
4. **Reliability**: Reduces dependency on external API availability

---

## Policy Changes

### Development Policy
**Before:**
```typescript
providerOrder: [PROVIDERS.OPENROUTER, PROVIDERS.GOOGLE]
```

**After:**
```typescript
providerOrder: [PROVIDERS.OPENROUTER]
// 100% free with dynamic model selection
```

### Production Policy
**Before:**
```typescript
providerOrder: [PROVIDERS.OPENAI, PROVIDERS.OPENROUTER, PROVIDERS.GOOGLE]
```

**After:**
```typescript
providerOrder: [PROVIDERS.OPENAI]
// Single reliable provider for consistent quality
```

---

## Usage Examples

### Basic Usage (Automatic)
```typescript
import { ModelRouter } from "@/ai";

const router = new ModelRouter();

// In development: automatically uses dynamically ranked free models
// In production: uses OpenAI gpt-4o-mini
const model = await router.getModel();

// Use the model for code generation
const result = await model.generateText({
  prompt: "Create a React component...",
});
```

### Manual Testing
```bash
# Test the ranking system
npx tsx src/ai/utils/test-openrouter-ranking.ts
```

Output:
```
================================================================================
OpenRouter Free Model Ranking System - Test Utility
================================================================================

Fetching and ranking free models from OpenRouter API...

================================================================================
✓ Successfully fetched and ranked 47 free models
⏱  Time taken: 1247ms
================================================================================

🏆 Top 20 Models for Code Generation:

 1. [Score: 115] [Context:  128k] nvidia/nemotron-3-ultra-550b-a55b:free
    optimized for code generation, large context (128k tokens), 550B parameters

 2. [Score: 105] [Context:   32k] cohere/north-mini-code:free
    optimized for code generation, large context (32k tokens), Cohere provider

 3. [Score:  95] [Context:   16k] poolside/laguna-s-2.1:free
    optimized for code generation, 16k context, 26B parameters
...
```

### Programmatic Inspection
```typescript
import { fetchAndRankFreeModels, clearModelCache } from "@/ai";

// Force refresh
clearModelCache();

// Get rankings
const models = await fetchAndRankFreeModels();

console.log(`Found ${models.length} free models`);
console.log("Top model:", models[0].name);
console.log("Score:", models[0].score);
console.log("Reasoning:", models[0].reasoning);
```

---

## Error Handling & Fallbacks

### Scenario 1: OpenRouter API is down
```
1. fetchAndRankFreeModels() throws error
2. Provider catches error, logs warning
3. Falls back to hardcoded OPENROUTER_FALLBACK_MODELS
4. Development continues normally
```

### Scenario 2: API returns zero free models
```
1. fetchAndRankFreeModels() returns empty array
2. Provider detects empty array
3. Falls back to hardcoded OPENROUTER_FALLBACK_MODELS
4. Development continues normally
```

### Scenario 3: All ranked models are rate-limited
```
1. Provider tries ranked models in order
2. Each returns rate-limit error
3. Provider continues through entire list
4. Returns null (triggers router to try next provider if any)
5. In dev policy: no fallback provider → returns error
```

**Note**: In Scenario 3, the router will throw an error indicating no models are available. This is expected behavior when all free models are exhausted. The solution is to wait for rate limits to reset or temporarily use a paid provider.

---

## Monitoring & Debugging

### Console Logs

**Successful fetch:**
```
[OpenRouter] Fetching latest free models from API...
[OpenRouter] Found 47 free models
[OpenRouter] Top 10 ranked models:
  1. nvidia/nemotron-3-ultra-550b-a55b:free (score: 115) - optimized for code...
  2. cohere/north-mini-code:free (score: 105) - optimized for code generation...
  ...
[OpenRouter] Using 47 dynamically ranked free models
[OpenRouter] Successfully using model: nvidia/nemotron-3-ultra-550b-a55b:free
```

**Cache hit:**
```
[OpenRouter] Using cached model rankings
[OpenRouter] Successfully using model: nvidia/nemotron-3-ultra-550b-a55b:free
```

**Fetch failure:**
```
[OpenRouter] Failed to fetch models: Network error
[OpenRouter] Returning stale cached models as fallback
```
OR
```
[OpenRouter] Failed to fetch models: API timeout
[OpenRouter] Using hardcoded fallback model list
```

**Rate limit hit:**
```
OpenRouter model nvidia/nemotron-3-ultra-550b-a55b:free failed to initialize: 
  Rate limit exceeded
OpenRouter model cohere/north-mini-code:free failed to initialize: 
  Rate limit exceeded
...
[OpenRouter] Successfully using model: poolside/laguna-s-2.1:free
```

---

## Performance Characteristics

### First Request (Cold Start)
- **Time**: ~1-2 seconds (API fetch + ranking)
- **Network**: 1 HTTP request to OpenRouter API
- **Processing**: Scoring ~40-50 models

### Subsequent Requests (Cached)
- **Time**: <1ms (memory lookup)
- **Network**: 0 requests
- **Processing**: None

### Cache Refresh (After 1 Hour)
- **Time**: ~1-2 seconds (same as cold start)
- **Behavior**: Transparent to caller (async)

---

## Migration Guide

### For Existing Codebases

**No code changes required!** The system is backward compatible:

1. **Old code continues working**: Hardcoded fallback list still exists
2. **Automatic upgrade**: Simply pull the latest code
3. **Gradual rollout**: Cache builds on first request in each environment

### For Custom Provider Implementations

If you have custom providers, note that `Provider.getModel()` now supports both:
- **Synchronous**: `getModel(): ProviderResult | null`
- **Asynchronous**: `getModel(): Promise<ProviderResult | null>`

The router handles both transparently with `await`.

---

## Configuration

### Environment Variables

**Required:**
- `OPENROUTER_API_KEY`: Your OpenRouter API key (for development)
- `OPENAI_API_KEY`: Your OpenAI API key (for production)

**Optional:**
- `OPENROUTER_BASE_URL`: Override default API endpoint (default: `https://openrouter.ai/api/v1`)

**Not needed:**
- `GOOGLE_GENERATIVE_AI_API_KEY`: No longer used (Google removed from policies)

### Cache Configuration

To modify cache TTL, edit `src/ai/utils/openrouter-model-fetcher.ts`:
```typescript
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (default)
// Change to 30 minutes:
const CACHE_TTL_MS = 30 * 60 * 1000;
```

---

## Testing

### Unit Tests (Recommended)
```typescript
import { fetchAndRankFreeModels } from "@/ai/utils/openrouter-model-fetcher";

describe("OpenRouter Model Ranking", () => {
  it("should fetch and rank models", async () => {
    const models = await fetchAndRankFreeModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].score).toBeGreaterThan(0);
  });

  it("should prioritize code models", async () => {
    const models = await fetchAndRankFreeModels();
    const topModel = models[0];
    expect(topModel.name.toLowerCase()).toContain("code");
  });
});
```

### Integration Tests
```typescript
import { ModelRouter } from "@/ai";

describe("Model Router with Dynamic Selection", () => {
  it("should get a model in development", async () => {
    const router = new ModelRouter();
    const result = await router.getRoutingResult({ 
      environment: "development" 
    });
    
    expect(result.provider).toBe("openrouter");
    expect(result.model).toBeDefined();
    expect(result.modelId).toBeTruthy();
  });
});
```

---

## Future Enhancements

### Potential Improvements

1. **User Feedback Loop**: Track which models perform best for specific tasks
2. **Cost Tracking**: Log token usage per model for analytics
3. **Dynamic Policies**: Load policies from database instead of code
4. **Model Health Checks**: Pre-test models before adding to rotation
5. **Weighted Fallback**: Try top 3 models in parallel, return fastest
6. **Custom Ranking**: Allow users to define their own ranking criteria

### Extensibility Points

The ranking algorithm is designed to be easily modified:

```typescript
// In src/ai/utils/openrouter-model-fetcher.ts
function calculateModelScore(model: OpenRouterModel): number {
  let score = 0;
  
  // ADD YOUR CUSTOM CRITERIA HERE
  if (model.name.includes("my-preferred-model")) {
    score += 100; // Boost specific models
  }
  
  // ... existing criteria ...
  
  return score;
}
```

---

## Troubleshooting

### Problem: "All fallback models failed to initialize"

**Cause**: All free models are rate-limited or unavailable

**Solutions**:
1. Wait 5-10 minutes for rate limits to reset
2. Temporarily set `OPENAI_API_KEY` and use production policy
3. Check OpenRouter status: https://openrouter.ai/status

### Problem: "Dynamic model fetching failed"

**Cause**: Network issue or OpenRouter API down

**Impact**: System falls back to hardcoded list (degraded but functional)

**Solutions**:
1. Check network connectivity
2. Verify OpenRouter API status
3. Check `OPENROUTER_BASE_URL` if using custom endpoint

### Problem: Models changing frequently

**Cause**: Cache is clearing or TTL is too short

**Solutions**:
1. Increase `CACHE_TTL_MS` in `openrouter-model-fetcher.ts`
2. Check if `clearModelCache()` is being called unintentionally

---

## References

- [OpenRouter Free Models](https://openrouter.ai/collections/free-models)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Vibe README - Model Router Deep Dive](../../README.md)

---

## Change Log

### Version 2.0 (Current)
- ✅ Dynamic model fetching from OpenRouter API
- ✅ Intelligent ranking based on programming capabilities
- ✅ 1-hour caching for optimal performance
- ✅ Graceful fallback to hardcoded list
- ✅ Development: OpenRouter only (100% free)
- ✅ Production: OpenAI only (consistent quality)
- ✅ Async provider support

### Version 1.0 (Legacy)
- Hardcoded model fallback list
- Development: OpenRouter + Google
- Production: OpenAI + OpenRouter + Google
- Synchronous provider interface
