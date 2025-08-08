import { BreakthroughIndicators } from '@/schemas/promptSchemas';

export class BreakthroughAnalyzer {
  private readonly BREAKTHROUGH_THRESHOLD = 0.7;
  private readonly PARADIGM_SHIFT_THRESHOLD = 0.8;

  async analyzeBreakthrough(
    content: string,
    previousInsights: string[] = []
  ): Promise<BreakthroughIndicators> {
    const indicators = {
      temporalDisplacement: this.detectTemporalDisplacement(content),
      assumptionInversion: this.detectAssumptionInversion(content),
      metaCognitiveFraming: this.detectMetaCognitiveFraming(content),
      constraintParadox: this.detectConstraintParadox(content),
      conceptualNovelty: await this.assessConceptualNovelty(content, previousInsights),
      paradigmShift: false,
      breakthroughScore: 0
    };

    // Calculate overall breakthrough score
    const score = (
      indicators.temporalDisplacement +
      indicators.assumptionInversion +
      indicators.metaCognitiveFraming +
      indicators.constraintParadox +
      indicators.conceptualNovelty
    ) / 5;

    indicators.breakthroughScore = score;
    indicators.paradigmShift = score >= this.PARADIGM_SHIFT_THRESHOLD;

    return indicators;
  }

  private detectTemporalDisplacement(content: string): number {
    const patterns = [
      // Historical/futuristic perspective shifts
      /\b(throughout history|in the future|centuries ago|millennia hence)\b/gi,
      // Time-scale reframing
      /\b(in the long term|from a cosmic perspective|over geological time)\b/gi,
      // Temporal paradoxes
      /\b(timeless|eternal|momentary yet infinite|outside of time)\b/gi,
      // Progress questioning
      /\b(progress is|regression|cyclical|spiral|non-linear)\b/gi
    ];

    let score = 0;
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 0.2;
      }
    });

    return Math.min(score, 1.0);
  }

  private detectAssumptionInversion(content: string): number {
    const patterns = [
      // Direct assumption challenges
      /\b(assumes|assumption|taken for granted|what if.*weren't|suppose.*opposite)\b/gi,
      // Inversion language
      /\b(inverted|reversed|opposite|contrary|antithetical)\b/gi,
      // Questioning fundamentals
      /\b(what if|but what if|perhaps instead|alternatively|conversely)\b/gi,
      // Reframing statements
      /\b(not.*but|rather than|instead of|actually)\b/gi
    ];

    let score = 0;
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 0.15;
      }
    });

    return Math.min(score, 1.0);
  }

  private detectMetaCognitiveFraming(content: string): number {
    const patterns = [
      // Thinking about thinking
      /\b(thinking about.*thinking|meta.*cognitive|recursive|self.*referential)\b/gi,
      // Questioning the question
      /\b(question.*itself|questioning.*assumptions|problem.*with.*problem)\b/gi,
      // Framework awareness
      /\b(framework|paradigm|lens|perspective|way of thinking)\b/gi,
      // Level jumping
      /\b(level.*up|zoom.*out|step.*back|higher.*level|meta.*level)\b/gi
    ];

    let score = 0;
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 0.2;
      }
    });

    return Math.min(score, 1.0);
  }

  private detectConstraintParadox(content: string): number {
    const patterns = [
      // Paradox language
      /\b(paradox|contradiction|simultaneously|both.*and|neither.*nor)\b/gi,
      // Impossible possibilities
      /\b(impossible.*possible|limitation.*unlimited|finite.*infinite)\b/gi,
      // Constraint transcendence
      /\b(beyond.*constraints|transcend.*limitations|break.*boundaries)\b/gi,
      // Logical tensions
      /\b(tension|dialectic|synthesis|antithesis|reconcile)\b/gi
    ];

    let score = 0;
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 0.18;
      }
    });

    return Math.min(score, 1.0);
  }

  private async assessConceptualNovelty(
    content: string,
    previousInsights: string[]
  ): Promise<number> {
    if (previousInsights.length === 0) {
      return 0.8; // High novelty if no previous context
    }

    try {
      // Simple text similarity check for now
      // In production, this would use actual vector embeddings
      let maxSimilarity = 0;
      
      for (const insight of previousInsights) {
        const similarity = this.simpleTextSimilarity(content, insight);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      // Convert similarity to novelty (inverse relationship)
      return 1.0 - maxSimilarity;
    } catch (error) {
      console.warn('Failed to calculate conceptual novelty:', error);
      return 0.5; // Default moderate novelty
    }
  }

  isBreakthrough(indicators: BreakthroughIndicators): boolean {
    return indicators.breakthroughScore >= this.BREAKTHROUGH_THRESHOLD;
  }

  isParadigmShift(indicators: BreakthroughIndicators): boolean {
    return indicators.paradigmShift;
  }

  getBreakthroughSummary(indicators: BreakthroughIndicators): string {
    const strengths: string[] = [];
    
    if (indicators.temporalDisplacement > 0.6) {
      strengths.push("temporal perspective shifting");
    }
    if (indicators.assumptionInversion > 0.6) {
      strengths.push("assumption challenging");
    }
    if (indicators.metaCognitiveFraming > 0.6) {
      strengths.push("meta-cognitive awareness");
    }
    if (indicators.constraintParadox > 0.6) {
      strengths.push("paradox recognition");
    }
    if (indicators.conceptualNovelty > 0.6) {
      strengths.push("conceptual novelty");
    }

    if (strengths.length === 0) {
      return "Standard insight with conventional framing";
    }

    const level = indicators.paradigmShift ? "PARADIGM SHIFT" : 
                  indicators.breakthroughScore > 0.7 ? "BREAKTHROUGH" : "ELEVATED INSIGHT";
    
    return `${level}: Strong ${strengths.join(", ")}`;
  }

  private simpleTextSimilarity(text1: string, text2: string): number {
    // Basic Jaccard similarity for demonstration
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

export const breakthroughAnalyzer = new BreakthroughAnalyzer();