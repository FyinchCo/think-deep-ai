import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useCoherenceTracking } from '@/hooks/useCoherenceTracking';

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  judge_scores?: {
    novelty: number;
    depth: number;
    coherence: number;
    relevance: number;
    breakthrough_potential: number;
  };
}

interface CoherenceMonitorProps {
  answers: Answer[];
  currentStep: number;
  className?: string;
}

export const CoherenceMonitor: React.FC<CoherenceMonitorProps> = ({ 
  answers, 
  currentStep, 
  className = "" 
}) => {
  const metrics = useCoherenceTracking(answers);

  const getTrendIcon = () => {
    switch (metrics.qualityTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSaturationColor = () => {
    switch (metrics.saturationRisk) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSaturationIcon = () => {
    switch (metrics.saturationRisk) {
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      case 'medium':
        return <Eye className="h-3 w-3" />;
      default:
        return <CheckCircle className="h-3 w-3" />;
    }
  };

  if (answers.length < 3) {
    return null; // Don't show until we have enough data
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Coherence Monitor</h3>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <Badge variant={getSaturationColor()} className="text-xs flex items-center gap-1">
                {getSaturationIcon()}
                {metrics.saturationRisk} saturation
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center">
              <div className="font-medium text-muted-foreground">Metaphor Density</div>
              <div className={`text-lg font-bold ${
                metrics.metaphorDensity > 8 ? 'text-destructive' : 
                metrics.metaphorDensity > 5 ? 'text-warning' : 'text-success'
              }`}>
                {metrics.metaphorDensity.toFixed(1)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-muted-foreground">Concept Load</div>
              <div className={`text-lg font-bold ${
                metrics.conceptualComplexity > 4 ? 'text-destructive' : 
                metrics.conceptualComplexity > 2 ? 'text-warning' : 'text-success'
              }`}>
                {metrics.conceptualComplexity}
              </div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-muted-foreground">Similarity</div>
              <div className={`text-lg font-bold ${
                metrics.semanticSimilarity > 0.7 ? 'text-destructive' : 
                metrics.semanticSimilarity > 0.5 ? 'text-warning' : 'text-success'
              }`}>
                {(metrics.semanticSimilarity * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {metrics.recommendation && (
        <Alert className={`${
          metrics.saturationRisk === 'high' ? 'border-destructive/50 bg-destructive/5' : 
          'border-warning/50 bg-warning/5'
        }`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Coherence Insight:</strong> {metrics.recommendation}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};