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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting backfill process for answer embeddings...');

    // Get all valid answers that don't have embeddings yet
    const { data: answersToProcess, error: queryError } = await supabase
      .from('answers')
      .select(`
        id,
        answer_text,
        rabbit_holes!inner(domain)
      `)
      .eq('is_valid', true)
      .is('answer_embeddings.answer_id', null)
      .leftJoin('answer_embeddings', 'id', 'answer_id');

    if (queryError) {
      throw new Error(`Failed to query answers: ${queryError.message}`);
    }

    console.log(`Found ${answersToProcess?.length || 0} answers to process`);

    if (!answersToProcess || answersToProcess.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No answers need embedding backfill',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    let errors = 0;

    // Process answers in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < answersToProcess.length; i += batchSize) {
      const batch = answersToProcess.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (answer) => {
          try {
            console.log(`Processing answer ${answer.id}...`);
            
            const embedding = await generateEmbedding(answer.answer_text);
            const domain = answer.rabbit_holes.domain || 'philosophy';
            
            await supabase
              .from('answer_embeddings')
              .insert({
                answer_id: answer.id,
                embedding: JSON.stringify(embedding),
                domain: domain
              });
            
            processed++;
            console.log(`✅ Processed answer ${answer.id}`);
          } catch (error) {
            errors++;
            console.error(`❌ Failed to process answer ${answer.id}:`, error);
          }
        })
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < answersToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Backfill completed',
      processed,
      errors,
      total: answersToProcess.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in backfill-embeddings function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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