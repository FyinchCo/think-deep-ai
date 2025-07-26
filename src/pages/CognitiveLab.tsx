import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Brain, Zap, Target, CheckCircle, XCircle, RotateCcw, List, BarChart3, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CollapsibleStep } from '@/components/cognitive-lab/CollapsibleStep';
import { ExportTools } from '@/components/cognitive-lab/ExportTools';
import { AutoRunControls } from '@/components/cognitive-lab/AutoRunControls';
import { AnalyticsDashboard } from '@/components/cognitive-lab/AnalyticsDashboard';
import { SearchAndFilter } from '@/components/cognitive-lab/SearchAndFilter';
import { CoherenceMonitor } from '@/components/cognitive-lab/CoherenceMonitor';

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
  const [bookmarkedSteps, setBookmarkedSteps] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('exploration');
  const [showCoherenceMonitor, setShowCoherenceMonitor] = useState(true);
  const { toast } = useToast();

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

  const startRabbitHole = async () => {
    if (!question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a question to explore',
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
          status: 'active'
        })
        .select()
        .single();

      if (rhError) throw rhError;

      setCurrentRabbitHole(rabbitHole);

      // Generate first step
      const response = await supabase.functions.invoke('rabbit-hole-step', {
        body: { 
          rabbit_hole_id: rabbitHole.id, 
          action_type: 'start' 
        },
      });

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
          description: 'Your philosophical exploration has begun',
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

  const generateNextStep = async () => {
    if (!currentRabbitHole) return;

    setIsProcessing(true);
    try {
      const response = await supabase.functions.invoke('rabbit-hole-step', {
        body: { 
          rabbit_hole_id: currentRabbitHole.id, 
          action_type: 'next_step' 
        },
      });

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

              <Button
                onClick={startRabbitHole}
                disabled={isProcessing || !question.trim()}
                className="w-full bg-gradient-to-r from-neural to-neural-secondary hover:from-neural-secondary hover:to-neural-accent shadow-[var(--shadow-neural)]"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Initial Insight...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Begin Exploration
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
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{currentRabbitHole.total_steps} steps</Badge>
                    <Badge variant="outline">{currentRabbitHole.domain}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScores(!showScores)}
                    >
                      {showScores ? 'Hide Scores' : 'Show Scores'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCoherenceMonitor(!showCoherenceMonitor)}
                      title={showCoherenceMonitor ? 'Hide Coherence Monitor' : 'Show Coherence Monitor'}
                    >
                      {showCoherenceMonitor ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                      Coherence Monitor
                    </Button>
                    <ExportTools rabbitHole={currentRabbitHole} answers={answers} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetExploration}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      New Exploration
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="exploration" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Exploration
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
                  <CoherenceMonitor 
                    answers={answers}
                    currentStep={currentRabbitHole.total_steps}
                  />
                )}

                <div className="space-y-4">
                  {filteredAnswers.map((answer, index) => (
                    <CollapsibleStep
                      key={answer.id}
                      answer={answer}
                      showScores={showScores}
                      isBookmarked={bookmarkedSteps.has(answer.id)}
                      onToggleBookmark={toggleBookmark}
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

              <TabsContent value="analytics">
                <AnalyticsDashboard answers={answers} />
              </TabsContent>

              <TabsContent value="autorun">
                <AutoRunControls
                  isProcessing={isProcessing}
                  onGenerateStep={generateNextStep}
                  currentStep={currentRabbitHole.total_steps}
                  isAutoRunning={isAutoRunning}
                  onAutoRunChange={setIsAutoRunning}
                />
              </TabsContent>
            </Tabs>

            {/* Next Step Button */}
            {currentRabbitHole.status === 'active' && (
              <Card className="border-2 border-dashed border-neural/30">
                <CardContent className="p-6 text-center">
                  <Button
                    onClick={generateNextStep}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-neural to-neural-secondary hover:from-neural-secondary hover:to-neural-accent shadow-[var(--shadow-neural)]"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Next Insight...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate Next Step
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    AI will build meaningfully upon the previous insight
                  </p>
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