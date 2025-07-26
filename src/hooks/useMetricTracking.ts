import { useState, useCallback } from 'react';

interface HeartbeatMetrics {
  livesImprovedEstimate: number;
  systemResilienceScore: number;
  equityIndex: number;
  targetLives: number;
  lastUpdated: number;
}

interface ConceptUsage {
  acronym: string;
  fullName: string;
  introducedAtStep: number;
  lastReferencedAtStep: number;
  referenceCount: number;
  isCandidate: boolean;
}

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  judge_scores?: any;
  generated_at: string;
}

export const useMetricTracking = () => {
  const [heartbeatMetrics, setHeartbeatMetrics] = useState<HeartbeatMetrics>({
    livesImprovedEstimate: 0,
    systemResilienceScore: 0.5,
    equityIndex: 0.4,
    targetLives: 1000000000, // 1 billion
    lastUpdated: 0
  });

  const [conceptUsage, setConceptUsage] = useState<ConceptUsage[]>([]);
  const [lastPruningStep, setLastPruningStep] = useState(0);

  const extractAcronyms = useCallback((text: string): string[] => {
    // Extract acronyms (2-6 uppercase letters, possibly with numbers)
    const acronymRegex = /\b[A-Z]{2,6}(?:\d+)?\b/g;
    const matches = text.match(acronymRegex) || [];
    
    // Filter out common words that aren't real acronyms
    const commonWords = ['AND', 'OR', 'THE', 'FOR', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'USE', 'LET'];
    
    return matches.filter(match => !commonWords.includes(match));
  }, []);

  const extractFullNames = useCallback((text: string, acronym: string): string => {
    // Simple heuristic: look for patterns like "Full Name (ACRONYM)" or "ACRONYM (Full Name)"
    const patterns = [
      new RegExp(`([^\\(\\)]{10,50})\\s*\\(${acronym}\\)`, 'i'),
      new RegExp(`${acronym}\\s*\\(([^\\(\\)]{10,50})\\)`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return `Concept ${acronym}`; // Fallback
  }, []);

  const updateMetrics = useCallback((answers: Answer[]) => {
    if (answers.length === 0) return;

    const latestAnswer = answers[answers.length - 1];
    const currentStep = latestAnswer.step_number;

    // Update heartbeat metrics every 5 steps
    if (currentStep % 5 === 0 || currentStep > heartbeatMetrics.lastUpdated + 5) {
      // Calculate lives improved estimate based on content analysis
      const totalText = answers.map(a => a.answer_text).join(' ');
      const impactKeywords = ['lives', 'people', 'population', 'billion', 'million', 'QALY', 'DALY', 'impact', 'benefit'];
      const impactScore = impactKeywords.reduce((score, keyword) => {
        const matches = (totalText.match(new RegExp(keyword, 'gi')) || []).length;
        return score + matches;
      }, 0);

      // Rough estimation: each impact keyword mention = 1000 lives improved
      const livesEstimate = Math.min(impactScore * 1000, heartbeatMetrics.targetLives);

      // Calculate resilience score based on robustness keywords
      const resilienceKeywords = ['resilient', 'antifragile', 'robust', 'adaptive', 'recovery', 'stress', 'failure'];
      const resilienceScore = Math.min(
        resilienceKeywords.reduce((score, keyword) => {
          const matches = (totalText.match(new RegExp(keyword, 'gi')) || []).length;
          return score + matches * 0.05;
        }, 0.3),
        1.0
      );

      // Calculate equity index based on fairness and equality keywords
      const equityKeywords = ['fair', 'equal', 'justice', 'bias', 'discrimination', 'inclusive'];
      const equityMentions = equityKeywords.reduce((count, keyword) => {
        const matches = (totalText.match(new RegExp(keyword, 'gi')) || []).length;
        return count + matches;
      }, 0);
      
      // Lower Gini = better equality (inverse relationship with mentions)
      const equityIndex = Math.max(0.1, 0.6 - (equityMentions * 0.02));

      setHeartbeatMetrics(prev => ({
        ...prev,
        livesImprovedEstimate: livesEstimate,
        systemResilienceScore: resilienceScore,
        equityIndex: equityIndex,
        lastUpdated: currentStep
      }));
    }

    // Update concept tracking
    const allAcronyms = new Set<string>();
    const conceptMap = new Map<string, ConceptUsage>();

    answers.forEach((answer, index) => {
      const acronyms = extractAcronyms(answer.answer_text);
      
      acronyms.forEach(acronym => {
        allAcronyms.add(acronym);
        
        if (!conceptMap.has(acronym)) {
          conceptMap.set(acronym, {
            acronym,
            fullName: extractFullNames(answer.answer_text, acronym),
            introducedAtStep: answer.step_number,
            lastReferencedAtStep: answer.step_number,
            referenceCount: 1,
            isCandidate: false
          });
        } else {
          const concept = conceptMap.get(acronym)!;
          concept.lastReferencedAtStep = answer.step_number;
          concept.referenceCount += 1;
        }
      });
    });

    setConceptUsage(Array.from(conceptMap.values()));
  }, [heartbeatMetrics.lastUpdated, extractAcronyms, extractFullNames]);

  const pruneConcepts = useCallback((acronymsToRemove: string[]) => {
    setConceptUsage(prev => prev.filter(concept => !acronymsToRemove.includes(concept.acronym)));
    setLastPruningStep(heartbeatMetrics.lastUpdated);
  }, [heartbeatMetrics.lastUpdated]);

  return {
    heartbeatMetrics,
    conceptUsage,
    lastPruningStep,
    updateMetrics,
    pruneConcepts
  };
};