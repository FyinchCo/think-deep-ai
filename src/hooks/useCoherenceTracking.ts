import { useState, useEffect, useMemo } from 'react';

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  judge_scores?: {
    novelty: number;
    depth: number;
    coherence: number;
    relevance: number;
    breakthrough_potential: number;
  };
}

interface CoherenceMetrics {
  metaphorDensity: number;
  conceptualComplexity: number;
  semanticSimilarity: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
  saturationRisk: 'low' | 'medium' | 'high';
  recommendation: string | null;
}

export const useCoherenceTracking = (answers: Answer[]) => {
  // Memoize the key for stable comparison - only change when answers actually change
  const answersKey = useMemo(() => 
    answers.map(a => `${a.id}-${a.step_number}`).join(','), 
    [answers]
  );

  const metrics = useMemo(() => {
    if (answers.length === 0) {
      return {
        metaphorDensity: 0,
        conceptualComplexity: 0,
        semanticSimilarity: 0,
        qualityTrend: 'stable' as const,
        saturationRisk: 'low' as const,
        recommendation: null
      };
    }

    const recentSteps = answers.slice(-5); // Last 5 steps
    const lastStep = answers[answers.length - 1];

    // Calculate metaphor density (abstract concepts per step)
    const metaphorKeywords = [
      'epistemic', 'ontological', 'meta-', 'shadow', 'mirror', 'gravity', 
      'friction', 'resonance', 'decay', 'camouflage', 'wildfire', 'echo',
      'paradigm', 'framework', 'spectrum', 'gradient', 'field'
    ];

    const metaphorCount = metaphorKeywords.reduce((count, keyword) => {
      return count + (lastStep.answer_text.toLowerCase().split(keyword).length - 1);
    }, 0);

    const metaphorDensity = metaphorCount / (lastStep.answer_text.length / 1000); // per 1000 chars

    // Calculate conceptual complexity (new terms introduced)
    const newConceptPattern = /"([^"]+)"|'([^']+)'|\*\*([^*]+)\*\*/g;
    const conceptMatches = lastStep.answer_text.match(newConceptPattern) || [];
    const conceptualComplexity = conceptMatches.length;

    // Calculate semantic similarity with previous steps
    const semanticSimilarity = calculateSemanticSimilarity(recentSteps);

    // Determine quality trend from scores
    const qualityTrend = calculateQualityTrend(recentSteps);

    // Assess saturation risk
    const saturationRisk = assessSaturationRisk(metaphorDensity, conceptualComplexity, semanticSimilarity);

    // Generate recommendation
    const recommendation = generateRecommendation(saturationRisk, qualityTrend, answers.length);

    return {
      metaphorDensity,
      conceptualComplexity,
      semanticSimilarity,
      qualityTrend,
      saturationRisk,
      recommendation
    };
  }, [answersKey, answers]);

  const calculateSemanticSimilarity = (steps: Answer[]): number => {
    if (steps.length < 2) return 0;
    
    // Simple keyword overlap calculation
    const getKeywords = (text: string) => {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4);
    };

    const lastStepKeywords = new Set(getKeywords(steps[steps.length - 1].answer_text));
    const previousStepsKeywords = new Set();
    
    steps.slice(-4, -1).forEach(step => {
      getKeywords(step.answer_text).forEach(keyword => previousStepsKeywords.add(keyword));
    });

    const intersection = new Set([...lastStepKeywords].filter(x => previousStepsKeywords.has(x)));
    const union = new Set([...lastStepKeywords, ...previousStepsKeywords]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  };

  const calculateQualityTrend = (steps: Answer[]): 'improving' | 'stable' | 'declining' => {
    if (steps.length < 3) return 'stable';

    const getAverageScore = (step: Answer) => {
      if (!step.judge_scores) return 7; // Default if no scores
      const { novelty, depth, coherence, relevance } = step.judge_scores;
      return (novelty + depth + coherence + relevance) / 4;
    };

    const recent = steps.slice(-3).map(getAverageScore);
    const trend = recent[2] - recent[0];

    if (trend > 0.3) return 'improving';
    if (trend < -0.3) return 'declining';
    return 'stable';
  };

  const assessSaturationRisk = (
    metaphorDensity: number, 
    conceptualComplexity: number, 
    semanticSimilarity: number
  ): 'low' | 'medium' | 'high' => {
    let riskScore = 0;

    if (metaphorDensity > 8) riskScore += 2;
    else if (metaphorDensity > 5) riskScore += 1;

    if (conceptualComplexity > 4) riskScore += 2;
    else if (conceptualComplexity > 2) riskScore += 1;

    if (semanticSimilarity > 0.7) riskScore += 2;
    else if (semanticSimilarity > 0.5) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  };

  const generateRecommendation = (
    saturationRisk: 'low' | 'medium' | 'high',
    qualityTrend: 'improving' | 'stable' | 'declining',
    stepCount: number
  ): string | null => {
    if (saturationRisk === 'high' && stepCount > 30) {
      return 'Consider concluding this exploration - conceptual saturation detected. The insights generated may benefit from consolidation.';
    }

    if (saturationRisk === 'high' && qualityTrend === 'declining') {
      return 'High metaphor density with declining quality. Try grounding concepts in concrete examples or pivot to a new angle.';
    }

    if (saturationRisk === 'medium' && stepCount > 40) {
      return 'Approaching conceptual limits. Consider crystallizing current insights before continuing.';
    }

    if (qualityTrend === 'declining' && stepCount > 20) {
      return 'Quality trend declining. Consider refocusing on practical applications or concluding exploration.';
    }

    return null;
  };

  return metrics;
};