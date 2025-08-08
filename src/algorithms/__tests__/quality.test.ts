import { describe, it, expect, beforeEach } from 'vitest';
import { QualityJudge } from '../quality/judge';

describe('QualityJudge', () => {
  let judge: QualityJudge;

  beforeEach(() => {
    judge = new QualityJudge({
      thresholds: {
        highQuality: 0.75,
        lowQuality: 0.40,
        confidence: 0.80
      }
    });
  });

  it('should assess basic quality dimensions', async () => {
    const response = `This question explores the fundamental nature of consciousness. 
                     Because consciousness appears to be non-physical, it suggests that 
                     the brain might filter rather than generate awareness. Therefore, 
                     this paradigm shift has profound implications for our understanding of reality.`;
    
    const question = 'What if consciousness is filtered by the brain rather than generated?';
    
    const judgment = await judge.judgeQuality(response, question);
    
    expect(judgment.dimensions.novelty).toBeGreaterThan(0);
    expect(judgment.dimensions.coherence).toBeGreaterThan(0.5);
    expect(judgment.dimensions.depth).toBeGreaterThan(0.3);
    expect(judgment.dimensions.relevance).toBeGreaterThan(0.5);
    expect(judgment.overallScore).toBeGreaterThan(0);
  });

  it('should detect high-quality responses', async () => {
    const highQualityResponse = `This question represents a revolutionary paradigm shift in consciousness studies. 
                                The brain-as-filter hypothesis fundamentally reconceptualizes the relationship between 
                                mind and matter. Because this framework implies consciousness is primary rather than 
                                emergent, it suggests profound insights about the nature of reality itself. 
                                Therefore, we must reconsider our entire materialist worldview and imagine 
                                consciousness as the fundamental substrate that brains merely constrain and focus.`;
    
    const question = 'What if consciousness is filtered by the brain?';
    
    const judgment = await judge.judgeQuality(highQualityResponse, question);
    
    expect(judgment.isHighQuality).toBe(true);
    expect(judgment.overallScore).toBeGreaterThan(0.7);
    expect(judgment.dimensions.novelty).toBeGreaterThan(0.5);
    expect(judgment.dimensions.insight).toBeGreaterThan(0.4);
  });

  it('should detect low-quality responses', async () => {
    const lowQualityResponse = `I think consciousness is just brain stuff. It is simple.`;
    
    const question = 'What is the nature of consciousness?';
    
    const judgment = await judge.judgeQuality(lowQualityResponse, question);
    
    expect(judgment.overallScore).toBeLessThan(0.5);
    expect(judgment.isHighQuality).toBe(false);
    expect(judgment.riskFactors.length).toBeGreaterThan(0);
  });

  it('should assess relevance correctly', async () => {
    const relevantResponse = `The question about consciousness filtering addresses fundamental issues in philosophy of mind. 
                             This consciousness framework suggests important implications for understanding awareness.`;
    
    const irrelevantResponse = `Bananas are yellow fruits that grow on trees in tropical climates.`;
    
    const question = 'How does consciousness relate to brain function?';
    
    const relevantJudgment = await judge.judgeQuality(relevantResponse, question);
    const irrelevantJudgment = await judge.judgeQuality(irrelevantResponse, question);
    
    expect(relevantJudgment.dimensions.relevance).toBeGreaterThan(irrelevantJudgment.dimensions.relevance);
  });

  it('should detect creativity in responses', async () => {
    const creativeResponse = `Imagine consciousness like a radio signal that brains tune into. 
                             This metaphor suggests that awareness is like waves in an ocean of being, 
                             and brains are like receivers that create the illusion of individual minds.`;
    
    const plainResponse = `Consciousness is awareness. The brain processes information.`;
    
    const question = 'What is consciousness?';
    
    const creativeJudgment = await judge.judgeQuality(creativeResponse, question);
    const plainJudgment = await judge.judgeQuality(plainResponse, question);
    
    expect(creativeJudgment.dimensions.creativity).toBeGreaterThan(plainJudgment.dimensions.creativity);
  });

  it('should assess logical structure', async () => {
    const logicalResponse = `If consciousness is fundamental, then the brain serves as a filter. 
                            Because brains can be damaged while some awareness remains, 
                            this evidence supports the filter hypothesis. 
                            Therefore, consciousness might be primary to reality.`;
    
    const illogicalResponse = `Consciousness is everywhere and nowhere. Trees think because green. 
                              All minds are brain but brain not mind sometimes maybe.`;
    
    const question = 'Is consciousness produced by the brain?';
    
    const logicalJudgment = await judge.judgeQuality(logicalResponse, question);
    const illogicalJudgment = await judge.judgeQuality(illogicalResponse, question);
    
    expect(logicalJudgment.dimensions.logic).toBeGreaterThan(illogicalJudgment.dimensions.logic);
    expect(logicalJudgment.dimensions.coherence).toBeGreaterThan(illogicalJudgment.dimensions.coherence);
  });

  it('should provide constructive feedback', async () => {
    const weakResponse = `Consciousness is complex.`;
    const question = 'How does consciousness relate to reality?';
    
    const judgment = await judge.judgeQuality(weakResponse, question);
    
    expect(judgment.feedback.length).toBeGreaterThan(0);
    expect(judgment.feedback.some(f => f.includes('depth'))).toBe(true);
  });

  it('should identify risk factors', async () => {
    const riskyResponse = `Purple elephants dance with quantum mathematics while consciousness 
                          flies through dimensions of impossible logic that contradict everything 
                          about nothing in particular without any relevance to anything.`;
    
    const question = 'What is the nature of consciousness?';
    
    const judgment = await judge.judgeQuality(riskyResponse, question);
    
    expect(judgment.riskFactors.length).toBeGreaterThan(0);
    expect(judgment.riskFactors.some(r => r.includes('Incoherent'))).toBe(true);
  });

  it('should calculate confidence correctly', async () => {
    const consistentResponse = `Consciousness represents the fundamental ground of being. 
                               This perspective suggests that awareness is primary to reality. 
                               Therefore, the brain filters rather than generates consciousness.`;
    
    const question = 'Is consciousness fundamental?';
    
    const judgment = await judge.judgeQuality(consistentResponse, question);
    
    expect(judgment.confidence).toBeGreaterThan(0);
    expect(judgment.confidence).toBeLessThanOrEqual(1);
  });

  it('should allow configuration updates', async () => {
    judge.updateConfig({
      weights: { 
        novelty: 0.3, 
        coherence: 0.3, 
        depth: 0.1, 
        relevance: 0.1, 
        creativity: 0.1, 
        logic: 0.05, 
        insight: 0.05 
      },
      thresholds: { highQuality: 0.6, lowQuality: 0.3, confidence: 0.7 }
    });
    
    const weights = judge.getDimensionWeights();
    expect(weights.novelty).toBe(0.5);
    expect(weights.coherence).toBe(0.5);
  });
});