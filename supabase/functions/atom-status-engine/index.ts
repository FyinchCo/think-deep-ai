import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers, rabbitHole, compressionLevel = 'atom' } = await req.json();
    
    console.log(`Generating ${compressionLevel} status report for rabbit hole: ${rabbitHole.id}`);
    
    if (!answers || answers.length === 0) {
      throw new Error('No answers provided for analysis');
    }

    // Get the last 3-5 steps for context
    const recentSteps = answers.slice(-5);
    const currentStep = answers.length;
    
    // Prepare context for the AI
    const contextText = recentSteps.map((answer, index) => 
      `Step ${answer.step_number}: ${answer.answer_text.substring(0, 300)}...`
    ).join('\n\n');

    // Create compression-specific prompts
    const compressionPrompts = {
      atom: `You are a real-time exploration status monitor. Analyze this philosophical exploration and provide EXACTLY ONE SENTENCE that answers: "Where is this exploration at right now?"

Be decisive, insightful, and actionable. Focus on the current trajectory and next logical move.

Initial Question: ${rabbitHole.initial_question}
Current Step: ${currentStep}
Recent Progress:
${contextText}

Provide exactly one sentence that captures:
1. Current conceptual position
2. Key insight discovered
3. Quality of trajectory
4. What should happen next

Format: "This exploration has [discovered/revealed/established] X and should [continue toward/pivot to/focus on] Y."`,

      micro: `You are a real-time exploration status monitor. Analyze this philosophical exploration in 2-3 sentences maximum.

Answer these 4 questions concisely:
- Where are we? (current position)
- What did we find? (key discovery)
- Is it working? (trajectory quality)
- What next? (recommended direction)

Initial Question: ${rabbitHole.initial_question}
Current Step: ${currentStep}
Recent Progress:
${contextText}

Provide 2-3 sentences maximum.`,

      brief: `You are a real-time exploration status monitor. Analyze this philosophical exploration in one paragraph.

Provide a brief status assessment covering:
- Current conceptual position and trajectory
- Key insights or discoveries made
- Quality assessment of the exploration path
- Recommended next direction or focus area
- Any concerns about circular reasoning or stagnation

Initial Question: ${rabbitHole.initial_question}
Current Step: ${currentStep}
Recent Progress:
${contextText}

Provide exactly one paragraph (4-6 sentences).`
    };

    const prompt = compressionPrompts[compressionLevel as keyof typeof compressionPrompts] || compressionPrompts.atom;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a precise philosophical exploration analyst. Provide clear, actionable status reports that help users understand where their exploration stands and what should happen next.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: compressionLevel === 'atom' ? 50 : compressionLevel === 'micro' ? 150 : 300
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const statusReport = data.choices[0].message.content;

    console.log(`${compressionLevel} status report generated successfully`);

    return new Response(JSON.stringify({ 
      statusReport,
      compressionLevel,
      currentStep,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in atom-status-engine:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      statusReport: 'Status check failed - please try again'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});