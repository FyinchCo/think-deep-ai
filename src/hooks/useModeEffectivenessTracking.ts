import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModeTransitionEvent {
  step_id: string;
  rabbit_hole_id: string;
  mode: 'single' | 'exploration' | 'grounding';
  coherence_before?: number;
  coherence_after?: number;
  abstraction_level?: number;
  user_satisfaction?: number;
  transition_reason?: string;
}

export const useModeEffectivenessTracking = () => {
  const logModeTransition = useCallback(async (event: ModeTransitionEvent) => {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'mode_transition',
          rabbit_hole_id: event.rabbit_hole_id,
          answer_id: event.step_id,
          payload: {
            mode: event.mode,
            coherence_before: event.coherence_before,
            coherence_after: event.coherence_after,
            abstraction_level: event.abstraction_level,
            user_satisfaction: event.user_satisfaction,
            transition_reason: event.transition_reason,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Error logging mode transition:', error);
      }
    } catch (error) {
      console.error('Failed to log mode transition:', error);
    }
  }, []);

  const logModeEffectiveness = useCallback(async (event: {
    rabbit_hole_id: string;
    mode: 'single' | 'exploration' | 'grounding';
    step_before_id?: string;
    step_after_id: string;
    coherence_improvement: number;
    abstraction_change: number;
    effectiveness_score: number;
  }) => {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          event_type: 'mode_effectiveness',
          rabbit_hole_id: event.rabbit_hole_id,
          answer_id: event.step_after_id,
          payload: {
            mode: event.mode,
            step_before_id: event.step_before_id,
            step_after_id: event.step_after_id,
            coherence_improvement: event.coherence_improvement,
            abstraction_change: event.abstraction_change,
            effectiveness_score: event.effectiveness_score,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Error logging mode effectiveness:', error);
      }
    } catch (error) {
      console.error('Failed to log mode effectiveness:', error);
    }
  }, []);

  const calculateAbstractionLevel = useCallback(async (text: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_abstraction_level', {
        text_content: text
      });

      if (error) {
        console.error('Error calculating abstraction level:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to calculate abstraction level:', error);
      return 0;
    }
  }, []);

  const queryModeEffectiveness = useCallback(async (rabbit_hole_id: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('rabbit_hole_id', rabbit_hole_id)
        .in('event_type', ['mode_transition', 'mode_effectiveness'])
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error querying mode effectiveness:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to query mode effectiveness:', error);
      return [];
    }
  }, []);

  return {
    logModeTransition,
    logModeEffectiveness,
    calculateAbstractionLevel,
    queryModeEffectiveness
  };
};