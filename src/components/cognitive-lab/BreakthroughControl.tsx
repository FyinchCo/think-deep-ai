import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  Brain, 
  Sparkles, 
  Target, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useBreakthroughDetection } from '@/hooks/useBreakthroughDetection';

interface BreakthroughControlProps {
  rabbitHoleId?: string;
  currentStep: number;
  answers: any[];
  onModeActivated?: (mode: string) => void;
}

export const BreakthroughControl: React.FC<BreakthroughControlProps> = ({
  rabbitHoleId,
  currentStep,
  answers,
  onModeActivated
}) => {
  const {
    currentMode,
    questionArchitecture,
    detectedShifts,
    cascadeDetected,
    breakthroughReadiness,
    isAnalyzing,
    activateBreakthroughMode,
    deactivateBreakthroughMode,
    checkBreakthroughReadiness
  } = useBreakthroughDetection(rabbitHoleId);

  React.useEffect(() => {
    if (answers.length > 0) {
      checkBreakthroughReadiness(answers);
    }
  }, [answers, checkBreakthroughReadiness]);

  const handleActivateMode = async (
    modeType: 'cascade' | 'paradigm_shift' | 'productive_chaos',
    reason: string
  ) => {
    const mode = await activateBreakthroughMode(modeType, currentStep, reason);
    if (mode && onModeActivated) {
      onModeActivated(modeType);
    }
  };

  const getModeIcon = (type: string) => {
    switch (type) {
      case 'cascade': return <Zap className="w-4 h-4" />;
      case 'paradigm_shift': return <Brain className="w-4 h-4" />;
      case 'productive_chaos': return <Sparkles className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getModeColor = (type: string) => {
    switch (type) {
      case 'cascade': return 'bg-amber-500';
      case 'paradigm_shift': return 'bg-purple-500';
      case 'productive_chaos': return 'bg-pink-500';
      default: return 'bg-blue-500';
    }
  };

  const getReadinessLevel = () => {
    if (breakthroughReadiness >= 0.8) return { level: 'Critical', color: 'text-red-500' };
    if (breakthroughReadiness >= 0.6) return { level: 'High', color: 'text-orange-500' };
    if (breakthroughReadiness >= 0.4) return { level: 'Medium', color: 'text-yellow-500' };
    return { level: 'Low', color: 'text-green-500' };
  };

  const readiness = getReadinessLevel();

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-primary" />
          Breakthrough Control System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Mode Status */}
        {currentMode ? (
          <div className="p-3 rounded-lg bg-secondary/50 border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getModeIcon(currentMode.mode_type)}
                <span className="font-semibold capitalize">
                  {currentMode.mode_type.replace('_', ' ')} Mode
                </span>
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={deactivateBreakthroughMode}
                className="text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                Deactivate
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentMode.trigger_reason}
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              Activated at step {currentMode.trigger_step}
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-muted-foreground">
            <Target className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <div className="text-sm">Normal exploration mode</div>
          </div>
        )}

        {/* Breakthrough Readiness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Breakthrough Readiness</span>
            <span className={`text-sm font-bold ${readiness.color}`}>
              {readiness.level}
            </span>
          </div>
          <Progress value={breakthroughReadiness * 100} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {Math.round(breakthroughReadiness * 100)}% - Based on recent momentum and complexity
          </div>
        </div>

        {/* Question Architecture */}
        {questionArchitecture && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Question Architecture</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Temporal:</span>
                <span>{Math.round(questionArchitecture.temporal_displacement_score * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Inversion:</span>
                <span>{Math.round(questionArchitecture.assumption_inversion_score * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Meta-cognitive:</span>
                <span>{Math.round(questionArchitecture.meta_cognitive_score * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Paradox:</span>
                <span>{Math.round(questionArchitecture.constraint_paradox_score * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Detected Paradigm Shifts */}
        {detectedShifts.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recent Paradigm Shifts
            </div>
            <div className="space-y-1">
              {detectedShifts.slice(-3).map((shift, index) => (
                <div key={index} className="text-xs p-2 rounded bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">{shift.shift_type}</span>
                    <span className="text-primary font-bold">
                      {Math.round(shift.intensity_score * 100)}%
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    Worldview alteration: {Math.round(shift.worldview_alteration_potential * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Breakthrough Mode Controls */}
        {!currentMode && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Activate Breakthrough Mode</div>
            
            <div className="grid gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleActivateMode('cascade', 'Manual activation for breakthrough cascade')}
                className="justify-start text-left"
                disabled={isAnalyzing}
              >
                <Zap className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">Cascade Mode</div>
                  <div className="text-xs text-muted-foreground">
                    Productive chaos for 2-3 steps
                  </div>
                </div>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleActivateMode('paradigm_shift', 'Manual activation for paradigm shift')}
                className="justify-start text-left"
                disabled={isAnalyzing}
              >
                <Brain className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">Paradigm Shift</div>
                  <div className="text-xs text-muted-foreground">
                    Target fundamental assumptions
                  </div>
                </div>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleActivateMode('productive_chaos', 'Manual activation for productive chaos')}
                className="justify-start text-left"
                disabled={isAnalyzing}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">Productive Chaos</div>
                  <div className="text-xs text-muted-foreground">
                    Abandon coherence temporarily
                  </div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Cascade Detection Alert */}
        {cascadeDetected && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Breakthrough Cascade Detected!</span>
            </div>
            <p className="text-sm mt-1 text-amber-600/80">
              High potential for paradigm-shifting insights. Consider activating breakthrough mode.
            </p>
          </div>
        )}

        {/* Auto-activation suggestions */}
        {breakthroughReadiness >= 0.7 && !currentMode && !cascadeDetected && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">High Breakthrough Potential</span>
            </div>
            <p className="text-sm mt-1 text-blue-600/80">
              Current trajectory shows high breakthrough readiness. Consider activating a breakthrough mode.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};