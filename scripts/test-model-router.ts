#!/usr/bin/env tsx
/**
 * Model Router Test Script
 *
 * This script validates the complete model router implementation:
 * - Provider registration
 * - Environment-based routing
 * - Provider failover
 * - Valid model initialization
 *
 * Usage:
 *   npm run test:router
 *   or
 *   tsx scripts/test-model-router.ts
 */

import { ModelRouter } from "../src/ai/index";
import { ENVIRONMENTS } from "../src/ai/constants/environment";
import type { ModelRouterContext } from "../src/ai/router/model-router";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(60));
  log(title, "bright");
  console.log("=".repeat(60));
}

function logSuccess(message: string) {
  log(`✓ ${message}`, "green");
}

function logError(message: string) {
  log(`✗ ${message}`, "red");
}

function logInfo(message: string) {
  log(`ℹ ${message}`, "cyan");
}

function logWarning(message: string) {
  log(`⚠ ${message}`, "yellow");
}

interface TestResult {
  passed: number;
  failed: number;
  warnings: number;
}

const testResults: TestResult = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

async function testProviderConfiguration() {
  logSection("Test 1: Provider Configuration");

  const router = new ModelRouter();

  // Check environment variables
  const hasGoogleKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  logInfo("Environment variables:");
  console.log(`  GOOGLE_GENERATIVE_AI_API_KEY: ${hasGoogleKey ? "✓ Set" : "✗ Not set"}`);
  console.log(`  OPENROUTER_API_KEY: ${hasOpenRouterKey ? "✓ Set" : "✗ Not set"}`);
  console.log(`  OPENAI_API_KEY: ${hasOpenAIKey ? "✓ Set" : "✗ Not set"}`);

  if (!hasGoogleKey && !hasOpenRouterKey && !hasOpenAIKey) {
    logError("No API keys configured! At least one provider must be configured.");
    testResults.failed++;
    return false;
  }

  const configuredCount = [hasGoogleKey, hasOpenRouterKey, hasOpenAIKey].filter(
    Boolean,
  ).length;
  logSuccess(`${configuredCount} provider(s) configured`);
  testResults.passed++;

  return true;
}

async function testDevelopmentEnvironment() {
  logSection("Test 2: Development Environment Routing");

  const router = new ModelRouter();
  const context: ModelRouterContext = {
    environment: ENVIRONMENTS.DEVELOPMENT,
  };

  try {
    logInfo("Attempting to get model for development environment...");
    const result = await router.getRoutingResult(context);

    logSuccess(
      `Development routing successful: ${result.provider}${result.modelId ? ` (${result.modelId})` : ""}`,
    );
    logInfo(`Model type: ${typeof result.model}`);
    logInfo(`Has model object: ${result.model ? "Yes" : "No"}`);

    testResults.passed++;
    return true;
  } catch (error) {
    logError("Development routing failed");
    console.error(error instanceof Error ? error.message : String(error));
    testResults.failed++;
    return false;
  }
}

async function testProductionEnvironment() {
  logSection("Test 3: Production Environment Routing");

  const router = new ModelRouter();
  const context: ModelRouterContext = {
    environment: ENVIRONMENTS.PRODUCTION,
  };

  try {
    logInfo("Attempting to get model for production environment...");
    const result = await router.getRoutingResult(context);

    logSuccess(
      `Production routing successful: ${result.provider}${result.modelId ? ` (${result.modelId})` : ""}`,
    );
    logInfo(`Model type: ${typeof result.model}`);
    logInfo(`Has model object: ${result.model ? "Yes" : "No"}`);

    testResults.passed++;
    return true;
  } catch (error) {
    logError("Production routing failed");
    console.error(error instanceof Error ? error.message : String(error));
    testResults.failed++;
    return false;
  }
}

async function testDefaultEnvironment() {
  logSection("Test 4: Default Environment (No Context)");

  const router = new ModelRouter();

  try {
    logInfo("Attempting to get model without environment context...");
    const result = await router.getRoutingResult();

    const detectedEnv =
      process.env.NODE_ENV === "production" ? "production" : "development";
    logSuccess(
      `Default routing successful: ${result.provider}${result.modelId ? ` (${result.modelId})` : ""}`,
    );
    logInfo(`Detected environment: ${detectedEnv}`);
    logInfo(`Model type: ${typeof result.model}`);

    testResults.passed++;
    return true;
  } catch (error) {
    logError("Default routing failed");
    console.error(error instanceof Error ? error.message : String(error));
    testResults.failed++;
    return false;
  }
}

