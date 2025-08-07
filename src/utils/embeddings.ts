/**
 * Vector Embeddings and Semantic Similarity
 * 
 * This module handles the vector-based novelty detection system used to identify
 * unique insights and prevent redundant exploration paths.
 */

export interface EmbeddingVector {
  vector: number[];
  metadata: {
    text: string;
    timestamp: string;
    qualityScore: number;
    explorationId: string;
  };
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Detect novelty by comparing against existing embeddings
 * Returns a novelty score between 0 and 1 (higher = more novel)
 */
export function detectNovelty(
  newEmbedding: number[],
  existingEmbeddings: EmbeddingVector[],
  qualityWeight: number = 0.3
): number {
  if (existingEmbeddings.length === 0) {
    return 1.0; // First embedding is always novel
  }

  const similarities = existingEmbeddings.map(existing => {
    const similarity = cosineSimilarity(newEmbedding, existing.vector);
    // Weight similarity by quality of existing insight
    return similarity * (1 + existing.metadata.qualityScore * qualityWeight);
  });

  const maxSimilarity = Math.max(...similarities);
  return Math.max(0, 1 - maxSimilarity);
}

/**
 * Semantic clustering for insight organization
 */
export function clusterInsights(
  embeddings: EmbeddingVector[],
  threshold: number = 0.7
): EmbeddingVector[][] {
  const clusters: EmbeddingVector[][] = [];
  const processed = new Set<number>();

  embeddings.forEach((embedding, i) => {
    if (processed.has(i)) return;

    const cluster = [embedding];
    processed.add(i);

    embeddings.forEach((other, j) => {
      if (i !== j && !processed.has(j)) {
        const similarity = cosineSimilarity(embedding.vector, other.vector);
        if (similarity >= threshold) {
          cluster.push(other);
          processed.add(j);
        }
      }
    });

    clusters.push(cluster);
  });

  return clusters;
}

/**
 * Generate embedding request for external API
 */
export interface EmbeddingRequest {
  text: string;
  model?: string;
  dimensions?: number;
}

export function createEmbeddingRequest(
  text: string,
  options: Partial<EmbeddingRequest> = {}
): EmbeddingRequest {
  return {
    text: text.slice(0, 8000), // Truncate for API limits
    model: options.model || 'text-embedding-3-small',
    dimensions: options.dimensions || 512,
    ...options
  };
}