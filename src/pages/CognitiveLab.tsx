import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Brain, Zap, Target, CheckCircle, XCircle, RotateCcw, List, BarChart3, Eye, EyeOff, Download, FileText, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CollapsibleStep } from '@/components/cognitive-lab/CollapsibleStep';
import { ExportTools } from '@/components/cognitive-lab/ExportTools';
import { AutoRunControls } from '@/components/cognitive-lab/AutoRunControls';
import { AnalyticsDashboard } from '@/components/cognitive-lab/AnalyticsDashboard';
import { SearchAndFilter } from '@/components/cognitive-lab/SearchAndFilter';
import { CoherenceMonitor } from '@/components/cognitive-lab/CoherenceMonitor';
import { MetricHeartbeat } from '@/components/cognitive-lab/MetricHeartbeat';
import { PruningRitual } from '@/components/cognitive-lab/PruningRitual';
import { useCoherenceTracking } from "@/hooks/useCoherenceTracking";
import { useBrillianceDetection } from "@/hooks/useBrillianceDetection";
import { useMetricTracking } from "@/hooks/useMetricTracking";
import { useGlobalBrillianceDetection } from "@/hooks/useGlobalBrillianceDetection";
import { BrillianceMonitor } from "@/components/cognitive-lab/BrillianceMonitor";
import { GlobalBrillianceArchive } from "@/components/cognitive-lab/GlobalBrillianceArchive";
import { RulesPanel } from "@/components/cognitive-lab/RulesPanel";
import { useExplorationRules } from "@/hooks/useExplorationRules";
import { ModeEffectivenessTracker } from "@/components/cognitive-lab/ModeEffectivenessTracker";
import { useBreakthroughDetection } from "@/hooks/useBreakthroughDetection";
import { BreakthroughControl } from "@/components/cognitive-lab/BreakthroughControl";

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  is_valid: boolean;
  judge_scores?: any; // Using any to handle the JSONB type from Supabase
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

