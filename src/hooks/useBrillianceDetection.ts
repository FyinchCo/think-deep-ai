import { useState, useEffect } from 'react';

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

interface BrillianceMetrics {
  paradigmShiftPotential: number; // 0-1 scale
  conceptualNoveltyScore: number; // 0-1 scale  
  ontologicalDepth: number; // 0-1 scale
  brillianceTrigger: boolean; // Should trigger brilliance mode
  brillianceType: 'paradigmatic' | 'ontological' | 'epistemological' | 'meta-cognitive' | null;
  brillianceConfidence: number; // 0-1 how confident we are this is brilliant territory
  recommendation: string;
}

export const useBrillianceDetection = (answers: Answer[]) => {
  const [metrics, setMetrics] = useState<BrillianceMetrics>({
    paradigmShiftPotential: 0,
    conceptualNoveltyScore: 0,
    ontologicalDepth: 0,
    brillianceTrigger: false,
    brillianceType: null,
    brillianceConfidence: 0,
    recommendation: ''
  });

  useEffect(() => {
    if (answers.length === 0) return;

    const calculateBrillianceMetrics = () => {
      const recentSteps = answers.slice(-3); // Last 3 steps for trend analysis
      const currentStep = answers[answers.length - 1];
      
      // Detect paradigm shift indicators
      const paradigmIndicators = [
        'ontological', 'epistemic', 'paradigm', 'meta-', 'recursive', 
        'self-referential', 'emergent', 'systemic', 'holistic', 'dialectical',
        'transcendent', 'immanent', 'liminal', 'apophatic', 'cataphatic'
      ];
      
      const paradigmScore = calculateIndicatorDensity(currentStep.answer_text, paradigmIndicators);
      
      // Detect conceptual novelty through new term creation
      const noveltyIndicators = [
        /"[^"]*"/, /'[^']*'/, /\*\*[^*]*\*\*/, // Quoted or emphasized new terms
        /\b[A-Z]{2,}\b/, // Acronyms
        /\w+-\w+-\w+/, // Hyphenated concepts
        /\([^)]*\)/ // Parenthetical definitions
      ];
      
      let noveltyScore = 0;
      noveltyIndicators.forEach(pattern => {
        const matches = currentStep.answer_text.match(new RegExp(pattern, 'g')) || [];
        noveltyScore += matches.length;
      });
      noveltyScore = Math.min(1, noveltyScore / 10); // Normalize to 0-1
      
      // Detect ontological depth
      const depthIndicators = [
        'being', 'existence', 'reality', 'consciousness', 'essence', 'substance',
        'fundamental', 'foundational', 'ground', 'absolute', 'infinite', 'eternal',
        'necessity', 'contingency', 'possibility', 'actuality', 'potentiality'
      ];
      
      const depthScore = calculateIndicatorDensity(currentStep.answer_text, depthIndicators);
      
      // Calculate quality momentum (are scores accelerating upward?)
      const qualityMomentum = calculateQualityMomentum(recentSteps);
      
      // Determine brilliance type
      const brillianceType = determineBrillianceType(paradigmScore, noveltyScore, depthScore);
      
      // Calculate overall brilliance confidence
      const brillianceConfidence = (paradigmScore + noveltyScore + depthScore + qualityMomentum) / 4;
      
      // Trigger brilliance mode if confidence is high and we're in profound territory
      const brillianceTrigger = brillianceConfidence > 0.7 && 
                              (paradigmScore > 0.6 || depthScore > 0.6) &&
                              answers.length > 5; // Minimum steps before triggering
      
      // Generate recommendation
      const recommendation = generateBrillianceRecommendation(
        brillianceTrigger, 
        brillianceType, 
        brillianceConfidence,
        answers.length
      );

      setMetrics({
        paradigmShiftPotential: paradigmScore,
        conceptualNoveltyScore: noveltyScore,
        ontologicalDepth: depthScore,
        brillianceTrigger,
        brillianceType,
        brillianceConfidence,
        recommendation
      });
    };

    calculateBrillianceMetrics();
  }, [answers]);

  const calculateIndicatorDensity = (text: string, indicators: string[]): number => {
    const wordCount = text.split(/\s+/).length;
    let indicatorCount = 0;
    
    indicators.forEach(indicator => {
      const regex = new RegExp(indicator, 'gi');
      const matches = text.match(regex) || [];
      indicatorCount += matches.length;
    });
    
    return Math.min(1, indicatorCount / (wordCount / 100)); // Density per 100 words, capped at 1
  };

  const calculateQualityMomentum = (steps: Answer[]): number => {
    if (steps.length < 2) return 0;
    
    const getAverageScore = (step: Answer) => {
      if (!step.judge_scores) return 0.5;
      const { novelty, depth, breakthrough_potential } = step.judge_scores;
      return (novelty + depth + breakthrough_potential) / 30; // Normalize to 0-1 (assuming 10-point scale)
    };
    
    const scores = steps.map(getAverageScore);
    if (scores.length < 2) return 0;
    
    // Calculate acceleration in quality
    const momentum = scores[scores.length - 1] - scores[0];
    return Math.max(0, momentum); // Only positive momentum counts toward brilliance
  };

  const determineBrillianceType = (
    paradigmScore: number, 
    noveltyScore: number, 
    depthScore: number
  ): BrillianceMetrics['brillianceType'] => {
    const maxScore = Math.max(paradigmScore, noveltyScore, depthScore);
    
    if (maxScore < 0.5) return null;
    
    if (paradigmScore === maxScore && paradigmScore > 0.6) return 'paradigmatic';
    if (depthScore === maxScore && depthScore > 0.6) return 'ontological';
    if (noveltyScore === maxScore && noveltyScore > 0.6) return 'epistemological';
    if (paradigmScore > 0.5 && depthScore > 0.5) return 'meta-cognitive';
    
    return 'epistemological'; // Default for high-novelty content
  };

  const generateBrillianceRecommendation = (
    trigger: boolean,
    type: BrillianceMetrics['brillianceType'],
    confidence: number,
    stepCount: number
  ): string => {
    if (trigger) {
      return `🔥 BRILLIANCE MODE TRIGGERED: ${type} breakthrough detected (${Math.round(confidence * 100)}% confidence). Remove all constraints and follow this thread to its absolute conclusion.`;
    }
    
    if (confidence > 0.5) {
      return `⚡ Approaching breakthrough territory (${Math.round(confidence * 100)}% confidence). Consider enabling brilliance mode to remove practical constraints.`;
    }
    
    if (confidence > 0.3 && stepCount > 10) {
      return `🌟 High conceptual potential detected. The exploration is building toward profound insights.`;
    }
    
    return 'Continuing standard exploration depth.';
  };

  return metrics;
};