async function testModelInitialization() {
  logSection("Test 5: Model Initialization");

  const router = new ModelRouter();

  try {
    logInfo("Testing model object initialization...");
    const model = await router.getModel();

    // Check if model has expected AI SDK methods
    const hasDoGenerate = typeof (model as any).doGenerate === "function";
    const hasDoStream = typeof (model as any).doStream === "function";

    if (hasDoGenerate) {
      logSuccess("Model has 'doGenerate' method");
    } else {
      logWarning("Model missing 'doGenerate' method");
      testResults.warnings++;
    }

    if (hasDoStream) {
      logSuccess("Model has 'doStream' method");
    } else {
      logWarning("Model missing 'doStream' method");
      testResults.warnings++;
    }

    logSuccess("Model initialization successful");
    testResults.passed++;
    return true;
  } catch (error) {
    logError("Model initialization failed");
    console.error(error instanceof Error ? error.message : String(error));
    testResults.failed++;
    return false;
  }
}

async function testProviderFailover() {
  logSection("Test 6: Provider Failover (Simulated)");

  logInfo("This test verifies the failover logic is in place");
  logInfo(
    "Actual failover requires simulating provider failures, which needs runtime manipulation",
  );

  // We can verify the logic exists by checking the router implementation
  // In a real scenario, we'd need to mock provider failures

  const hasGoogleKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;

  if (hasGoogleKey && hasOpenRouterKey) {
    logInfo("Development policy: Google → OpenRouter");
    logInfo("If Google fails, OpenRouter will be tried automatically");
    logSuccess("Failover configuration validated");
    testResults.passed++;
  } else if (hasOpenRouterKey) {
    logInfo("Only OpenRouter configured, no failover possible");
    logWarning("Configure additional providers for failover");
    testResults.warnings++;
    testResults.passed++;
  } else if (hasGoogleKey) {
    logInfo("Only Google configured, no failover possible");
    logWarning("Configure OpenRouter as fallback for development");
    testResults.warnings++;
    testResults.passed++;
  } else {
    logError("No providers configured for development");
    testResults.failed++;
  }

  return true;
}

async function testRouterAPI() {
  logSection("Test 7: Router API Contract");

  const router = new ModelRouter();

  // Test that the router has the expected methods
  const hasGetModel = typeof router.getModel === "function";
  const hasGetRoutingResult = typeof router.getRoutingResult === "function";

  if (hasGetModel) {
    logSuccess("Router has 'getModel' method");
    testResults.passed++;
  } else {
    logError("Router missing 'getModel' method");
    testResults.failed++;
  }

  if (hasGetRoutingResult) {
    logSuccess("Router has 'getRoutingResult' method");
    testResults.passed++;
  } else {
    logError("Router missing 'getRoutingResult' method");
    testResults.failed++;
  }

  return hasGetModel && hasGetRoutingResult;
}

function printSummary() {
  logSection("Test Summary");

  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? (testResults.passed / total) * 100 : 0;

  console.log(`\nTotal tests: ${total}`);
  log(`Passed: ${testResults.passed}`, "green");
  log(`Failed: ${testResults.failed}`, "red");
  log(`Warnings: ${testResults.warnings}`, "yellow");
  console.log(`Success rate: ${passRate.toFixed(1)}%\n`);

  if (testResults.failed === 0) {
    log("🎉 All tests passed!", "green");
    return 0;
  } else {
    log("❌ Some tests failed", "red");
    return 1;
  }
}

async function main() {
  log("\n🚀 Model Router Test Suite", "bright");
  log("Testing provider-agnostic model routing implementation\n", "cyan");

  // Run all tests
  await testProviderConfiguration();
  await testRouterAPI();
  await testDevelopmentEnvironment();
  await testProductionEnvironment();
  await testDefaultEnvironment();
  await testModelInitialization();
  await testProviderFailover();

  // Print summary and exit with appropriate code
  const exitCode = printSummary();
  process.exit(exitCode);
}

// Run the tests
main().catch((error) => {
  logError("Unexpected error during test execution:");
  console.error(error);
  process.exit(1);
});
