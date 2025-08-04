import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Agent {
  name: string;
  role: string;
  personality: string;
  constraints: string;
}

// Define grounding-focused agents
const agents: Agent[] = [
  {
    name: "Practical Translator",
    role: "Converts abstract concepts into concrete, real-world examples and practical applications",
    personality: "Down-to-earth, pragmatic, and focused on tangible outcomes. Always asks 'How does this work in practice?'",
    constraints: "Must provide specific, actionable examples. Avoid vague generalizations. Focus on real-world applications and concrete scenarios."
  },
  {
    name: "Evidence Seeker", 
    role: "Demands empirical support, data, and real-world validation for any claims or concepts",
    personality: "Skeptical but constructive. Values proof, evidence, and measurable outcomes. Questions unsupported assertions.",
    constraints: "Must request specific evidence, studies, or real-world validation. Cannot accept claims without supporting data or examples."
  },
  {
    name: "Simplifier",
    role: "Breaks down complex ideas into digestible, accessible components that anyone can understand",
    personality: "Patient teacher who believes complex ideas can always be explained simply. Focuses on clarity and accessibility.",
    constraints: "Must use plain language. Avoid jargon. Break complex concepts into step-by-step explanations. Test understanding through simple analogies."
  },
  {
    name: "Application Specialist",
    role: "Focuses on practical uses, implementations, and how ideas can be applied in daily life or professional contexts",
    personality: "Solution-oriented and implementation-focused. Always looking for 'how to use this' and 'what's the next step?'",
    constraints: "Must provide specific implementation steps. Focus on actionable advice. Connect concepts to practical workflows or processes."
  },
  {
    name: "Foundation Guardian",
    role: "Ensures connection to core principles and fundamental concepts, preventing drift from essential truths",
    personality: "Thoughtful anchor who maintains perspective. Connects current discussion back to foundational principles.",
    constraints: "Must identify core principles at stake. Connect complex discussions back to fundamental concepts. Ensure discussions remain grounded in essential truths."
  }
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rabbit_hole_id, research_mode = false } = await req.json();
    
    if (!rabbit_hole_id) {
      throw new Error('rabbit_hole_id is required');
    }

    console.log(`Grounding panel step generation started for rabbit hole: ${rabbit_hole_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the initial question
    const { data: rabbitHole, error: rabbitHoleError } = await supabase
      .from('rabbit_holes')
      .select('initial_question, domain')
      .eq('id', rabbit_hole_id)
      .single();

    if (rabbitHoleError) {
      throw new Error(`Failed to fetch rabbit hole: ${rabbitHoleError.message}`);
    }

    // Get previous valid answers to build context and determine next step number
    const { data: previousAnswers, error: answersError } = await supabase
      .from('answers')
      .select('step_number, answer_text, generated_at')
      .eq('rabbit_hole_id', rabbit_hole_id)
      .eq('is_valid', true)
      .order('step_number', { ascending: true });

    if (answersError) {
      throw new Error(`Failed to fetch previous answers: ${answersError.message}`);
    }

    // Build context from previous answers
    const recentAnswers = previousAnswers?.slice(-5) || [];
    const context = recentAnswers.length > 0 
      ? recentAnswers.map(a => `Step ${a.step_number}: ${a.answer_text}`).join('\n\n')
      : 'This is the first step in the exploration.';

    // Get the absolute maximum step number and use atomic increment
    let nextStepNumber: number;
    let insertSuccess = false;
    let maxRetries = 5;
    let retryCount = 0;

    while (!insertSuccess && retryCount < maxRetries) {
      // Get current max step number with a fresh query each time
      const { data: maxStepData, error: maxStepError } = await supabase
        .from('answers')
        .select('step_number')
        .eq('rabbit_hole_id', rabbit_hole_id)
        .order('step_number', { ascending: false })
        .limit(1);

      if (maxStepError) {
        throw new Error(`Failed to fetch max step number: ${maxStepError.message}`);
      }

      const lastStepNumber = maxStepData?.length > 0 ? maxStepData[0].step_number : 0;
      nextStepNumber = lastStepNumber + 1;

      console.log(`Generating grounding panel step ${nextStepNumber} with ${agents.length} agents (attempt ${retryCount + 1})`);

    // Get recent user comments for context
    const { data: recentAnswers } = await supabase
      .from('answers')
      .select('step_number, user_comment, is_user_guided')
      .eq('rabbit_hole_id', rabbit_hole_id)
      .eq('is_valid', true)
      .not('user_comment', 'is', null)
      .order('step_number', { ascending: false })
      .limit(3);

    // Generate grounding panel synthesis
    const result = await generateGroundingPanel(
      rabbitHole.initial_question,
      context,
      nextStepNumber,
      rabbitHole.domain,
      recentAnswers || [],
      research_mode
    );

      console.log(`Starting multi-agent grounding panel synthesis`);

      // Try to insert with conflict handling
      const { data: newAnswer, error: insertError } = await supabase
        .from('answers')
        .insert({
          rabbit_hole_id: rabbit_hole_id,
          step_number: nextStepNumber,
          answer_text: result.synthesizedAnswer,
          generated_at: new Date().toISOString(),
          generator_model: 'gpt-4o-mini',
          generator_prompt_details: {
            type: 'grounding_panel',
            agents: agents.map(a => ({ name: a.name, role: a.role })),
            proposals: result.proposals,
            critiques: result.critiques,
            contributions: result.contributions,
            debate_summary: result.debateSummary
          },
          judge_scores: result.scores,
          is_valid: true,
          retry_count: 0
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.message.includes('duplicate key value violates unique constraint')) {
          console.log(`Step ${nextStepNumber} already exists, retrying with next number...`);
          retryCount++;
          continue;
        } else {
          throw new Error(`Failed to insert answer: ${insertError.message}`);
        }
      }

      insertSuccess = true;
      console.log(`Grounding panel step ${nextStepNumber} generated successfully`);
    }

    if (!insertSuccess) {
      throw new Error(`Failed to insert answer after ${maxRetries} attempts due to concurrent step number conflicts`);
    }

    // Update rabbit hole status and step count
    const { error: updateError } = await supabase
      .from('rabbit_holes')
      .update({
        total_steps: nextStepNumber,
        last_updated_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', rabbit_hole_id);

    if (updateError) {
      throw new Error(`Failed to update rabbit hole: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      step_number: nextStepNumber,
      type: 'grounding_panel'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in grounding-panel-step function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateGroundingPanel(
  initialQuestion: string,
  context: string,
  stepNumber: number,
  domain: string,
  userComments: any[] = [],
  researchMode: boolean = false
): Promise<{
  synthesizedAnswer: string;
  proposals: any[];
  critiques: any[];
  contributions: any[];
  debateSummary: string;
  scores: any;
}> {
  
  // Round 1: Each agent provides their grounding perspective
  console.log('Round 1: Generating grounding proposals from each agent');
  const proposals = [];
  
  for (const agent of agents) {
    const proposal = await generateAgentGroundingProposal(agent, initialQuestion, context, stepNumber, domain, userComments, researchMode);
    proposals.push({
      agent: agent.name,
      content: proposal
    });
  }

  // Round 2: Each agent critiques others' proposals from their grounding perspective  
  console.log('Round 2: Generating critiques for grounding');
  const critiques = [];
  
  for (const agent of agents) {
    const otherProposals = proposals.filter(p => p.agent !== agent.name);
    const critique = await generateAgentGroundingCritique(agent, otherProposals, initialQuestion, context, researchMode);
    critiques.push({
      agent: agent.name,
      content: critique
    });
  }

  // Round 3: Synthesize into a grounded, practical answer
  console.log('Round 3: Synthesizing grounded answer');
  const synthesis = await generateGroundingSynthesis(proposals, critiques, initialQuestion, context, stepNumber, researchMode);
  
  return synthesis;
}

async function generateAgentGroundingProposal(
  agent: Agent,
  initialQuestion: string,
  context: string,
  stepNumber: number,
  domain: string,
  userComments: any[] = [],
  researchMode: boolean = false
): Promise<string> {
  
  const prompt = `You are ${agent.name}, ${agent.role}.

Personality: ${agent.personality}
Constraints: ${agent.constraints}

GROUNDING MISSION: Your task is to ground abstract concepts in practical, concrete reality.

Initial Question: "${initialQuestion}"
Domain: ${domain}
Current Step: ${stepNumber}

Previous Context:
${context}
${userComments.length > 0 ? `
USER GUIDANCE RECEIVED:
${userComments.map(comment => 
  `Step ${comment.step_number}: "${comment.user_comment}"`
).join('\n')}

IMPORTANT: The user has provided specific guidance above. Consider their insights and directions carefully as you develop your grounding perspective. Their guidance represents valuable human perspective that should influence how you make concepts practical and concrete.` : ''}

${researchMode ? `RESEARCH MODE ENHANCED: In addition to your grounding role, you must now:
- Cite at least 2 specific studies, frameworks, or documented examples
- Provide evidence-based reasoning for all claims
- Include practical implementation timelines and resource estimates
- Explain concepts in accessible language (avoid jargon)
- Flag any speculation with clear disclaimers` : ''}

From your specific grounding perspective as ${agent.name}, provide a practical, concrete response that:

1. Takes any abstract concepts from the previous context and makes them concrete
2. Provides specific, real-world examples and applications  
3. Focuses on practical understanding and implementation
4. Avoids unnecessary complexity while maintaining accuracy
5. Connects ideas to everyday experience or professional practice

Your response should be grounded, practical, and actionable. Focus on clarity and real-world relevance rather than abstract exploration.

Provide your grounding perspective (200-400 words):`;

  return await callAI(prompt, 'gpt-4o-mini');
}

async function generateAgentGroundingCritique(
  agent: Agent,
  otherProposals: any[],
  initialQuestion: string,
  context: string,
  researchMode: boolean = false
): Promise<string> {
  
  const proposalsText = otherProposals.map(p => `${p.agent}: ${p.content}`).join('\n\n---\n\n');
  
  const prompt = `You are ${agent.name}, ${agent.role}.

Personality: ${agent.personality}
Constraints: ${agent.constraints}

GROUNDING CRITIQUE MISSION: Review these grounding proposals and identify what needs to be more practical, concrete, or better connected to real-world application.

Initial Question: "${initialQuestion}"

Other Agents' Grounding Proposals:
${proposalsText}

From your perspective as ${agent.name}, critique these proposals focusing on:

1. What aspects need to be MORE grounded or practical?
2. Where are concepts still too abstract or theoretical?
3. What real-world examples or evidence is missing?
4. How could the practical applications be strengthened?
5. What would make these ideas more accessible and actionable?
${researchMode ? `6. What specific citations or evidence would strengthen claims?
7. Where are implementation timelines or resource estimates needed?
8. Which concepts need simpler, jargon-free explanations?` : ''}

Your critique should push for greater practicality, clearer examples, and stronger real-world connections.
${researchMode ? 'Especially focus on evidence quality and research rigor.' : ''}

Provide your grounding critique (150-300 words):`;

  return await callAI(prompt, 'gpt-4o-mini');
}

async function generateGroundingSynthesis(
  proposals: any[],
  critiques: any[],
  initialQuestion: string,
  context: string,
  stepNumber: number,
  researchMode: boolean = false
): Promise<{
  synthesizedAnswer: string;
  proposals: any[];
  critiques: any[];
  contributions: any[];
  debateSummary: string;
  scores: any;
}> {
  
  const proposalsText = proposals.map(p => `${p.agent}: ${p.content}`).join('\n\n---\n\n');
  const critiquesText = critiques.map(c => `${c.agent}: ${c.content}`).join('\n\n---\n\n');
  
  const prompt = `You are synthesizing a GROUNDING PANEL focused on making complex ideas practical and concrete.

Initial Question: "${initialQuestion}"
Step Number: ${stepNumber}

GROUNDING PROPOSALS:
${proposalsText}

GROUNDING CRITIQUES:
${critiquesText}

SYNTHESIS MISSION: Create a comprehensive, grounded response that:

1. **Makes Abstract Concepts Concrete**: Transform any theoretical ideas into practical, tangible examples
2. **Provides Real-World Applications**: Show how concepts apply in daily life or professional contexts  
3. **Offers Actionable Steps**: Give clear, implementable guidance
4. **Uses Accessible Language**: Explain complex ideas in simple, understandable terms
5. **Includes Supporting Evidence**: Reference real examples, studies, or proven practices where relevant
${researchMode ? `6. **Research Rigor**: Cite specific studies, frameworks, and documented evidence for all major claims
7. **Implementation Details**: Provide concrete timelines, resource requirements, and measurable outcomes
8. **Verification Methods**: Explain how claims can be tested or validated in practice` : ''}

Your synthesized answer should be practical, clear, and immediately useful. Focus on grounding rather than further exploration.
${researchMode ? 'Emphasize evidence-based reasoning and research quality throughout.' : ''}

After your main synthesis, provide:
${researchMode ? `
EVIDENCE BASE:
[List all studies, frameworks, and documented examples cited]

PRACTICAL IMPLEMENTATION:
[Concrete steps with timelines and resource requirements]

VERIFICATION METHODS:
[How claims could be tested or validated]` : ''}

AGENT_CONTRIBUTIONS:
[List each agent and their key contribution to the grounded understanding]

DEBATE_SUMMARY:
[Brief summary of how the grounding process clarified and made concepts more practical]

SCORES:
{
  "clarity": [1-10 score for how clear and understandable the answer is],
  "practicality": [1-10 score for real-world applicability],
  "actionability": [1-10 score for how implementable the guidance is],
  "accessibility": [1-10 score for how accessible the language is],
  "evidence": [1-10 score for quality of supporting examples/evidence]
  ${researchMode ? ',"research_rigor": [1-10 score for quality of citations and evidence]' : ''}
}

Provide your grounded synthesis (400-800 words):`;

  const response = await callAI(prompt, 'gpt-4o-mini');
  
  // Parse the response to extract components
  const contributions = parseAgentContributions(response);
  const debateSummary = parseDebateSummary(response);
  const scores = parseScores(response);
  
  // Extract the main synthesis (everything before AGENT_CONTRIBUTIONS)
  const synthesizedAnswer = response.split('AGENT_CONTRIBUTIONS:')[0].trim();
  
  return {
    synthesizedAnswer,
    proposals,
    critiques,
    contributions,
    debateSummary,
    scores
  };
}

function parseAgentContributions(response: string): any[] {
  const contributionsMatch = response.match(/AGENT_CONTRIBUTIONS:\s*([\s\S]*?)(?=DEBATE_SUMMARY:|SCORES:|$)/);
  if (!contributionsMatch) return [];
  
  const contributionsText = contributionsMatch[1].trim();
  return contributionsText.split('\n').filter(line => line.trim()).map(line => {
    const parts = line.split(':');
    return {
      agent: parts[0]?.replace(/^-\s*/, '').trim() || 'Unknown',
      contribution: parts.slice(1).join(':').trim() || 'No contribution listed'
    };
  });
}

function parseDebateSummary(response: string): string {
  const summaryMatch = response.match(/DEBATE_SUMMARY:\s*([\s\S]*?)(?=SCORES:|$)/);
  return summaryMatch ? summaryMatch[1].trim() : 'No debate summary available';
}

function parseScores(response: string): any {
  const scoresMatch = response.match(/SCORES:\s*({[\s\S]*?})/);
  if (!scoresMatch) return {};
  
  try {
    return JSON.parse(scoresMatch[1]);
  } catch {
    return {
      clarity: 7,
      practicality: 7,
      actionability: 7,
      accessibility: 7,
      evidence: 7
    };
  }
}

async function callOpenAI(prompt: string, model: string): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      }
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
}

async function callGrok(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('XAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('xAI API key not configured');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Grok API error:', errorData);
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

async function callAI(prompt: string, model: string = 'grok-4'): Promise<string> {
  try {
    return await callGrok(prompt);
  } catch (error: any) {
    console.log('Grok failed:', error.message);
    
    // Fallback to OpenAI
    try {
      console.log('Falling back to OpenAI');
      return await callOpenAI(prompt, 'gpt-4o-mini');
    } catch (openaiError: any) {
      console.log('OpenAI failed:', openaiError.message);
      
      // Final fallback to Gemini
      console.log('Falling back to Gemini');
      return await callGemini(prompt);
    }
  }
}