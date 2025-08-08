/**
 * Jaccard Similarity-based Convergence Detection
 * 
 * Determines when an exploration has reached sufficient convergence
 * by analyzing semantic similarity between consecutive responses.
 */

export interface ConvergenceMetrics {
  jaccardSimilarity: number;
  semanticStability: number;
  noveltyDecrease: number;
  isConverged: boolean;
  confidence: number;
}

export interface ConvergenceConfig {
  jaccardThreshold: number;
  stabilityThreshold: number;
  noveltyThreshold: number;
  windowSize: number;
  minIterations: number;
}

export class JaccardConvergenceDetector {
  private config: ConvergenceConfig;
  private responseHistory: string[] = [];
  private similarityHistory: number[] = [];

  constructor(config: Partial<ConvergenceConfig> = {}) {
    this.config = {
      jaccardThreshold: 0.85, // High similarity threshold
      stabilityThreshold: 0.9, // Stability over time
      noveltyThreshold: 0.1, // Low novelty threshold
      windowSize: 3, // Compare last N responses
      minIterations: 2, // Minimum responses before convergence
      ...config
    };
  }

  addResponse(response: string): ConvergenceMetrics {
    this.responseHistory.push(response);
    
    if (this.responseHistory.length < 2) {
      return this.createMetrics(0, 0, 1, false, 0);
    }

    const jaccardSimilarity = this.calculateJaccardSimilarity(
      this.responseHistory[this.responseHistory.length - 2],
      response
    );

    this.similarityHistory.push(jaccardSimilarity);

    const semanticStability = this.calculateSemanticStability();
    const noveltyDecrease = this.calculateNoveltyDecrease();
    
    const isConverged = this.determineConvergence(
      jaccardSimilarity,
      semanticStability,
      noveltyDecrease
    );

    const confidence = this.calculateConfidence(
      jaccardSimilarity,
      semanticStability,
      noveltyDecrease
    );

    return this.createMetrics(
      jaccardSimilarity,
      semanticStability,
      noveltyDecrease,
      isConverged,
      confidence
    );
  }

  private calculateJaccardSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2); // Remove short words
  }

  private calculateSemanticStability(): number {
    if (this.similarityHistory.length < this.config.windowSize) {
      return 0;
    }

    const window = this.similarityHistory.slice(-this.config.windowSize);
    const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
    
    // Calculate variance
    const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
    
    // Stability is inverse of variance (higher variance = lower stability)
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private calculateNoveltyDecrease(): number {
    if (this.similarityHistory.length < 2) {
      return 0;
    }

    const recent = this.similarityHistory.slice(-2);
    const earlier = this.similarityHistory.slice(0, -2);
    
    if (earlier.length === 0) {
      return 0;
    }

    const recentMean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierMean = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
    
    // Novelty decrease = how much more similar recent responses are
    return Math.max(0, recentMean - earlierMean);
  }

  private determineConvergence(
    jaccardSimilarity: number,
    semanticStability: number,
    noveltyDecrease: number
  ): boolean {
    if (this.responseHistory.length < this.config.minIterations) {
      return false;
    }

    return (
      jaccardSimilarity >= this.config.jaccardThreshold &&
      semanticStability >= this.config.stabilityThreshold &&
      noveltyDecrease <= this.config.noveltyThreshold
    );
  }

  private calculateConfidence(
    jaccardSimilarity: number,
    semanticStability: number,
    noveltyDecrease: number
  ): number {
    // Weighted confidence based on all metrics
    const weights = { jaccard: 0.4, stability: 0.4, novelty: 0.2 };
    
    const jaccardScore = Math.min(jaccardSimilarity / this.config.jaccardThreshold, 1);
    const stabilityScore = Math.min(semanticStability / this.config.stabilityThreshold, 1);
    const noveltyScore = Math.max(0, 1 - (noveltyDecrease / this.config.noveltyThreshold));
    
    return (
      weights.jaccard * jaccardScore +
      weights.stability * stabilityScore +
      weights.novelty * noveltyScore
    );
  }

  private createMetrics(
    jaccardSimilarity: number,
    semanticStability: number,
    noveltyDecrease: number,
    isConverged: boolean,
    confidence: number
  ): ConvergenceMetrics {
    return {
      jaccardSimilarity,
      semanticStability,
      noveltyDecrease,
      isConverged,
      confidence
    };
  }

  reset(): void {
    this.responseHistory = [];
    this.similarityHistory = [];
  }

  getHistory(): { responses: string[]; similarities: number[] } {
    return {
      responses: [...this.responseHistory],
      similarities: [...this.similarityHistory]
    };
  }
}

export const jaccardDetector = new JaccardConvergenceDetector();