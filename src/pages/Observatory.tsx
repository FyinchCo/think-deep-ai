import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, Telescope, Eye, Zap, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ConceptNetwork } from '@/components/observatory/ConceptNetwork';
import { ThoughtTrajectory } from '@/components/observatory/ThoughtTrajectory';
import { ConsciousnessCompass } from '@/components/observatory/ConsciousnessCompass';
import { InsightWeather } from '@/components/observatory/InsightWeather';
import { useConsciousnessTracking } from '@/hooks/useConsciousnessTracking';

interface ObservatoryAnswer {
  id: string;
  step_number: number;
  answer_text: string;
  is_valid: boolean;
  judge_scores?: any; // Using any to handle JSONB type from Supabase
  generated_at: string;
  conceptual_coordinates?: {
    x: number;
    y: number;
    z: number;
  };
  semantic_weight?: number;
  connection_strength?: number[];
}

interface RabbitHole {
  id: string;
  initial_question: string;
  domain: string;
  status: string;
  total_steps: number;
  created_at: string;
}

const Observatory = () => {
  const [question, setQuestion] = useState('');
  const [currentExploration, setCurrentExploration] = useState<RabbitHole | null>(null);
  const [thoughts, setThoughts] = useState<ObservatoryAnswer[]>([]);
  const [isObserving, setIsObserving] = useState(false);
  const [selectedThought, setSelectedThought] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'network' | 'trajectory' | 'compass'>('network');
  const { toast } = useToast();
  
  const consciousnessMetrics = useConsciousnessTracking(thoughts);

  const philosophicalQueries = [
    "What is the architecture of consciousness itself?",
    "How do contradictions create rather than destroy meaning?",
    "What would happen if time could think?",
    "Why does existence prefer complexity over simplicity?",
    "What is the relationship between emptiness and creativity?"
  ];

  const startObservation = async () => {
    if (!question.trim()) {
      toast({
        title: 'Query Required',
        description: 'Enter a question to begin consciousness archaeology',
        variant: 'destructive',
      });
      return;
    }

    setIsObserving(true);
    try {
      // Create rabbit hole
      const { data: rabbitHole, error: rhError } = await supabase
        .from('rabbit_holes')
        .insert({
          initial_question: question,
          domain: 'consciousness',
          status: 'active'
        })
        .select()
        .single();

      if (rhError) throw rhError;
      setCurrentExploration(rabbitHole);

      // Start the first observation
      const response = await supabase.functions.invoke('rabbit-hole-step', {
        body: { 
          rabbit_hole_id: rabbitHole.id, 
          action_type: 'start',
          observation_mode: true
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result.success) {
        await loadThoughts();
        toast({
          title: 'Observatory Activated',
          description: 'Consciousness telescope focused on your question',
        });
      }
    } catch (error) {
      console.error('Error starting observation:', error);
      toast({
        title: 'Observatory Error',
        description: 'Failed to initialize consciousness telescope',
        variant: 'destructive',
      });
    } finally {
      setIsObserving(false);
    }
  };

  const loadThoughts = async () => {
    if (!currentExploration) return;

    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('rabbit_hole_id', currentExploration.id)
        .eq('is_valid', true)
        .order('step_number', { ascending: true });

      if (error) throw error;
      
      console.log('Observatory: Raw answers data:', data);
      
      // Transform answers into observatory thoughts with spatial coordinates
      const transformedThoughts = (data || []).map((answer, index) => ({
        ...answer,
        conceptual_coordinates: generateConceptualCoordinates(answer, index),
        semantic_weight: calculateSemanticWeight(answer),
        connection_strength: calculateConnectionStrengths(answer, data || [])
      }));
      
      console.log('Observatory: Transformed thoughts:', transformedThoughts);
      setThoughts(transformedThoughts);
    } catch (error) {
      console.error('Error loading thoughts:', error);
    }
  };

  const generateConceptualCoordinates = (answer: any, index: number) => {
    // Generate 3D coordinates based on semantic properties
    const novelty = answer.judge_scores?.novelty || 5;
    const depth = answer.judge_scores?.depth || 5;
    const coherence = answer.judge_scores?.coherence || 5;
    
    return {
      x: (novelty - 5) * 20 + Math.cos(index * 0.618) * 15,
      y: (depth - 5) * 20 + Math.sin(index * 0.618) * 15,
      z: (coherence - 5) * 10 + index * 5
    };
  };

  const calculateSemanticWeight = (answer: any) => {
    const scores = answer.judge_scores;
    if (!scores) return 1;
    
    return (scores.novelty + scores.depth + scores.breakthrough_potential) / 30;
  };

  const calculateConnectionStrengths = (answer: any, allAnswers: any[]) => {
    // Calculate semantic similarity with other thoughts
    return allAnswers.map(other => {
      if (other.id === answer.id) return 0;
      
      // Simple word overlap calculation (in a real implementation, use embeddings)
      const words1 = answer.answer_text.toLowerCase().split(' ');
      const words2 = other.answer_text.toLowerCase().split(' ');
      const overlap = words1.filter(word => words2.includes(word)).length;
      
      return Math.min(overlap / Math.max(words1.length, words2.length), 1);
    });
  };

  const deeperInto = async (thoughtId: string) => {
    if (!currentExploration || isObserving) return;

    setIsObserving(true);
    setSelectedThought(thoughtId);
    
    try {
      const response = await supabase.functions.invoke('rabbit-hole-step', {
        body: { 
          rabbit_hole_id: currentExploration.id, 
          action_type: 'next_step',
          focus_concept: thoughtId,
          observation_mode: true
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result.success) {
        setTimeout(async () => {
          await loadThoughts();
          setSelectedThought(null);
        }, 1000);
        
        toast({
          title: 'Deeper Observation',
          description: 'Consciousness telescope refocused on selected concept',
        });
      }
    } catch (error) {
      console.error('Error going deeper:', error);
      toast({
        title: 'Focus Error',
        description: 'Failed to deepen observation',
        variant: 'destructive',
      });
    } finally {
      setIsObserving(false);
    }
  };

  const resetObservatory = () => {
    setCurrentExploration(null);
    setThoughts([]);
    setQuestion('');
    setSelectedThought(null);
  };

  useEffect(() => {
    if (currentExploration) {
      loadThoughts();
    }
  }, [currentExploration]);

  // Load existing active rabbit hole on mount
  useEffect(() => {
    const loadExistingRabbitHole = async () => {
      try {
        const { data, error } = await supabase
          .from('rabbit_holes')
          .select('*')
          .eq('status', 'active')
          .eq('domain', 'consciousness')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          console.log('Observatory: Found existing rabbit hole:', data);
          setCurrentExploration(data);
          setQuestion(data.initial_question);
        }
      } catch (error) {
        console.error('Error loading existing rabbit hole:', error);
      }
    };

    loadExistingRabbitHole();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Telescope className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              The Observatory
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A consciousness telescope that reveals how questions explore themselves.
            Watch the invisible architecture of inquiry unfold in real-time.
          </p>
        </div>

        {/* Query Interface */}
        {!currentExploration && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Begin Consciousness Archaeology
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Question</label>
                <Textarea
                  placeholder="What question would reveal how consciousness explores itself?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Or explore one of these:</p>
                <div className="grid gap-2">
                  {philosophicalQueries.map((query, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-left h-auto p-3 justify-start"
                      onClick={() => setQuestion(query)}
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={startObservation}
                disabled={isObserving}
                className="w-full"
                size="lg"
              >
                {isObserving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Focusing Telescope...
                  </>
                ) : (
                  <>
                    <Telescope className="h-4 w-4 mr-2" />
                    Begin Observation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Observatory Interface */}
        {currentExploration && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Observing: {currentExploration.initial_question}</h2>
                <p className="text-sm text-muted-foreground">
                  {thoughts.length} thoughts mapped • Status: {currentExploration.status}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex bg-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === 'network' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('network')}
                  >
                    Network
                  </Button>
                  <Button
                    variant={viewMode === 'trajectory' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('trajectory')}
                  >
                    Trajectory
                  </Button>
                  <Button
                    variant={viewMode === 'compass' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('compass')}
                  >
                    Compass
                  </Button>
                </div>
                
                <Button variant="outline" onClick={resetObservatory}>
                  New Observation
                </Button>
              </div>
            </div>

            {/* Insight Weather */}
            <InsightWeather metrics={consciousnessMetrics} />

            {/* Main Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <Card className="h-[600px]">
                  <CardContent className="p-0 h-full">
                    {viewMode === 'network' && (
                      <ConceptNetwork
                        thoughts={thoughts}
                        selectedThought={selectedThought}
                        onThoughtSelect={deeperInto}
                        isProcessing={isObserving}
                      />
                    )}
                    {viewMode === 'trajectory' && (
                      <ThoughtTrajectory
                        thoughts={thoughts}
                        selectedThought={selectedThought}
                        onThoughtSelect={deeperInto}
                        isProcessing={isObserving}
                      />
                    )}
                    {viewMode === 'compass' && (
                      <ConsciousnessCompass
                        thoughts={thoughts}
                        selectedThought={selectedThought}
                        onThoughtSelect={deeperInto}
                        metrics={consciousnessMetrics}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Consciousness Metrics */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Consciousness Signature</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Conceptual Depth</span>
                        <span>{consciousnessMetrics.conceptualDepth.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${consciousnessMetrics.conceptualDepth * 10}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Semantic Coherence</span>
                        <span>{consciousnessMetrics.semanticCoherence.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${consciousnessMetrics.semanticCoherence * 10}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Curiosity Vector</span>
                        <Badge variant="outline" className="text-xs">
                          {consciousnessMetrics.curiosityDirection}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {thoughts.length > 2 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Recent Thoughts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {thoughts.slice(-5).reverse().map((thought) => (
                          <div
                            key={thought.id}
                            className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                              selectedThought === thought.id
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted/50 hover:bg-muted'
                            }`}
                            onClick={() => deeperInto(thought.id)}
                          >
                            <div className="font-medium mb-1">Step {thought.step_number}</div>
                            <div className="line-clamp-3">{thought.answer_text}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Observatory;