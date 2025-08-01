import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface BreakthroughAnalysis {
  paradigm_shift_score: number;
  worldview_alteration: number;
  conceptual_revolution_markers: string[];
  shift_type: 'ontological' | 'epistemological' | 'methodological' | 'axiological';
  breakthrough_cascade_detected: boolean;
  recommended_mode: 'cascade' | 'paradigm_shift' | 'productive_chaos' | 'normal';
}

interface QuestionArchitecture {
  temporal_displacement: number;
  assumption_inversion: number;
  meta_cognitive: number;
  constraint_paradox: number;
  breakthrough_potential: number;
  patterns: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'analyze_question':
        return await analyzeQuestionArchitecture(params);
      case 'detect_paradigm_shift':
        return await detectParadigmShift(params);
      case 'activate_breakthrough_mode':
        return await activateBreakthroughMode(params);
      case 'generate_with_breakthrough_pressure':
        return await generateWithBreakthroughPressure(params);
      case 'query_seed_bank':
        return await querySeedBank(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Breakthrough engine error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeQuestionArchitecture({ question_text }: { question_text: string }) {
  console.log(`Analyzing question architecture for: ${question_text}`);
  
  // Check if already analyzed
  const { data: existing } = await supabase
    .from('question_architecture')
    .select('*')
    .eq('question_text', question_text)
    .single();

  if (existing) {
    return new Response(JSON.stringify({
      success: true,
      architecture: existing,
      cached: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use database function for analysis
  const { data: analysisData, error: analysisError } = await supabase
    .rpc('analyze_question_architecture', { question_text });

  if (analysisError) {
    throw new Error(`Architecture analysis failed: ${analysisError.message}`);
  }

  const analysis = analysisData as QuestionArchitecture;

  // Store in database
  const { data: stored, error: storeError } = await supabase
    .from('question_architecture')
    .insert({
      question_text,
      temporal_displacement_score: analysis.temporal_displacement,
      assumption_inversion_score: analysis.assumption_inversion,
      meta_cognitive_score: analysis.meta_cognitive,
      constraint_paradox_score: analysis.constraint_paradox,
      breakthrough_potential: analysis.breakthrough_potential,
      structural_patterns: analysis.patterns
    })
    .select()
    .single();

  return new Response(JSON.stringify({
    success: true,
    architecture: stored || analysis,
    cached: false
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function detectParadigmShift({ 
  rabbit_hole_id, 
  answer_id, 
  answer_text, 
  previous_answers 
}: { 
  rabbit_hole_id: string; 
  answer_id: string; 
  answer_text: string; 
  previous_answers: string[];
}) {
  console.log(`Detecting paradigm shift for answer ${answer_id}`);

  const prompt = `You are a paradigm shift detector. Analyze this answer for potential worldview-altering insights.

ANSWER TO ANALYZE:
"${answer_text}"

CONTEXT (Previous Insights):
${previous_answers.slice(-3).map((a, i) => `${i + 1}. ${a}`).join('\n')}

Evaluate on these exact criteria (0.0-1.0 scale):

1. **ONTOLOGICAL SHIFT**: Does this fundamentally alter what we consider to exist or be real?
2. **EPISTEMOLOGICAL SHIFT**: Does this change how we know or validate knowledge itself?
3. **METHODOLOGICAL SHIFT**: Does this revolutionize our approach to investigation or reasoning?
4. **AXIOLOGICAL SHIFT**: Does this transform our fundamental values or what we consider worthy?

5. **WORLDVIEW ALTERATION POTENTIAL**: How likely is this to change someone's entire worldview? (0.0-1.0)

6. **CONCEPTUAL REVOLUTION MARKERS**: List specific phrases/concepts that indicate paradigm-shifting thinking.

Respond with valid JSON:
{
  "paradigm_shift_score": <0.0-1.0>,
  "worldview_alteration": <0.0-1.0>,
  "shift_type": "ontological|epistemological|methodological|axiological",
  "conceptual_revolution_markers": ["marker1", "marker2", ...],
  "explanation": "<brief analysis>"
}`;

  const response = await callAI(prompt, 0.2);
  
  try {
    const analysis = JSON.parse(response) as BreakthroughAnalysis;
    
    // Store significant paradigm shifts (threshold 0.6)
    if (analysis.paradigm_shift_score >= 0.6) {
      await supabase
        .from('paradigm_shifts')
        .insert({
          rabbit_hole_id,
          answer_id,
          shift_type: analysis.shift_type,
          intensity_score: analysis.paradigm_shift_score,
          worldview_alteration_potential: analysis.worldview_alteration,
          conceptual_revolution_markers: analysis.conceptual_revolution_markers
        });
    }

    return new Response(JSON.stringify({
      success: true,
      analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to parse paradigm shift analysis:', error);
    throw new Error('Paradigm shift analysis parsing failed');
  }
}

async function activateBreakthroughMode({ 
  rabbit_hole_id, 
  mode_type, 
  trigger_step, 
  trigger_reason,
  parameters = {}
}: { 
  rabbit_hole_id: string; 
  mode_type: 'cascade' | 'paradigm_shift' | 'productive_chaos';
  trigger_step: number;
  trigger_reason: string;
  parameters?: any;
}) {
  console.log(`Activating breakthrough mode: ${mode_type} for rabbit hole ${rabbit_hole_id}`);

  // Deactivate any existing breakthrough modes
  await supabase
    .from('breakthrough_modes')
    .update({ deactivated_at: new Date().toISOString() })
    .eq('rabbit_hole_id', rabbit_hole_id)
    .is('deactivated_at', null);

  // Activate new breakthrough mode
  const { data: activated, error } = await supabase
    .from('breakthrough_modes')
    .insert({
      rabbit_hole_id,
      mode_type,
      trigger_step,
      trigger_reason,
      parameters
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to activate breakthrough mode: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    mode: activated
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateWithBreakthroughPressure({ 
  prompt, 
  mode_type, 
  temperature = 0.8,
  model_preference = 'multi'
}: { 
  prompt: string; 
  mode_type: 'cascade' | 'paradigm_shift' | 'productive_chaos' | 'devils_advocate' | 'normal';
  temperature?: number;
  model_preference?: 'gpt' | 'claude' | 'multi';
}) {
  console.log(`Generating with breakthrough pressure: ${mode_type}`);

  let enhancedPrompt = prompt;

  // Add mode-specific pressure instructions
  switch (mode_type) {
    case 'cascade':
      enhancedPrompt += `\n\nBREAKTHROUGH CASCADE MODE ACTIVE:
- Embrace productive incoherence for 2-3 steps
- Prioritize conceptual leaps over logical incrementalism  
- Allow contradictions to coexist and generate tension
- Seek the impossible, paradoxical, or reality-bending
- Build momentum toward transcendent insights`;
      break;
      
    case 'paradigm_shift':
      enhancedPrompt += `\n\nPARADIGM SHIFT MODE ACTIVE:
- Target fundamental assumptions for inversion
- Seek insights that would rewrite textbooks
- Question the questioner, think about thinking
- Embrace ideas that feel dangerous or heretical
- Aim for worldview-shattering breakthroughs`;
      break;
      
    case 'productive_chaos':
      enhancedPrompt += `\n\nPRODUCTIVE CHAOS MODE ACTIVE:
- Temporarily abandon coherence requirements
- Generate multiple contradictory perspectives simultaneously
- Allow stream-of-consciousness intellectual exploration
- Embrace confusion as a pathway to breakthrough
- Prioritize novelty over comprehensibility`;
      break;
      
    case 'devils_advocate':
      enhancedPrompt += `\n\nDEVIL'S ADVOCATE MODE ACTIVE:
- Challenge the most recent breakthrough or high-scoring insights
- Identify the weakest assumptions and logical gaps
- Propose mundane, conventional explanations for apparent breakthroughs
- Question the methodology and reasoning process itself
- Force intellectual rigor by playing skeptical counterpoint
- Highlight confirmation bias and wishful thinking
- Demand evidence for extraordinary claims`;
      break;
  }

  // Model ensemble for peak performance
  if (model_preference === 'multi') {
    // Try Claude first for creative breakthroughs, fallback to GPT
    try {
      if (anthropicApiKey) {
        const claudeResponse = await callClaude(enhancedPrompt, temperature);
        return new Response(JSON.stringify({
          success: true,
          text: claudeResponse,
          model_used: 'claude'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.log('Claude failed, falling back to GPT-4o:', error.message);
    }
  }

  // Use GPT-4o for breakthrough scenarios (more powerful than mini)
  const response = await callOpenAI(enhancedPrompt, temperature, 'gpt-4o');
  
  return new Response(JSON.stringify({
    success: true,
    text: response,
    model_used: 'gpt-4o'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function querySeedBank({ 
  domain, 
  min_breakthrough_score = 0.7,
  limit = 5 
}: { 
  domain?: string; 
  min_breakthrough_score?: number;
  limit?: number;
}) {
  console.log(`Querying seed bank for domain: ${domain}, min_score: ${min_breakthrough_score}`);

  let query = supabase
    .from('breakthrough_seeds')
    .select('*')
    .gte('breakthrough_score', min_breakthrough_score)
    .order('breakthrough_score', { ascending: false })
    .limit(limit);

  if (domain) {
    query = query.eq('domain', domain);
  }

  const { data: seeds, error } = await query;

  if (error) {
    throw new Error(`Seed bank query failed: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    seeds: seeds || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function callOpenAI(prompt: string, temperature: number, model = 'gpt-4o-mini'): Promise<string> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

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
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(prompt: string, temperature: number): Promise<string> {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callAI(prompt: string, temperature: number): Promise<string> {
  try {
    return await callOpenAI(prompt, temperature, 'gpt-4o');
  } catch (error) {
    console.log('OpenAI failed, trying Claude:', error.message);
    try {
      return await callClaude(prompt, temperature);
    } catch (claudeError) {
      console.log('Claude failed, falling back to GPT-4o-mini:', claudeError.message);
      return await callOpenAI(prompt, temperature, 'gpt-4o-mini');
    }
  }
}