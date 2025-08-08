import { describe, it, expect, beforeEach } from 'vitest';
import { JaccardConvergenceDetector } from '../convergence/jaccard';

describe('JaccardConvergenceDetector', () => {
  let detector: JaccardConvergenceDetector;

  beforeEach(() => {
    detector = new JaccardConvergenceDetector({
      jaccardThreshold: 0.8,
      stabilityThreshold: 0.9,
      noveltyThreshold: 0.1,
      windowSize: 3,
      minIterations: 2
    });
  });

  it('should not detect convergence with only one response', () => {
    const metrics = detector.addResponse('This is the first response about consciousness.');
    
    expect(metrics.isConverged).toBe(false);
    expect(metrics.jaccardSimilarity).toBe(0);
    expect(metrics.confidence).toBe(0);
  });

  it('should detect high similarity between identical responses', () => {
    const response = 'Consciousness is a fundamental aspect of reality.';
    
    detector.addResponse(response);
    const metrics = detector.addResponse(response);
    
    expect(metrics.jaccardSimilarity).toBe(1);
    expect(metrics.isConverged).toBe(true);
  });

  it('should calculate similarity correctly for different responses', () => {
    detector.addResponse('Consciousness emerges from neural complexity.');
    const metrics = detector.addResponse('Awareness arises through brain processes.');
    
    expect(metrics.jaccardSimilarity).toBeGreaterThan(0);
    expect(metrics.jaccardSimilarity).toBeLessThan(1);
  });

  it('should detect convergence when similarity remains high', () => {
    detector.addResponse('The nature of consciousness involves awareness.');
    detector.addResponse('Consciousness involves the nature of awareness.');
    const metrics = detector.addResponse('Awareness and consciousness are fundamentally related.');
    
    expect(metrics.jaccardSimilarity).toBeGreaterThan(0.5);
    expect(metrics.semanticStability).toBeGreaterThan(0);
  });

  it('should maintain history correctly', () => {
    detector.addResponse('First response');
    detector.addResponse('Second response');
    detector.addResponse('Third response');
    
    const history = detector.getHistory();
    expect(history.responses).toHaveLength(3);
    expect(history.similarities).toHaveLength(2);
  });

  it('should reset state correctly', () => {
    detector.addResponse('Test response');
    detector.reset();
    
    const history = detector.getHistory();
    expect(history.responses).toHaveLength(0);
    expect(history.similarities).toHaveLength(0);
  });

  it('should enforce minimum iterations before convergence', () => {
    const config = { minIterations: 5 };
    const restrictiveDetector = new JaccardConvergenceDetector(config);
    
    const response = 'Same response';
    for (let i = 0; i < 4; i++) {
      const metrics = restrictiveDetector.addResponse(response);
      expect(metrics.isConverged).toBe(false);
    }
    
    const finalMetrics = restrictiveDetector.addResponse(response);
    expect(finalMetrics.isConverged).toBe(true);
  });

  it('should calculate confidence based on multiple factors', () => {
    detector.addResponse('Philosophy explores fundamental questions about existence.');
    const metrics = detector.addResponse('Philosophical inquiry examines basic questions of being.');
    
    expect(metrics.confidence).toBeGreaterThan(0);
    expect(metrics.confidence).toBeLessThanOrEqual(1);
  });
});