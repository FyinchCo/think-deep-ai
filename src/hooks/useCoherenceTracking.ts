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

// Helper functions
const calculateSemanticSimilarity = (steps: Answer[]): number => {
  if (steps.length < 2) return 0;
  
  // Simple semantic similarity based on word overlap
  const texts = steps.map(s => s.answer_text.toLowerCase());
  const allWords = texts.join(' ').split(/\s+/);
  const uniqueWords = new Set(allWords);
  
  const similarity = 1 - (uniqueWords.size / allWords.length);
  return Math.min(similarity * 100, 100);
};

const calculateQualityTrend = (steps: Answer[]): 'improving' | 'stable' | 'declining' => {
  if (steps.length < 3) return 'stable';
  
  const recentScores = steps.slice(-3).map(s => {
    const scores = s.judge_scores;
    if (scores) {
      return (scores.depth + scores.novelty + scores.coherence) / 3;
    }
    return 7; // Default score
  });
  
  const trend = recentScores[2] - recentScores[0];
  if (trend > 0.5) return 'improving';
  if (trend < -0.5) return 'declining';
  return 'stable';
};

const assessSaturationRisk = (metaphor: number, complexity: number, similarity: number): 'low' | 'medium' | 'high' => {
  if (similarity > 80 || (metaphor < 2 && complexity < 2)) return 'high';
  if (similarity > 60 || (metaphor < 3 && complexity < 3)) return 'medium';
  return 'low';
};

const generateRecommendation = (risk: string, trend: string, stepCount: number): string | null => {
  if (risk === 'high') return "Consider introducing radically new concepts or paradigm shifts";
  if (trend === 'declining') return "Try grounding mode to excavate deeper insights";
  if (stepCount > 15 && risk === 'medium') return "Switch to cycling mode to break conceptual patterns";
  return null;
};

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

  return metrics;
};