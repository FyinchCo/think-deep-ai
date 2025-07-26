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
  overall_pass: boolean;
  explanation: string;
}

interface VectorSimilarityResult {
  answer_id: string;
  similarity_score: number;
  answer_text: string;
  domain: string;
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

  // Generate the first response directly (no previous context)
  const generatedAnswer = await generateFirstAnswer(rabbitHole.initial_question, rabbitHole.domain);

      // Check global novelty with vector similarity
      const globalNoveltyCheck = await checkGlobalNovelty(generatedAnswer.text, rabbitHole.domain);
      
      // Judge the first answer
      const judgeResult = await judgeAnswer({
        initial_question: rabbitHole.initial_question,
        previous_answer: null,
        candidate_answer: generatedAnswer.text,
        step_number: 1,
        domain: rabbitHole.domain,
        global_novelty_score: globalNoveltyCheck.global_novelty_score
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
    .single();

  if (!rabbitHole || !lastAnswer) {
    throw new Error('Cannot find rabbit hole or previous answer');
  }

  console.log(`Generating step ${lastAnswer.step_number + 1} for rabbit hole`);

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Generate next answer
      const generatedAnswer = await generateNextAnswer({
        initial_question: rabbitHole.initial_question,
        previous_answer: lastAnswer.answer_text,
        step_number: lastAnswer.step_number + 1,
        domain: rabbitHole.domain,
        retry_feedback: retryCount > 0 ? 'Previous attempt was rejected. Focus on adding genuine new insights.' : null
      });

      // Check global novelty with vector similarity
      const globalNoveltyCheck = await checkGlobalNovelty(generatedAnswer.text, rabbitHole.domain);
      
      // Judge the answer
      const judgeResult = await judgeAnswer({
        initial_question: rabbitHole.initial_question,
        previous_answer: lastAnswer.answer_text,
        candidate_answer: generatedAnswer.text,
        step_number: lastAnswer.step_number + 1,
        domain: rabbitHole.domain,
        global_novelty_score: globalNoveltyCheck.global_novelty_score
      });

      // Store the result
      const { data: answer, error: answerError } = await supabase
        .from('answers')
        .insert({
          rabbit_hole_id,
          step_number: lastAnswer.step_number + 1,
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
        throw new Error('Failed to store answer');
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

async function generateFirstAnswer(initial_question: string, domain: string) {
  const prompt = `You are an expert in ${domain} engaged in deep intellectual exploration. You have been given this profound question to explore:

"${initial_question}"

Your task is to provide the first step in what will become a deep intellectual journey. This first response should:

1. **Acknowledge the Depth**: Recognize the complexity and richness of the question
2. **Establish Direction**: Choose a specific angle or perspective to begin the exploration
3. **Provide Genuine Insight**: Offer a meaningful observation, principle, or framework
4. **Set Foundation**: Create a solid conceptual foundation that can be built upon
5. **Avoid Generalizations**: Be specific and substantive, not vague or superficial

Remember: This is the beginning of an incremental journey where each subsequent step must add genuine new value. Make this first step strong and specific enough to enable meaningful progression.

Your response should be thoughtful, substantive (2-4 paragraphs), and represent a clear philosophical or intellectual position that can be deepened.`;

  const response = await callOpenAI(prompt, 0.7);

  return {
    text: response,
    prompt_details: { prompt, model: 'gpt-4o-mini', temperature: 0.7 }
  };
}

async function generateNextAnswer({ initial_question, previous_answer, step_number, domain, retry_feedback }: {
  initial_question: string;
  previous_answer: string;
  step_number: number;
  domain: string;
  retry_feedback?: string | null;
}) {
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

PROHIBITED ACTIONS:
- Repeating previous points in different words
- Introducing unrelated tangents
- Giving generic advice or platitudes
- Simply expanding without adding new depth

Your response should reveal a NEW layer of understanding that builds on what came before while advancing the exploration meaningfully.`;

  const response = await callOpenAI(prompt, 0.7);

  return {
    text: response,
    prompt_details: { prompt, model: 'gpt-4o-mini', temperature: 0.7, step_number, retry_feedback }
  };
}

async function judgeAnswer({ initial_question, previous_answer, candidate_answer, step_number, domain, global_novelty_score }: {
  initial_question: string;
  previous_answer: string | null;
  candidate_answer: string;
  step_number: number;
  domain: string;
  global_novelty_score?: number;
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

PASSING CRITERIA:
- Novelty: Must be ≥ 7
- Depth: Must be ≥ 6  
- Coherence: Must be ≥ 8
- Incremental Build: Must be ≥ 7 (N/A for first step)
- Relevance: Must be ≥ 7

Respond with valid JSON in this exact format:
{
  "novelty": <score>,
  "depth": <score>,
  "coherence": <score>,
  "incremental_build": <score>,
  "relevance": <score>,
  "overall_pass": <true/false>,
  "explanation": "<brief explanation of the decision>"
}`;

  const response = await callOpenAI(prompt, 0.1); // Low temperature for consistency
  
  try {
    const scores = JSON.parse(response) as JudgeScores;
    
    // Validate the passing criteria
    if (isFirstStep) {
      scores.overall_pass = scores.novelty >= 7 && scores.depth >= 6 && scores.coherence >= 8 && scores.relevance >= 7;
    } else {
      scores.overall_pass = scores.novelty >= 7 && scores.depth >= 6 && scores.coherence >= 8 && scores.incremental_build >= 7 && scores.relevance >= 7;
    }
    
    return scores;
  } catch (error) {
    console.error('Failed to parse judge response:', response);
    // Fallback: conservative fail
    return {
      novelty: 1,
      depth: 1,
      coherence: 1,
      incremental_build: 1,
      relevance: 1,
      overall_pass: false,
      explanation: 'Failed to parse judge response'
    };
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