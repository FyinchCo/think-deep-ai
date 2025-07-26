import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface ExportToolsProps {
  rabbitHole: RabbitHole;
  answers: Answer[];
}

export const ExportTools: React.FC<ExportToolsProps> = ({ rabbitHole, answers }) => {
  const { toast } = useToast();

  const generateReport = () => {
    const date = new Date().toLocaleString();
    const avgScores = calculateAverageScores();
    
    const report = `COGNITIVE LAB EXPLORATION REPORT
======================================

Generated: ${date}
Session ID: ${rabbitHole.id}
Status: ${rabbitHole.status}

EXPLORATION OVERVIEW
==================
Initial Question: ${rabbitHole.initial_question}
Domain: ${rabbitHole.domain}
Total Steps: ${rabbitHole.total_steps}
Started: ${new Date(rabbitHole.created_at).toLocaleString()}

QUALITY METRICS
==============
Average Novelty Score: ${avgScores.novelty.toFixed(1)}
Average Depth Score: ${avgScores.depth.toFixed(1)}
Average Coherence Score: ${avgScores.coherence.toFixed(1)}
Average Relevance Score: ${avgScores.relevance.toFixed(1)}
${avgScores.breakthrough > 0 ? `Average Breakthrough Potential: ${avgScores.breakthrough.toFixed(1)}` : ''}

BREAKTHROUGH MOMENTS
==================
${getBreakthroughMoments()}

FULL EXPLORATION CHAIN
=====================
${answers.map((answer, index) => `
STEP ${answer.step_number}
--------
Generated: ${new Date(answer.generated_at).toLocaleString()}
${answer.judge_scores ? `Scores: N:${answer.judge_scores.novelty} D:${answer.judge_scores.depth} C:${answer.judge_scores.coherence} R:${answer.judge_scores.relevance}${answer.judge_scores.breakthrough_potential ? ` BT:${answer.judge_scores.breakthrough_potential}` : ''}` : ''}

${answer.answer_text}

${answer.judge_scores?.explanation ? `Judge Analysis: ${answer.judge_scores.explanation}` : ''}
${index < answers.length - 1 ? '\n---\n' : ''}
`).join('')}

END OF REPORT
============`;

    return report;
  };

  const calculateAverageScores = () => {
    const validAnswers = answers.filter(a => a.judge_scores);
    if (validAnswers.length === 0) return { novelty: 0, depth: 0, coherence: 0, relevance: 0, breakthrough: 0 };

    const totals = validAnswers.reduce((acc, answer) => {
      const scores = answer.judge_scores;
      return {
        novelty: acc.novelty + (scores.novelty || 0),
        depth: acc.depth + (scores.depth || 0),
        coherence: acc.coherence + (scores.coherence || 0),
        relevance: acc.relevance + (scores.relevance || 0),
        breakthrough: acc.breakthrough + (scores.breakthrough_potential || 0)
      };
    }, { novelty: 0, depth: 0, coherence: 0, relevance: 0, breakthrough: 0 });

    return {
      novelty: totals.novelty / validAnswers.length,
      depth: totals.depth / validAnswers.length,
      coherence: totals.coherence / validAnswers.length,
      relevance: totals.relevance / validAnswers.length,
      breakthrough: totals.breakthrough / validAnswers.length
    };
  };

  const getBreakthroughMoments = () => {
    const breakthroughs = answers.filter(a => 
      a.judge_scores?.breakthrough_potential && a.judge_scores.breakthrough_potential >= 7
    );
    
    if (breakthroughs.length === 0) return 'No significant breakthrough moments detected.';
    
    return breakthroughs.map(a => 
      `Step ${a.step_number} (Score: ${a.judge_scores.breakthrough_potential}): ${a.answer_text.substring(0, 100)}...`
    ).join('\n');
  };

  const exportToTxt = () => {
    try {
      const report = generateReport();
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cognitive-lab-${rabbitHole.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: 'Full exploration report downloaded as TXT file',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to generate report file',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToTxt}
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Export Report
      </Button>
    </div>
  );
};