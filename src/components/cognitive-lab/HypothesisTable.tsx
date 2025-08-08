import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, CheckCircle, ThumbsUp, ThumbsDown, Send } from 'lucide-react';

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  is_valid: boolean;
  judge_scores?: any;
  generated_at: string;
  retry_count: number;
}

interface RabbitHole {
  id: string;
  initial_question: string;
  domain: string;
  status: string;
  total_steps: number;
  created_at: string;
}

export type HypothesisMetric = 'DIQ' | 'SDI' | 'ADR' | 'Other';

export interface Hypothesis {
  id: string;
  metric: HypothesisMetric;
  statement: string;
  selected?: boolean;
  supportVotes?: number;
  refuteVotes?: number;
}

interface HypothesisTableProps {
  rabbitHole: RabbitHole;
  answers: Answer[];
  onRunGrounding: () => Promise<void>;
}

export const HypothesisTable: React.FC<HypothesisTableProps> = ({ rabbitHole, answers, onRunGrounding }) => {
  const { toast } = useToast();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [filter, setFilter] = useState<'all' | HypothesisMetric>('all');
  const textCorpus = useMemo(() => answers.map(a => a.answer_text.toLowerCase()).join(' '), [answers]);

  useEffect(() => {
    // Load existing ballots to initialize counts
    const loadBallots = async () => {
      const { data } = await supabase
        .from('events')
        .select('payload')
        .eq('rabbit_hole_id', rabbitHole.id)
        .eq('event_type', 'hypothesis_ballot');

      const voteMap = new Map<string, { support: number; refute: number }>();
      data?.forEach((e: any) => {
        const id = e.payload?.hypothesis_id as string;
        const vote = e.payload?.vote as 'support' | 'refute';
        if (!id || !vote) return;
        const cur = voteMap.get(id) || { support: 0, refute: 0 };
        cur[vote] += 1;
        voteMap.set(id, cur);
      });

      setHypotheses(prev => prev.map(h => ({
        ...h,
        supportVotes: voteMap.get(h.id)?.support || 0,
        refuteVotes: voteMap.get(h.id)?.refute || 0,
      })));
    };

    if (rabbitHole?.id) loadBallots();
  }, [rabbitHole?.id]);

  const genId = () => Math.random().toString(36).slice(2, 10);

  const generateHypotheses = () => {
    if (!answers.length) {
      toast({ title: 'No data', description: 'Run exploration steps first.', variant: 'destructive' });
      return;
    }

    const picks: Hypothesis[] = [];
    const addIf = (cond: boolean, metric: HypothesisMetric, statement: string) => {
      if (cond) picks.push({ id: genId(), metric, statement, supportVotes: 0, refuteVotes: 0 });
    };

    addIf(/dissip|entropy|thermo|free energy/.test(textCorpus), 'DIQ',
      'Higher Dissipation Intelligence (DIQ) predicts faster convergence and higher accuracy on ambiguous Bayesian inference tasks.');
    addIf(/microbiome|gut|symbio|metabolite/.test(textCorpus), 'SDI',
      'Greater Symbiotic Dissipation Index (SDI) correlates with improved cognitive resilience under stress and fewer regressions.');
    addIf(/adversarial|parasit|arms race|pathobiont|phage/.test(textCorpus), 'ADR',
      'Higher Adversarial Dissipation Ratio (ADR) predicts quicker recovery from perturbations and superior problem-solving under noise.');

    // Generic info-theoretic compression angle if strong novelty/depth
    const avg = (() => {
      const withScores = answers.filter(a => a.judge_scores);
      if (!withScores.length) return 0;
      const s = withScores.reduce((acc, a) => acc + ((a.judge_scores.novelty || 0) + (a.judge_scores.depth || 0)) / 2, 0) / withScores.length;
      return s;
    })();
    if (avg >= 8) {
      addIf(true, 'Other', 'Entropic compression efficiency explains variance in task performance beyond novelty/depth alone.');
    }

    if (!picks.length) {
      picks.push({ id: genId(), metric: 'Other', statement: 'Recent conceptual themes predict measurable gains on transfer tasks in uncertain environments.', supportVotes: 0, refuteVotes: 0 });
    }

    setHypotheses(picks);
    toast({ title: 'Hypotheses generated', description: `Created ${picks.length} candidates.` });
  };

  const castBallot = async (h: Hypothesis, vote: 'support' | 'refute') => {
    setHypotheses(prev => prev.map(x => x.id === h.id ? {
      ...x,
      supportVotes: (x.supportVotes || 0) + (vote === 'support' ? 1 : 0),
      refuteVotes: (x.refuteVotes || 0) + (vote === 'refute' ? 1 : 0)
    } : x));

    await supabase.from('events').insert({
      rabbit_hole_id: rabbitHole.id,
      event_type: 'hypothesis_ballot',
      payload: { hypothesis_id: h.id, vote, statement: h.statement, metric: h.metric }
    });
  };

  const selectedCount = hypotheses.filter(h => h.selected).length;

  const runGroundingWithSelection = async () => {
    if (!selectedCount) {
      toast({ title: 'No selection', description: 'Select at least one hypothesis to ground.', variant: 'destructive' });
      return;
    }

    // Log selection for traceability
    await supabase.from('events').insert({
      rabbit_hole_id: rabbitHole.id,
      event_type: 'hypotheses_selected',
      payload: { hypotheses: hypotheses.filter(h => h.selected).map(h => ({ id: h.id, metric: h.metric, statement: h.statement })) }
    });

    toast({ title: 'Sending to Grounding Panel', description: `${selectedCount} hypothesis${selectedCount>1?'es':''} queued.` });
    await onRunGrounding();
  };

  const visible = hypotheses.filter(h => filter === 'all' ? true : h.metric === filter);

  return (
    <Card className="border-2 border-neural/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-neural" />
          Phase 2: Hypotheses & Ballots
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generateHypotheses} size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Hypotheses
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">{rabbitHole.total_steps} steps</Badge>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Filter:</span>
              <select className="border rounded px-2 py-1 text-xs bg-background" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="DIQ">DIQ</option>
                <option value="SDI">SDI</option>
                <option value="ADR">ADR</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {hypotheses.length === 0 ? (
          <div className="text-sm text-muted-foreground p-6 border rounded">No hypotheses yet. Click "Generate Hypotheses" to start.</div>
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"><span className="sr-only">Select</span></TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Hypothesis</TableHead>
                  <TableHead className="text-right">Ballots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <Checkbox checked={!!h.selected} onCheckedChange={(v) => setHypotheses(prev => prev.map(x => x.id === h.id ? { ...x, selected: !!v } : x))} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{h.metric}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input value={h.statement} onChange={(e) => setHypotheses(prev => prev.map(x => x.id === h.id ? { ...x, statement: e.target.value } : x))} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => castBallot(h, 'support')}>
                          <ThumbsUp className="h-4 w-4 mr-1" /> {(h.supportVotes || 0)}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => castBallot(h, 'refute')}>
                          <ThumbsDown className="h-4 w-4 mr-1" /> {(h.refuteVotes || 0)}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                Selected: {selectedCount}
              </div>
              <Button onClick={runGroundingWithSelection} size="sm" className="ml-auto">
                <Send className="h-4 w-4 mr-2" /> Run Grounding Panel
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-3">
          Tip: Ballots are logged as events for this rabbit hole to track consensus over time.
        </div>
      </CardContent>
    </Card>
  );
};
