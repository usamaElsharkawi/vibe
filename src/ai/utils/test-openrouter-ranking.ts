/**
 * CLI Utility to test OpenRouter model fetching and ranking
 * 
 * Run with: npx tsx src/ai/utils/test-openrouter-ranking.ts
 */

import { fetchAndRankFreeModels, clearModelCache } from "./openrouter-model-fetcher";

async function main() {
  console.log("=".repeat(80));
  console.log("OpenRouter Free Model Ranking System - Test Utility");
  console.log("=".repeat(80));
  console.log();
  
  // Clear cache to force fresh fetch
  clearModelCache();
  
  console.log("Fetching and ranking free models from OpenRouter API...");
  console.log();
  
  const startTime = Date.now();
  const rankedModels = await fetchAndRankFreeModels();
  const endTime = Date.now();
  
  console.log();
  console.log("=".repeat(80));
  console.log(`✓ Successfully fetched and ranked ${rankedModels.length} free models`);
  console.log(`⏱  Time taken: ${endTime - startTime}ms`);
  console.log("=".repeat(80));
  console.log();
  
  if (rankedModels.length === 0) {
    console.error("❌ No free models found!");
    return;
  }
  
  // Display top 20 models
  console.log("🏆 Top 20 Models for Code Generation:");
  console.log();
  
  rankedModels.slice(0, 20).forEach((model, index) => {
    const rank = (index + 1).toString().padStart(2, " ");
    const score = model.score.toString().padStart(3, " ");
    const contextK = Math.floor(model.contextLength / 1000);
    const context = `${contextK}k`.padStart(5, " ");
    
    console.log(`${rank}. [Score: ${score}] [Context: ${context}] ${model.name}`);
    console.log(`    ${model.reasoning}`);
    console.log();
  });
  
  console.log("=".repeat(80));
  console.log("Model ID Format for use in code:");
  console.log("=".repeat(80));
  console.log();
  rankedModels.slice(0, 5).forEach((model, index) => {
    console.log(`  ${index + 1}. "${model.id}"`);
  });
  console.log();
  
  // Statistics
  console.log("=".repeat(80));
  console.log("Statistics:");
  console.log("=".repeat(80));
  console.log();
  
  const avgScore = rankedModels.reduce((sum, m) => sum + m.score, 0) / rankedModels.length;
  const avgContext = rankedModels.reduce((sum, m) => sum + m.contextLength, 0) / rankedModels.length;
  const maxContext = Math.max(...rankedModels.map(m => m.contextLength));
  const minContext = Math.min(...rankedModels.map(m => m.contextLength));
  
  console.log(`  Average Score: ${avgScore.toFixed(2)}`);
  console.log(`  Average Context Length: ${Math.floor(avgContext / 1000)}k tokens`);
  console.log(`  Max Context Length: ${Math.floor(maxContext / 1000)}k tokens`);
  console.log(`  Min Context Length: ${Math.floor(minContext / 1000)}k tokens`);
  console.log();
  
  // Check for code-specific models
  const codeModels = rankedModels.filter(m => 
    m.name.toLowerCase().includes("code") || 
    m.name.toLowerCase().includes("coding")
  );
  
  console.log(`  Models specifically for code: ${codeModels.length}`);
  console.log();
  
  console.log("=".repeat(80));
  console.log("✓ Test complete!");
  console.log("=".repeat(80));
}

main().catch((error) => {
  console.error("❌ Error running test:", error);
  process.exit(1);
});
