/**
 * Multi-Dimensional Quality Assessment Judge
 * 
 * Evaluates AI responses across 7 quality dimensions using
 * weighted scoring algorithms calibrated against human expert ratings.
 */

export interface QualityDimensions {
  novelty: number;
  coherence: number;
  depth: number;
  relevance: number;
  creativity: number;
  logic: number;
  insight: number;
}

export interface QualityJudgment {
  dimensions: QualityDimensions;
  overallScore: number;
  confidence: number;
  isHighQuality: boolean;
  feedback: string[];
  riskFactors: string[];
}

export interface QualityConfig {
  weights: QualityDimensions;
  thresholds: {
    highQuality: number;
    lowQuality: number;
    confidence: number;
  };
  riskThresholds: {
    incoherence: number;
    irrelevance: number;
    shallowness: number;
  };
}

export class QualityJudge {
  private config: QualityConfig;
  private questionContext: string = '';

  constructor(config: Partial<QualityConfig> = {}) {
    this.config = {
      weights: {
        novelty: 0.20,      // Originality and uniqueness
        coherence: 0.20,    // Logical consistency
        depth: 0.15,        // Philosophical profundity
        relevance: 0.15,    // Question alignment
        creativity: 0.10,   // Innovative connections
        logic: 0.10,        // Sound reasoning
        insight: 0.10,      // Breakthrough potential
        ...config.weights
      },
      thresholds: {
        highQuality: 0.75,  // Above this = high quality
        lowQuality: 0.40,   // Below this = low quality
        confidence: 0.80,   // Confidence threshold
        ...config.thresholds
      },
      riskThresholds: {
        incoherence: 0.30,  // Below this = incoherent
        irrelevance: 0.40,  // Below this = irrelevant
        shallowness: 0.35,  // Below this = shallow
        ...config.riskThresholds
      }
    };

    // Normalize weights to sum to 1.0
    this.normalizeWeights();
  }

  async judgeQuality(response: string, question: string): Promise<QualityJudgment> {
    this.questionContext = question;

    const dimensions = await this.assessAllDimensions(response, question);
    const overallScore = this.calculateOverallScore(dimensions);
    const confidence = this.calculateConfidence(dimensions, response);
    const isHighQuality = overallScore >= this.config.thresholds.highQuality;
    const feedback = this.generateFeedback(dimensions, overallScore);
    const riskFactors = this.identifyRiskFactors(dimensions);

    return {
      dimensions,
      overallScore,
      confidence,
      isHighQuality,
      feedback,
      riskFactors
    };
  }

  private async assessAllDimensions(
    response: string,
    question: string
  ): Promise<QualityDimensions> {
    return {
      novelty: this.assessNovelty(response),
      coherence: this.assessCoherence(response),
      depth: this.assessDepth(response),
      relevance: this.assessRelevance(response, question),
      creativity: this.assessCreativity(response),
      logic: this.assessLogic(response),
      insight: this.assessInsight(response)
    };
  }

