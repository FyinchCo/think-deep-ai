import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Rule {
  id: string;
  rule_text: string;
  rule_type: string;
  priority: number;
  is_active: boolean;
  created_at_step: number;
  last_modified_step?: number;
  effectiveness_score: number;
  trigger_condition?: string;
  scope: string;
}

export const useExplorationRules = (rabbitHoleId: string, currentStep: number) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchRules = useCallback(async () => {
    if (!rabbitHoleId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exploration_rules')
        .select('*')
        .eq('rabbit_hole_id', rabbitHoleId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  }, [rabbitHoleId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const getActiveRulesForMode = useCallback((mode: string) => {
    return rules.filter(rule => 
      rule.is_active && 
      (rule.scope === 'all' || rule.scope === mode) &&
      (!rule.trigger_condition || evaluateTriggerCondition(rule.trigger_condition, currentStep))
    );
  }, [rules, currentStep]);

  const getFormattedRulesText = useCallback((mode: string) => {
    const activeRules = getActiveRulesForMode(mode);
    
    if (activeRules.length === 0) return '';

    const rulesByType = activeRules.reduce((acc, rule) => {
      if (!acc[rule.rule_type]) acc[rule.rule_type] = [];
      acc[rule.rule_type].push(rule);
      return acc;
    }, {} as Record<string, Rule[]>);

    let formattedText = '\n\n=== EXPLORATION RULES ===\n';
    
    Object.entries(rulesByType).forEach(([type, typeRules]) => {
      formattedText += `\n${type.toUpperCase()} RULES:\n`;
      typeRules.forEach((rule, index) => {
        formattedText += `${index + 1}. ${rule.rule_text}\n`;
      });
    });

    formattedText += '\nThese rules must be followed throughout your response.\n';
    
    return formattedText;
  }, [getActiveRulesForMode]);

  const updateRuleEffectiveness = useCallback(async (ruleId: string, effectiveness: number) => {
    try {
      await supabase
        .from('exploration_rules')
        .update({ 
          effectiveness_score: effectiveness,
          last_modified_step: currentStep 
        })
        .eq('id', ruleId);
    } catch (error) {
      console.error('Error updating rule effectiveness:', error);
    }
  }, [currentStep]);

  const evaluateTriggerCondition = (condition: string, step: number): boolean => {
    // Safe trigger condition evaluation without dynamic code execution
    // Only supports specific predefined patterns
    try {
      // Sanitize and validate condition string
      const sanitized = condition.trim().toLowerCase();
      
      // Predefined safe conditions
      const patterns = [
        { pattern: /^step\s*>\s*(\d+)$/, eval: (match: RegExpMatchArray) => step > parseInt(match[1]) },
        { pattern: /^step\s*>=\s*(\d+)$/, eval: (match: RegExpMatchArray) => step >= parseInt(match[1]) },
        { pattern: /^step\s*<\s*(\d+)$/, eval: (match: RegExpMatchArray) => step < parseInt(match[1]) },
        { pattern: /^step\s*<=\s*(\d+)$/, eval: (match: RegExpMatchArray) => step <= parseInt(match[1]) },
        { pattern: /^step\s*==\s*(\d+)$/, eval: (match: RegExpMatchArray) => step === parseInt(match[1]) },
        { pattern: /^step\s*%\s*(\d+)\s*==\s*(\d+)$/, eval: (match: RegExpMatchArray) => step % parseInt(match[1]) === parseInt(match[2]) },
      ];
      
      for (const { pattern, eval: evalFn } of patterns) {
        const match = sanitized.match(pattern);
        if (match) {
          return evalFn(match);
        }
      }
      
      // If no pattern matches, default to active for safety
      return true;
    } catch {
      return true; // If evaluation fails, default to active
    }
  };

  return {
    rules,
    loading,
    getActiveRulesForMode,
    getFormattedRulesText,
    updateRuleEffectiveness,
    refetchRules: fetchRules
  };
};