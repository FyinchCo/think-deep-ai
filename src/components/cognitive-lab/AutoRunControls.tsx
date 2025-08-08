import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, Settings, CheckCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface AutoRunControlsProps {
  isProcessing: boolean;
  onGenerateStep: () => Promise<void>;
  onGeneratePanelStep: () => Promise<void>;
  onGenerateGroundingStep: () => Promise<void>;
  currentStep: number;
  isAutoRunning: boolean;
  onAutoRunChange: (running: boolean) => void;
  generationMode: 'single' | 'exploration' | 'grounding' | 'cycling' | 'devils_advocate';
  onGenerationModeChange: (mode: 'single' | 'exploration' | 'grounding' | 'cycling' | 'devils_advocate') => void;
  researchMode: boolean;
  earlyStopEnabled: boolean;
  onEarlyStopChange: (v: boolean) => void;
  onResearchModeChange: (v: boolean) => void;
}

export const AutoRunControls: React.FC<AutoRunControlsProps> = ({
  isProcessing,
  onGenerateStep,
  onGeneratePanelStep,
  onGenerateGroundingStep,
  currentStep,
  isAutoRunning,
  onAutoRunChange,
  generationMode,
  onGenerationModeChange,
  researchMode,
  earlyStopEnabled,
  onEarlyStopChange,
  onResearchModeChange
}) => {
  const [targetSteps, setTargetSteps] = useState(5);
  const [delayBetweenSteps, setDelayBetweenSteps] = useState(3);
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [autoRunStartStep, setAutoRunStartStep] = useState(0);
  const [cyclePosition, setCyclePosition] = useState(0); // Track position in cycle
  const [cycleStep, setCycleStep] = useState<'single' | 'exploration' | 'grounding'>('single');

  // Determine current mode for cycling
  const getCurrentMode = () => {
    if (generationMode !== 'cycling') return generationMode;
    
    const pos = cyclePosition % 25; // Full cycle is 25 steps
    if (pos < 8) return 'single';         // 0-7: Single
    if (pos < 10) return 'exploration';   // 8-9: Discovery/Exploration  
    if (pos < 18) return 'single';        // 10-17: Single
    if (pos < 20) return 'grounding';     // 18-19: Grounding
    if (pos < 22) return 'devils_advocate'; // 20-21: Devil's Advocate
    return 'single';                      // 22-24: Single
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAutoRunning && !isProcessing) {
      if (stepsCompleted < targetSteps) {
        interval = setTimeout(async () => {
          const currentMode = getCurrentMode();
          
          if (currentMode === 'exploration') {
            await onGeneratePanelStep();
          } else if (currentMode === 'grounding') {
            await onGenerateGroundingStep();
          } else if (currentMode === 'devils_advocate') {
            await onGenerateStep();
          } else {
            await onGenerateStep();
          }
          
          setStepsCompleted(prev => prev + 1);
          if (generationMode === 'cycling') {
            setCyclePosition(prev => prev + 1);
          }
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
  }, [isAutoRunning, isProcessing, stepsCompleted, targetSteps, delayBetweenSteps, cyclePosition, generationMode, onGenerateStep, onGeneratePanelStep, onGenerateGroundingStep, onAutoRunChange]);

  const startAutoRun = () => {
    setAutoRunStartStep(currentStep);
    setStepsCompleted(0);
    if (generationMode === 'cycling') {
      setCyclePosition(0); // Reset cycle
    }
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
              <div className="space-y-3 p-3 border rounded-lg border-neural/20">
                <Label className="text-sm font-medium">Generation Mode</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="single-mode"
                      value="single"
                      checked={generationMode === 'single'}
                      onChange={() => onGenerationModeChange('single')}
                      disabled={isAutoRunning}
                      className="w-4 h-4"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="single-mode" className="text-sm font-medium cursor-pointer">Single Perspective</Label>
                      <p className="text-xs text-muted-foreground">Traditional single-agent exploration</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="exploration-mode"
                      value="exploration"
                      checked={generationMode === 'exploration'}
                      onChange={() => onGenerationModeChange('exploration')}
                      disabled={isAutoRunning}
                      className="w-4 h-4"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="exploration-mode" className="text-sm font-medium cursor-pointer">Exploration Panel</Label>
                      <p className="text-xs text-muted-foreground">Multi-agent philosophical debate for deep exploration</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="grounding-mode"
                      value="grounding"
                      checked={generationMode === 'grounding'}
                      onChange={() => onGenerationModeChange('grounding')}
                      disabled={isAutoRunning}
                      className="w-4 h-4"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="grounding-mode" className="text-sm font-medium cursor-pointer">Grounding Panel</Label>
                      <p className="text-xs text-muted-foreground">Multi-agent focus on practical clarity and real-world applications</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="devils-advocate-mode"
                      value="devils_advocate"
                      checked={generationMode === 'devils_advocate'}
                      onChange={() => onGenerationModeChange('devils_advocate')}
                      disabled={isAutoRunning}
                      className="w-4 h-4"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="devils-advocate-mode" className="text-sm font-medium cursor-pointer">Devil's Advocate</Label>
                      <p className="text-xs text-muted-foreground">Challenge breakthrough ideas with skeptical counterarguments</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="cycling-mode"
                      value="cycling"
                      checked={generationMode === 'cycling'}
                      onChange={() => onGenerationModeChange('cycling')}
                      disabled={isAutoRunning}
                      className="w-4 h-4"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="cycling-mode" className="text-sm font-medium cursor-pointer">Cycling Mode</Label>
                      <p className="text-xs text-muted-foreground">8 Single → 2 Discovery → 8 Single → 2 Grounding → 2 Devil's Advocate → 3 Single → repeat</p>
                    </div>
                  </div>
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

            <div className="flex items-center justify-between py-1">
              <Label className="text-xs">Research-Grounded Mode</Label>
              <Switch checked={researchMode} onCheckedChange={onResearchModeChange} disabled={isProcessing} />
            </div>

            {isAutoRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress: {stepsCompleted} / {targetSteps}</span>
                  <Badge variant="secondary">
                    Step {currentStep}
                  </Badge>
                </div>
                {generationMode === 'cycling' && (
                   <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cycle Mode: {getCurrentMode()}</span>
                    <span>Cycle Step: {(cyclePosition % 25) + 1}/25</span>
                  </div>
                )}
                {researchMode && (
                  <div className="flex items-center gap-2 text-xs text-neural">
                    <CheckCircle className="h-3 w-3" />
                    Research-Grounded Mode Active
                  </div>
                )}
                <div className="flex items-center justify-between py-1">
                  <Label className="text-xs">Early Stop on Convergence</Label>
                  <Switch checked={earlyStopEnabled} onCheckedChange={onEarlyStopChange} disabled={isProcessing} />
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
                      Start Auto-Run ({generationMode === 'cycling' ? 'Cycling' : generationMode === 'exploration' ? 'Exploration' : generationMode === 'grounding' ? 'Grounding' : generationMode === 'devils_advocate' ? 'Devil\'s Advocate' : 'Single'})
                    </Button>
                    <Button
                      onClick={generationMode === 'exploration' ? onGeneratePanelStep : generationMode === 'grounding' ? onGenerateGroundingStep : generationMode === 'devils_advocate' ? onGenerateStep : onGenerateStep}
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
              Auto-run will generate {targetSteps} {generationMode === 'cycling' ? 'steps cycling through modes (8 Single → 2 Discovery → 8 Single → 2 Grounding → 2 Devil\'s Advocate → 3 Single)' : generationMode === 'exploration' ? 'exploration panel' : generationMode === 'grounding' ? 'grounding panel' : generationMode === 'devils_advocate' ? 'devil\'s advocate' : 'single-perspective'} steps with {delayBetweenSteps} second delays between each step.
            </p>
          </CardContent>
        </Card>
      );
    };