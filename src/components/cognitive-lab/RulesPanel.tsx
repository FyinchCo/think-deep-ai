import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface RulesPanelProps {
  rabbitHoleId: string;
  currentStep: number;
  onRulesChange?: (rules: Rule[]) => void;
}

const RULE_TYPES = [
  { value: 'methodological', label: 'Methodological' },
  { value: 'conceptual', label: 'Conceptual' },
  { value: 'constraint', label: 'Constraint' },
  { value: 'meta', label: 'Meta-Rule' }
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All Steps' },
  { value: 'single', label: 'Single Mode' },
  { value: 'exploration', label: 'Exploration Mode' },
  { value: 'grounding', label: 'Grounding Mode' }
];

export const RulesPanel: React.FC<RulesPanelProps> = ({
  rabbitHoleId,
  currentStep,
  onRulesChange
}) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    rule_text: '',
    rule_type: 'methodological',
    priority: 1,
    scope: 'all',
    trigger_condition: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, [rabbitHoleId]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('exploration_rules')
        .select('*')
        .eq('rabbit_hole_id', rabbitHoleId)
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules(data || []);
      onRulesChange?.(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rules",
        variant: "destructive"
      });
    }
  };

  const addRule = async () => {
    if (!newRule.rule_text.trim()) {
      toast({
        title: "Error",
        description: "Rule text is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exploration_rules')
        .insert({
          rabbit_hole_id: rabbitHoleId,
          rule_text: newRule.rule_text,
          rule_type: newRule.rule_type,
          priority: newRule.priority,
          scope: newRule.scope,
          trigger_condition: newRule.trigger_condition || null,
          created_at_step: currentStep
        })
        .select()
        .single();

      if (error) throw error;

      setRules(prev => [...prev, data]);
      setNewRule({
        rule_text: '',
        rule_type: 'methodological',
        priority: 1,
        scope: 'all',
        trigger_condition: ''
      });
      setIsAddingRule(false);
      onRulesChange?.([...rules, data]);

      toast({
        title: "Success",
        description: "Rule added successfully"
      });
    } catch (error) {
      console.error('Error adding rule:', error);
      toast({
        title: "Error",
        description: "Failed to add rule",
        variant: "destructive"
      });
    }
  };

  const updateRule = async (ruleId: string, updates: Partial<Rule>) => {
    try {
      const { error } = await supabase
        .from('exploration_rules')
        .update({
          ...updates,
          last_modified_step: currentStep
        })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates, last_modified_step: currentStep } : rule
      ));

      const updatedRules = rules.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates, last_modified_step: currentStep } : rule
      );
      onRulesChange?.(updatedRules);

      toast({
        title: "Success",
        description: "Rule updated successfully"
      });
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive"
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('exploration_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      const updatedRules = rules.filter(rule => rule.id !== ruleId);
      setRules(updatedRules);
      onRulesChange?.(updatedRules);

      toast({
        title: "Success",
        description: "Rule deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive"
      });
    }
  };

  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    await updateRule(ruleId, { is_active: isActive });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Exploration Rules</span>
          <Button 
            onClick={() => setIsAddingRule(true)} 
            size="sm"
            disabled={isAddingRule}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Rule Form */}
        {isAddingRule && (
          <Card className="p-4 border-dashed">
            <div className="space-y-3">
              <Textarea
                placeholder="Enter rule text (e.g., 'Use ECCM and TERG on actual human messes')"
                value={newRule.rule_text}
                onChange={(e) => setNewRule(prev => ({ ...prev, rule_text: e.target.value }))}
                className="min-h-[80px]"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <Select 
                  value={newRule.rule_type} 
                  onValueChange={(value) => setNewRule(prev => ({ ...prev, rule_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={newRule.scope} 
                  onValueChange={(value) => setNewRule(prev => ({ ...prev, scope: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map(scope => (
                      <SelectItem key={scope.value} value={scope.value}>
                        {scope.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Priority (1-10)"
                  value={newRule.priority}
                  onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={10}
                />
                
                <Input
                  placeholder="Trigger condition (optional)"
                  value={newRule.trigger_condition}
                  onChange={(e) => setNewRule(prev => ({ ...prev, trigger_condition: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingRule(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={addRule}>
                  <Save className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Rules List */}
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={`p-4 ${!rule.is_active ? 'opacity-60' : ''}`}>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rule.rule_text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{rule.rule_type}</Badge>
                      <Badge variant="secondary">Priority: {rule.priority}</Badge>
                      <Badge variant="outline">{rule.scope}</Badge>
                      {rule.trigger_condition && (
                        <Badge variant="outline">Trigger: {rule.trigger_condition}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created at step {rule.created_at_step}
                  {rule.last_modified_step && ` • Modified at step ${rule.last_modified_step}`}
                  {rule.effectiveness_score > 0 && ` • Effectiveness: ${rule.effectiveness_score.toFixed(2)}`}
                </div>
              </div>
            </Card>
          ))}

          {rules.length === 0 && !isAddingRule && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No rules defined yet</p>
              <p className="text-sm">Add rules to guide your exploration process</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};