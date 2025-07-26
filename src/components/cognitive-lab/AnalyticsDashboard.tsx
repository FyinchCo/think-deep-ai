import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Zap, Brain } from 'lucide-react';

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  is_valid: boolean;
  judge_scores?: any;
  generated_at: string;
  retry_count: number;
}

interface AnalyticsDashboardProps {
  answers: Answer[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ answers }) => {
  const validAnswers = answers.filter(a => a.judge_scores);
  
  if (validAnswers.length === 0) {
    return null;
  }

  const calculateAverages = () => {
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

  const getQualityTrend = () => {
    if (validAnswers.length < 3) return 'insufficient_data';
    
    const recent = validAnswers.slice(-3);
    const earlier = validAnswers.slice(-6, -3);
    
    if (earlier.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((sum, a) => sum + (a.judge_scores.depth + a.judge_scores.novelty) / 2, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, a) => sum + (a.judge_scores.depth + a.judge_scores.novelty) / 2, 0) / earlier.length;
    
    if (recentAvg > earlierAvg + 0.5) return 'improving';
    if (recentAvg < earlierAvg - 0.5) return 'declining';
    return 'stable';
  };

  const getBreakthroughMoments = () => {
    return validAnswers.filter(a => 
      a.judge_scores?.breakthrough_potential && a.judge_scores.breakthrough_potential >= 7
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 6) return 'text-warning';
    return 'text-destructive';
  };

  const averages = calculateAverages();
  const trend = getQualityTrend();
  const breakthroughs = getBreakthroughMoments();

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-destructive rotate-180" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'improving': return 'success';
      case 'declining': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card className="border-2 border-neural/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-neural" />
          Exploration Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quality Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className={`text-2xl font-bold ${getScoreColor(averages.novelty)}`}>
              {averages.novelty.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Novelty</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className={`text-2xl font-bold ${getScoreColor(averages.depth)}`}>
              {averages.depth.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Depth</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className={`text-2xl font-bold ${getScoreColor(averages.coherence)}`}>
              {averages.coherence.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Coherence</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className={`text-2xl font-bold ${getScoreColor(averages.breakthrough)}`}>
              {averages.breakthrough.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Breakthrough</div>
          </div>
        </div>

        {/* Trend and Insights */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className="text-sm font-medium">Quality Trend:</span>
            <Badge variant={getTrendColor() as any}>
              {trend === 'insufficient_data' ? 'Building...' : trend}
            </Badge>
          </div>
          {breakthroughs.length > 0 && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-neural" />
              <Badge variant="outline" className="bg-neural/10">
                {breakthroughs.length} Breakthrough{breakthroughs.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>

        {/* Breakthrough Highlights */}
        {breakthroughs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Breakthroughs:</h4>
            {breakthroughs.slice(-2).map((breakthrough) => (
              <div key={breakthrough.id} className="p-2 bg-neural/5 rounded border-l-2 border-l-neural">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    Step {breakthrough.step_number}
                  </Badge>
                  <span className="text-xs font-medium text-neural">
                    Score: {breakthrough.judge_scores.breakthrough_potential}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {breakthrough.answer_text.substring(0, 80)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};