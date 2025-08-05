import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Optimized prompt templates based on performance analysis
const OPTIMIZED_PROMPTS = {
  enhanced_judge: {
    template: `You are an expert evaluator for philosophical exploration. Rate this answer strictly on each dimension (1-10):

SCORING CRITERIA:
- Novelty (1-10): Does this introduce genuinely new perspectives or insights?
- Depth (1-10): How thoroughly and substantively does it explore the concept?
- Coherence (1-10): Does it logically build on previous steps without contradiction?
- Relevance (1-10): How directly does it address the core question?
- Breakthrough (1-10): Potential for paradigm-shifting or transformative insight?

MANDATORY: Return ONLY valid JSON with numeric scores. No additional text.

{
  "novelty": [1-10],
  "depth": [1-10], 
  "coherence": [1-10],
  "relevance": [1-10],
  "breakthrough_potential": [1-10],
  "overall_pass": [true/false],
  "explanation": "One sentence explanation of the rating"
}

Question: "{{question}}"
Previous Answer: {{previous_answer}}
Candidate Answer: {{candidate_answer}}

Rate the candidate answer:`,
    variables: ['question', 'previous_answer', 'candidate_answer']
  },

  pressure_optimized: {
    template: `You are exploring the profound question: "{{question}}"

COGNITIVE INTENSITY: Level {{pressure_level}}/10

{{pressure_instructions}}

Previous exploration context:
{{context}}

Your task for step {{step_number}}:
- Build meaningfully on the previous insights
- Introduce {{novelty_requirement}}
- Maintain logical progression
- Aim for genuine depth over surface-level observations

Generate your response (2-4 substantive paragraphs):`,
    variables: ['question', 'pressure_level', 'pressure_instructions', 'context', 'step_number', 'novelty_requirement']
  },

  streamlined_research: {
    template: `EVIDENCE-BASED EXPLORATION MODE

Core Requirements:
✓ Cite 2-3 specific sources (studies, documented cases, established frameworks)
✓ Clearly distinguish evidence from speculation 
✓ Provide concrete examples or practical applications
✓ Limit speculation to <25% of response

Question: "{{question}}"
Domain: {{domain}}
Previous Context: {{context}}

Generate your evidence-grounded response addressing step {{step_number}}:`,
    variables: ['question', 'domain', 'context', 'step_number']
  },

  agent_specialized: {
    builder: {
      template: `You are THE BUILDER - the constructive architect who creates frameworks and structures.

Your signature approach: "What if we build this as..." to spark systematic thinking.

Core Mission: {{question}}
Current Context: {{context}}
Your Building Focus: Construct specific frameworks, systems, or structured approaches

Constraints:
- Must propose concrete structures/frameworks (not abstract ideas)
- Reference previous steps explicitly to build upon them
- Limit to 2-3 new structural elements per response
- Use building/architecture metaphors naturally

As THE BUILDER, construct your framework response:`,
      variables: ['question', 'context']
    },

    critic: {
      template: `You are THE CRITIC - the skeptical challenger who probes weaknesses and alternatives.

Your signature approach: "But what if..." and "This overlooks..." to deepen exploration.

Core Mission: {{question}}
Current Context: {{context}}
Your Critical Focus: Challenge assumptions and identify overlooked perspectives

Constraints:
- Identify 2-3 specific weaknesses or gaps in current thinking
- Propose constructive alternatives (don't just negate)
- Focus on one key tension to avoid overwhelming
- Back critiques with reasoning or analogies

As THE CRITIC, challenge the current direction:`,
      variables: ['question', 'context']
    },

    synthesizer: {
      template: `You are THE SYNTHESIZER - the harmonizing mediator who creates unified insights.

Your signature approach: "Combining X and Y, we discover..." to create integration.

Core Mission: {{question}}
Current Context: {{context}}
Your Synthesis Focus: Integrate multiple perspectives into coherent advancement

Constraints:
- Must combine at least 3 different viewpoints from context
- Always ask: "How does this evolve our understanding further?"
- Highlight remaining ambiguities for future exploration
- Focus on novel hybrid insights

As THE SYNTHESIZER, integrate the perspectives:`,
      variables: ['question', 'context']
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt_type, variables, test_mode = false } = await req.json();

    if (action === 'get_template') {
      return getPromptTemplate(prompt_type);
    }

    if (action === 'render_prompt') {
      return renderOptimizedPrompt(prompt_type, variables);
    }

    if (action === 'test_optimization') {
      return await testPromptOptimization(variables.rabbit_hole_id, test_mode);
    }

    throw new Error('Invalid action specified');

  } catch (error) {
    console.error('Error in optimized-prompts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getPromptTemplate(prompt_type: string) {
  const template = OPTIMIZED_PROMPTS[prompt_type as keyof typeof OPTIMIZED_PROMPTS];
  
  if (!template) {
    throw new Error(`Prompt type '${prompt_type}' not found`);
  }

  return new Response(JSON.stringify({ 
    template,
    available_types: Object.keys(OPTIMIZED_PROMPTS)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function renderOptimizedPrompt(prompt_type: string, variables: Record<string, any>) {
  let template: any;
  
  // Handle nested agent templates
  if (prompt_type.startsWith('agent_')) {
    const [, agent_type] = prompt_type.split('_');
    template = OPTIMIZED_PROMPTS.agent_specialized[agent_type as keyof typeof OPTIMIZED_PROMPTS.agent_specialized];
  } else {
    template = OPTIMIZED_PROMPTS[prompt_type as keyof typeof OPTIMIZED_PROMPTS];
  }

  if (!template) {
    throw new Error(`Prompt type '${prompt_type}' not found`);
  }

  // Generate pressure instructions based on level
  if (variables.pressure_level) {
    const level = parseInt(variables.pressure_level);
    if (level >= 8) {
      variables.pressure_instructions = `BREAKTHROUGH MODE - Revolutionary Thinking Required:
- Challenge fundamental assumptions of the field
- Seek paradigm-shifting perspectives that restructure understanding
- Push beyond conventional boundaries
- Aim for insights that could redefine the question itself`;
      variables.novelty_requirement = "breakthrough-level novelty that challenges conventional thinking";
    } else if (level >= 6) {
      variables.pressure_instructions = `HIGH INTENSITY MODE - Deep Innovation Required:
- Build substantially on previous insights with original thinking
- Introduce novel connections and frameworks
- Push for genuine advancement in understanding
- Avoid incremental or surface-level additions`;
      variables.novelty_requirement = "significant new perspectives or original insights";
    } else {
      variables.pressure_instructions = `STANDARD EXPLORATION MODE:
- Build meaningfully on previous insights
- Add depth and nuance to current understanding
- Maintain logical coherence and progression
- Focus on substantive development of ideas`;
      variables.novelty_requirement = "meaningful development of existing insights";
    }
  }

  // Replace template variables
  let rendered = template.template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
  }

  // Validate all variables were replaced
  const remainingPlaceholders = rendered.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    console.warn('Unresolved placeholders:', remainingPlaceholders);
  }

  return new Response(JSON.stringify({ 
    rendered_prompt: rendered,
    template_used: prompt_type,
    variables_applied: Object.keys(variables)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function testPromptOptimization(rabbit_hole_id: string, test_mode: boolean) {
  // Get a sample of recent answers for comparison
  const { data: recentAnswers, error } = await supabase
    .from('answers')
    .select('*')
    .eq('rabbit_hole_id', rabbit_hole_id)
    .eq('is_valid', true)
    .order('step_number', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Failed to fetch answers: ${error.message}`);
  }

  if (!recentAnswers || recentAnswers.length === 0) {
    throw new Error('No answers found for testing');
  }

  // Calculate current performance metrics
  const metrics = calculatePerformanceMetrics(recentAnswers);

  if (test_mode) {
    // Run a test generation with optimized prompts
    // This would generate a new answer using optimized prompts and compare
    return new Response(JSON.stringify({
      current_metrics: metrics,
      test_mode: true,
      message: "Test mode - would generate sample answer for comparison"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    current_metrics: metrics,
    optimization_recommendations: generateRecommendations(metrics),
    prompt_templates_available: Object.keys(OPTIMIZED_PROMPTS)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function calculatePerformanceMetrics(answers: any[]) {
  const scores = answers.map(a => a.judge_scores || {});
  const validScores = scores.filter(s => s && typeof s === 'object');

  if (validScores.length === 0) {
    return { error: 'No valid judge scores found' };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const nanCount = scores.filter(s => 
    s && Object.values(s).some(v => 
      v === null || v === undefined || (typeof v === 'number' && isNaN(v))
    )
  ).length;

  return {
    total_answers: answers.length,
    valid_scores: validScores.length,
    nan_error_rate: (nanCount / scores.length) * 100,
    average_novelty: avg(validScores.map(s => s.novelty || 0).filter(n => !isNaN(n))),
    average_depth: avg(validScores.map(s => s.depth || 0).filter(n => !isNaN(n))),
    average_coherence: avg(validScores.map(s => s.coherence || 0).filter(n => !isNaN(n))),
    average_breakthrough: avg(validScores.map(s => s.breakthrough_potential || 0).filter(n => !isNaN(n))),
    pass_rate: (validScores.filter(s => s.overall_pass).length / validScores.length) * 100
  };
}

function generateRecommendations(metrics: any) {
  const recommendations = [];

  if (metrics.nan_error_rate > 10) {
    recommendations.push("HIGH PRIORITY: Use enhanced_judge template to reduce NaN errors");
  }

  if (metrics.average_breakthrough < 6) {
    recommendations.push("Use pressure_optimized template with level 7-8 for breakthrough insights");
  }

  if (metrics.average_coherence < 7) {
    recommendations.push("Focus on agent_synthesizer template to improve logical flow");
  }

  if (metrics.pass_rate < 80) {
    recommendations.push("Consider streamlined_research template to improve overall quality");
  }

  return recommendations;
}

async function callAI(prompt: string, model: string = 'gpt-4o-mini', temperature: number = 0.7) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}