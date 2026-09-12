/**
 * OpenRouter Model Fetcher and Ranker
 * 
 * This utility fetches free models from OpenRouter API and ranks them
 * based on their programming capabilities for our AI website builder.
 * 
 * Ranking criteria (in order of importance):
 * 1. Code generation capability
 * 2. Context length (longer is better for complex tasks)
 * 3. Model size/parameters (larger generally better for coding)
 * 4. Instruction following capability
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated: boolean;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  description?: string;
}

export interface RankedModel {
  id: string;
  name: string;
  score: number;
  contextLength: number;
  reasoning: string;
}

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

// Cache for fetched models (TTL: 1 hour)
let cachedModels: RankedModel[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Calculate a ranking score for a model based on its coding capabilities
 */
function calculateModelScore(model: OpenRouterModel): number {
  let score = 0;
  
  // 1. Check if model is specifically designed for code (highest priority)
  const nameAndDesc = `${model.name} ${model.description || ""}`.toLowerCase();
  if (nameAndDesc.includes("code") || nameAndDesc.includes("coding")) {
    score += 50;
  }
  if (nameAndDesc.includes("instruct") || nameAndDesc.includes("instruction")) {
    score += 30;
  }
  
  // 2. Context length scoring (logarithmic scale)
  // Models with 32k+ context get full points, scaling down for smaller contexts
  if (model.context_length >= 32000) {
    score += 30;
  } else if (model.context_length >= 16000) {
    score += 25;
  } else if (model.context_length >= 8000) {
    score += 20;
  } else if (model.context_length >= 4000) {
    score += 15;
  } else {
    score += 10;
  }
  
  // 3. Model architecture and size (inferred from name)
  // Look for parameter counts in model names (e.g., "70b", "120b")
  const paramMatch = model.name.match(/(\d+)b/i);
  if (paramMatch) {
    const params = parseInt(paramMatch[1], 10);
    if (params >= 100) {
      score += 20;
    } else if (params >= 50) {
      score += 15;
    } else if (params >= 20) {
      score += 10;
    } else if (params >= 7) {
      score += 5;
    }
  }
  
  // 4. Provider reputation (Nvidia, Meta, Google, Anthropic, etc.)
  if (nameAndDesc.includes("nvidia") || nameAndDesc.includes("nemotron")) {
    score += 15;
  }
  if (nameAndDesc.includes("meta") || nameAndDesc.includes("llama")) {
    score += 12;
  }
  if (nameAndDesc.includes("google") || nameAndDesc.includes("gemma")) {
    score += 12;
  }
  if (nameAndDesc.includes("mistral") || nameAndDesc.includes("mixtral")) {
    score += 10;
  }
  if (nameAndDesc.includes("cohere")) {
    score += 10;
  }
  
  // 5. Penalize models that might be unstable or experimental
  if (nameAndDesc.includes("experimental") || nameAndDesc.includes("preview")) {
    score -= 10;
  }
  
  return score;
}

/**
 * Generate reasoning text explaining why a model was ranked
 */
function generateReasoning(model: OpenRouterModel, score: number): string {
  const reasons: string[] = [];
  const nameAndDesc = `${model.name} ${model.description || ""}`.toLowerCase();
  
  if (nameAndDesc.includes("code") || nameAndDesc.includes("coding")) {
    reasons.push("optimized for code generation");
  }
  if (model.context_length >= 32000) {
    reasons.push(`large context (${Math.floor(model.context_length / 1000)}k tokens)`);
  }
  
  const paramMatch = model.name.match(/(\d+)b/i);
  if (paramMatch) {
    reasons.push(`${paramMatch[1]}B parameters`);
  }
  
  if (nameAndDesc.includes("nvidia")) {
    reasons.push("Nvidia provider");
  } else if (nameAndDesc.includes("meta")) {
    reasons.push("Meta provider");
  } else if (nameAndDesc.includes("google")) {
    reasons.push("Google provider");
  }
  
  return reasons.join(", ") || "general-purpose model";
}

/**
 * Fetch all free models from OpenRouter and rank them by coding capability
 */
export async function fetchAndRankFreeModels(): Promise<RankedModel[]> {
  // Check cache first
  const now = Date.now();
  if (cachedModels && (now - cacheTimestamp) < CACHE_TTL_MS) {
    console.log("[OpenRouter] Using cached model rankings");
    return cachedModels;
  }
  
  try {
    console.log("[OpenRouter] Fetching latest free models from API...");
    
    const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.data as OpenRouterModel[];
    
    // Filter for free models only (pricing.prompt === "0")
    const freeModels = models.filter((model) => {
      return (
        model.pricing.prompt === "0" &&
        model.pricing.completion === "0" &&
        model.context_length > 0
      );
    });
    
    console.log(`[OpenRouter] Found ${freeModels.length} free models`);
    
    // Rank the models
    const rankedModels: RankedModel[] = freeModels
      .map((model) => {
        const score = calculateModelScore(model);
        return {
          id: model.id,
          name: model.name,
          score,
          contextLength: model.context_length,
          reasoning: generateReasoning(model, score),
        };
      })
      .sort((a, b) => b.score - a.score); // Sort by score descending
    
    // Log top 10 models for debugging
    console.log("[OpenRouter] Top 10 ranked models:");
    rankedModels.slice(0, 10).forEach((model, index) => {
      console.log(
        `  ${index + 1}. ${model.name} (score: ${model.score}) - ${model.reasoning}`
      );
    });
    
    // Update cache
    cachedModels = rankedModels;
    cacheTimestamp = now;
    
    return rankedModels;
  } catch (error) {
    console.error("[OpenRouter] Failed to fetch models:", error);
    
    // If we have stale cache, return it as fallback
    if (cachedModels) {
      console.warn("[OpenRouter] Returning stale cached models as fallback");
      return cachedModels;
    }
    
    // Ultimate fallback: return empty array (will cause provider to return null)
    return [];
  }
}

/**
 * Clear the model cache (useful for testing or forcing a refresh)
 */
export function clearModelCache(): void {
  cachedModels = null;
  cacheTimestamp = 0;
  console.log("[OpenRouter] Model cache cleared");
}