const CognitiveLab = () => {
  const [question, setQuestion] = useState('');
  const [currentRabbitHole, setCurrentRabbitHole] = useState<RabbitHole | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [generationMode, setGenerationMode] = useState<'single' | 'exploration' | 'grounding' | 'cycling' | 'devils_advocate'>('single');
  const [researchMode, setResearchMode] = useState(false);
  const [bookmarkedSteps, setBookmarkedSteps] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('exploration');
  const [showCoherenceMonitor, setShowCoherenceMonitor] = useState(true);
  const [brillianceModeActive, setBrillianceModeActive] = useState(false);
  const [isGeneratingBrilliance, setIsGeneratingBrilliance] = useState(false);
  const [rules, setRules] = useState([]);
  const [earlyStopEnabled, setEarlyStopEnabled] = useState(true);
  const { toast } = useToast();

  // Rules integration
  const explorationRules = useExplorationRules(
    currentRabbitHole?.id || '', 
    currentRabbitHole?.total_steps || 0
  );

  const filterAnswers = () => {
    let filtered = answers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(answer =>
        answer.answer_text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Score filter
    if (scoreFilter !== 'all' && filtered.length > 0) {
      filtered = filtered.filter(answer => {
        if (!answer.judge_scores) return false;
        const avgScore = (answer.judge_scores.novelty + answer.judge_scores.depth) / 2;
        
        switch (scoreFilter) {
          case 'high': return avgScore >= 8;
          case 'medium': return avgScore >= 6 && avgScore < 8;
          case 'low': return avgScore < 6;
          case 'breakthrough': return answer.judge_scores.breakthrough_potential >= 7;
          default: return true;
        }
      });
    }

    // Bookmarked filter
    if (bookmarkedOnly) {
      filtered = filtered.filter(answer => bookmarkedSteps.has(answer.id));
    }

    return filtered;
  };

  const filteredAnswers = filterAnswers();
  const coherenceMetrics = useCoherenceTracking(filteredAnswers);
  const brillianceMetrics = useBrillianceDetection(filteredAnswers);
  const globalBrillianceMetrics = useGlobalBrillianceDetection(answers);
  const { heartbeatMetrics, conceptUsage, lastPruningStep, updateMetrics, pruneConcepts } = useMetricTracking();
  const breakthroughDetection = useBreakthroughDetection(currentRabbitHole?.id);

  // Update metrics when answers change
  useEffect(() => {
    updateMetrics(answers);
  }, [answers, updateMetrics]);

  const philosophySuggestions = [
    "What is the nature of consciousness and how does it emerge from physical processes?",
    "If free will is an illusion, what are the implications for moral responsibility?",
    "What makes a life worth living when we know it will inevitably end?",
    "How do we distinguish between knowledge and belief in an age of information overload?",
    "What role should suffering play in human existence and personal growth?"
  ];

  // Load recent session on mount
  useEffect(() => {
    loadRecentSession();
  }, []);

  useEffect(() => {
    if (currentRabbitHole) {
      loadAnswers();
    }
  }, [currentRabbitHole]);

  const loadRecentSession = async () => {
    try {
      const { data: recentHoles, error } = await supabase
        .from('rabbit_holes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (recentHoles && recentHoles.length > 0) {
        const recentHole = recentHoles[0];
        setCurrentRabbitHole(recentHole);
        setQuestion(recentHole.initial_question);
        
        // Analyze question architecture for breakthrough detection
        if (recentHole.initial_question) {
          breakthroughDetection.analyzeQuestionArchitecture(recentHole.initial_question);
        }
        
        toast({
          title: 'Session Restored',
          description: `Continuing from step ${recentHole.total_steps}`,
        });
      }
    } catch (error) {
      console.error('Error loading recent session:', error);
    }
  };

  const loadAnswers = async () => {
    if (!currentRabbitHole) return;

    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('rabbit_hole_id', currentRabbitHole.id)
        .eq('is_valid', true)
        .order('step_number', { ascending: true });

      if (error) throw error;
      setAnswers(data || []);
    } catch (error) {
      console.error('Error loading answers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load answers',
        variant: 'destructive',
      });
    }
  };

  const { user } = useAuth();

  const startRabbitHole = async () => {
    if (!question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a question to explore',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to start an exploration',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Create rabbit hole
      const { data: rabbitHole, error: rhError } = await supabase
        .from('rabbit_holes')
        .insert({
          initial_question: question,
          domain: 'philosophy',
          status: 'active',
          user_id: user.id
        })
        .select()
        .single();

      if (rhError) throw rhError;

      setCurrentRabbitHole(rabbitHole);

      // Analyze question architecture for breakthrough detection
      breakthroughDetection.analyzeQuestionArchitecture(question);

      // Generate first step based on selected mode
      const functionName = generationMode === 'exploration' ? 'panel-step' : 
                        generationMode === 'grounding' ? 'grounding-panel-step' : 
                        'rabbit-hole-step';
      const body = generationMode === 'exploration' || generationMode === 'grounding'
        ? { rabbit_hole_id: rabbitHole.id, research_mode: researchMode }
        : generationMode === 'devils_advocate'
        ? { rabbit_hole_id: rabbitHole.id, action_type: 'start', generation_mode: 'devils_advocate', research_mode: researchMode }
        : { rabbit_hole_id: rabbitHole.id, action_type: 'start', research_mode: researchMode };
      
      const response = await supabase.functions.invoke(functionName, { body });

      if (response.error) throw response.error;

      const result = response.data;
      
      if (result.success) {
        // Update rabbit hole with step count first
        setCurrentRabbitHole(prev => prev ? {
          ...prev,
          total_steps: 1,
          status: 'active'
        } : null);
        
        // Force reload answers with a delay to ensure database consistency
        setTimeout(async () => {
          await loadAnswers();
        }, 1500);
        
        toast({
          title: 'Success!',
          description: generationMode === 'exploration'
            ? 'Your multi-agent philosophical exploration has begun'
            : generationMode === 'grounding'
            ? 'Your multi-agent grounding exploration has begun'
            : generationMode === 'devils_advocate'
            ? 'Your devil\'s advocate exploration has begun'
            : 'Your philosophical exploration has begun',
        });
      } else {
        toast({
          title: 'Generation Failed',
          description: result.error || 'Failed to generate first insight',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error starting rabbit hole:', error);
      toast({
        title: 'Error',
        description: 'Failed to start exploration',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePanelStep = async () => {
    if (!currentRabbitHole || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Add timeout and retry logic for better reliability
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Function call timed out')), 120000) // 2 minute timeout
      );
      
      const functionPromise = supabase.functions.invoke('panel-step', {
        body: { rabbit_hole_id: currentRabbitHole.id, research_mode: researchMode }
      });
      
      const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Panel step generation error:', error);
        toast({
          title: "Exploration Panel Failed",
          description: error.message || "Failed to generate exploration panel step",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.answer) {
        // Force a small delay to ensure database consistency
        setTimeout(async () => {
          await loadAnswers();
        }, 1000);
        
        // Update rabbit hole stats
        setCurrentRabbitHole(prev => prev ? {
          ...prev,
          total_steps: data.answer.step_number,
          status: 'active'
        } : null);
        
        toast({
          title: "Exploration Panel Generated",
          description: `Multi-agent exploration debate completed for step ${data.answer.step_number}`,
        });
      }
    } catch (error) {
      console.error('Exploration panel error:', error);
      toast({
        title: "Exploration Panel Error",
        description: "An unexpected error occurred during exploration panel generation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateGroundingStep = async () => {
    if (!currentRabbitHole || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Add timeout and retry logic for better reliability - grounding panel needs longer timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Function call timed out')), 600000) // 10 minute timeout for resilience
      );
      
      const functionPromise = supabase.functions.invoke('grounding-panel-step', {
        body: { rabbit_hole_id: currentRabbitHole.id, research_mode: researchMode }
      });
      
      const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Grounding panel generation error:', error);
        toast({
          title: "Grounding Panel Failed",
          description: error.message || "Failed to generate grounding panel step",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.answer) {
        // Force a small delay to ensure database consistency
        setTimeout(async () => {
          await loadAnswers();
        }, 1000);
        
        // Update rabbit hole stats
        setCurrentRabbitHole(prev => prev ? {
          ...prev,
          total_steps: data.answer.step_number,
          status: 'active'
        } : null);
        
        toast({
          title: "Grounding Panel Generated",
          description: `Multi-agent grounding synthesis completed for step ${data.answer.step_number}`,
        });
      }
    } catch (error) {
      console.error('Grounding panel error:', error);
      toast({
        title: "Grounding Panel Error",
        description: "An unexpected error occurred during grounding panel generation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateNextStep = async () => {
    if (!currentRabbitHole) return;

    setIsProcessing(true);
    try {
      // Add timeout and retry logic for better reliability  
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Function call timed out')), 600000) // 10 minute timeout for resilience
      );
      
      const functionPromise = supabase.functions.invoke('rabbit-hole-step', {
        body: { 
          rabbit_hole_id: currentRabbitHole.id, 
          action_type: 'next_step',
          generation_mode: generationMode === 'devils_advocate' ? 'devils_advocate' : undefined,
          research_mode: researchMode
        },
      });
      
      const response = await Promise.race([functionPromise, timeoutPromise]) as any;

      if (response.error) throw response.error;

      const result = response.data;
      
      if (result.success) {
        // Force a small delay to ensure database consistency
        setTimeout(async () => {
          await loadAnswers();
        }, 1000);
        // Update rabbit hole stats
        setCurrentRabbitHole(prev => prev ? {
          ...prev,
          total_steps: result.answer.step_number,
          status: 'active'
        } : null);
        
        toast({
          title: 'New Insight Generated!',
          description: `Step ${result.answer.step_number} added to your exploration`,
        });
      } else {
        // Handle stalled state
        setCurrentRabbitHole(prev => prev ? { ...prev, status: 'stalled' } : null);
        toast({
          title: 'Exploration Stalled',
          description: result.error || 'Unable to generate meaningful next step',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating next step:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate next step',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleBrillianceMode = async () => {
    const newMode = !brillianceModeActive;
    setBrillianceModeActive(newMode);
    
    try {
      await supabase
        .from('settings')
        .upsert({
          key: 'brilliance_mode',
          value: { enabled: newMode },
          description: 'Enable brilliance mode for pure existential exploration'
        });
      
      toast({
        title: newMode ? "Brilliance Mode Activated" : "Brilliance Mode Deactivated",
        description: newMode 
          ? "All practical constraints removed. Following pure insight." 
          : "Returned to standard exploration mode.",
      });
    } catch (error) {
      console.error('Error toggling brilliance mode:', error);
      setBrillianceModeActive(!newMode); // Revert on error
    }
  };

  const resetExploration = () => {
    setCurrentRabbitHole(null);
    setAnswers([]);
    setQuestion('');
    setBookmarkedSteps(new Set());
    setSearchTerm('');
    setScoreFilter('all');
    setBookmarkedOnly(false);
    setIsAutoRunning(false);
  };

  const toggleBookmark = (stepId: string) => {
    setBookmarkedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const saveComment = async (stepId: string, comment: string) => {
    try {
      const { error } = await supabase
        .from('answers')
        .update({ 
          user_comment: comment,
          is_user_guided: true,
          comment_added_at: new Date().toISOString()
        })
        .eq('id', stepId);

      if (error) throw error;

      // Update local state
      setAnswers(prev => prev.map(answer => 
        answer.id === stepId 
          ? { 
              ...answer, 
              user_comment: comment, 
              is_user_guided: true 
            }
          : answer
      ));

      toast({
        title: "Comment saved",
        description: "Your guidance has been added to this step.",
      });
    } catch (error: any) {
      console.error('Error saving comment:', error);
      toast({
        title: "Error saving comment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Function moved to top of component

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 6) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'stalled':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const exportProgressSummary = () => {
    if (!currentRabbitHole) return;
    
    try {
      const date = new Date().toLocaleString();
      const summary = `THE AXIOM PROJECT - PROGRESS SUMMARY
=====================================

Generated: ${date}
Session ID: ${currentRabbitHole.id}
Status: ${currentRabbitHole.status}

EXPLORATION OVERVIEW
==================
Initial Question: ${currentRabbitHole.initial_question}
Domain: ${currentRabbitHole.domain}
Total Steps: ${currentRabbitHole.total_steps}
Duration: ${new Date(currentRabbitHole.created_at).toLocaleString()} - ${date}

STEPS SUMMARY
=============
${answers.map((answer, index) => `Step ${answer.step_number}: ${answer.answer_text.substring(0, 100)}...`).join('\n\n')}

END OF SUMMARY
=============`;

      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `axiom-project-summary-${currentRabbitHole.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: 'Progress summary downloaded',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to generate summary file',
        variant: 'destructive',
      });
    }
  };

  const exportToTxt = () => {
    if (!currentRabbitHole) return;
    
    try {
      const date = new Date().toLocaleString();
      const report = `THE AXIOM PROJECT - FULL EXPLORATION REPORT
==========================================

Generated: ${date}
Session ID: ${currentRabbitHole.id}
Status: ${currentRabbitHole.status}

EXPLORATION OVERVIEW
==================
Initial Question: ${currentRabbitHole.initial_question}
Domain: ${currentRabbitHole.domain}
Total Steps: ${currentRabbitHole.total_steps}
Started: ${new Date(currentRabbitHole.created_at).toLocaleString()}

FULL EXPLORATION CHAIN
=====================
${answers.map((answer, index) => `
STEP ${answer.step_number}
--------
Generated: ${new Date(answer.generated_at).toLocaleString()}
${answer.judge_scores ? `Scores: N:${answer.judge_scores.novelty} D:${answer.judge_scores.depth} C:${answer.judge_scores.coherence} R:${answer.judge_scores.relevance}` : ''}

${answer.answer_text}

${index < answers.length - 1 ? '---\n' : ''}
`).join('')}

END OF REPORT
============`;

      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `axiom-project-full-${currentRabbitHole.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: 'Full exploration report downloaded',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to generate report file',
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
          initialQuestion: currentRabbitHole.initial_question
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
Question: ${currentRabbitHole.initial_question}

${data.reportContent}

---
Report generated by AI-Powered Brilliance Compression Engine
Total steps analyzed: ${answers.length}`;

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brilliance-compression-${currentRabbitHole.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-neural via-neural-secondary to-neural-accent rounded-2xl shadow-[var(--shadow-neural)]">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-neural via-neural-secondary to-neural-accent bg-clip-text text-transparent">
              Cognitive Lab
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore the depths of philosophical questions through incremental AI-guided discovery. 
            Each step builds meaningfully upon the last.
          </p>
        </div>

        {!currentRabbitHole ? (
          /* Initial Question Input */
          <Card className="mb-8 border-2 border-neural/20 shadow-[var(--shadow-neural)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-neural" />
                Begin Your Philosophical Journey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="question" className="block text-sm font-medium mb-2">
                  What profound question would you like to explore?
                </label>
                <Textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Enter a deep philosophical question that invites layered exploration..."
                  className="min-h-[100px] text-base border-neural/30 focus:border-neural focus:ring-neural"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-3 text-muted-foreground">Or choose from these examples:</p>
                <div className="grid gap-2">
                  {philosophySuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setQuestion(suggestion)}
                      className="text-left p-3 rounded-lg border border-muted bg-muted/30 hover:bg-muted/50 transition-colors text-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Research Mode Toggle */}
              <div className="space-y-3 p-4 border rounded-lg border-neural/20 bg-gradient-to-r from-background to-neural-accent/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Research-Grounded Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Require evidence, citations, and practical implementation for all insights
                    </p>
                  </div>
                  <Switch
                    checked={researchMode}
                    onCheckedChange={setResearchMode}
                    className="data-[state=checked]:bg-neural-accent"
                  />
                </div>
                {researchMode && (
                  <div className="p-3 bg-neural-accent/5 rounded border border-neural-accent/20">
                    <p className="text-xs text-muted-foreground">
                      ✓ Evidence requirements active<br/>
                      ✓ Citation checking enabled<br/>
                      ✓ Practical implementation gates<br/>
                      ✓ Jargon translation prompts
                    </p>
                  </div>
                )}
              </div>

              {/* Generation Mode Selection */}
              <div className="space-y-3 p-4 border rounded-lg border-neural/20 bg-gradient-to-r from-background to-neural/5">
                <Label className="text-sm font-medium">Generation Mode</Label>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="initial-single-mode"
                      value="single"
                      checked={generationMode === 'single'}
                      onChange={() => setGenerationMode('single')}
                      disabled={isProcessing}
                      className="w-4 h-4 mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="initial-single-mode" className="text-sm font-medium cursor-pointer">Single Perspective</Label>
                      <p className="text-xs text-muted-foreground">Traditional single-agent exploration approach</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="initial-exploration-mode"
                      value="exploration"
                      checked={generationMode === 'exploration'}
                      onChange={() => setGenerationMode('exploration')}
                      disabled={isProcessing}
                      className="w-4 h-4 mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="initial-exploration-mode" className="text-sm font-medium cursor-pointer">Exploration Panel</Label>
                      <p className="text-xs text-muted-foreground">Multi-agent philosophical debate for deep exploration</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="initial-grounding-mode"
                      value="grounding"
                      checked={generationMode === 'grounding'}
                      onChange={() => setGenerationMode('grounding')}
                      disabled={isProcessing}
                      className="w-4 h-4 mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="initial-grounding-mode" className="text-sm font-medium cursor-pointer">Grounding Panel</Label>
                      <p className="text-xs text-muted-foreground">Multi-agent focus on practical clarity and real-world applications</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="initial-devils-advocate-mode"
                      value="devils_advocate"
                      checked={generationMode === 'devils_advocate'}
                      onChange={() => setGenerationMode('devils_advocate')}
                      disabled={isProcessing}
                      className="w-4 h-4 mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="initial-devils-advocate-mode" className="text-sm font-medium cursor-pointer">Devil's Advocate</Label>
                      <p className="text-xs text-muted-foreground">Challenge breakthrough ideas with skeptical counterarguments</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={startRabbitHole}
                disabled={isProcessing || !question.trim()}
                className="w-full bg-gradient-to-r from-neural to-neural-secondary hover:from-neural-secondary hover:to-neural-accent shadow-[var(--shadow-neural)]"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {generationMode === 'exploration' ? 'Initiating Exploration Panel...' : 
                     generationMode === 'grounding' ? 'Initiating Grounding Panel...' : 
                     'Generating Initial Insight...'}
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Begin Exploration ({generationMode === 'exploration' ? 'Exploration Panel' : 
                                      generationMode === 'grounding' ? 'Grounding Panel' : 
                                      'Single Perspective'})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Rabbit Hole Display */
          <div className="space-y-6">
            {/* Current Session Info */}
            <Card className="border-2 border-neural/20 shadow-[var(--shadow-neural)]">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">Current Exploration</CardTitle>
                    <p className="text-muted-foreground italic">{currentRabbitHole.initial_question}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getStatusIcon(currentRabbitHole.status)}
                    <Badge variant={currentRabbitHole.status === 'active' ? 'default' : 'destructive'}>
                      {currentRabbitHole.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4 mt-6">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-sm">
                      {currentRabbitHole.total_steps} steps
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {currentRabbitHole.domain}
                    </Badge>
                  </div>
                  
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScores(!showScores)}
                        className="justify-start"
                      >
                        {showScores ? 'Hide Scores' : 'Show Scores'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCoherenceMonitor(!showCoherenceMonitor)}
                        title={showCoherenceMonitor ? 'Hide Coherence Monitor' : 'Show Coherence Monitor'}
                        className="justify-start"
                      >
                        {showCoherenceMonitor ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        Coherence
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetExploration}
                        className="justify-start"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        New Exploration
                      </Button>
                    </div>

                    <ExportTools 
                      rabbitHole={currentRabbitHole}
                      answers={answers}
                      globalBrillianceMetrics={globalBrillianceMetrics}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="exploration" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Exploration
                </TabsTrigger>
                <TabsTrigger value="rules" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Rules
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="autorun" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto-Run
                </TabsTrigger>
              </TabsList>

              <TabsContent value="exploration" className="space-y-4">
                {/* Auto-Run Controls at top of Exploration tab */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Auto-Run Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AutoRunControls
                      isProcessing={isProcessing}
                      onGenerateStep={generateNextStep}
                      onGeneratePanelStep={generatePanelStep}
                      onGenerateGroundingStep={generateGroundingStep}
                      currentStep={currentRabbitHole.total_steps}
                      isAutoRunning={isAutoRunning}
                      onAutoRunChange={setIsAutoRunning}
                      generationMode={generationMode}
                      onGenerationModeChange={setGenerationMode}
                      researchMode={researchMode}
                      earlyStopEnabled={earlyStopEnabled}
                      onEarlyStopChange={setEarlyStopEnabled}
                    />
                  </CardContent>
                </Card>

                <SearchAndFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  scoreFilter={scoreFilter}
                  onScoreFilterChange={setScoreFilter}
                  bookmarkedOnly={bookmarkedOnly}
                  onBookmarkedOnlyChange={setBookmarkedOnly}
                  totalResults={answers.length}
                  filteredResults={filteredAnswers.length}
                />

                {showCoherenceMonitor && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <CoherenceMonitor 
                        answers={answers}
                        currentStep={currentRabbitHole.total_steps}
                      />
                      <BrillianceMonitor 
                        metrics={brillianceMetrics}
                        brillianceModeActive={brillianceModeActive}
                        onToggleBrillianceMode={toggleBrillianceMode}
                      />
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <MetricHeartbeat 
                        metrics={heartbeatMetrics}
                        currentStep={currentRabbitHole.total_steps}
                      />
                      <PruningRitual 
                        concepts={conceptUsage}
                        currentStep={currentRabbitHole.total_steps}
                        onPruneConcepts={pruneConcepts}
                        lastPruningStep={lastPruningStep}
                       />
                     </div>
                     
                     {/* Breakthrough Control */}
                      <BreakthroughControl
                        rabbitHoleId={currentRabbitHole?.id}
                        currentStep={currentRabbitHole?.total_steps || 0}
                        answers={filteredAnswers}
                        onModeActivated={(mode) => toast({ title: `${mode} mode activated`, description: "Enhanced breakthrough generation enabled" })}
                      />
                      
                      {/* Research Mode Indicator */}
                      {researchMode && (
                        <Card className="border-neural-accent/30 bg-neural-accent/5">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Eye className="h-4 w-4 text-neural-accent" />
                              Research Mode Active
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Evidence requirements enforced
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Citation checking active
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Practical implementation required
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Jargon translation enabled
                              </div>
                            </div>
                            {filteredAnswers.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-neural-accent/20">
                                <p className="text-xs font-medium mb-1">Research Quality Score</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-neural-accent/10 rounded-full h-2">
                                    <div 
                                      className="bg-neural-accent h-2 rounded-full transition-all" 
                                      style={{ 
                                        width: `${Math.min(100, (filteredAnswers.reduce((acc, answer) => {
                                          const scores = answer.judge_scores;
                                          const evidenceScore = scores?.evidence || scores?.research_rigor || 7;
                                          const practicalityScore = scores?.practicality || scores?.actionability || 7;
                                          return acc + (evidenceScore + practicalityScore) / 2;
                                        }, 0) / filteredAnswers.length) * 10)}%` 
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round((filteredAnswers.reduce((acc, answer) => {
                                      const scores = answer.judge_scores;
                                      const evidenceScore = scores?.evidence || scores?.research_rigor || 7;
                                      const practicalityScore = scores?.practicality || scores?.actionability || 7;
                                      return acc + (evidenceScore + practicalityScore) / 2;
                                    }, 0) / filteredAnswers.length) * 10) / 10}/10
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                   </div>
                 )}

                 <div className="space-y-4">
                  {filteredAnswers.map((answer, index) => (
                    <CollapsibleStep
                      key={answer.id}
                      answer={answer}
                      showScores={showScores}
                      isBookmarked={bookmarkedSteps.has(answer.id)}
                      onToggleBookmark={toggleBookmark}
                      onSaveComment={saveComment}
                      defaultExpanded={index >= Math.max(0, filteredAnswers.length - 2)}
                    />
                  ))}
                  {filteredAnswers.length === 0 && answers.length > 0 && (
                    <Card className="p-6 text-center">
                      <p className="text-muted-foreground">No steps match your current filters.</p>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4">
                <RulesPanel
                  rabbitHoleId={currentRabbitHole.id}
                  currentStep={Math.max(currentRabbitHole.total_steps, 1)}
                  onRulesChange={(updatedRules) => {
                    setRules(updatedRules);
                    explorationRules.refetchRules();
                  }}
                />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <ModeEffectivenessTracker
                  answers={answers}
                  currentRabbitHoleId={currentRabbitHole.id}
                  currentMode={generationMode === 'cycling' ? 'single' : (generationMode === 'devils_advocate' ? 'single' : generationMode)}
                  coherenceMetrics={coherenceMetrics}
                />
                <GlobalBrillianceArchive 
                  answers={answers}
                  currentStep={currentRabbitHole.total_steps}
                />
                <AnalyticsDashboard answers={answers} />
              </TabsContent>

              <TabsContent value="autorun">
                <AutoRunControls
                  isProcessing={isProcessing}
                  onGenerateStep={generateNextStep}
                  onGeneratePanelStep={generatePanelStep}
                  onGenerateGroundingStep={generateGroundingStep}
                  currentStep={currentRabbitHole.total_steps}
                  isAutoRunning={isAutoRunning}
                  onAutoRunChange={setIsAutoRunning}
                  generationMode={generationMode}
                  onGenerationModeChange={setGenerationMode}
                  researchMode={researchMode}
                  earlyStopEnabled={earlyStopEnabled}
                  onEarlyStopChange={setEarlyStopEnabled}
                />
              </TabsContent>
            </Tabs>

            {/* Generation Options */}
            {currentRabbitHole.status === 'active' && (
              <Card className="border-2 border-dashed border-neural/30">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold mb-2">Generate Next Step</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred generation approach
                    </p>
                  </div>
                  
                  <div className="grid gap-3 md:grid-cols-3">
                    <Button
                      onClick={generateNextStep}
                      disabled={isProcessing}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start space-y-2 text-left"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Brain className="h-4 w-4" />
                        <span className="font-medium">Single Perspective</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Traditional single-agent step
                      </span>
                    </Button>
                    
                    <Button
                      onClick={generatePanelStep}
                      disabled={isProcessing}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start space-y-2 text-left"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Target className="h-4 w-4" />
                        <span className="font-medium">Exploration Panel</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Multi-agent philosophical debate
                      </span>
                    </Button>
                    
                    <Button
                      onClick={generateGroundingStep}
                      disabled={isProcessing}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start space-y-2 text-left"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Grounding Panel</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Multi-agent practical clarity
                      </span>
                    </Button>
                  </div>
                  
                  {isProcessing && (
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating insight...
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentRabbitHole.status === 'stalled' && (
              <Card className="border-2 border-destructive/30">
                <CardContent className="p-6 text-center">
                  <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <h3 className="font-semibold text-destructive mb-2">Exploration Stalled</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The AI was unable to generate a meaningful next step that adds sufficient value.
                    This can happen when a line of reasoning reaches natural completion.
                  </p>
                  <Button variant="outline" onClick={resetExploration}>
                    Start New Exploration
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CognitiveLab;