import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Sparkles, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  globalBrillianceMetrics?: any;
}

export const ExportTools: React.FC<ExportToolsProps> = ({ rabbitHole, answers, globalBrillianceMetrics }) => {
  const { toast } = useToast();
  const [isGeneratingBrilliance, setIsGeneratingBrilliance] = useState(false);
  const [isGeneratingStatus, setIsGeneratingStatus] = useState(false);
  const [statusReport, setStatusReport] = useState<string>('');
  const [compressionLevel, setCompressionLevel] = useState<'atom' | 'micro' | 'brief'>('atom');

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

  const generateProgressSummary = () => {
    const date = new Date().toLocaleString();
    const avgScores = calculateAverageScores();
    const qualityEvolution = getQualityEvolution();
    const conceptualProgression = getConceptualProgression();
    const intellectualArc = getIntellectualArc();
    
    const summary = `COGNITIVE LAB PROGRESS SUMMARY
=====================================

Generated: ${date}
Session ID: ${rabbitHole.id}
Status: ${rabbitHole.status}

EXPLORATION OVERVIEW
==================
Initial Question: ${rabbitHole.initial_question}
Domain: ${rabbitHole.domain}
Total Steps: ${answers.length}
Duration: ${new Date(rabbitHole.created_at).toLocaleString()} - ${date}

QUALITY EVOLUTION
================
${qualityEvolution}

CONCEPTUAL PROGRESSION
=====================
${conceptualProgression}

KEY INSIGHTS CHAIN
=================
${getKeyInsightsChain()}

BREAKTHROUGH ANALYSIS
====================
${getEnhancedBreakthroughAnalysis()}

INTELLECTUAL ARC SUMMARY
=======================
${intellectualArc}

END OF SUMMARY
=============`;

    return summary;
  };

  const getQualityEvolution = () => {
    if (answers.length < 2) return 'Insufficient data for quality evolution analysis.';
    
    const firstHalf = answers.slice(0, Math.ceil(answers.length / 2));
    const secondHalf = answers.slice(Math.ceil(answers.length / 2));
    
    const firstHalfAvg = calculateAverageScoresForSet(firstHalf);
    const secondHalfAvg = calculateAverageScoresForSet(secondHalf);
    
    const noveltyTrend = secondHalfAvg.novelty > firstHalfAvg.novelty ? 'improving' : 
                        secondHalfAvg.novelty < firstHalfAvg.novelty ? 'declining' : 'stable';
    const depthTrend = secondHalfAvg.depth > firstHalfAvg.depth ? 'improving' : 
                      secondHalfAvg.depth < firstHalfAvg.depth ? 'declining' : 'stable';
    
    return `Initial Phase (Steps 1-${firstHalf.length}): Avg Novelty ${firstHalfAvg.novelty.toFixed(1)}, Avg Depth ${firstHalfAvg.depth.toFixed(1)}
Later Phase (Steps ${firstHalf.length + 1}-${answers.length}): Avg Novelty ${secondHalfAvg.novelty.toFixed(1)}, Avg Depth ${secondHalfAvg.depth.toFixed(1)}

Quality Trajectory: Novelty ${noveltyTrend}, Depth ${depthTrend}
Peak Performance: ${getPeakPerformanceSteps()}`;
  };

  const getConceptualProgression = () => {
    return answers.map((answer, index) => {
      const keyTheme = extractKeyTheme(answer.answer_text);
      const connectionNote = index > 0 ? getConnectionTooPrevious(answer, answers[index - 1]) : '';
      return `Step ${answer.step_number}: ${keyTheme}${connectionNote}`;
    }).join('\n');
  };

  const extractKeyTheme = (text: string) => {
    // Clean the text first by removing step indicators
    const cleanText = text.replace(/^Step \d+:?\s*/, '').trim();
    
    // Extract the first meaningful paragraph, aiming for 80-150 characters
    const paragraphs = cleanText.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length > 0) {
      let content = paragraphs[0].trim();
      // Remove any remaining formatting
      content = content.replace(/^\*+\s*/, '').replace(/\*+$/, '').trim();
      
      // If it's very long, try to cut at a sentence boundary
      if (content.length > 120) {
        const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
        if (sentences.length > 0 && sentences[0].length > 30) {
          content = sentences[0].trim();
        } else {
          content = content.substring(0, 117) + '...';
        }
      }
      
      return content;
    }
    
    // Fallback to first part of the text
    return cleanText.length > 120 ? cleanText.substring(0, 117) + '...' : cleanText;
  };

  const getConnectionTooPrevious = (current: Answer, previous: Answer) => {
    // Simple heuristic: if current answer references concepts from previous
    const prevWords = previous.answer_text.toLowerCase().split(/\W+/).filter(w => w.length > 5);
    const currentWords = current.answer_text.toLowerCase().split(/\W+/);
    const sharedConcepts = prevWords.filter(word => currentWords.includes(word));
    
    if (sharedConcepts.length > 2) {
      return ' (builds on previous concepts)';
    } else if (current.judge_scores?.novelty && current.judge_scores.novelty > 7) {
      return ' (new conceptual direction)';
    }
    return '';
  };

  const getKeyInsightsChain = () => {
    const keyInsights = answers.filter(a => 
      (a.judge_scores?.depth && a.judge_scores.depth >= 8) ||
      (a.judge_scores?.novelty && a.judge_scores.novelty >= 8)
    );
    
    if (keyInsights.length === 0) return 'No major insights identified (threshold: 8+).';
    
    return keyInsights.map(insight => {
      const framework = extractFrameworkOrTheory(insight.answer_text);
      const scores = insight.judge_scores;
      return `Step ${insight.step_number} (D:${scores?.depth || 'N/A'} N:${scores?.novelty || 'N/A'}): ${framework}`;
    }).join('\n\n');
  };

  const extractFrameworkOrTheory = (text: string) => {
    // Clean the text first
    const cleanText = text.replace(/^Step \d+:?\s*/, '').trim();
    
    // Look for specific framework/theory introductions
    const frameworkPatterns = [
      /introducing\s+(?:the\s+)?(?:concept\s+of\s+)?["""]([^"""]+)["""]/i,
      /introducing\s+(?:the\s+)?([A-Z][^.!?]*(?:Framework|Theory|Model|Index|System|Network|Method|Approach))/i,
      /(?:framework|theory|model|principle|approach|method|system|index)\s+(?:of\s+)?["""]([^"""]+)["""]/i,
      /(epistemic\s+\w+(?:\s+\w+)*)/i,
      /the\s+([A-Z][^.!?]*(?:Framework|Theory|Model|Index|System|Network|Method|Approach|Principle))/i
    ];
    
    for (const pattern of frameworkPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        let result = match[1].trim();
        result = result.replace(/^(the\s+)?/, '').trim();
        return result.length > 100 ? result.substring(0, 97) + '...' : result;
      }
    }
    
    // Look for key concepts being discussed
    const conceptPatterns = [
      /(?:argues?|suggests?|proposes?|demonstrates?|explores?)\s+(?:that\s+)?([^.!?]{20,100})/i,
      /(?:this|the)\s+([^.!?]{30,120}(?:suggests?|argues?|demonstrates?))/i
    ];
    
    for (const pattern of conceptPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        let result = match[1].trim();
        return result.length > 100 ? result.substring(0, 97) + '...' : result;
      }
    }
    
    // Fallback to cleaned key theme
    return extractKeyTheme(text);
  };

  const getEnhancedBreakthroughAnalysis = () => {
    const breakthroughs = answers.filter(a => 
      a.judge_scores?.breakthrough_potential && a.judge_scores.breakthrough_potential >= 8.7
    );
    
    if (breakthroughs.length === 0) return 'No significant breakthrough moments detected.';
    
    const analysis = breakthroughs.map(bt => {
      const influencedNext = answers.filter(a => 
        a.step_number > bt.step_number && 
        a.step_number <= bt.step_number + 3
      );
      
      const avgInfluenceScore = influencedNext.length > 0 ? 
        influencedNext.reduce((acc, a) => acc + (a.judge_scores?.depth || 0), 0) / influencedNext.length : 0;
      
      return `Step ${bt.step_number} (Breakthrough Score: ${bt.judge_scores?.breakthrough_potential}):
${extractKeyTheme(bt.answer_text)}
Impact: ${avgInfluenceScore > 6 ? 'High influence on subsequent steps' : 'Moderate influence'}`;
    }).join('\n\n');
    
    return `${breakthroughs.length} breakthrough moment(s) identified:\n\n${analysis}`;
  };

  const getIntellectualArc = () => {
    if (answers.length < 3) return 'Insufficient steps for arc analysis.';
    
    const opening = answers[0];
    const middle = answers[Math.floor(answers.length / 2)];
    const closing = answers[answers.length - 1];
    
    const openingTheme = extractKeyTheme(opening.answer_text);
    const middleTheme = extractKeyTheme(middle.answer_text);
    const closingTheme = extractKeyTheme(closing.answer_text);
    
    const progressionPattern = getProgressionPattern();
    
    return `Starting Point: ${openingTheme}

Midpoint Evolution: ${middleTheme}

Final Position: ${closingTheme}

Progression Pattern: ${progressionPattern}

Overall Journey: ${getJourneyDescription()}`;
  };

  const getProgressionPattern = () => {
    const scores = answers.map(a => a.judge_scores?.depth || 0);
    const trend = scores[scores.length - 1] > scores[0] ? 'deepening' : 
                 scores[scores.length - 1] < scores[0] ? 'broadening' : 'stable';
    
    const volatility = getScoreVolatility(scores);
    return `${trend} exploration with ${volatility} conceptual shifts`;
  };

  const getScoreVolatility = (scores: number[]) => {
    if (scores.length < 3) return 'minimal';
    
    let changes = 0;
    for (let i = 1; i < scores.length; i++) {
      if (Math.abs(scores[i] - scores[i-1]) > 2) changes++;
    }
    
    const volatilityRatio = changes / (scores.length - 1);
    return volatilityRatio > 0.5 ? 'frequent' : volatilityRatio > 0.25 ? 'moderate' : 'minimal';
  };

  const getJourneyDescription = () => {
    const totalSteps = answers.length;
    const avgQuality = calculateAverageScores();
    const breakthroughCount = answers.filter(a => 
      a.judge_scores?.breakthrough_potential && a.judge_scores.breakthrough_potential >= 8.7
    ).length;
    
    return `${totalSteps}-step intellectual journey with ${avgQuality.depth.toFixed(1)} avg depth, ${breakthroughCount} breakthrough moments. ${getJourneyCharacter()}`;
  };

  const getJourneyCharacter = () => {
    const avgScores = calculateAverageScores();
    if (avgScores.novelty > 7 && avgScores.depth > 7) return 'Characterized by innovative deep thinking.';
    if (avgScores.novelty > 7) return 'Characterized by creative exploration.';
    if (avgScores.depth > 7) return 'Characterized by thorough analysis.';
    return 'Characterized by steady conceptual development.';
  };

  const calculateAverageScoresForSet = (answerSet: Answer[]) => {
    const validAnswers = answerSet.filter(a => a.judge_scores);
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

  const getPeakPerformanceSteps = () => {
    const peakNovelty = Math.max(...answers.map(a => a.judge_scores?.novelty || 0));
    const peakDepth = Math.max(...answers.map(a => a.judge_scores?.depth || 0));
    
    const noveltyStep = answers.find(a => a.judge_scores?.novelty === peakNovelty)?.step_number;
    const depthStep = answers.find(a => a.judge_scores?.depth === peakDepth)?.step_number;
    
    return `Novelty peak at Step ${noveltyStep} (${peakNovelty}), Depth peak at Step ${depthStep} (${peakDepth})`;
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
      a.download = `cognitive-lab-full-${rabbitHole.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
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

  const exportProgressSummary = () => {
    try {
      const summary = generateProgressSummary();
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cognitive-lab-summary-${rabbitHole.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: 'Progress summary downloaded as TXT file',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to generate summary file',
        variant: 'destructive',
      });
    }
  };

  const generateBrillianceCompressionReport = async () => {
    if (!answers.length) {
      toast({
        title: "No data to analyze",
        description: "Please complete some exploration steps first.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingBrilliance(true);
    
    try {
      console.log('Calling brilliance compression engine...');
      
      const { data, error } = await supabase.functions.invoke('brilliance-compression-engine', {
        body: {
          answers,
          globalBrillianceMetrics,
          initialQuestion: rabbitHole.initial_question
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to generate brilliance report');
      }

      if (!data?.reportContent) {
        throw new Error('No report content received from AI');
      }

      // Create and download the report
      const reportContent = `BRILLIANCE COMPRESSION REPORT
Generated: ${new Date().toLocaleString()}
Question: ${rabbitHole.initial_question}

${data.reportContent}

---
Report generated by AI-Powered Brilliance Compression Engine
Total steps analyzed: ${answers.length}`;

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brilliance-compression-${rabbitHole.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Brilliance Report Generated!",
        description: "Your AI-powered brilliance compression report has been downloaded.",
      });

    } catch (error) {
      console.error('Error generating brilliance report:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate brilliance report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingBrilliance(false);
    }
  };

  const generateAtomStatus = async () => {
    if (!answers.length) {
      toast({
        title: "No data to analyze",
        description: "Please complete some exploration steps first.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingStatus(true);
    
    try {
      console.log(`Generating ${compressionLevel} status report...`);
      
      const { data, error } = await supabase.functions.invoke('atom-status-engine', {
        body: {
          answers,
          rabbitHole,
          compressionLevel
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to generate status report');
      }

      if (!data?.statusReport) {
        throw new Error('No status report received from AI');
      }

      setStatusReport(data.statusReport);

      toast({
        title: "Status Check Complete!",
        description: `Generated ${compressionLevel} status report at step ${answers.length}`,
      });

    } catch (error) {
      console.error('Error generating status report:', error);
      toast({
        title: "Status Check Failed",
        description: error instanceof Error ? error.message : "Failed to generate status report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingStatus(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Atom Status Check Section */}
      <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Real-Time Status Check</h3>
          <select 
            value={compressionLevel} 
            onChange={(e) => setCompressionLevel(e.target.value as 'atom' | 'micro' | 'brief')}
            className="text-xs px-2 py-1 rounded border bg-background"
          >
            <option value="atom">Atom (1 sentence)</option>
            <option value="micro">Micro (2-3 sentences)</option>
            <option value="brief">Brief (1 paragraph)</option>
          </select>
        </div>
        
        <Button
          onClick={generateAtomStatus}
          size="sm"
          variant="secondary"
          disabled={isGeneratingStatus}
          className="flex items-center gap-2 w-full"
        >
          <Zap className="h-4 w-4" />
          {isGeneratingStatus ? 'Checking Status...' : `Check Status (${compressionLevel})`}
        </Button>
        
        {statusReport && (
          <div className="p-3 rounded-md bg-accent text-accent-foreground text-sm">
            <div className="font-medium text-xs text-muted-foreground mb-1">
              Status at Step {answers.length} ({compressionLevel}):
            </div>
            {statusReport}
          </div>
        )}
      </div>

      {/* Export Tools Section */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={generateBrillianceCompressionReport}
          size="sm"
          variant="default"
          disabled={isGeneratingBrilliance}
          className="bg-gradient-primary hover:bg-gradient-primary/90 flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isGeneratingBrilliance ? 'Analyzing...' : 'Export Brilliance Report'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportProgressSummary}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export Progress Summary
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToTxt}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Export Full Report
        </Button>
      </div>
    </div>
  );
};