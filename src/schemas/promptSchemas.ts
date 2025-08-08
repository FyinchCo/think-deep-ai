import { z } from 'zod';

// Core exploration request schema
export const ExplorationRequestSchema = z.object({
  question: z.string().min(1, "Question is required"),
  mode: z.enum(['single', 'exploration', 'grounding', 'devils_advocate']),
  cognitiveLevel: z.number().min(1).max(10).default(5),
  enableResearchEnforcement: z.boolean().default(false),
  customRules: z.array(z.string()).default([]),
  maxSteps: z.number().min(1).max(50).default(10),
});

// AI Model configuration schema
export const ModelConfigSchema = z.object({
  provider: z.enum(['grok', 'openai', 'gemini', 'claude']),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8000).default(2000),
  topP: z.number().min(0).max(1).default(0.9),
  frequencyPenalty: z.number().min(-2).max(2).default(0),
  presencePenalty: z.number().min(-2).max(2).default(0),
});

// Quality assessment schema
export const QualityMetricsSchema = z.object({
  novelty: z.number().min(0).max(1),
  coherence: z.number().min(0).max(1),
  depth: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  creativity: z.number().min(0).max(1),
  logic: z.number().min(0).max(1),
  insight: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(1),
});

// Breakthrough detection schema
export const BreakthroughIndicatorsSchema = z.object({
  temporalDisplacement: z.number().min(0).max(1),
  assumptionInversion: z.number().min(0).max(1),
  metaCognitiveFraming: z.number().min(0).max(1),
  constraintParadox: z.number().min(0).max(1),
  conceptualNovelty: z.number().min(0).max(1),
  paradigmShift: z.boolean(),
  breakthroughScore: z.number().min(0).max(1),
});

// Cognitive pressure calculation schema
export const CognitivePressureSchema = z.object({
  baseComplexity: z.number().min(0).max(1),
  stepNumber: z.number().min(1),
  escalationRate: z.number().min(0).max(1),
  qualityMomentum: z.number().min(-1).max(1),
  domainModifiers: z.record(z.string(), z.number()),
  finalPressure: z.number().min(0).max(1),
});

// Agent role schemas for multi-agent exploration
export const AgentRoleSchema = z.enum(['builder', 'critic', 'synthesizer']);

export const AgentResponseSchema = z.object({
  role: AgentRoleSchema,
  content: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  timestamp: z.string().datetime(),
});

// Exploration rule schema
export const ExplorationRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['methodological', 'constraint', 'stylistic', 'domain_specific']),
  description: z.string(),
  prompt: z.string(),
  isActive: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
  applicableModels: z.array(z.string()).default([]),
});

// Vector embedding schema
export const EmbeddingSchema = z.object({
  content: z.string(),
  embedding: z.array(z.number()),
  model: z.string().default('text-embedding-3-small'),
  dimensions: z.number().default(1536),
  similarity_threshold: z.number().min(0).max(1).default(0.8),
});

// Export type definitions
export type ExplorationRequest = z.infer<typeof ExplorationRequestSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;
export type BreakthroughIndicators = z.infer<typeof BreakthroughIndicatorsSchema>;
export type CognitivePressure = z.infer<typeof CognitivePressureSchema>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type ExplorationRule = z.infer<typeof ExplorationRuleSchema>;
export type Embedding = z.infer<typeof EmbeddingSchema>;