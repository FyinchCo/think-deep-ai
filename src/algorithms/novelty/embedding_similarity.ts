/**
 * Embedding-based Novelty Detection
 * 
 * Assesses conceptual novelty by comparing semantic embeddings
 * against historical response patterns and known philosophical concepts.
 */

export interface NoveltyMetrics {
  conceptualDistance: number;
  historicalSimilarity: number;
  domainCrossing: number;
  linguisticNovelty: number;
  overallNovelty: number;
  isBreakthrough: boolean;
}

export interface NoveltyConfig {
  distanceThreshold: number;
  historicalThreshold: number;
  crossingThreshold: number;
  linguisticThreshold: number;
  breakthroughThreshold: number;
  maxHistorySize: number;
}

export class EmbeddingNoveltyDetector {
  private config: NoveltyConfig;
  private historicalEmbeddings: number[][] = [];
  private domainKeywords: Map<string, string[]> = new Map();

  constructor(config: Partial<NoveltyConfig> = {}) {
    this.config = {
      distanceThreshold: 0.7, // Cosine distance threshold for novelty
      historicalThreshold: 0.8, // Similarity to past responses
      crossingThreshold: 0.3, // Domain boundary crossing
      linguisticThreshold: 0.6, // Unique linguistic patterns
      breakthroughThreshold: 0.75, // Overall breakthrough threshold
      maxHistorySize: 100, // Maximum stored embeddings
      ...config
    };

    this.initializeDomainKeywords();
  }

  async analyzeNovelty(
    text: string,
    embedding: number[],
    domain?: string
  ): Promise<NoveltyMetrics> {
    const conceptualDistance = this.calculateConceptualDistance(embedding);
    const historicalSimilarity = this.calculateHistoricalSimilarity(embedding);
    const domainCrossing = this.calculateDomainCrossing(text, domain);
    const linguisticNovelty = this.calculateLinguisticNovelty(text);

    // Store embedding for future comparisons
    this.addToHistory(embedding);

    const overallNovelty = this.calculateOverallNovelty(
      conceptualDistance,
      historicalSimilarity,
      domainCrossing,
      linguisticNovelty
    );

    const isBreakthrough = overallNovelty >= this.config.breakthroughThreshold;

    return {
      conceptualDistance,
      historicalSimilarity,
      domainCrossing,
      linguisticNovelty,
      overallNovelty,
      isBreakthrough
    };
  }

  private calculateConceptualDistance(embedding: number[]): number {
    if (this.historicalEmbeddings.length === 0) {
      return 1.0; // Maximum novelty for first response
    }

    // Find minimum cosine distance to any historical embedding
    let minDistance = Infinity;
    
    for (const historical of this.historicalEmbeddings) {
      const distance = this.cosineDistance(embedding, historical);
      minDistance = Math.min(minDistance, distance);
    }

    // Normalize to 0-1 range (0 = identical, 1 = completely novel)
    return Math.min(minDistance, 1.0);
  }

  private calculateHistoricalSimilarity(embedding: number[]): number {
    if (this.historicalEmbeddings.length === 0) {
      return 0.0; // No historical similarity
    }

    // Calculate average similarity to recent responses
    const recentCount = Math.min(10, this.historicalEmbeddings.length);
    const recentEmbeddings = this.historicalEmbeddings.slice(-recentCount);
    
    let totalSimilarity = 0;
    for (const historical of recentEmbeddings) {
      const similarity = this.cosineSimilarity(embedding, historical);
      totalSimilarity += similarity;
    }

    return totalSimilarity / recentCount;
  }

  private calculateDomainCrossing(text: string, currentDomain?: string): number {
    if (!currentDomain) {
      return 0.5; // Moderate score if domain unknown
    }

    const textLower = text.toLowerCase();
    let crossDomainMatches = 0;
    let totalMatches = 0;

    for (const [domain, keywords] of this.domainKeywords) {
      const matches = keywords.filter(keyword => 
        textLower.includes(keyword)
      ).length;

      totalMatches += matches;
      
      if (domain !== currentDomain && matches > 0) {
        crossDomainMatches += matches;
      }
    }

    if (totalMatches === 0) {
      return 0.0;
    }

    return crossDomainMatches / totalMatches;
  }

  private calculateLinguisticNovelty(text: string): number {
    const noveltyIndicators = [
      // Metaphorical language
      /\b(like|as if|imagine|metaphorically|symbolically)\b/gi,
      // Neologisms and word combinations
      /\b\w+[-]\w+\b/g, // Hyphenated concepts
      // Abstract conceptual language
      /\b(trans|meta|ultra|proto|quasi|pseudo)\w+\b/gi,
      // Temporal reframing
      /\b(timeless|eternal|momentary|infinite|finite)\b/gi,
      // Paradoxical constructions
      /\b(yet|although|however|nevertheless|simultaneously)\b/gi
    ];

    let totalMatches = 0;
    const words = text.split(/\s+/).length;

    for (const pattern of noveltyIndicators) {
      const matches = text.match(pattern);
      if (matches) {
        totalMatches += matches.length;
      }
    }

    // Normalize by text length
    return Math.min(totalMatches / Math.max(words * 0.1, 1), 1.0);
  }

  private calculateOverallNovelty(
    conceptualDistance: number,
    historicalSimilarity: number,
    domainCrossing: number,
    linguisticNovelty: number
  ): number {
    // Weighted combination of novelty factors
    const weights = {
      conceptual: 0.4,
      historical: 0.3, // Inverse weight (lower similarity = higher novelty)
      domain: 0.2,
      linguistic: 0.1
    };

    const historicalNovelty = 1 - historicalSimilarity; // Invert similarity

    return (
      weights.conceptual * conceptualDistance +
      weights.historical * historicalNovelty +
      weights.domain * domainCrossing +
      weights.linguistic * linguisticNovelty
    );
  }

  private cosineDistance(a: number[], b: number[]): number {
    return 1 - this.cosineSimilarity(a, b);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private addToHistory(embedding: number[]): void {
    this.historicalEmbeddings.push([...embedding]);
    
    // Maintain maximum history size
    if (this.historicalEmbeddings.length > this.config.maxHistorySize) {
      this.historicalEmbeddings.shift();
    }
  }

  private initializeDomainKeywords(): void {
    this.domainKeywords.set('consciousness', [
      'awareness', 'perception', 'qualia', 'subjective', 'experience',
      'phenomenology', 'mind', 'mental', 'cognitive', 'sentience'
    ]);

    this.domainKeywords.set('ethics', [
      'moral', 'ethical', 'virtue', 'duty', 'obligation', 'rights',
      'justice', 'good', 'evil', 'responsibility', 'consequentialism'
    ]);

    this.domainKeywords.set('metaphysics', [
      'being', 'existence', 'reality', 'substance', 'causation',
      'time', 'space', 'identity', 'change', 'ontology'
    ]);

    this.domainKeywords.set('epistemology', [
      'knowledge', 'belief', 'truth', 'justification', 'skepticism',
      'empiricism', 'rationalism', 'evidence', 'certainty', 'doubt'
    ]);

    this.domainKeywords.set('logic', [
      'argument', 'premise', 'conclusion', 'valid', 'sound',
      'fallacy', 'reasoning', 'inference', 'contradiction', 'paradox'
    ]);
  }

  reset(): void {
    this.historicalEmbeddings = [];
  }

  getHistorySize(): number {
    return this.historicalEmbeddings.length;
  }

  updateConfig(newConfig: Partial<NoveltyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const noveltyDetector = new EmbeddingNoveltyDetector();