import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, Settings, CheckCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
interface AutoRunControlsProps {
  isProcessing: boolean;
  onGenerateStep: () => Promise<void>;
  onGeneratePanelStep: () => Promise<void>;
  onGenerateGroundingStep: () => Promise<void>;
  currentStep: number;
  isAutoRunning: boolean;
  onAutoRunChange: (running: boolean) => void;
  generationMode: 'single' | 'exploration' | 'grounding' | 'cycling' | 'devils_advocate' | 'full_cycle';
  onGenerationModeChange: (mode: 'single' | 'exploration' | 'grounding' | 'cycling' | 'devils_advocate' | 'full_cycle') => void;
  researchMode: boolean;
  earlyStopEnabled: boolean;
  onEarlyStopChange: (v: boolean) => void;
  onResearchModeChange: (v: boolean) => void;
  rabbitHoleId?: string;
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
  onResearchModeChange,
  rabbitHoleId
}) => {
  const [targetSteps, setTargetSteps] = useState(5);
  const [delayBetweenSteps, setDelayBetweenSteps] = useState(3);
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [autoRunStartStep, setAutoRunStartStep] = useState(0);
  const [cyclePosition, setCyclePosition] = useState(0); // Track position in cycle
  const [cycleStep, setCycleStep] = useState<'single' | 'exploration' | 'grounding'>('single');
  const [p2Rounds, setP2Rounds] = useState(3);
  const [autoSelectEnabled, setAutoSelectEnabled] = useState(true);
  const { toast } = useToast();
  const { session } = useAuth();
  const canScheduleFullCycle = Boolean(session && rabbitHoleId);

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

  const scheduleFullCycle = async () => {
    try {
      if (!rabbitHoleId) {
        toast({ title: 'No session found', description: 'Start or load a rabbit hole first.', variant: 'destructive' });
        return;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) {
        toast({ title: 'Authentication required', description: 'Please sign in to schedule a run.', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('automation_runs').insert({
        user_id: uid,
        rabbit_hole_id: rabbitHoleId,
        status: 'active',
        phase: 'phase1',
        p1_target_steps: targetSteps,
        p1_delay_sec: delayBetweenSteps,
        p1_early_stop: earlyStopEnabled,
        research_mode_p1: researchMode,
        p2_rounds: p2Rounds,
        research_mode_p2: researchMode,
        next_run_at: new Date().toISOString()
      });
      if (error) {
        toast({ title: 'Failed to schedule', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Full Cycle scheduled', description: 'The orchestrator will now run Phase 1 → Phase 2 unattended.' });
      }
    } catch (e: any) {
      toast({ title: 'Unexpected error', description: e?.message || 'Failed to schedule', variant: 'destructive' });
    }
  };

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
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="full-cycle-mode"
                      value="full_cycle"
                      checked={generationMode === 'full_cycle'}
                      onChange={() => onGenerationModeChange('full_cycle')}
                      disabled={isAutoRunning}
                      className="w-4 h-4"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="full-cycle-mode" className="text-sm font-medium cursor-pointer">Full Cycle (Unattended)</Label>
                      <p className="text-xs text-muted-foreground">Phase 1 auto-run → auto Phase 2 grounding via orchestrator</p>
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
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="p2Rounds">P2 Rounds</Label>
                    <p className="text-xs text-muted-foreground">Number of grounding loops after Phase 1</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">loops</Badge>
                    <Input
                      id="p2Rounds"
                      type="number"
                      min="1"
                      max="5"
                      value={p2Rounds}
                      onChange={(e) => setP2Rounds(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                      disabled={isAutoRunning}
                      className="w-20 text-right"
                    />
                  </div>
                </div>
              </div>
            </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center justify-between py-1">
              <Label className="text-xs">Research-Grounded Mode</Label>
              <Switch checked={researchMode} onCheckedChange={onResearchModeChange} disabled={isProcessing} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Auto-select “Most Interesting”</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline">formula</Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">score = 0.7*novelty + 0.3*support; ties: testability, then older created_at; floor: novelty ≥ 6 and support ≥ 5</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch checked={autoSelectEnabled} onCheckedChange={setAutoSelectEnabled} disabled={isProcessing} />
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
                    {generationMode === 'full_cycle' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex-1">
                              <Button
                                onClick={scheduleFullCycle}
                                disabled={!canScheduleFullCycle || isProcessing}
                                variant="secondary"
                                className="w-full"
                              >
                                Schedule Full Cycle
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!canScheduleFullCycle && (
                            <TooltipContent>
                              <p>{!session ? 'Sign in to schedule a run' : 'Open or create a rabbit hole first'}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    )}
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