import { useState, useEffect, useCallback } from 'react';

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  judge_scores?: any;
  generated_at: string;
}

interface GlobalBrillianceMetrics {
  crownJewelInsights: CrownJewelInsight[];
  brillianceCascades: BrillianceCascade[];
  semanticBreakthroughs: SemanticBreakthrough[];
  crossStepPatterns: CrossStepPattern[];
  impactPredictions: ImpactPrediction[];
  overallBrillianceScore: number;
  hingePoints: number[];
  emergentFrameworks: EmergentFramework[];
}

interface CrownJewelInsight {
  answerId: string;
  stepNumber: number;
  brillianceScore: number;
  category: 'paradigmatic' | 'practical' | 'aesthetic' | 'generative';
  extractedInsight: string;
  transformativePotential: number;
}

interface BrillianceCascade {
  triggerStep: number;
  cascadeSteps: number[];
  momentum: number;
  depth: number;
  conceptualNovelty: number;
}

interface SemanticBreakthrough {
  stepNumber: number;
  conceptualDistance: number;
  novelCombinations: string[];
  paradigmShiftIntensity: number;
}

interface CrossStepPattern {
  steps: number[];
  pattern: string;
  recurrence: number;
  evolutionDepth: number;
  conceptualBridge: string;
}

interface ImpactPrediction {
  stepNumber: number;
  transformativePotential: number;
  realWorldApplicability: number;
  followUpQuestionGeneration: number;
  fundamentalChangeIndex: number;
}

interface EmergentFramework {
  name: string;
  spanningSteps: number[];
  coherenceScore: number;
  noveltyIndex: number;
  applicabilityScope: number;
}

