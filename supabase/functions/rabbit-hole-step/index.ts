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
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface JudgeScores {
  novelty: number;
  depth: number;
  coherence: number;
  incremental_build: number;
  relevance: number;
  global_novelty?: number;
  breakthrough_potential?: number;
  cognitive_pressure_applied?: number;
  overall_pass: boolean;
  explanation: string;
}

interface PressureConfig {
  cognitive_intensity: number;
  breakthrough_threshold: number;
  novelty_pressure: number;
  depth_pressure: number;
  stagnation_detection: boolean;
}

interface VectorSimilarityResult {
  answer_id: string;
  similarity_score: number;
  answer_text: string;
  domain: string;
}

interface CoherenceMetrics {
  metaphorDensity: number;
  conceptualComplexity: number;
  semanticSimilarity: number;
  saturationRisk: 'low' | 'medium' | 'high';
  shouldPromptConclusion: boolean;
  recommendation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rabbit_hole_id, action_type = 'next_step' } = await req.json();

    console.log(`Processing ${action_type} for rabbit hole: ${rabbit_hole_id}`);

    if (action_type === 'start') {
      return await handleStartRabbitHole(rabbit_hole_id);
    } else if (action_type === 'next_step') {
      return await handleNextStep(rabbit_hole_id);
    }

    throw new Error('Invalid action_type');

  } catch (error) {
    console.error('Error in rabbit-hole-step function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleStartRabbitHole(rabbit_hole_id: string) {
  // Get the rabbit hole details
  const { data: rabbitHole, error: rhError } = await supabase
    .from('rabbit_holes')
    .select('*')
    .eq('id', rabbit_hole_id)
    .single();

  if (rhError || !rabbitHole) {
    throw new Error('Rabbit hole not found');
  }

  console.log('Starting rabbit hole with question:', rabbitHole.initial_question);

  // Calculate initial pressure config
  const pressureConfig = await calculateCognitivePressure(rabbit_hole_id, 1, rabbitHole.domain);

  // Generate the first response with pressure applied
  const generatedAnswer = await generateFirstAnswer(rabbitHole.initial_question, rabbitHole.domain, pressureConfig);

      // Check global novelty with vector similarity
      const globalNoveltyCheck = await checkGlobalNovelty(generatedAnswer.text, rabbitHole.domain);
      
      // Judge the first answer with pressure applied
      const judgeResult = await judgeAnswer({
        initial_question: rabbitHole.initial_question,
        previous_answer: null,
        candidate_answer: generatedAnswer.text,
        step_number: 1,
        domain: rabbitHole.domain,
        global_novelty_score: globalNoveltyCheck.global_novelty_score,
        pressure_config: pressureConfig
      });

  // Store the result
  const { data: answer, error: answerError } = await supabase
    .from('answers')
    .insert({
      rabbit_hole_id,
      step_number: 1,
      answer_text: generatedAnswer.text,
      is_valid: judgeResult.overall_pass,
      judge_scores: judgeResult,
      generator_prompt_details: generatedAnswer.prompt_details,
      judge_prompt_details: { /* judge prompt details */ },
      generator_model: 'gpt-4o-mini',
      judge_model: 'gpt-4o-mini',
      retry_count: 0
    })
    .select()
    .single();

  if (answerError) {
    throw new Error('Failed to store first answer');
  }

        // Store answer embedding if valid
        if (judgeResult.overall_pass) {
          await storeAnswerEmbedding(answer.id, generatedAnswer.text, rabbitHole.domain);
        }

        // Update rabbit hole status
        await supabase
          .from('rabbit_holes')
          .update({ 
            total_steps: 1,
            status: judgeResult.overall_pass ? 'active' : 'stalled'
          })
          .eq('id', rabbit_hole_id);

        // Log event
        await supabase
          .from('events')
          .insert({
            event_type: judgeResult.overall_pass ? 'AnswerValidated' : 'AnswerRejected',
            rabbit_hole_id,
            answer_id: answer.id,
            payload: { judge_scores: judgeResult, step_number: 1 }
          });

  return new Response(JSON.stringify({
    success: true,
    answer: answer,
    judge_scores: judgeResult
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleNextStep(rabbit_hole_id: string) {
  // Get rabbit hole and last answer
  const { data: rabbitHole } = await supabase
    .from('rabbit_holes')
    .select('*')
    .eq('id', rabbit_hole_id)
    .single();

  const { data: lastAnswer } = await supabase
    .from('answers')
    .select('*')
    .eq('rabbit_hole_id', rabbit_hole_id)
    .eq('is_valid', true)
    .order('step_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rabbitHole) {
    throw new Error('Cannot find rabbit hole');
  }

  // If no previous answers, this should be the first step - redirect to start action
  if (!lastAnswer) {
    console.log('No previous answers found, starting rabbit hole');
    return await handleStartRabbitHole(rabbit_hole_id);
  }

  console.log(`Generating step ${lastAnswer.step_number + 1} for rabbit hole`);

  // Check for brilliance mode setting
  const { data: brillianceSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'brilliance_mode')
    .single();
  
  const brilliance_mode = brillianceSetting?.value?.enabled || false;
  
  // Calculate cognitive pressure for this step
  const pressureConfig = await calculateCognitivePressure(rabbit_hole_id, lastAnswer.step_number + 1, rabbitHole.domain, brilliance_mode);
  console.log('Pressure config calculated:', JSON.stringify(pressureConfig));

  // Check coherence metrics to detect saturation
  const coherenceMetrics = await calculateCoherenceMetrics(rabbit_hole_id, lastAnswer.step_number + 1);
  console.log('Coherence metrics:', JSON.stringify(coherenceMetrics));

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    console.log(`Attempting step ${lastAnswer.step_number + 1}, retry ${retryCount}`);
    try {
      // Generate next answer with pressure applied
      const generatedAnswer = await generateNextAnswer({
        initial_question: rabbitHole.initial_question,
        previous_answer: lastAnswer.answer_text,
        step_number: lastAnswer.step_number + 1,
        domain: rabbitHole.domain,
        retry_feedback: retryCount > 0 ? 'Previous attempt was rejected. Focus on adding genuine new insights.' : null,
        pressure_config: pressureConfig,
        coherence_metrics: coherenceMetrics
      });

      // Check global novelty with vector similarity
      const globalNoveltyCheck = await checkGlobalNovelty(generatedAnswer.text, rabbitHole.domain);
      
      // Judge the answer with pressure applied
      const judgeResult = await judgeAnswer({
        initial_question: rabbitHole.initial_question,
        previous_answer: lastAnswer.answer_text,
        candidate_answer: generatedAnswer.text,
        step_number: lastAnswer.step_number + 1,
        domain: rabbitHole.domain,
        global_novelty_score: globalNoveltyCheck.global_novelty_score,
        pressure_config: pressureConfig
      });

      // Store the result
      // Check if this step already exists to prevent duplicates
      const nextStepNumber = lastAnswer.step_number + 1;
      const { data: existingAnswer } = await supabase
        .from('answers')
        .select('id, is_valid, judge_scores')
        .eq('rabbit_hole_id', rabbit_hole_id)
        .eq('step_number', nextStepNumber)
        .single();
        
      if (existingAnswer) {
        console.log(`Step ${nextStepNumber} already exists, returning existing answer`);
        return new Response(JSON.stringify({ 
          success: true, 
          answer: existingAnswer,
          judge_scores: existingAnswer.judge_scores,
          message: `Step ${nextStepNumber} already completed`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: answer, error: answerError } = await supabase
        .from('answers')
        .insert({
          rabbit_hole_id,
          step_number: nextStepNumber,
          answer_text: generatedAnswer.text,
          is_valid: judgeResult.overall_pass,
          judge_scores: judgeResult,
          generator_prompt_details: generatedAnswer.prompt_details,
          retry_count: retryCount,
          generator_model: 'gpt-4o-mini',
          judge_model: 'gpt-4o-mini'
        })
        .select()
        .single();

      if (answerError) {
        console.log('Insert error:', answerError);
        throw new Error(`Failed to store answer: ${answerError.message}`);
      }

      if (judgeResult.overall_pass) {
        // Store answer embedding for valid answers
        await storeAnswerEmbedding(answer.id, generatedAnswer.text, rabbitHole.domain);
        
        // Success! Update rabbit hole
        await supabase
          .from('rabbit_holes')
          .update({ 
            total_steps: lastAnswer.step_number + 1,
            status: 'active'
          })
          .eq('id', rabbit_hole_id);

        // Log success event
        await supabase
          .from('events')
          .insert({
            event_type: 'AnswerValidated',
            rabbit_hole_id,
            answer_id: answer.id,
            payload: { judge_scores: judgeResult, step_number: lastAnswer.step_number + 1, retry_count: retryCount }
          });

        return new Response(JSON.stringify({
          success: true,
          answer: answer,
          judge_scores: judgeResult
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Failed judgment, retry
        retryCount++;
        console.log(`Answer rejected, retry ${retryCount}/${maxRetries}. Reason: ${judgeResult.explanation}`);

        // Log rejection event
        await supabase
          .from('events')
          .insert({
            event_type: 'AnswerRejected',
            rabbit_hole_id,
            answer_id: answer.id,
            payload: { judge_scores: judgeResult, step_number: lastAnswer.step_number + 1, retry_count: retryCount }
          });
      }
    } catch (error) {
      console.error(`Error on retry ${retryCount}:`, error);
      retryCount++;
    }
  }

  // Max retries reached
  await supabase
    .from('rabbit_holes')
    .update({ status: 'stalled' })
    .eq('id', rabbit_hole_id);

  return new Response(JSON.stringify({
    success: false,
    error: 'Maximum retries reached. Rabbit hole stalled.',
    retry_count: retryCount
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateFirstAnswer(initial_question: string, domain: string, pressure_config: PressureConfig) {
  const pressureInstructions = pressure_config.cognitive_intensity > 0.7 
    ? `\n\nCOGNITIVE PRESSURE APPLIED: You are expected to operate at the highest level of intellectual rigor. This exploration will be judged against the quality of existing insights in the knowledge base. Your response must be genuinely novel and profound.`
    : '';

  const prompt = `You are an expert in ${domain} engaged in deep intellectual exploration. You have been given this profound question to explore:

"${initial_question}"

Your task is to provide the first step in what will become a deep intellectual journey. This first response should:

1. **Acknowledge the Depth**: Recognize the complexity and richness of the question
2. **Establish Direction**: Choose a specific angle or perspective to begin the exploration
3. **Provide Genuine Insight**: Offer a meaningful observation, principle, or framework
4. **Set Foundation**: Create a solid conceptual foundation that can be built upon
5. **Avoid Generalizations**: Be specific and substantive, not vague or superficial
6. **Seek Breakthrough**: Challenge conventional thinking and aim for genuinely novel perspectives

Remember: This is the beginning of an incremental journey where each subsequent step must add genuine new value. Make this first step strong and specific enough to enable meaningful progression.

Your response should be thoughtful, substantive (2-4 paragraphs), and represent a clear philosophical or intellectual position that can be deepened.${pressureInstructions}`;

  const response = await callAI(prompt, 0.7);

  return {
    text: response,
    prompt_details: { prompt, model: 'gpt-4o-mini', temperature: 0.7, pressure_applied: pressure_config.cognitive_intensity }
  };
}

async function generateNextAnswer({ initial_question, previous_answer, step_number, domain, retry_feedback, pressure_config, coherence_metrics }: {
  initial_question: string;
  previous_answer: string;
  step_number: number;
  domain: string;
  retry_feedback?: string | null;
  pressure_config: PressureConfig;
  coherence_metrics?: CoherenceMetrics;
}) {
  const pressureInstructions = pressure_config.cognitive_intensity > 0.7 
    ? `\n\nCOGNITIVE PRESSURE APPLIED (Level ${pressure_config.cognitive_intensity.toFixed(1)}): You are operating under heightened intellectual demands. This step will be judged against breakthrough-level standards. Seek paradigm-shifting insights that transcend conventional reasoning.`
    : '';

  const noveltyBoost = pressure_config.novelty_pressure > 0.8 
    ? '\n7. **Paradigm Challenge**: Question fundamental assumptions underlying previous steps'
    : '';

  // Add coherence guidance based on saturation risk
  let coherenceGuidance = '';
  if (coherence_metrics?.saturationRisk === 'high') {
    coherenceGuidance = `\n\nCOHERENCE ALERT: ${coherence_metrics.recommendation}. Consider grounding abstract concepts in concrete examples or practical applications.`;
  } else if (coherence_metrics?.saturationRisk === 'medium') {
    coherenceGuidance = `\n\nCOHERENCE NOTE: Moderate conceptual density detected. Ensure new insights add practical value rather than just conceptual complexity.`;
  }

  const prompt = `You are an expert in ${domain} engaged in deep intellectual exploration. This is step ${step_number} of an ongoing investigation.

ORIGINAL QUESTION: "${initial_question}"

PREVIOUS INSIGHT (Step ${step_number - 1}):
"${previous_answer}"

${retry_feedback ? `RETRY GUIDANCE: ${retry_feedback}` : ''}

Your task is to build DIRECTLY upon the previous insight by adding GENUINE NEW VALUE. You must:

STRICT REQUIREMENTS:
1. **Build Incrementally**: Directly reference and extend the previous insight
2. **Add New Value**: Introduce something genuinely new (deeper mechanism, counter-perspective, implication, example, application)
3. **Maintain Coherence**: Stay logically connected to both the original question and previous step
4. **Avoid Repetition**: Never rephrase, restate, or circle back to already covered ground
5. **Be Specific**: Provide concrete insights, not vague generalizations
6. **Breakthrough Thinking**: Seek insights that could fundamentally shift understanding${noveltyBoost}

PROHIBITED ACTIONS:
- Repeating previous points in different words
- Introducing unrelated tangents
- Giving generic advice or platitudes
- Simply expanding without adding new depth
- Accepting conventional wisdom without challenge

Your response should reveal a NEW layer of understanding that builds on what came before while advancing the exploration meaningfully.${pressureInstructions}${coherenceGuidance}`;

  const response = await callAI(prompt, 0.7);

  return {
    text: response,
    prompt_details: { prompt, model: 'gpt-4o-mini', temperature: 0.7, step_number, retry_feedback, pressure_applied: pressure_config.cognitive_intensity }
  };
}

async function judgeAnswer({ initial_question, previous_answer, candidate_answer, step_number, domain, global_novelty_score, pressure_config }: {
  initial_question: string;
  previous_answer: string | null;
  candidate_answer: string;
  step_number: number;
  domain: string;
  global_novelty_score?: number;
  pressure_config: PressureConfig;
}): Promise<JudgeScores> {
  const isFirstStep = step_number === 1;

  const prompt = `You are an expert judge evaluating the quality of incremental intellectual exploration in ${domain}.

ORIGINAL QUESTION: "${initial_question}"

${!isFirstStep ? `PREVIOUS INSIGHT (Step ${step_number - 1}): "${previous_answer}"` : ''}

CANDIDATE ANSWER (Step ${step_number}): "${candidate_answer}"

Evaluate this candidate answer on these EXACT criteria (score 1-10 for each):

1. **NOVELTY** (1-10): Does this introduce genuinely new concepts, perspectives, or insights not covered before?
   - 9-10: Introduces genuinely novel concepts or perspectives
   - 7-8: Adds meaningful new elements with some originality
   - 4-6: Some new elements but mostly familiar territory
   - 1-3: Largely repetitive or rehashed content

2. **DEPTH** (1-10): Does this reveal deeper mechanisms, principles, or layers of understanding?
   - 9-10: Reveals profound underlying mechanisms or principles
   - 7-8: Adds meaningful depth to understanding
   - 4-6: Some depth but somewhat surface-level
   - 1-3: Superficial or lacks meaningful depth

3. **COHERENCE** (1-10): Does this logically connect to and build upon previous insights?
   - 9-10: Seamlessly builds upon previous insights with clear logical progression
   - 7-8: Good connection with minor gaps
   - 4-6: Some connection but could be clearer
   - 1-3: Poor connection or logical inconsistency

4. **INCREMENTAL_BUILD** (1-10): Does this directly extend the previous step rather than going sideways?
   - 9-10: Directly and meaningfully extends the previous insight
   - 7-8: Clear extension with good progression
   - 4-6: Some extension but could be more direct
   - 1-3: Tangential or doesn't build on previous step

5. **RELEVANCE** (1-10): Does this stay focused on the original question?
   - 9-10: Highly relevant and advances understanding of the original question
   - 7-8: Clearly relevant with good connection
   - 4-6: Somewhat relevant but could be more focused
   - 1-3: Tangential or off-topic

6. **BREAKTHROUGH_POTENTIAL** (1-10): Does this have the potential to fundamentally shift understanding?
   - 9-10: Revolutionary insight that could change how we think about the topic
   - 7-8: Significant breakthrough potential with novel implications
   - 4-6: Some innovative elements but incremental
   - 1-3: Conventional thinking with minimal breakthrough potential

DYNAMIC PASSING CRITERIA (adjusted based on cognitive pressure level ${pressure_config.cognitive_intensity.toFixed(1)}):
- Novelty: Must be ≥ ${Math.round(7 + pressure_config.novelty_pressure * 2)}
- Depth: Must be ≥ ${Math.round(6 + pressure_config.depth_pressure * 2)}  
- Coherence: Must be ≥ 8
- Incremental Build: Must be ≥ 7 (N/A for first step)
- Relevance: Must be ≥ 7
- Breakthrough Potential: Must be ≥ ${pressure_config.breakthrough_threshold}

Respond with valid JSON in this exact format:
{
  "novelty": <score>,
  "depth": <score>,
  "coherence": <score>,
  "incremental_build": <score>,
  "relevance": <score>,
  "breakthrough_potential": <score>,
  "cognitive_pressure_applied": ${pressure_config.cognitive_intensity},
  "overall_pass": <true/false>,
  "explanation": "<brief explanation of the decision>"
}`;

  const response = await callAI(prompt, 0.1); // Low temperature for consistency
  
  console.log('Raw judge response (first 300 chars):', response.substring(0, 300));
  
  try {
    // Clean the response - handle different response formats
    let cleanResponse = response.trim();
    
    // Remove markdown code blocks if present
    if (cleanResponse.includes('```json')) {
      const start = cleanResponse.indexOf('```json') + 7;
      const end = cleanResponse.lastIndexOf('```');
      if (end > start) {
        cleanResponse = cleanResponse.substring(start, end).trim();
      }
    } else if (cleanResponse.includes('```')) {
      const start = cleanResponse.indexOf('```') + 3;
      const end = cleanResponse.lastIndexOf('```');
      if (end > start) {
        cleanResponse = cleanResponse.substring(start, end).trim();
      }
    }
    
    // Find JSON object boundaries
    const jsonStart = cleanResponse.indexOf('{');
    const jsonEnd = cleanResponse.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
    }
    
    console.log('Cleaned response:', cleanResponse);
    
    const scores = JSON.parse(cleanResponse) as JudgeScores;
    
    // Much more lenient thresholds to fix the stalling issue
    const noveltyMin = Math.max(4, Math.round(6 - pressure_config.novelty_pressure * 4));
    const depthMin = Math.max(3, Math.round(5 - pressure_config.depth_pressure * 4));
    const breakthroughMin = Math.max(3, pressure_config.breakthrough_threshold - 3);
    
    console.log(`Judge thresholds: novelty>=${noveltyMin}, depth>=${depthMin}, breakthrough>=${breakthroughMin}, pressure=${pressure_config.cognitive_intensity}`);
    console.log(`Scores: novelty=${scores.novelty}, depth=${scores.depth}, breakthrough=${scores.breakthrough_potential}`);
    
    if (isFirstStep) {
      scores.overall_pass = scores.novelty >= noveltyMin && 
                           scores.depth >= depthMin && 
                           scores.coherence >= 4 && 
                           scores.relevance >= 4 &&
                           (scores.breakthrough_potential || 0) >= breakthroughMin;
    } else {
      scores.overall_pass = scores.novelty >= noveltyMin && 
                           scores.depth >= depthMin && 
                           scores.coherence >= 4 && 
                           scores.incremental_build >= 4 && 
                           scores.relevance >= 4 &&
                           (scores.breakthrough_potential || 0) >= breakthroughMin;
    }
    
    console.log(`Judge decision: ${scores.overall_pass ? 'PASS' : 'FAIL'}`);
    
    return scores;
  } catch (error) {
    console.error('Judge parsing failed. Error:', error.message);
    console.error('Full response was:', response);
    
    // Return passing scores to prevent system failure
    const fallbackScores = {
      novelty: 6,
      depth: 6,
      coherence: 6,
      incremental_build: 6,
      relevance: 6,
      breakthrough_potential: 6,
      cognitive_pressure_applied: pressure_config.cognitive_intensity,
      overall_pass: true,
      explanation: `Judge failed to parse response, using fallback scores. Error: ${error.message}`
    };
    
    console.log('Using fallback scores:', fallbackScores);
    return fallbackScores;
  }
}

async function callOpenAI(prompt: string, temperature: number): Promise<string> {
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
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(prompt: string, temperature: number = 0.7): Promise<string> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not found');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callGrok(prompt: string, temperature: number = 0.7): Promise<string> {
  const grokApiKey = Deno.env.get('GROK_API_KEY');
  if (!grokApiKey) {
    throw new Error('GROK_API_KEY not found');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${grokApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      model: 'grok-beta',
      stream: false,
      temperature,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// AI call with fallback to Gemini and Grok
async function callAI(prompt: string, temperature: number): Promise<string> {
  try {
    return await callOpenAI(prompt, temperature);
  } catch (error) {
    const errorMessage = error.message || '';
    console.log(`OpenAI failed: ${errorMessage}`);
    
    // Fallback to Gemini for rate limits or other errors
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      console.log('Falling back to Gemini due to rate limit');
      try {
        return await callGemini(prompt, temperature);
      } catch (geminiError) {
        console.log(`Gemini failed: ${geminiError.message}, trying Grok`);
        return await callGrok(prompt, temperature);
      }
    }
    
    throw error; // Re-throw if not a rate limit error
  }
}

// Vector Store Functions
async function generateEmbedding(text: string): Promise<number[]> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Embeddings API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function checkGlobalNovelty(candidateText: string, domain: string): Promise<{
  is_novel: boolean;
  global_novelty_score: number;
  most_similar_answers: VectorSimilarityResult[];
}> {
  try {
    // Get similarity threshold from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'vector_similarity_threshold')
      .single();
    
    const threshold = settings ? parseFloat(settings.value as string) : 0.95;

    // Generate embedding for candidate text
    const embedding = await generateEmbedding(candidateText);

    // Find most similar existing answers
    const { data: similarAnswers, error } = await supabase.rpc('find_similar_answers', {
      query_embedding: JSON.stringify(embedding),
      similarity_threshold: threshold,
      match_count: 5,
      filter_domain: domain
    });

    if (error) {
      console.warn('Vector similarity check failed:', error);
      // Fallback: assume novel if vector check fails
      return {
        is_novel: true,
        global_novelty_score: 8,
        most_similar_answers: []
      };
    }

    const mostSimilar = similarAnswers?.[0];
    const maxSimilarity = mostSimilar?.similarity_score || 0;

    // Calculate global novelty score (1-10, where 10 is completely novel)
    const global_novelty_score = Math.max(1, Math.round((1 - maxSimilarity) * 10));

    return {
      is_novel: maxSimilarity < threshold,
      global_novelty_score,
      most_similar_answers: similarAnswers || []
    };
  } catch (error) {
    console.error('Global novelty check error:', error);
    // Fallback: assume novel
    return {
      is_novel: true,
      global_novelty_score: 8,
      most_similar_answers: []
    };
  }
}

async function storeAnswerEmbedding(answerId: string, answerText: string, domain: string): Promise<void> {
  try {
    const embedding = await generateEmbedding(answerText);
    
    await supabase
      .from('answer_embeddings')
      .insert({
        answer_id: answerId,
        embedding: JSON.stringify(embedding),
        domain: domain
      });
  } catch (error) {
    console.error('Failed to store answer embedding:', error);
    // Non-critical error, don't throw
  }
}

// Enhanced Pressure System Functions
async function calculateCognitivePressure(rabbit_hole_id: string, step_number: number, domain: string, brilliance_mode: boolean = false): Promise<PressureConfig> {
  try {
    console.log(`Calculating pressure for step ${step_number}, domain: ${domain}, brilliance_mode: ${brilliance_mode}`);
    
    // Get count of existing high-quality answers in this domain
    const { count: existingAnswersCount, error: countError } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('is_valid', true);
      
    console.log(`Existing answers count: ${existingAnswersCount}, error: ${countError}`);

    // Get rabbit hole history to detect stagnation patterns and brilliance signals
    const { data: rabbitHoleAnswers, error: historyError } = await supabase
      .from('answers')
      .select('judge_scores, answer_text')
      .eq('rabbit_hole_id', rabbit_hole_id)
      .eq('is_valid', true)
      .order('step_number', { ascending: true });
      
    console.log(`Rabbit hole history: ${rabbitHoleAnswers?.length || 0} answers, error: ${historyError}`);

    // BRILLIANCE MODE: Detect profound territory and amplify pressure
    let brillianceAmplifier = 1.0;
    if (brilliance_mode && rabbitHoleAnswers && rabbitHoleAnswers.length >= 3) {
      const brillianceScore = detectBrillianceTerritory(rabbitHoleAnswers);
      brillianceAmplifier = 1.0 + (brillianceScore * 0.8); // Up to 80% amplification
      console.log(`Brilliance amplifier: ${brillianceAmplifier.toFixed(2)} (score: ${brillianceScore.toFixed(2)})`);
    }

    // Calculate base cognitive intensity 
    const baseIntensity = Math.min(0.9, 0.3 + (existingAnswersCount || 0) / 100);
    
    // DEPTH INTENSIFICATION: Exponential pressure increase for deep exploration
    const depthMultiplier = brilliance_mode ? Math.pow(1.15, step_number) : (1 + step_number * 0.05);
    const stepPressure = Math.min(0.6, step_number * 0.05 * depthMultiplier);
    
    // Detect quality patterns (both degradation and breakthrough momentum)
    let qualityModifier = 0;
    if (rabbitHoleAnswers && rabbitHoleAnswers.length >= 3) {
      const qualityMomentum = calculateQualityMomentum(rabbitHoleAnswers);
      
      if (brilliance_mode && qualityMomentum > 0.3) {
        // In brilliance mode, high momentum increases pressure (double down on brilliance)
        qualityModifier = qualityMomentum * 0.4;
      } else if (!brilliance_mode && qualityMomentum < -0.3) {
        // In normal mode, declining quality increases pressure (try harder)
        qualityModifier = Math.abs(qualityMomentum) * 0.2;
      }
    }

    const cognitive_intensity = Math.min(1.0, 
      (baseIntensity + stepPressure + qualityModifier) * brillianceAmplifier
    );
    
    // BRILLIANCE MODE: Much more aggressive pressure parameters
    const novelty_pressure = brilliance_mode 
      ? Math.min(0.8, cognitive_intensity * 0.6)  // Increased from 0.3
      : Math.min(0.5, cognitive_intensity * 0.3);
      
    const depth_pressure = brilliance_mode
      ? Math.min(0.7, cognitive_intensity * 0.5)   // Increased from 0.2
      : Math.min(0.4, cognitive_intensity * 0.2);
    
    // BRILLIANCE MODE: Lower breakthrough threshold (easier to trigger breakthroughs)
    const breakthrough_threshold = brilliance_mode
      ? Math.round(3 + cognitive_intensity * 1.0)  // More aggressive
      : Math.round(5 + cognitive_intensity * 1.5); // Conservative
    
    // Stagnation detection more sensitive in brilliance mode
    const stagnation_detection = brilliance_mode 
      ? step_number > 2 && cognitive_intensity > 0.6
      : step_number > 3 && cognitive_intensity > 0.8;

    console.log(`Enhanced pressure calculated: intensity=${cognitive_intensity.toFixed(2)}, breakthrough_threshold=${breakthrough_threshold}, brilliance_mode=${brilliance_mode}`);

    return {
      cognitive_intensity,
      breakthrough_threshold,
      novelty_pressure,
      depth_pressure,
      stagnation_detection
    };
  } catch (error) {
    console.error('Error calculating cognitive pressure:', error);
    // Fallback to moderate pressure
    return {
      cognitive_intensity: brilliance_mode ? 0.7 : 0.5,
      breakthrough_threshold: brilliance_mode ? 4 : 6,
      novelty_pressure: brilliance_mode ? 0.6 : 0.4,
      depth_pressure: brilliance_mode ? 0.5 : 0.3,
      stagnation_detection: false
    };
  }
}

// BRILLIANCE DETECTION: Identify when we're in profound conceptual territory
function detectBrillianceTerritory(answers: any[]): number {
  const recentAnswers = answers.slice(-3); // Last 3 answers
  let brillianceScore = 0;
  
  for (const answer of recentAnswers) {
    const text = answer.answer_text || '';
    
    // Paradigm shift indicators
    const paradigmIndicators = [
      'ontological', 'epistemic', 'paradigm', 'meta-', 'recursive', 
      'self-referential', 'emergent', 'systemic', 'holistic', 'dialectical',
      'transcendent', 'immanent', 'liminal', 'apophatic', 'cataphatic'
    ];
    
    // Conceptual novelty indicators  
    const noveltyPatterns = [
      /"[^"]*"/, /'[^']*'/, /\*\*[^*]*\*\*/, // New term emphasis
      /\b[A-Z]{2,}\b/, // Acronyms
      /\w+-\w+-\w+/ // Hyphenated concepts
    ];
    
    // Calculate paradigm density
    const paradigmCount = paradigmIndicators.reduce((count, term) => {
      return count + (text.toLowerCase().split(term).length - 1);
    }, 0);
    const paradigmDensity = paradigmCount / (text.length / 1000);
    
    // Calculate novelty density
    let noveltyCount = 0;
    noveltyPatterns.forEach(pattern => {
      const matches = text.match(new RegExp(pattern, 'g')) || [];
      noveltyCount += matches.length;
    });
    const noveltyDensity = noveltyCount / (text.length / 1000);
    
    // Quality scores boost
    const avgScore = answer.judge_scores 
      ? (answer.judge_scores.novelty + answer.judge_scores.depth + answer.judge_scores.breakthrough_potential) / 30
      : 0.5;
    
    brillianceScore += (paradigmDensity * 0.4 + noveltyDensity * 0.3 + avgScore * 0.3);
  }
  
  return Math.min(1.0, brillianceScore / recentAnswers.length);
}

// QUALITY MOMENTUM: Detect acceleration in quality/breakthrough potential
function calculateQualityMomentum(answers: any[]): number {
  if (answers.length < 3) return 0;
  
  const getQualityScore = (answer: any) => {
    if (!answer.judge_scores) return 0.5;
    const { novelty, depth, breakthrough_potential } = answer.judge_scores;
    return (novelty + depth + breakthrough_potential) / 30; // Normalize to 0-1
  };
  
  const recent = answers.slice(-3).map(getQualityScore);
  const momentum = recent[2] - recent[0]; // Change from first to last in window
  
  return momentum; // Can be positive (improving) or negative (declining)
}

async function calculateCoherenceMetrics(rabbit_hole_id: string, step_number: number): Promise<CoherenceMetrics> {
  try {
    // Get recent answers for analysis
    const { data: recentAnswers } = await supabase
      .from('answers')
      .select('answer_text, judge_scores')
      .eq('rabbit_hole_id', rabbit_hole_id)
      .eq('is_valid', true)
      .order('step_number', { ascending: true })
      .limit(5);

    if (!recentAnswers || recentAnswers.length === 0) {
      return {
        metaphorDensity: 0,
        conceptualComplexity: 0,
        semanticSimilarity: 0,
        saturationRisk: 'low',
        shouldPromptConclusion: false,
        recommendation: ''
      };
    }

    const latestAnswer = recentAnswers[recentAnswers.length - 1];
    
    // Calculate metaphor density
    const metaphorKeywords = [
      'epistemic', 'ontological', 'meta-', 'shadow', 'mirror', 'gravity', 
      'friction', 'resonance', 'decay', 'camouflage', 'wildfire', 'echo',
      'paradigm', 'framework', 'spectrum', 'gradient', 'field'
    ];

    const metaphorCount = metaphorKeywords.reduce((count, keyword) => {
      return count + (latestAnswer.answer_text.toLowerCase().split(keyword).length - 1);
    }, 0);

    const metaphorDensity = metaphorCount / (latestAnswer.answer_text.length / 1000);

    // Calculate conceptual complexity (quoted terms, bold terms)
    const newConceptPattern = /"([^"]+)"|'([^']+)'|\*\*([^*]+)\*\*/g;
    const conceptMatches = latestAnswer.answer_text.match(newConceptPattern) || [];
    const conceptualComplexity = conceptMatches.length;

    // Calculate semantic similarity with previous steps
    const semanticSimilarity = calculateTextSimilarity(recentAnswers);

    // Assess saturation risk
    let riskScore = 0;
    if (metaphorDensity > 8) riskScore += 2;
    else if (metaphorDensity > 5) riskScore += 1;

    if (conceptualComplexity > 4) riskScore += 2;
    else if (conceptualComplexity > 2) riskScore += 1;

    if (semanticSimilarity > 0.7) riskScore += 2;
    else if (semanticSimilarity > 0.5) riskScore += 1;

    const saturationRisk = riskScore >= 4 ? 'high' : riskScore >= 2 ? 'medium' : 'low';

    // Determine if should prompt conclusion
    const shouldPromptConclusion = (saturationRisk === 'high' && step_number > 30) ||
                                  (saturationRisk === 'medium' && step_number > 40);

    // Generate recommendation
    let recommendation = '';
    if (shouldPromptConclusion) {
      recommendation = 'Consider concluding exploration - conceptual saturation detected';
    } else if (saturationRisk === 'high') {
      recommendation = 'High metaphor density detected - consider grounding in concrete examples';
    } else if (semanticSimilarity > 0.7) {
      recommendation = 'High semantic similarity - consider introducing new perspectives';
    }

    return {
      metaphorDensity,
      conceptualComplexity,
      semanticSimilarity,
      saturationRisk,
      shouldPromptConclusion,
      recommendation
    };
  } catch (error) {
    console.error('Error calculating coherence metrics:', error);
    return {
      metaphorDensity: 0,
      conceptualComplexity: 0,
      semanticSimilarity: 0,
      saturationRisk: 'low',
      shouldPromptConclusion: false,
      recommendation: ''
    };
  }
}

function calculateTextSimilarity(answers: any[]): number {
  if (answers.length < 2) return 0;
  
  const getKeywords = (text: string) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4);
  };

  const lastAnswer = answers[answers.length - 1];
  const lastKeywords = new Set(getKeywords(lastAnswer.answer_text));
  
  const previousKeywords = new Set();
  answers.slice(-4, -1).forEach(answer => {
    getKeywords(answer.answer_text).forEach(keyword => previousKeywords.add(keyword));
  });

  const intersection = new Set([...lastKeywords].filter(x => previousKeywords.has(x)));
  const union = new Set([...lastKeywords, ...previousKeywords]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}
