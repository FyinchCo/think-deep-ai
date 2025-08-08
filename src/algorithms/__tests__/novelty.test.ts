import { describe, it, expect, beforeEach } from 'vitest';
import { EmbeddingNoveltyDetector } from '../novelty/embedding_similarity';

describe('EmbeddingNoveltyDetector', () => {
  let detector: EmbeddingNoveltyDetector;

  beforeEach(() => {
    detector = new EmbeddingNoveltyDetector({
      distanceThreshold: 0.7,
      historicalThreshold: 0.8,
      crossingThreshold: 0.3,
      linguisticThreshold: 0.6,
      breakthroughThreshold: 0.75
    });
  });

  it('should detect maximum novelty for first response', async () => {
    const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    const metrics = await detector.analyzeNovelty(
      'This is a novel philosophical insight.',
      embedding,
      'philosophy'
    );
    
    expect(metrics.conceptualDistance).toBe(1.0);
    expect(metrics.historicalSimilarity).toBe(0.0);
    expect(metrics.overallNovelty).toBeGreaterThan(0.5);
  });

  it('should detect domain crossing in interdisciplinary text', async () => {
    const text = 'Consciousness research reveals moral implications for artificial intelligence ethics.';
    const embedding = [0.1, 0.2, 0.3];
    
    const metrics = await detector.analyzeNovelty(text, embedding, 'consciousness');
    
    expect(metrics.domainCrossing).toBeGreaterThan(0);
  });

  it('should detect linguistic novelty in creative text', async () => {
    const text = 'Imagine a trans-temporal meta-cognitive framework that quasi-simultaneously bridges consciousness and reality.';
    const embedding = [0.1, 0.2, 0.3];
    
    const metrics = await detector.analyzeNovelty(text, embedding, 'philosophy');
    
    expect(metrics.linguisticNovelty).toBeGreaterThan(0.3);
  });

  it('should calculate decreasing novelty for similar embeddings', async () => {
    const similarEmbedding1 = [0.1, 0.2, 0.3, 0.4, 0.5];
    const similarEmbedding2 = [0.11, 0.21, 0.31, 0.41, 0.51];
    
    await detector.analyzeNovelty('First response', similarEmbedding1);
    const metrics = await detector.analyzeNovelty('Similar response', similarEmbedding2);
    
    expect(metrics.conceptualDistance).toBeLessThan(0.5);
    expect(metrics.historicalSimilarity).toBeGreaterThan(0.8);
  });

  it('should maintain history size limit', async () => {
    const limitedDetector = new EmbeddingNoveltyDetector({ maxHistorySize: 3 });
    
    for (let i = 0; i < 5; i++) {
      const embedding = [i * 0.1, i * 0.2, i * 0.3];
      await limitedDetector.analyzeNovelty(`Response ${i}`, embedding);
    }
    
    expect(limitedDetector.getHistorySize()).toBe(3);
  });

  it('should detect breakthrough when novelty exceeds threshold', async () => {
    const highNoveltyText = 'Revolutionary paradigm-shifting meta-cognitive trans-temporal breakthrough insight.';
    const embedding = [0.9, 0.8, 0.7];
    
    const metrics = await detector.analyzeNovelty(highNoveltyText, embedding, 'philosophy');
    
    expect(metrics.overallNovelty).toBeGreaterThan(0.7);
    expect(metrics.isBreakthrough).toBe(true);
  });

  it('should reset state correctly', async () => {
    const embedding = [0.1, 0.2, 0.3];
    await detector.analyzeNovelty('Test', embedding);
    
    detector.reset();
    expect(detector.getHistorySize()).toBe(0);
  });

  it('should update configuration correctly', async () => {
    detector.updateConfig({ breakthroughThreshold: 0.5 });
    
    const embedding = [0.1, 0.2, 0.3];
    const metrics = await detector.analyzeNovelty('Moderately novel text', embedding);
    
    // With lower threshold, should be more likely to detect breakthrough
    expect(metrics.isBreakthrough).toBeTruthy();
  });

  it('should handle empty domain gracefully', async () => {
    const embedding = [0.1, 0.2, 0.3];
    const metrics = await detector.analyzeNovelty('Test without domain', embedding);
    
    expect(metrics.domainCrossing).toBe(0.5); // Moderate score for unknown domain
    expect(metrics.overallNovelty).toBeGreaterThan(0);
  });
});