export const useGlobalBrillianceDetection = (answers: Answer[]) => {
  const [metrics, setMetrics] = useState<GlobalBrillianceMetrics>({
    crownJewelInsights: [],
    brillianceCascades: [],
    semanticBreakthroughs: [],
    crossStepPatterns: [],
    impactPredictions: [],
    overallBrillianceScore: 0,
    hingePoints: [],
    emergentFrameworks: []
  });

  const calculateSemanticDistance = useCallback((text1: string, text2: string): number => {
    // Simple semantic distance calculation using keyword overlap and novelty
    const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
    const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const jaccardSimilarity = intersection.size / union.size;
    return 1 - jaccardSimilarity; // Distance = 1 - similarity
  }, []);

  const detectBrillianceCascades = useCallback((answers: Answer[]): BrillianceCascade[] => {
    const cascades: BrillianceCascade[] = [];
    
    for (let i = 0; i < answers.length - 2; i++) {
      const triggerAnswer = answers[i];
      const subsequentAnswers = answers.slice(i + 1, i + 5); // Look ahead 4 steps
      
      // Check if this step triggers elevated brilliance in subsequent steps
      let cascadeSteps: number[] = [];
      let totalMomentum = 0;
      
      subsequentAnswers.forEach((answer, idx) => {
        const brillianceScore = calculateStepBrilliance(answer, answers.slice(0, i + idx + 2));
        if (brillianceScore > 0.7) { // High brilliance threshold
          cascadeSteps.push(answer.step_number);
          totalMomentum += brillianceScore;
        }
      });
      
      if (cascadeSteps.length >= 2) {
        cascades.push({
          triggerStep: triggerAnswer.step_number,
          cascadeSteps,
          momentum: totalMomentum / cascadeSteps.length,
          depth: cascadeSteps.length,
          conceptualNovelty: calculateConceptualNovelty(triggerAnswer.answer_text)
        });
      }
    }
    
    return cascades;
  }, []);

  const calculateStepBrilliance = useCallback((answer: Answer, context: Answer[]): number => {
    let brilliance = 0;
    
    // Judge scores component (40%)
    if (answer.judge_scores) {
      const scores = Object.values(answer.judge_scores).filter((score: any) => typeof score === 'number') as number[];
      if (scores.length > 0) {
        const avgJudgeScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        brilliance += (avgJudgeScore / 10) * 0.4;
      }
    }
    
    // Conceptual novelty component (30%)
    const novelty = calculateConceptualNovelty(answer.answer_text);
    brilliance += novelty * 0.3;
    
    // Cross-step coherence component (30%)
    if (context.length > 1) {
      const coherence = calculateCrossStepCoherence(answer, context);
      brilliance += coherence * 0.3;
    }
    
    return Math.min(brilliance, 1.0);
  }, []);

  const calculateConceptualNovelty = useCallback((text: string): number => {
    // Indicators of conceptual novelty
    const noveltyIndicators = [
      'paradigm', 'breakthrough', 'revolutionary', 'unprecedented', 
      'novel', 'innovative', 'transforms', 'reframes', 'reconceptualize',
      'emergent', 'synthesis', 'transcends', 'unifies', 'bridges'
    ];
    
    const complexityIndicators = [
      'multidimensional', 'interconnected', 'recursive', 'meta',
      'systemic', 'holistic', 'dialectical', 'paradox'
    ];
    
    const textLower = text.toLowerCase();
    const noveltyScore = noveltyIndicators.reduce((score, indicator) => {
      return score + (textLower.includes(indicator) ? 0.1 : 0);
    }, 0);
    
    const complexityScore = complexityIndicators.reduce((score, indicator) => {
      return score + (textLower.includes(indicator) ? 0.05 : 0);
    }, 0);
    
    return Math.min(noveltyScore + complexityScore, 1.0);
  }, []);

  const calculateCrossStepCoherence = useCallback((answer: Answer, context: Answer[]): number => {
    if (context.length < 2) return 0;
    
    // Calculate how well this answer builds upon previous insights
    const recentContext = context.slice(-3); // Last 3 answers
    let coherenceSum = 0;
    
    recentContext.forEach(contextAnswer => {
      const semanticSimilarity = 1 - calculateSemanticDistance(
        answer.answer_text, 
        contextAnswer.answer_text
      );
      coherenceSum += semanticSimilarity;
    });
    
    return coherenceSum / recentContext.length;
  }, [calculateSemanticDistance]);

  const detectSemanticBreakthroughs = useCallback((answers: Answer[]): SemanticBreakthrough[] => {
    const breakthroughs: SemanticBreakthrough[] = [];
    
    for (let i = 1; i < answers.length; i++) {
      const currentAnswer = answers[i];
      const previousAnswers = answers.slice(Math.max(0, i - 3), i);
      
      let avgDistance = 0;
      let novelCombinations: string[] = [];
      
      previousAnswers.forEach(prevAnswer => {
        const distance = calculateSemanticDistance(
          currentAnswer.answer_text, 
          prevAnswer.answer_text
        );
        avgDistance += distance;
      });
      
      avgDistance /= previousAnswers.length;
      
      // Detect novel concept combinations
      const concepts = extractConcepts(currentAnswer.answer_text);
      const previousConcepts = new Set(
        previousAnswers.flatMap(a => extractConcepts(a.answer_text))
      );
      
      novelCombinations = concepts.filter(concept => !previousConcepts.has(concept));
      
      if (avgDistance > 0.6 || novelCombinations.length > 2) {
        breakthroughs.push({
          stepNumber: currentAnswer.step_number,
          conceptualDistance: avgDistance,
          novelCombinations,
          paradigmShiftIntensity: calculateParadigmShiftIntensity(currentAnswer.answer_text)
        });
      }
    }
    
    return breakthroughs;
  }, [calculateSemanticDistance]);

  const extractConcepts = useCallback((text: string): string[] => {
    // Extract key concepts using pattern matching
    const conceptPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:principle|theory|model|framework|paradigm)/gi,
      /(?:concept of|notion of|idea of)\s+([a-zA-Z\s]+?)(?:\s|,|\.)/gi,
      /([A-Z]{2,})/g // Acronyms
    ];
    
    const concepts: string[] = [];
    conceptPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      concepts.push(...matches.map(match => match.trim()));
    });
    
    return [...new Set(concepts)]; // Remove duplicates
  }, []);

  const calculateParadigmShiftIntensity = useCallback((text: string): number => {
    const paradigmShiftIndicators = [
      'paradigm shift', 'fundamental change', 'revolutionary', 'transforms everything',
      'changes the game', 'redefines', 'overturns', 'challenges assumptions'
    ];
    
    const textLower = text.toLowerCase();
    return paradigmShiftIndicators.reduce((intensity, indicator) => {
      return intensity + (textLower.includes(indicator) ? 0.2 : 0);
    }, 0);
  }, []);

  const identifyCrownJewels = useCallback((answers: Answer[]): CrownJewelInsight[] => {
    const insights: CrownJewelInsight[] = answers.map(answer => {
      const brillianceScore = calculateStepBrilliance(answer, answers);
      const category = determineBrillianceCategory(answer.answer_text);
      const transformativePotential = calculateTransformativePotential(answer.answer_text);
      
      return {
        answerId: answer.id,
        stepNumber: answer.step_number,
        brillianceScore,
        category,
        extractedInsight: extractKeyInsight(answer.answer_text),
        transformativePotential
      };
    });
    
    // Return top 5% of insights
    const sortedInsights = insights.sort((a, b) => b.brillianceScore - a.brillianceScore);
    const topPercentile = Math.max(1, Math.floor(insights.length * 0.05));
    return sortedInsights.slice(0, topPercentile);
  }, [calculateStepBrilliance]);

  const determineBrillianceCategory = useCallback((text: string): CrownJewelInsight['category'] => {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('paradigm') || textLower.includes('framework') || textLower.includes('model')) {
      return 'paradigmatic';
    }
    if (textLower.includes('application') || textLower.includes('implementation') || textLower.includes('solution')) {
      return 'practical';
    }
    if (textLower.includes('elegant') || textLower.includes('beautiful') || textLower.includes('harmony')) {
      return 'aesthetic';
    }
    return 'generative';
  }, []);

  const calculateTransformativePotential = useCallback((text: string): number => {
    const transformativeIndicators = [
      'transform', 'revolution', 'breakthrough', 'game-changer', 
      'paradigm shift', 'fundamental', 'revolutionary', 'unprecedented'
    ];
    
    const textLower = text.toLowerCase();
    return transformativeIndicators.reduce((potential, indicator) => {
      return potential + (textLower.includes(indicator) ? 0.15 : 0);
    }, 0);
  }, []);

  const extractKeyInsight = useCallback((text: string): string => {
    // Extract the most important sentence or key insight
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Find sentences with high insight indicators
    const insightIndicators = ['therefore', 'thus', 'consequently', 'this means', 'the key insight'];
    
    const keyInsight = sentences.find(sentence => 
      insightIndicators.some(indicator => 
        sentence.toLowerCase().includes(indicator)
      )
    );
    
    return keyInsight?.trim() || sentences[0]?.trim() || text.substring(0, 200) + '...';
  }, []);

  useEffect(() => {
    if (answers.length === 0) return;

    const crownJewelInsights = identifyCrownJewels(answers);
    const brillianceCascades = detectBrillianceCascades(answers);
    const semanticBreakthroughs = detectSemanticBreakthroughs(answers);
    
    // Calculate overall brilliance score
    const overallBrillianceScore = crownJewelInsights.reduce((sum, jewel) => 
      sum + jewel.brillianceScore, 0
    ) / Math.max(crownJewelInsights.length, 1);

    // Identify hinge points (steps that trigger cascades)
    const hingePoints = brillianceCascades.map(cascade => cascade.triggerStep);

    setMetrics({
      crownJewelInsights,
      brillianceCascades,
      semanticBreakthroughs,
      crossStepPatterns: [], // TODO: Implement in Phase 2
      impactPredictions: [], // TODO: Implement in Phase 2
      overallBrillianceScore,
      hingePoints,
      emergentFrameworks: [] // TODO: Implement in Phase 2
    });
  }, [answers, identifyCrownJewels, detectBrillianceCascades, detectSemanticBreakthroughs]);

  return metrics;
};