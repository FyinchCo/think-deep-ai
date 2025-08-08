import { ModelConfig, ExplorationRequest, QualityMetrics } from '@/schemas/promptSchemas';
import { supabase } from '@/integrations/supabase/client';

export class AIOrchestrator {
  private fallbackChain: string[] = ['grok', 'openai', 'gemini', 'claude'];
  private requestCount = 0;
  private lastRequestTime = 0;

  async generateResponse(
    request: ExplorationRequest,
    modelConfig: ModelConfig,
    cognitiveLevel: number = 5
  ): Promise<{ content: string; metrics: QualityMetrics; model: string }> {
    const startTime = Date.now();
    
    // Implement rate limiting
    await this.enforceRateLimit();
    
    // Calculate cognitive pressure
    const pressure = this.calculateCognitivePressure(
      request.question,
      cognitiveLevel,
      this.requestCount
    );

    // Build prompt with cognitive pressure
    const enhancedPrompt = this.buildCognitivePressurePrompt(
      request.question,
      pressure,
      request.mode
    );

    // Attempt generation with fallback chain
    for (const provider of this.fallbackChain) {
      try {
        const response = await this.callProvider(provider, enhancedPrompt, modelConfig);
        
        if (response) {
          const metrics = await this.assessQuality(response, request.question);
          
          // Log successful generation
          console.log(`✅ Generated with ${provider} in ${Date.now() - startTime}ms`);
          
          return {
            content: response,
            metrics,
            model: provider
          };
        }
      } catch (error) {
        console.warn(`⚠️ Provider ${provider} failed:`, error);
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  private async callProvider(
    provider: string,
    prompt: string,
    config: ModelConfig
  ): Promise<string | null> {
    const { data, error } = await supabase.functions.invoke('rabbit-hole-step', {
      body: {
        provider,
        prompt,
        model_config: config,
        request_id: `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
      }
    });

    if (error) throw error;
    return data?.content || null;
  }

  private calculateCognitivePressure(
    question: string,
    baseLevel: number,
    stepNumber: number
  ): number {
    // Base complexity analysis
    const questionComplexity = this.analyzeQuestionComplexity(question);
    
    // Escalation based on step number
    const escalation = Math.min(stepNumber * 0.1, 0.5);
    
    // Domain-specific modifiers
    const domainModifier = this.getDomainModifier(question);
    
    return Math.min(
      (baseLevel / 10) + questionComplexity + escalation + domainModifier,
      1.0
    );
  }

  private analyzeQuestionComplexity(question: string): number {
    const indicators = [
      /\b(why|how|what if|suppose|imagine)\b/gi,
      /\b(paradox|contradiction|impossible|infinite)\b/gi,
      /\b(consciousness|reality|existence|meaning)\b/gi,
      /\b(ethical|moral|should|ought)\b/gi
    ];

    let complexity = 0.1; // Base complexity
    
    indicators.forEach(pattern => {
      const matches = question.match(pattern);
      if (matches) {
        complexity += matches.length * 0.1;
      }
    });

    return Math.min(complexity, 0.5);
  }

  private getDomainModifier(question: string): number {
    const domains = {
      philosophy: /\b(philosophy|philosophical|existence|reality|consciousness)\b/gi,
      ethics: /\b(ethics|ethical|moral|right|wrong|should|ought)\b/gi,
      science: /\b(science|scientific|physics|quantum|universe)\b/gi,
      logic: /\b(logic|logical|reasoning|argument|proof)\b/gi,
      metaphysics: /\b(metaphysics|being|time|space|causation)\b/gi
    };

    for (const [domain, pattern] of Object.entries(domains)) {
      if (question.match(pattern)) {
        return 0.2; // Philosophy and abstract domains get higher pressure
      }
    }

    return 0.0;
  }

  private buildCognitivePressurePrompt(
    question: string,
    pressure: number,
    mode: string
  ): string {
    const pressureInstructions = this.getPressureInstructions(pressure);
    const modeInstructions = this.getModeInstructions(mode);
    
    return `${pressureInstructions}

${modeInstructions}

QUESTION: ${question}

Please provide a thoughtful, nuanced response that demonstrates deep philosophical reasoning.`;
  }

  private getPressureInstructions(pressure: number): string {
    if (pressure < 0.3) {
      return "Provide a clear, straightforward response focusing on fundamental concepts.";
    } else if (pressure < 0.6) {
      return "Explore deeper implications and consider multiple perspectives. Challenge common assumptions.";
    } else if (pressure < 0.8) {
      return "Push the boundaries of conventional thinking. Explore paradoxes, contradictions, and novel frameworks.";
    } else {
      return "Engage in revolutionary thinking. Question the very foundations of the question itself. Seek paradigm-shifting insights.";
    }
  }

  private getModeInstructions(mode: string): string {
    switch (mode) {
      case 'exploration':
        return "Take on the role of a philosophical explorer. Build upon ideas iteratively and follow interesting tangents.";
      case 'grounding':
        return "Ground your response in established facts and evidence. Avoid pure speculation.";
      case 'devils_advocate':
        return "Challenge the assumptions in the question. Present contrarian viewpoints and alternative interpretations.";
      default:
        return "Provide a balanced, thoughtful response.";
    }
  }

  private async assessQuality(response: string, question: string): Promise<QualityMetrics> {
    // Implement quality assessment logic
    const novelty = this.assessNovelty(response);
    const coherence = this.assessCoherence(response);
    const depth = this.assessDepth(response);
    const relevance = this.assessRelevance(response, question);
    const creativity = this.assessCreativity(response);
    const logic = this.assessLogic(response);
    const insight = this.assessInsight(response);

    const overallScore = (novelty + coherence + depth + relevance + creativity + logic + insight) / 7;

    return {
      novelty,
      coherence,
      depth,
      relevance,
      creativity,
      logic,
      insight,
      overallScore
    };
  }

  private assessNovelty(response: string): number {
    // Check for unique philosophical terms and concepts
    const novelIndicators = [
      /\b(paradigm|framework|reconceptualize|reframe)\b/gi,
      /\b(novel|innovative|unprecedented|breakthrough)\b/gi,
      /\b(synthesis|integration|emergence)\b/gi
    ];

    let score = 0.3; // Base score
    novelIndicators.forEach(pattern => {
      if (response.match(pattern)) score += 0.1;
    });

    return Math.min(score, 1.0);
  }

  private assessCoherence(response: string): number {
    // Simple coherence check based on structure
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const hasIntroduction = sentences.length > 0;
    const hasConclusion = response.toLowerCase().includes('therefore') || 
                         response.toLowerCase().includes('thus') ||
                         response.toLowerCase().includes('in conclusion');
    
    let score = 0.5;
    if (hasIntroduction) score += 0.2;
    if (hasConclusion) score += 0.2;
    if (sentences.length >= 3) score += 0.1;

    return Math.min(score, 1.0);
  }

  private assessDepth(response: string): number {
    const depthIndicators = [
      /\b(fundamental|underlying|essential|core)\b/gi,
      /\b(because|since|therefore|thus|consequently)\b/gi,
      /\b(implies|suggests|indicates|reveals)\b/gi
    ];

    let score = 0.3;
    depthIndicators.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) score += matches.length * 0.05;
    });

    return Math.min(score, 1.0);
  }

  private assessRelevance(response: string, question: string): number {
    const questionWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const responseWords = response.toLowerCase().split(/\W+/);
    
    let overlap = 0;
    questionWords.forEach(word => {
      if (responseWords.includes(word)) overlap++;
    });

    return Math.min(overlap / Math.max(questionWords.length, 1), 1.0);
  }

  private assessCreativity(response: string): number {
    const creativityIndicators = [
      /\b(imagine|suppose|consider|what if)\b/gi,
      /\b(metaphor|analogy|like|as if)\b/gi,
      /\b(creative|innovative|original)\b/gi
    ];

    let score = 0.3;
    creativityIndicators.forEach(pattern => {
      if (response.match(pattern)) score += 0.15;
    });

    return Math.min(score, 1.0);
  }

  private assessLogic(response: string): number {
    const logicIndicators = [
      /\b(if|then|because|therefore|thus|hence)\b/gi,
      /\b(premise|conclusion|argument|reasoning)\b/gi,
      /\b(follows|implies|leads to|results in)\b/gi
    ];

    let score = 0.4;
    logicIndicators.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) score += matches.length * 0.03;
    });

    return Math.min(score, 1.0);
  }

  private assessInsight(response: string): number {
    const insightIndicators = [
      /\b(insight|revelation|understanding|realization)\b/gi,
      /\b(hidden|underlying|deeper|profound)\b/gi,
      /\b(perspective|viewpoint|lens|angle)\b/gi
    ];

    let score = 0.3;
    insightIndicators.forEach(pattern => {
      if (response.match(pattern)) score += 0.1;
    });

    return Math.min(score, 1.0);
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < 1000) { // 1 second minimum between requests
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}

export const aiOrchestrator = new AIOrchestrator();