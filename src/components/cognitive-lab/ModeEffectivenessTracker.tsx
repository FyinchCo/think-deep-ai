import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useModeEffectivenessTracking } from '@/hooks/useModeEffectivenessTracking';

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  judge_scores?: any;
  generated_at: string;
}

interface ModeEffectivenessTrackerProps {
  answers: Answer[];
  currentRabbitHoleId: string;
  currentMode: 'single' | 'exploration' | 'grounding';
  coherenceMetrics?: {
    qualityTrend: 'improving' | 'declining' | 'stable';
    saturationRisk: 'low' | 'medium' | 'high';
    metaphorDensity: number;
    conceptualComplexity: number;
    semanticSimilarity: number;
  };
}

export const ModeEffectivenessTracker: React.FC<ModeEffectivenessTrackerProps> = ({
  answers,
  currentRabbitHoleId,
  currentMode,
  coherenceMetrics
}) => {
  const [effectivenessData, setEffectivenessData] = useState<any[]>([]);
  const [modeStats, setModeStats] = useState<{
    single: { count: number; avgCoherence: number; avgAbstraction: number };
    exploration: { count: number; avgCoherence: number; avgAbstraction: number };
    grounding: { count: number; avgCoherence: number; avgAbstraction: number };
  }>({
    single: { count: 0, avgCoherence: 0, avgAbstraction: 0 },
    exploration: { count: 0, avgCoherence: 0, avgAbstraction: 0 },
    grounding: { count: 0, avgCoherence: 0, avgAbstraction: 0 }
  });

  const { 
    logModeTransition, 
    logModeEffectiveness, 
    calculateAbstractionLevel, 
    queryModeEffectiveness 
  } = useModeEffectivenessTracking();

  // Load effectiveness data on mount
  useEffect(() => {
    const loadEffectivenessData = async () => {
      if (currentRabbitHoleId) {
        const data = await queryModeEffectiveness(currentRabbitHoleId);
        setEffectivenessData(data);
        calculateModeStats(data);
      }
    };
    
    loadEffectivenessData();
  }, [currentRabbitHoleId, queryModeEffectiveness]);

  // Track mode transitions when currentMode changes
  useEffect(() => {
    const trackModeTransition = async () => {
      if (answers.length > 0 && currentRabbitHoleId) {
        const latestAnswer = answers[answers.length - 1];
        const coherenceBefore = coherenceMetrics ? 
          (coherenceMetrics.metaphorDensity + coherenceMetrics.conceptualComplexity + coherenceMetrics.semanticSimilarity) / 3 : 
          undefined;
        
        const abstractionLevel = await calculateAbstractionLevel(latestAnswer.answer_text);
        
        await logModeTransition({
          step_id: latestAnswer.id,
          rabbit_hole_id: currentRabbitHoleId,
          mode: currentMode,
          coherence_before: coherenceBefore,
          abstraction_level: abstractionLevel,
          transition_reason: 'user_selected'
        });
      }
    };

    trackModeTransition();
  }, [currentMode, currentRabbitHoleId, answers, coherenceMetrics, logModeTransition, calculateAbstractionLevel]);

  const calculateModeStats = (data: any[]) => {
    const stats = {
      single: { count: 0, avgCoherence: 0, avgAbstraction: 0 },
      exploration: { count: 0, avgCoherence: 0, avgAbstraction: 0 },
      grounding: { count: 0, avgCoherence: 0, avgAbstraction: 0 }
    };

    const modeData = {
      single: [] as number[][],
      exploration: [] as number[][],
      grounding: [] as number[][]
    };

    data.forEach(event => {
      if (event.event_type === 'mode_transition' && event.payload?.mode) {
        const mode = event.payload.mode as keyof typeof stats;
        if (stats[mode]) {
          stats[mode].count++;
          
          if (event.payload.coherence_before !== undefined) {
            modeData[mode].push([
              event.payload.coherence_before || 0,
              event.payload.abstraction_level || 0
            ]);
          }
        }
      }
    });

    // Calculate averages
    Object.keys(modeData).forEach(mode => {
      const modeKey = mode as keyof typeof stats;
      const data = modeData[modeKey];
      if (data.length > 0) {
        stats[modeKey].avgCoherence = data.reduce((sum, [coherence]) => sum + coherence, 0) / data.length;
        stats[modeKey].avgAbstraction = data.reduce((sum, [_, abstraction]) => sum + abstraction, 0) / data.length;
      }
    });

    setModeStats(stats);
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'single': return 'bg-blue-500';
      case 'exploration': return 'bg-green-500';
      case 'grounding': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEffectivenessIcon = (coherence: number) => {
    if (coherence > 0.7) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (coherence < 0.3) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-yellow-500" />;
  };

  if (answers.length < 3) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Mode effectiveness tracking requires at least 3 steps</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Mode Effectiveness Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(modeStats).map(([mode, stats]) => (
            <div key={mode} className="text-center">
              <div className={`h-2 w-full rounded-full ${getModeColor(mode)} mb-2`} />
              <Badge variant="outline" className="text-xs capitalize mb-1">
                {mode}
              </Badge>
              <div className="space-y-1">
                <div className="text-sm font-medium">{stats.count} uses</div>
                {stats.count > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground">
                      Coherence: {(stats.avgCoherence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Abstraction: {(stats.avgAbstraction * 100).toFixed(0)}%
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {coherenceMetrics && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Session Coherence</span>
              {getEffectivenessIcon(
                (coherenceMetrics.metaphorDensity + coherenceMetrics.conceptualComplexity + coherenceMetrics.semanticSimilarity) / 3
              )}
            </div>
            <Progress 
              value={((coherenceMetrics.metaphorDensity + coherenceMetrics.conceptualComplexity + coherenceMetrics.semanticSimilarity) / 3) * 100}
              className="h-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Quality trend: {coherenceMetrics.qualityTrend} • Risk: {coherenceMetrics.saturationRisk}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Tracking mode transitions and effectiveness for optimization insights
        </div>
      </CardContent>
    </Card>
  );
};