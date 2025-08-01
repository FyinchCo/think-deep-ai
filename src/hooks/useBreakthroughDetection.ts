import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BreakthroughMode {
  id: string;
  mode_type: 'cascade' | 'paradigm_shift' | 'productive_chaos';
  activated_at: string;
  deactivated_at?: string;
  trigger_reason: string;
  trigger_step: number;
  parameters: any;
  effectiveness_score?: number;
}

interface QuestionArchitecture {
  temporal_displacement_score: number;
  assumption_inversion_score: number;
  meta_cognitive_score: number;
  constraint_paradox_score: number;
  breakthrough_potential: number;
  structural_patterns: any;
}

interface ParadigmShift {
  id: string;
  shift_type: 'ontological' | 'epistemological' | 'methodological' | 'axiological';
  intensity_score: number;
  worldview_alteration_potential: number;
  conceptual_revolution_markers: string[];
  detected_at: string;
}

interface BreakthroughDetectionState {
  currentMode?: BreakthroughMode;
  questionArchitecture?: QuestionArchitecture;
  detectedShifts: ParadigmShift[];
  cascadeDetected: boolean;
  breakthroughReadiness: number;
  isAnalyzing: boolean;
}

export const useBreakthroughDetection = (rabbitHoleId?: string) => {
  const [state, setState] = useState<BreakthroughDetectionState>({
    detectedShifts: [],
    cascadeDetected: false,
    breakthroughReadiness: 0,
    isAnalyzing: false
  });

  const analyzeQuestionArchitecture = useCallback(async (questionText: string) => {
    setState(prev => ({ ...prev, isAnalyzing: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('breakthrough-engine', {
        body: {
          action: 'analyze_question',
          question_text: questionText
        }
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        questionArchitecture: data.architecture,
        breakthroughReadiness: data.architecture.breakthrough_potential
      }));

      return data.architecture;
    } catch (error) {
      console.error('Question architecture analysis failed:', error);
      return null;
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, []);

  const detectParadigmShift = useCallback(async (
    answerId: string,
    answerText: string,
    previousAnswers: string[]
  ) => {
    if (!rabbitHoleId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('breakthrough-engine', {
        body: {
          action: 'detect_paradigm_shift',
          rabbit_hole_id: rabbitHoleId,
          answer_id: answerId,
          answer_text: answerText,
          previous_answers: previousAnswers
        }
      });

      if (error) throw error;

      const analysis = data.analysis;
      
      // Update local state if significant shift detected (lowered threshold)
      if (analysis.paradigm_shift_score >= 0.4) {
        setState(prev => ({
          ...prev,
          detectedShifts: [...prev.detectedShifts, {
            id: answerId,
            shift_type: analysis.shift_type,
            intensity_score: analysis.paradigm_shift_score,
            worldview_alteration_potential: analysis.worldview_alteration,
            conceptual_revolution_markers: analysis.conceptual_revolution_markers,
            detected_at: new Date().toISOString()
          }],
          cascadeDetected: analysis.paradigm_shift_score >= 0.6
        }));
      }

      return analysis;
    } catch (error) {
      console.error('Paradigm shift detection failed:', error);
      return null;
    }
  }, [rabbitHoleId]);

  const activateBreakthroughMode = useCallback(async (
    modeType: 'cascade' | 'paradigm_shift' | 'productive_chaos',
    triggerStep: number,
    triggerReason: string,
    parameters: any = {}
  ) => {
    if (!rabbitHoleId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('breakthrough-engine', {
        body: {
          action: 'activate_breakthrough_mode',
          rabbit_hole_id: rabbitHoleId,
          mode_type: modeType,
          trigger_step: triggerStep,
          trigger_reason: triggerReason,
          parameters
        }
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        currentMode: data.mode
      }));

      return data.mode;
    } catch (error) {
      console.error('Breakthrough mode activation failed:', error);
      return null;
    }
  }, [rabbitHoleId]);

  const deactivateBreakthroughMode = useCallback(async () => {
    if (!rabbitHoleId || !state.currentMode) return;

    try {
      await supabase
        .from('breakthrough_modes')
        .update({ deactivated_at: new Date().toISOString() })
        .eq('id', state.currentMode.id);

      setState(prev => ({
        ...prev,
        currentMode: undefined
      }));
    } catch (error) {
      console.error('Failed to deactivate breakthrough mode:', error);
    }
  }, [rabbitHoleId, state.currentMode]);

  const checkBreakthroughReadiness = useCallback((answers: any[]) => {
    if (answers.length < 3) return 0;

    const recentAnswers = answers.slice(-5);
    let readinessScore = 0;

    // Check for brilliance momentum
    const brillianceScores = recentAnswers
      .map(a => a.judge_scores?.breakthrough_potential || 0)
      .filter(score => score > 0);

    if (brillianceScores.length >= 3) {
      const avgBrilliance = brillianceScores.reduce((sum, score) => sum + score, 0) / brillianceScores.length;
      readinessScore += avgBrilliance * 0.4;
    }

    // Check for increasing complexity
    const complexityTrend = recentAnswers
      .map(a => (a.answer_text?.length || 0))
      .reduce((acc, length, i, arr) => {
        if (i > 0) acc += length > arr[i - 1] ? 0.1 : -0.05;
        return acc;
      }, 0);

    readinessScore += Math.max(0, complexityTrend);

    // Check for paradigm shift indicators
    const hasShiftIndicators = recentAnswers.some(a => 
      a.answer_text?.toLowerCase().includes('paradigm') ||
      a.answer_text?.toLowerCase().includes('fundamentally') ||
      a.answer_text?.toLowerCase().includes('revolutionary')
    );

    if (hasShiftIndicators) readinessScore += 0.2;

    // Auto-trigger breakthrough modes based on readiness
    const finalScore = Math.min(1, readinessScore);
    
    setState(prev => ({
      ...prev,
      breakthroughReadiness: finalScore
    }));

    // Auto-activate breakthrough modes when readiness is high
    if (finalScore >= 0.7 && !state.currentMode && rabbitHoleId) {
      const lastAnswer = answers[answers.length - 1];
      if (lastAnswer) {
        setTimeout(() => {
          activateBreakthroughMode(
            'cascade',
            lastAnswer.step_number,
            `Auto-triggered: High breakthrough readiness (${finalScore.toFixed(2)})`,
            { auto_triggered: true, readiness_score: finalScore }
          );
        }, 100);
      }
    }

    return finalScore;
  }, []);

  // Load current breakthrough mode on mount
  useEffect(() => {
    if (!rabbitHoleId) return;

    const loadCurrentMode = async () => {
      const { data } = await supabase
        .from('breakthrough_modes')
        .select('*')
        .eq('rabbit_hole_id', rabbitHoleId)
        .is('deactivated_at', null)
        .order('activated_at', { ascending: false })
        .limit(1)
        .single();

      if (data && ['cascade', 'paradigm_shift', 'productive_chaos'].includes(data.mode_type)) {
        setState(prev => ({ 
          ...prev, 
          currentMode: data as BreakthroughMode
        }));
      }
    };

    loadCurrentMode();
  }, [rabbitHoleId]);

  return {
    ...state,
    analyzeQuestionArchitecture,
    detectParadigmShift,
    activateBreakthroughMode,
    deactivateBreakthroughMode,
    checkBreakthroughReadiness
  };
};