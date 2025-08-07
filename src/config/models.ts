/**
 * AI Model Configuration and Orchestration
 * 
 * This file manages the multi-model AI system used in The Axiom Project,
 * including fallback logic, model-specific optimizations, and quality assessment.
 */

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  strengths: string[];
  maxTokens: number;
  costPerToken: number;
  reliabilityScore: number;
}

export const AI_MODELS: Record<string, AIModel> = {
  grok: {
    id: 'grok-beta',
    name: 'Grok',
    provider: 'X.AI',
    strengths: ['philosophical reasoning', 'creative thinking', 'breakthrough detection'],
    maxTokens: 8192,
    costPerToken: 0.00002,
    reliabilityScore: 0.87
  },
  gpt4: {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    strengths: ['analytical reasoning', 'structured thinking', 'quality assessment'],
    maxTokens: 4096,
    costPerToken: 0.00003,
    reliabilityScore: 0.92
  },
  gemini: {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    strengths: ['factual grounding', 'coherence checking', 'semantic analysis'],
    maxTokens: 8192,
    costPerToken: 0.000125,
    reliabilityScore: 0.85
  },
  claude: {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    strengths: ['ethical reasoning', 'nuanced analysis', 'bias detection'],
    maxTokens: 4096,
    costPerToken: 0.000015,
    reliabilityScore: 0.89
  }
};

export interface ModelSelectionStrategy {
  primary: string;
  fallbacks: string[];
  qualityThreshold: number;
  retryAttempts: number;
}

export const EXPLORATION_STRATEGIES: Record<string, ModelSelectionStrategy> = {
  breakthrough: {
    primary: 'grok',
    fallbacks: ['claude', 'gpt4'],
    qualityThreshold: 0.75,
    retryAttempts: 3
  },
  analytical: {
    primary: 'gpt4',
    fallbacks: ['claude', 'gemini'],
    qualityThreshold: 0.80,
    retryAttempts: 2
  },
  grounding: {
    primary: 'gemini',
    fallbacks: ['gpt4', 'claude'],
    qualityThreshold: 0.85,
    retryAttempts: 2
  }
};

/**
 * Dynamic cognitive pressure calculation based on exploration quality and momentum
 */
export function calculateCognitivePressure(
  stepNumber: number,
  qualityScore: number,
  momentum: number
): number {
  const basePressure = Math.min(stepNumber * 0.1, 0.8);
  const qualityModifier = qualityScore > 0.7 ? 0.2 : -0.1;
  const momentumModifier = momentum * 0.3;
  
  return Math.max(0.1, Math.min(1.0, basePressure + qualityModifier + momentumModifier));
}

/**
 * Quality assessment weights for multi-dimensional scoring
 */
export const QUALITY_WEIGHTS = {
  novelty: 0.25,
  coherence: 0.20,
  depth: 0.20,
  clarity: 0.15,
  relevance: 0.10,
  creativity: 0.10
};