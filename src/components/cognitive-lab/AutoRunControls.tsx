import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, Settings } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface AutoRunControlsProps {
  isProcessing: boolean;
  onGenerateStep: () => Promise<void>;
  onGeneratePanelStep: () => Promise<void>;
  currentStep: number;
  isAutoRunning: boolean;
  onAutoRunChange: (running: boolean) => void;
  isPanelMode: boolean;
  onPanelModeChange: (panelMode: boolean) => void;
}

export const AutoRunControls: React.FC<AutoRunControlsProps> = ({
  isProcessing,
  onGenerateStep,
  onGeneratePanelStep,
  currentStep,
  isAutoRunning,
  onAutoRunChange,
  isPanelMode,
  onPanelModeChange
}) => {
  const [targetSteps, setTargetSteps] = useState(5);
  const [delayBetweenSteps, setDelayBetweenSteps] = useState(3);
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [autoRunStartStep, setAutoRunStartStep] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAutoRunning && !isProcessing) {
      if (stepsCompleted < targetSteps) {
        interval = setTimeout(async () => {
          if (isPanelMode) {
            await onGeneratePanelStep();
          } else {
            await onGenerateStep();
          }
          setStepsCompleted(prev => prev + 1);
        }, delayBetweenSteps * 1000);
      } else {
        // Auto-run completed
        onAutoRunChange(false);
        setStepsCompleted(0);
      }
    }

    return () => {
      if (interval) clearTimeout(interval);
    };
  }, [isAutoRunning, isProcessing, stepsCompleted, targetSteps, delayBetweenSteps, onGenerateStep, onAutoRunChange]);

  const startAutoRun = () => {
    setAutoRunStartStep(currentStep);
    setStepsCompleted(0);
    onAutoRunChange(true);
  };

  const pauseAutoRun = () => {
    onAutoRunChange(false);
  };

  const stopAutoRun = () => {
    onAutoRunChange(false);
    setStepsCompleted(0);
  };

  const progress = targetSteps > 0 ? (stepsCompleted / targetSteps) * 100 : 0;

  return (
    <Card className="border-2 border-neural/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5 text-neural" />
            Auto-Run Controls
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleContent className="space-y-4 pb-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg border-neural/20">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Generation Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {isPanelMode ? 'Multi-Agent Panel: 5 specialized agents debate and synthesize responses' : 'Single Perspective: Traditional single-agent exploration'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Single</span>
                  <Switch
                    checked={isPanelMode}
                    onCheckedChange={onPanelModeChange}
                    disabled={isAutoRunning}
                  />
                  <span className="text-xs text-muted-foreground">Panel</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetSteps">Target Steps</Label>
                <Input
                  id="targetSteps"
                  type="number"
                  min="1"
                  max="20"
                  value={targetSteps}
                  onChange={(e) => setTargetSteps(parseInt(e.target.value) || 1)}
                  disabled={isAutoRunning}
                />
              </div>
              <div>
                <Label htmlFor="delay">Delay (seconds)</Label>
                <Input
                  id="delay"
                  type="number"
                  min="1"
                  max="30"
                  value={delayBetweenSteps}
                  onChange={(e) => setDelayBetweenSteps(parseInt(e.target.value) || 1)}
                  disabled={isAutoRunning}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {isAutoRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress: {stepsCompleted} / {targetSteps}</span>
              <Badge variant="secondary">
                Step {currentStep}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {isProcessing ? 'Generating step...' : `Next step in ${delayBetweenSteps}s`}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            {!isAutoRunning ? (
              <>
                <Button
                  onClick={startAutoRun}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Auto-Run ({isPanelMode ? 'Panel' : 'Single'})
                </Button>
                <Button
                  onClick={isPanelMode ? onGeneratePanelStep : onGenerateStep}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                >
                  Generate 1 Step
                </Button>
              </>
            ) : (
            <>
              <Button
                onClick={pauseAutoRun}
                variant="outline"
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button
                onClick={stopAutoRun}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Auto-run will generate {targetSteps} {isPanelMode ? 'panel-debated' : 'single-perspective'} steps with {delayBetweenSteps} second delays between each step.
        </p>
      </CardContent>
    </Card>
  );
};