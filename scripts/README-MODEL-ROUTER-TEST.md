# Model Router Testing Guide

This document explains how to test the Model Router implementation.

## Prerequisites

Before running the tests, you need at least one AI provider API key configured in your `.env` file:

```bash
# Google Gemini (recommended for development)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# OpenRouter (free models available)
OPENROUTER_API_KEY=your_openrouter_api_key

# OpenAI (for production)
OPENAI_API_KEY=your_openai_api_key
```

### Getting API Keys

1. **Google Gemini** (Free tier available)
   - Visit: https://aistudio.google.com/apikey
   - Create a free API key
   - Best for development

2. **OpenRouter** (Free models available)
   - Visit: https://openrouter.ai/keys
   - Create an account and get API key
   - Provides multiple free models

3. **OpenAI** (Paid service)
   - Visit: https://platform.openai.com/api-keys
   - Create an API key
   - Recommended for production

## Running the Tests

### Option 1: Using npm script (recommended)

```bash
npm run test:router
```

### Option 2: Using tsx directly

```bash
tsx scripts/test-model-router.ts
```

## What the Tests Validate

The test script validates the following:

1. **Provider Configuration**
   - Checks which API keys are configured
   - Validates at least one provider is available

2. **Router API Contract**
   - Verifies `getModel()` method exists
   - Verifies `getRoutingResult()` method exists

3. **Development Environment Routing**
   - Tests routing for development environment
   - Development policy: Google → OpenRouter

4. **Production Environment Routing**
   - Tests routing for production environment
   - Production policy: OpenAI → OpenRouter → Google

5. **Default Environment**
   - Tests routing when no environment is specified
   - Should detect NODE_ENV automatically

6. **Model Initialization**
   - Verifies model object is valid
   - Checks for AI SDK methods (doGenerate, doStream)

7. **Provider Failover Logic**
   - Validates failover configuration
   - Confirms multiple providers enable failover

## Expected Output

### All Tests Pass

```
🚀 Model Router Test Suite
Testing provider-agnostic model routing implementation

============================================================
Test 1: Provider Configuration
============================================================
ℹ Environment variables:
  GOOGLE_GENERATIVE_AI_API_KEY: ✓ Set
  OPENROUTER_API_KEY: ✓ Set
  OPENAI_API_KEY: ✗ Not set
✓ 2 provider(s) configured

============================================================
Test 2: Router API Contract
============================================================
✓ Router has 'getModel' method
✓ Router has 'getRoutingResult' method

============================================================
Test 3: Development Environment Routing
============================================================
ℹ Attempting to get model for development environment...
✓ Development routing successful: google (gemini-3.5-flash)
ℹ Model type: object
ℹ Has model object: Yes

============================================================
Test 7: Test Summary
============================================================

Total tests: 10
Passed: 10
Failed: 0
Warnings: 0
Success rate: 100.0%

🎉 All tests passed!
```

### Some Tests Fail

If tests fail, the output will show which tests failed and why:

```
✗ Development routing failed
ModelRouter failed to select a model for environment 'development'
```

## Troubleshooting

### "No API keys configured!"

**Problem:** No API keys are set in your `.env` file.

**Solution:** Add at least one API key to your `.env` file:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

### "Development routing failed"

**Problem:** The primary provider for development (Google) is not configured.

**Solution:** Either:
1. Add Google API key, OR
2. Add OpenRouter API key (fallback for development)

### "Production routing failed"

**Problem:** The primary provider for production (OpenAI) is not configured.

**Solution:** Either:
1. Add OpenAI API key, OR
2. Add OpenRouter or Google API key (fallback for production)

### Model initialization warnings

**Problem:** Model object is missing expected AI SDK methods.

**Solution:** This is usually not critical, but verify you're using the latest AI SDK versions:
```bash
npm update @ai-sdk/google @ai-sdk/openai ai
```

## Understanding the Routing Policies

### Development Policy

**Priority Order:**
1. Google Gemini (`gemini-3.5-flash`) - Free, fast
2. OpenRouter (6 free models) - Multiple fallbacks

**Rationale:** Development prioritizes free models to minimize costs during development and testing.

### Production Policy

**Priority Order:**
1. OpenAI (`gpt-4o-mini`) - Reliable, consistent
2. OpenRouter (6 free models) - Cost-effective fallback
3. Google Gemini (`gemini-3.5-flash`) - Additional fallback

**Rationale:** Production prioritizes reliability and quality while maintaining fallback options.

## Model Router Architecture

The Model Router follows these design patterns:

1. **Registry Pattern** - Providers are registered once at startup
2. **Strategy Pattern** - Routing policies define provider order per environment
3. **Provider Abstraction** - Application code never imports specific providers

For more details, see `docs/architecture/model-router.md`.

## Next Steps

After tests pass:

1. Use the model router in your agent:
   ```typescript
   import { ModelRouter } from "@/ai";
   
   const router = new ModelRouter();
   const model = await router.getModel({ environment: "development" });
   ```

2. The router automatically handles:
   - Environment detection
   - Provider selection
   - Failover between providers
   - Model initialization

3. Your code stays provider-agnostic - no need to import specific SDK packages.

## Advanced Testing

### Test with specific environment

```typescript
const router = new ModelRouter();

// Force development environment
const devModel = await router.getModel({ 
  environment: "development" 
});

// Force production environment  
const prodModel = await router.getModel({ 
  environment: "production" 
});
```

### Test failover manually

To test failover, temporarily remove one API key from `.env` and run the tests again. The router should automatically fall back to the next available provider.

## Support

If tests continue to fail after following this guide:

1. Check the error messages carefully
2. Verify API keys are valid and active
3. Review provider-specific rate limits
4. Check the Model Router implementation in `src/ai/router/`
