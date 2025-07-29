import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Answer {
  id: string;
  step: number;
  answer: string;
  judgeScores?: {
    logic?: number;
    creativity?: number;
    practicality?: number;
    clarity?: number;
  };
}

interface GlobalBrillianceMetrics {
  crownJewelInsights?: Array<{
    stepNumber: number;
    brillianceScore: number;
    category: string;
    transformativePotential: number;
    keyInsight: string;
    answer: string;
  }>;
  brillianceCascades?: Array<{
    steps: number[];
    avgBrilliance: number;
    momentum: number;
  }>;
  semanticBreakthroughs?: Array<{
    stepNumber: number;
    noveltyScore: number;
    paradigmShiftIntensity: number;
    conceptualLeap: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers, globalBrillianceMetrics, initialQuestion } = await req.json();

    if (!answers || !Array.isArray(answers)) {
      throw new Error('Invalid answers data provided');
    }

    console.log(`Processing brilliance compression for ${answers.length} answers`);

    const prompt = `You are a brilliance finder and compression engine. Analyze this cognitive exploration process and create a concise, insightful report.

INITIAL QUESTION: ${initialQuestion || 'Not provided'}

EXPLORATION DATA:
${answers.map((answer: Answer, index: number) => 
  `Step ${answer.step || index + 1}: ${answer.answer}${answer.judgeScores ? 
    ` (Logic: ${answer.judgeScores.logic}, Creativity: ${answer.judgeScores.creativity}, Practicality: ${answer.judgeScores.practicality}, Clarity: ${answer.judgeScores.clarity})` : ''}`
).join('\n\n')}

BRILLIANCE METRICS:
${globalBrillianceMetrics ? JSON.stringify(globalBrillianceMetrics, null, 2) : 'No metrics available'}

Create a structured report with exactly these 5 sections:

## 1. THE MOST BRILLIANT ANSWER
Identify the single most brilliant answer from the exploration. Quote it directly and explain why it stands out.

## 2. CRYSTALLIZATION POINT
Specify the exact step number where this brilliance crystallized. Explain the buildup that led to this moment.

## 3. SYNTHESIS
Write one compelling paragraph that captures the essence of this brilliant insight in clear, memorable language.

## 4. VALUE COMPARISON
Explain why this insight is more valuable than other ideas in the report. Be specific about what makes it superior.

## 5. VERDICT
Answer definitively: Is this as good as the report could get? Or is something missing? Provide specific next steps or declare the exploration complete.

Be concise, insightful, and actionable. Focus on the most transformative insight that emerged.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert analyst specializing in identifying brilliant insights from cognitive explorations. You excel at synthesis, pattern recognition, and distilling complex information into actionable insights.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reportContent = data.choices[0].message.content;

    console.log('Successfully generated brilliance compression report');

    return new Response(JSON.stringify({ 
      reportContent,
      timestamp: new Date().toISOString(),
      analysisComplete: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in brilliance-compression-engine function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      reportContent: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});