import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, TrendingUp, Zap, Crown, Brain } from "lucide-react";
import { useGlobalBrillianceDetection } from "@/hooks/useGlobalBrillianceDetection";

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  judge_scores?: any;
  generated_at: string;
}

interface GlobalBrillianceArchiveProps {
  answers: Answer[];
  currentStep: number;
  className?: string;
}

export const GlobalBrillianceArchive: React.FC<GlobalBrillianceArchiveProps> = ({
  answers,
  currentStep,
  className = ""
}) => {
  const metrics = useGlobalBrillianceDetection(answers);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'paradigmatic': return <Brain className="h-4 w-4" />;
      case 'practical': return <Zap className="h-4 w-4" />;
      case 'aesthetic': return <Sparkles className="h-4 w-4" />;
      case 'generative': return <TrendingUp className="h-4 w-4" />;
      default: return <Crown className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'paradigmatic': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'practical': return 'bg-green-100 text-green-800 border-green-200';
      case 'aesthetic': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'generative': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getBrillianceColor = (score: number) => {
    if (score >= 0.8) return 'text-crown';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  if (answers.length < 3) {
    return (
      <Card className={`border-crown/20 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-crown">
            <Crown className="h-5 w-5" />
            Global Brilliance Archive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Brilliance detection requires at least 3 steps to analyze patterns and insights.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Brilliance Score */}
      <Card className="border-crown/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-crown">
            <Crown className="h-5 w-5" />
            Global Brilliance Archive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Brilliance Score</span>
              <span className={`text-sm font-bold ${getBrillianceColor(metrics.overallBrillianceScore)}`}>
                {(metrics.overallBrillianceScore * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={metrics.overallBrillianceScore * 100} 
              className="h-2"
            />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-crown">{metrics.crownJewelInsights.length}</div>
              <div className="text-xs text-muted-foreground">Crown Jewels</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">{metrics.brillianceCascades.length}</div>
              <div className="text-xs text-muted-foreground">Cascades</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">{metrics.semanticBreakthroughs.length}</div>
              <div className="text-xs text-muted-foreground">Breakthroughs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crown Jewel Insights */}
      {metrics.crownJewelInsights.length > 0 && (
        <Card className="border-crown/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-crown text-lg">
              <Crown className="h-4 w-4" />
              Crown Jewel Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.crownJewelInsights.map((jewel, index) => (
              <div key={jewel.answerId} className="border border-crown/10 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getCategoryColor(jewel.category)}>
                      {getCategoryIcon(jewel.category)}
                      <span className="ml-1 capitalize">{jewel.category}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">Step {jewel.stepNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${getBrillianceColor(jewel.brillianceScore)}`}>
                      {(jewel.brillianceScore * 100).toFixed(0)}%
                    </span>
                    <Progress 
                      value={jewel.transformativePotential * 100} 
                      className="w-12 h-1"
                    />
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{jewel.extractedInsight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Brilliance Cascades */}
      {metrics.brillianceCascades.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 text-lg">
              <TrendingUp className="h-4 w-4" />
              Brilliance Cascades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.brillianceCascades.map((cascade, index) => (
              <div key={index} className="border border-orange-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Trigger: Step {cascade.triggerStep}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {cascade.cascadeSteps.length} steps affected
                    </span>
                  </div>
                  <div className="text-xs font-medium text-orange-600">
                    Momentum: {(cascade.momentum * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Cascade:</span>
                  {cascade.cascadeSteps.map((step, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {step}
                    </Badge>
                  ))}
                </div>
                <Progress value={cascade.conceptualNovelty * 100} className="h-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Semantic Breakthroughs */}
      {metrics.semanticBreakthroughs.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600 text-lg">
              <Sparkles className="h-4 w-4" />
              Semantic Breakthroughs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.semanticBreakthroughs.map((breakthrough, index) => (
              <div key={index} className="border border-purple-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Step {breakthrough.stepNumber}
                  </Badge>
                  <div className="text-xs font-medium text-purple-600">
                    Distance: {(breakthrough.conceptualDistance * 100).toFixed(0)}%
                  </div>
                </div>
                {breakthrough.novelCombinations.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Novel concepts:</span>
                    <div className="flex flex-wrap gap-1">
                      {breakthrough.novelCombinations.slice(0, 3).map((concept, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {concept}
                        </Badge>
                      ))}
                      {breakthrough.novelCombinations.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{breakthrough.novelCombinations.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <Progress value={breakthrough.paradigmShiftIntensity * 100} className="h-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hinge Points Alert */}
      {metrics.hingePoints.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Zap className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong>Hinge Points Detected:</strong> Steps {metrics.hingePoints.join(', ')} triggered 
            significant brilliance cascades. These may be crucial turning points in the exploration.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};