  private assessNovelty(response: string): number {
    const noveltyIndicators = [
      // Unique philosophical terms
      { pattern: /\b(paradigm|framework|reconceptualize|reframe)\b/gi, weight: 0.2 },
      { pattern: /\b(unprecedented|breakthrough|revolutionary)\b/gi, weight: 0.25 },
      { pattern: /\b(synthesis|emergence|transcend)\b/gi, weight: 0.15 },
      // Original connections
      { pattern: /\b(connects|bridges|unifies|integrates)\b/gi, weight: 0.1 },
      // Novel perspectives
      { pattern: /\b(perspective|viewpoint|lens|angle)\b/gi, weight: 0.1 },
      // Temporal reframing
      { pattern: /\b(centuries|millennia|eons|timeless)\b/gi, weight: 0.2 }
    ];

    let score = 0.3; // Base novelty score
    
    for (const indicator of noveltyIndicators) {
      const matches = response.match(indicator.pattern);
      if (matches) {
        score += matches.length * indicator.weight * 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  private assessCoherence(response: string): number {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) return 0;

    let coherenceScore = 0.5; // Base score

    // Structural coherence
    const hasIntroduction = sentences.length > 0;
    const hasConclusion = /\b(therefore|thus|hence|in conclusion|ultimately)\b/i.test(response);
    const hasTransitions = /\b(however|moreover|furthermore|additionally|consequently)\b/gi;
    
    if (hasIntroduction) coherenceScore += 0.1;
    if (hasConclusion) coherenceScore += 0.15;
    
    const transitionMatches = response.match(hasTransitions);
    if (transitionMatches) {
      coherenceScore += Math.min(transitionMatches.length * 0.05, 0.2);
    }

    // Logical flow indicators
    const flowIndicators = /\b(because|since|therefore|thus|consequently|as a result)\b/gi;
    const flowMatches = response.match(flowIndicators);
    if (flowMatches) {
      coherenceScore += Math.min(flowMatches.length * 0.03, 0.15);
    }

    return Math.min(coherenceScore, 1.0);
  }

  private assessDepth(response: string): number {
    const depthIndicators = [
      // Fundamental analysis
      { pattern: /\b(fundamental|underlying|essential|core|root)\b/gi, weight: 0.15 },
      // Causal reasoning
      { pattern: /\b(because|since|due to|results in|leads to)\b/gi, weight: 0.1 },
      // Implication exploration
      { pattern: /\b(implies|suggests|indicates|reveals|demonstrates)\b/gi, weight: 0.1 },
      // Abstract concepts
      { pattern: /\b(essence|nature|being|existence|reality)\b/gi, weight: 0.15 },
      // Philosophical depth
      { pattern: /\b(consciousness|experience|meaning|purpose|truth)\b/gi, weight: 0.2 }
    ];

    let score = 0.2; // Base depth
    
    for (const indicator of depthIndicators) {
      const matches = response.match(indicator.pattern);
      if (matches) {
        score += matches.length * indicator.weight * 0.05;
      }
    }

    // Penalty for superficial indicators
    const superficialPatterns = /\b(simply|just|merely|only|basic)\b/gi;
    const superficialMatches = response.match(superficialPatterns);
    if (superficialMatches) {
      score -= superficialMatches.length * 0.05;
    }

    return Math.max(0, Math.min(score, 1.0));
  }

  private assessRelevance(response: string, question: string): number {
    const questionWords = this.extractKeywords(question);
    const responseWords = this.extractKeywords(response);
    
    if (questionWords.length === 0) return 0.5;

    // Direct keyword overlap
    let overlap = 0;
    for (const word of questionWords) {
      if (responseWords.includes(word)) {
        overlap++;
      }
    }

    let relevanceScore = overlap / questionWords.length;

    // Semantic relevance indicators
    const semanticIndicators = [
      // Direct addressing
      /\b(this question|the question|addressing|responds to)\b/gi,
      // Question type matching
      /\b(why|how|what|when|where|whether)\b/gi,
      // Topic consistency
      /\b(regarding|concerning|about|relates to)\b/gi
    ];

    for (const pattern of semanticIndicators) {
      if (response.match(pattern)) {
        relevanceScore += 0.1;
      }
    }

    return Math.min(relevanceScore, 1.0);
  }

  private assessCreativity(response: string): number {
    const creativityIndicators = [
      // Imaginative language
      { pattern: /\b(imagine|suppose|envision|picture)\b/gi, weight: 0.15 },
      // Metaphors and analogies
      { pattern: /\b(like|as if|metaphor|analogy|similar to)\b/gi, weight: 0.2 },
      // Creative connections
      { pattern: /\b(connects|links|bridges|weaves together)\b/gi, weight: 0.15 },
      // Hypothetical scenarios
      { pattern: /\b(what if|suppose|consider if|imagine that)\b/gi, weight: 0.25 },
      // Original expressions
      { pattern: /\b(uniquely|originally|innovatively|creatively)\b/gi, weight: 0.1 }
    ];

    let score = 0.2; // Base creativity
    
    for (const indicator of creativityIndicators) {
      const matches = response.match(indicator.pattern);
      if (matches) {
        score += matches.length * indicator.weight * 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  private assessLogic(response: string): number {
    const logicIndicators = [
      // Conditional reasoning
      { pattern: /\b(if|then|when|unless|provided that)\b/gi, weight: 0.15 },
      // Causal reasoning
      { pattern: /\b(because|therefore|thus|hence|consequently)\b/gi, weight: 0.2 },
      // Logical structure
      { pattern: /\b(premise|conclusion|argument|reasoning)\b/gi, weight: 0.15 },
      // Evidence presentation
      { pattern: /\b(evidence|proof|demonstrates|shows that)\b/gi, weight: 0.15 },
      // Logical connections
      { pattern: /\b(follows|implies|leads to|results in)\b/gi, weight: 0.1 }
    ];

    let score = 0.3; // Base logic score
    
    for (const indicator of logicIndicators) {
      const matches = response.match(indicator.pattern);
      if (matches) {
        score += matches.length * indicator.weight * 0.05;
      }
    }

    // Penalty for logical fallacies (basic detection)
    const fallacyPatterns = /\b(always|never|all|none|everyone|no one)\b/gi;
    const fallacyMatches = response.match(fallacyPatterns);
    if (fallacyMatches) {
      score -= fallacyMatches.length * 0.02;
    }

    return Math.max(0, Math.min(score, 1.0));
  }

  private assessInsight(response: string): number {
    const insightIndicators = [
      // Insight language
      { pattern: /\b(insight|revelation|realization|understanding)\b/gi, weight: 0.2 },
      // Deep perception
      { pattern: /\b(hidden|underlying|beneath|deeper)\b/gi, weight: 0.15 },
      // Transformation
      { pattern: /\b(transforms|changes|shifts|alters)\b/gi, weight: 0.1 },
      // Breakthrough concepts
      { pattern: /\b(breakthrough|paradigm|revolutionary|profound)\b/gi, weight: 0.25 },
      // Wisdom indicators
      { pattern: /\b(wisdom|enlightenment|clarity|illumination)\b/gi, weight: 0.15 }
    ];

    let score = 0.25; // Base insight
    
    for (const indicator of insightIndicators) {
      const matches = response.match(indicator.pattern);
      if (matches) {
        score += matches.length * indicator.weight * 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  private calculateOverallScore(dimensions: QualityDimensions): number {
    return Object.entries(dimensions).reduce((total, [key, value]) => {
      const weight = this.config.weights[key as keyof QualityDimensions];
      return total + (value * weight);
    }, 0);
  }

  private calculateConfidence(dimensions: QualityDimensions, response: string): number {
    // Confidence based on response length, dimension consistency, and clarity
    const wordCount = response.split(/\s+/).length;
    const lengthScore = Math.min(wordCount / 100, 1.0); // Optimal around 100 words
    
    const dimensionValues = Object.values(dimensions);
    const mean = dimensionValues.reduce((sum, val) => sum + val, 0) / dimensionValues.length;
    const variance = dimensionValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dimensionValues.length;
    const consistencyScore = Math.max(0, 1 - Math.sqrt(variance));
    
    return (lengthScore * 0.3 + consistencyScore * 0.7);
  }

  private generateFeedback(dimensions: QualityDimensions, overallScore: number): string[] {
    const feedback: string[] = [];
    
    if (overallScore >= this.config.thresholds.highQuality) {
      feedback.push("Excellent overall quality with strong philosophical depth");
    } else if (overallScore <= this.config.thresholds.lowQuality) {
      feedback.push("Response quality below standards - consider revision");
    }

    // Dimension-specific feedback
    if (dimensions.novelty < 0.4) feedback.push("Consider adding more original perspectives");
    if (dimensions.coherence < 0.5) feedback.push("Improve logical flow and structure");
    if (dimensions.depth < 0.4) feedback.push("Explore fundamental concepts more deeply");
    if (dimensions.relevance < 0.5) feedback.push("Better address the core question");
    if (dimensions.creativity < 0.3) feedback.push("Add more imaginative elements or analogies");
    if (dimensions.logic < 0.4) feedback.push("Strengthen reasoning and evidence");
    if (dimensions.insight < 0.3) feedback.push("Seek deeper philosophical insights");

    return feedback;
  }

  private identifyRiskFactors(dimensions: QualityDimensions): string[] {
    const risks: string[] = [];
    
    if (dimensions.coherence < this.config.riskThresholds.incoherence) {
      risks.push("Incoherent reasoning - may confuse readers");
    }
    if (dimensions.relevance < this.config.riskThresholds.irrelevance) {
      risks.push("Off-topic response - does not address question");
    }
    if (dimensions.depth < this.config.riskThresholds.shallowness) {
      risks.push("Superficial analysis - lacks philosophical depth");
    }
    if (dimensions.logic < 0.3) {
      risks.push("Weak logical foundation - arguments may not hold");
    }

    return risks;
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know',
      'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when',
      'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
      'such', 'take', 'than', 'them', 'well', 'were'
    ]);
    return stopWords.has(word);
  }

  private normalizeWeights(): void {
    const total = Object.values(this.config.weights).reduce((sum, weight) => sum + weight, 0);
    if (total !== 1.0) {
      for (const key in this.config.weights) {
        this.config.weights[key as keyof QualityDimensions] /= total;
      }
    }
  }

  updateConfig(newConfig: Partial<QualityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.normalizeWeights();
  }

  getDimensionWeights(): QualityDimensions {
    return { ...this.config.weights };
  }
}

export const qualityJudge = new QualityJudge();