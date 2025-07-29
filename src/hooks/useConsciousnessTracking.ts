import { useState, useEffect, useCallback } from 'react';

interface ThoughtNode {
  id: string;
  step_number: number;
  answer_text: string;
  judge_scores?: any;
  conceptual_coordinates?: {
    x: number;
    y: number;
    z: number;
  };
  semantic_weight?: number;
  connection_strength?: number[];
}

interface ConsciousnessMetrics {
  conceptualDepth: number;
  semanticCoherence: number;
  curiosityDirection: string;
  explorationVelocity: number;
  conceptualGravity: number;
  insightDensity: number;
  thoughtEntropy: number;
  emergentPatterns: string[];
}

export const useConsciousnessTracking = (thoughts: ThoughtNode[]) => {
  const [metrics, setMetrics] = useState<ConsciousnessMetrics>({
    conceptualDepth: 0,
    semanticCoherence: 0,
    curiosityDirection: 'exploring',
    explorationVelocity: 0,
    conceptualGravity: 0,
    insightDensity: 0,
    thoughtEntropy: 0,
    emergentPatterns: []
  });

  const calculateConceptualDepth = useCallback((thoughts: ThoughtNode[]): number => {
    if (thoughts.length === 0) return 0;
    
    const avgDepth = thoughts.reduce((sum, thought) => {
      const depth = thought.judge_scores?.depth || 0;
      return sum + depth;
    }, 0) / thoughts.length;
    
    return Math.min(avgDepth, 10);
  }, []);

  const calculateSemanticCoherence = useCallback((thoughts: ThoughtNode[]): number => {
    if (thoughts.length < 2) return 0;
    
    let totalCoherence = 0;
    let pairCount = 0;
    
    for (let i = 0; i < thoughts.length - 1; i++) {
      const current = thoughts[i];
      const next = thoughts[i + 1];
      
      // Simple word overlap calculation
      const words1 = current.answer_text.toLowerCase().split(' ');
      const words2 = next.answer_text.toLowerCase().split(' ');
      const overlap = words1.filter(word => words2.includes(word)).length;
      const coherence = overlap / Math.max(words1.length, words2.length);
      
      totalCoherence += coherence;
      pairCount++;
    }
    
    return pairCount > 0 ? (totalCoherence / pairCount) * 10 : 0;
  }, []);

  const determineCuriosityDirection = useCallback((thoughts: ThoughtNode[]): string => {
    if (thoughts.length < 3) return 'exploring';
    
    const recent = thoughts.slice(-3);
    const noveltyTrend = recent.map(t => t.judge_scores?.novelty || 0);
    
    if (noveltyTrend[2] > noveltyTrend[1] && noveltyTrend[1] > noveltyTrend[0]) {
      return 'expanding';
    } else if (noveltyTrend[2] < noveltyTrend[1] && noveltyTrend[1] < noveltyTrend[0]) {
      return 'converging';
    } else if (Math.max(...noveltyTrend) - Math.min(...noveltyTrend) < 2) {
      return 'stabilizing';
    } else {
      return 'oscillating';
    }
  }, []);

  const calculateExplorationVelocity = useCallback((thoughts: ThoughtNode[]): number => {
    if (thoughts.length < 2) return 0;
    
    const recentThoughts = thoughts.slice(-5);
    let velocitySum = 0;
    
    for (let i = 1; i < recentThoughts.length; i++) {
      const prev = recentThoughts[i - 1];
      const curr = recentThoughts[i];
      
      if (prev.conceptual_coordinates && curr.conceptual_coordinates) {
        const dx = curr.conceptual_coordinates.x - prev.conceptual_coordinates.x;
        const dy = curr.conceptual_coordinates.y - prev.conceptual_coordinates.y;
        const dz = curr.conceptual_coordinates.z - prev.conceptual_coordinates.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        velocitySum += distance;
      }
    }
    
    return velocitySum / Math.max(recentThoughts.length - 1, 1);
  }, []);

  const calculateConceptualGravity = useCallback((thoughts: ThoughtNode[]): number => {
    if (thoughts.length === 0) return 0;
    
    // Calculate center of conceptual mass
    const centerX = thoughts.reduce((sum, t) => sum + (t.conceptual_coordinates?.x || 0), 0) / thoughts.length;
    const centerY = thoughts.reduce((sum, t) => sum + (t.conceptual_coordinates?.y || 0), 0) / thoughts.length;
    const centerZ = thoughts.reduce((sum, t) => sum + (t.conceptual_coordinates?.z || 0), 0) / thoughts.length;
    
    // Calculate average distance from center
    const avgDistance = thoughts.reduce((sum, thought) => {
      if (!thought.conceptual_coordinates) return sum;
      
      const dx = thought.conceptual_coordinates.x - centerX;
      const dy = thought.conceptual_coordinates.y - centerY;
      const dz = thought.conceptual_coordinates.z - centerZ;
      
      return sum + Math.sqrt(dx * dx + dy * dy + dz * dz);
    }, 0) / thoughts.length;
    
    // Invert distance to get gravity (closer = stronger gravity)
    return Math.max(0, 100 - avgDistance) / 10;
  }, []);

  const calculateInsightDensity = useCallback((thoughts: ThoughtNode[]): number => {
    if (thoughts.length === 0) return 0;
    
    const breakthroughCount = thoughts.filter(t => 
      (t.judge_scores?.breakthrough_potential || 0) >= 7
    ).length;
    
    return (breakthroughCount / thoughts.length) * 10;
  }, []);

  const calculateThoughtEntropy = useCallback((thoughts: ThoughtNode[]): number => {
    if (thoughts.length === 0) return 0;
    
    // Calculate variance in conceptual positions
    const positions = thoughts
      .filter(t => t.conceptual_coordinates)
      .map(t => t.conceptual_coordinates!);
    
    if (positions.length < 2) return 0;
    
    const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
    const avgZ = positions.reduce((sum, p) => sum + p.z, 0) / positions.length;
    
    const variance = positions.reduce((sum, p) => {
      const dx = p.x - avgX;
      const dy = p.y - avgY;
      const dz = p.z - avgZ;
      return sum + (dx * dx + dy * dy + dz * dz);
    }, 0) / positions.length;
    
    return Math.min(Math.sqrt(variance) / 10, 10);
  }, []);

  const detectEmergentPatterns = useCallback((thoughts: ThoughtNode[]): string[] => {
    const patterns: string[] = [];
    
    if (thoughts.length < 3) return patterns;
    
    // Pattern detection based on thought metrics
    const recent = thoughts.slice(-5);
    const noveltyScores = recent.map(t => t.judge_scores?.novelty || 0);
    const depthScores = recent.map(t => t.judge_scores?.depth || 0);
    
    // Ascending pattern
    if (noveltyScores.every((score, i, arr) => i === 0 || score >= arr[i - 1])) {
      patterns.push('Escalating Innovation');
    }
    
    // High depth cluster
    if (depthScores.filter(score => score >= 8).length >= 3) {
      patterns.push('Deep Territory');
    }
    
    // Breakthrough clustering
    const breakthroughs = recent.filter(t => (t.judge_scores?.breakthrough_potential || 0) >= 7);
    if (breakthroughs.length >= 2) {
      patterns.push('Insight Cascade');
    }
    
    return patterns;
  }, []);

  useEffect(() => {
    const newMetrics: ConsciousnessMetrics = {
      conceptualDepth: calculateConceptualDepth(thoughts),
      semanticCoherence: calculateSemanticCoherence(thoughts),
      curiosityDirection: determineCuriosityDirection(thoughts),
      explorationVelocity: calculateExplorationVelocity(thoughts),
      conceptualGravity: calculateConceptualGravity(thoughts),
      insightDensity: calculateInsightDensity(thoughts),
      thoughtEntropy: calculateThoughtEntropy(thoughts),
      emergentPatterns: detectEmergentPatterns(thoughts)
    };
    
    setMetrics(newMetrics);
  }, [thoughts, calculateConceptualDepth, calculateSemanticCoherence, determineCuriosityDirection, 
      calculateExplorationVelocity, calculateConceptualGravity, calculateInsightDensity, 
      calculateThoughtEntropy, detectEmergentPatterns]);

  return metrics;
};