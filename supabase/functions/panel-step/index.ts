import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Agent {
  name: string;
  role: string;
  personality: string;
  constraints: string[];
}

const agents: Agent[] = [
  {
    name: "The Builder",
    role: "Constructive Architect",
    personality: "Optimistic, integrative, focuses on foundational logic and coherence. Always starts with 'What if we build this as...' to spark ideas.",
    constraints: [
      "Must reference prior steps explicitly to avoid repetition",
      "Limit proposals to 2-3 new elements per round; justify with logical chains",
      "Encourage cross-agent integration: 'How does this connect to [other agent's] point?'",
      "Adapt to question type (add empirical angles for non-philosophical queries)"
    ]
  },
  {
    name: "The Critic",
    role: "Skeptical Challenger",
    personality: "Provocative, direct, uses 'But what if...' or 'This overlooks...' to probe weaknesses. Aims for disruption to deepen exploration.",
    constraints: [
      "Critiques must be constructive (propose alternatives, not just negate)",
      "Focus on one key tension per round to avoid overwhelming the panel",
      "Back critiques with reasoning or analogies, not personal attacks",
      "For varying questions, emphasize practical risks (real-world implementation flaws)"
    ]
  },
  {
    name: "The Synthesizer",
    role: "Harmonizing Mediator",
    personality: "Balanced, holistic, phrases as 'Combining X and Y, we get...' to create unified outputs.",
    constraints: [
      "Only activate after initial proposals/critiques; summarize debates before synthesizing",
      "Always ask: 'How does this evolve the model further?'",
      "Highlight remaining ambiguities for future steps",
      "For creative questions, emphasize novel hybrids; for analytical, focus on logical consistency"
    ]
  },
  {
    name: "The Ethicist",
    role: "Moral Guardian",
    personality: "Principled, reflective, questions 'Is this just? What are the human costs?' to add philosophical weight.",
    constraints: [
      "Tie ethics to the question's domain (behavioral impacts in relevant queries)",
      "Propose mitigations for identified issues, promoting positive change strategies",
      "Don't veto ideas outright; suggest refinements instead",
      "For ethical-neutral questions, pivot to fairness/bias in reasoning processes"
    ]
  },
  {
    name: "The Historian",
    role: "Contextual Sage",
    personality: "Narrative-driven, uses 'Drawing from history/X analogy...' to ground abstractions.",
    constraints: [
      "Limit to 1-2 historical/philosophical references per round; explain relevance clearly",
      "Link past to future adaptations: 'How might this system evolve?'",
      "Verify parallels logically, not force-fit",
      "For modern questions, draw from recent events/tech history; for timeless ones, emphasize enduring patterns"
    ]
  }
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { rabbit_hole_id } = await req.json();
    
    console.log(`Panel step generation started for rabbit hole: ${rabbit_hole_id}`);

    // Fetch rabbit hole and previous answers
    const { data: rabbitHole, error: rhError } = await supabase
      .from('rabbit_holes')
      .select('*')
      .eq('id', rabbit_hole_id)
      .single();

    if (rhError || !rabbitHole) {
      throw new Error(`Failed to fetch rabbit hole: ${rhError?.message}`);
    }

    const { data: previousAnswers, error: answersError } = await supabase
      .from('answers')
      .select('*')
      .eq('rabbit_hole_id', rabbit_hole_id)
      .eq('is_valid', true)
      .order('step_number', { ascending: true });

    if (answersError) {
      throw new Error(`Failed to fetch previous answers: ${answersError.message}`);
    }

    const lastStepNumber = previousAnswers?.length > 0 
      ? Math.max(...previousAnswers.map(a => a.step_number))
      : 0;
    const nextStepNumber = lastStepNumber + 1;

    // Build context from previous answers
    const previousContext = previousAnswers?.slice(-3).map(a => 
      `Step ${a.step_number}: ${a.answer_text}`
    ).join('\n\n') || '';

    // Get recent user comments for context
    const { data: recentAnswers } = await supabase
      .from('answers')
      .select('step_number, user_comment, is_user_guided')
      .eq('rabbit_hole_id', rabbit_hole_id)
      .eq('is_valid', true)
      .not('user_comment', 'is', null)
      .order('step_number', { ascending: false })
      .limit(3);

    console.log(`Generating panel step ${nextStepNumber} with ${agents.length} agents`);

    // Generate panel debate
    const panelDebate = await generatePanelDebate(
      rabbitHole.initial_question,
      rabbitHole.domain,
      previousContext,
      nextStepNumber,
      recentAnswers || []
    );

    // Store the panel answer
    const { data: newAnswer, error: insertError } = await supabase
      .from('answers')
      .insert({
        rabbit_hole_id,
        step_number: nextStepNumber,
        answer_text: panelDebate.final_answer,
        is_valid: true,
        judge_scores: {
          panel_mode: true,
          agent_contributions: panelDebate.agent_contributions,
          debate_summary: panelDebate.debate_summary,
          novelty_score: panelDebate.scores.novelty,
          depth_score: panelDebate.scores.depth,
          coherence_score: panelDebate.scores.coherence,
          relevance_score: panelDebate.scores.relevance,
          overall_pass: true
        }
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert panel answer: ${insertError.message}`);
    }

    // Update rabbit hole status
    await supabase
      .from('rabbit_holes')
      .update({ 
        status: 'active',
        last_updated_at: new Date().toISOString()
      })
      .eq('id', rabbit_hole_id);

    console.log(`Panel step ${nextStepNumber} generated successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        answer: newAnswer,
        panel_mode: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Panel step generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function generatePanelDebate(question: string, domain: string, previousContext: string, stepNumber: number, userComments: any[] = []) {
  console.log('Starting multi-agent panel debate');

  // Round 1: Individual agent proposals
  const agentProposals = await Promise.all(
    agents.map(agent => generateAgentProposal(agent, question, domain, previousContext, stepNumber, userComments))
  );

  // Round 2: Cross-agent critiques and responses
  const agentCritiques = await Promise.all(
    agents.map((agent, index) => 
      generateAgentCritique(agent, agentProposals, index, question, domain)
    )
  );

  // Round 3: Synthesis and final consensus
  const finalSynthesis = await generatePanelSynthesis(
    question, 
    domain, 
    agentProposals, 
    agentCritiques, 
    previousContext,
    stepNumber
  );

  return finalSynthesis;
}

async function generateAgentProposal(agent: Agent, question: string, domain: string, previousContext: string, stepNumber: number, userComments: any[] = []) {
  const prompt = `You are ${agent.name}, the ${agent.role} in a philosophical inquiry council.

PERSONALITY: ${agent.personality}

CONSTRAINTS:
${agent.constraints.map(c => `- ${c}`).join('\n')}

CONTEXT:
Original Question: "${question}"
Domain: ${domain}
Previous Steps:
${previousContext}
${userComments.length > 0 ? `

USER GUIDANCE RECEIVED:
${userComments.map(comment => 
  `Step ${comment.step_number}: "${comment.user_comment}"`
).join('\n')}

IMPORTANT: The user has provided specific guidance above. Consider their insights and directions carefully as you develop your proposal from your role perspective. Their guidance represents valuable human perspective that should influence your exploration approach.` : ''}

Current Step: ${stepNumber}

As ${agent.name}, provide your perspective on how to advance this exploration. Be true to your role while building meaningfully on previous steps. Focus on ${agent.role.toLowerCase()} aspects.

Your response should be 2-3 paragraphs maximum.`;

  return await callAI(prompt, 'gpt-4o-mini');
}

async function generateAgentCritique(agent: Agent, proposals: string[], agentIndex: number, question: string, domain: string) {
  const otherProposals = proposals.filter((_, index) => index !== agentIndex);
  
  const prompt = `You are ${agent.name}, the ${agent.role}.

Review these proposals from other council members:

${otherProposals.map((proposal, i) => `Proposal ${i + 1}:\n${proposal}`).join('\n\n')}

As ${agent.name}, provide constructive critique and identify key tensions or synergies. What would you refine, challenge, or build upon? Stay true to your role as ${agent.role}.

Keep your critique to 1-2 paragraphs.`;

  return await callAI(prompt, 'gpt-4o-mini');
}

async function generatePanelSynthesis(question: string, domain: string, proposals: string[], critiques: string[], previousContext: string, stepNumber: number) {
  const prompt = `You are synthesizing a multi-agent panel debate for step ${stepNumber} of exploring: "${question}"

AGENT PROPOSALS:
${proposals.map((proposal, i) => `${agents[i].name} (${agents[i].role}):\n${proposal}`).join('\n\n')}

AGENT CRITIQUES:
${critiques.map((critique, i) => `${agents[i].name}'s Critique:\n${critique}`).join('\n\n')}

PREVIOUS CONTEXT:
${previousContext}

Synthesize this debate into a coherent advancement of the exploration. The output should:
1. Integrate the strongest insights from all agents
2. Address key tensions raised in critiques
3. Build meaningfully on previous steps
4. Open new pathways for future exploration

Provide your synthesis in this format:

SYNTHESIS:
[2-3 paragraphs integrating the panel debate into a coherent next step]

AGENT CONTRIBUTIONS:
- Builder: [1 sentence summary]
- Critic: [1 sentence summary] 
- Synthesizer: [1 sentence summary]
- Ethicist: [1 sentence summary]
- Historian: [1 sentence summary]

DEBATE SUMMARY:
[1 paragraph on key tensions and resolutions]

SCORES:
Novelty: [1-10]
Depth: [1-10]
Coherence: [1-10]
Relevance: [1-10]`;

  const response = await callAI(prompt, 'gpt-4o-mini');
  
  // Parse the structured response
  const sections = response.split(/(?:SYNTHESIS:|AGENT CONTRIBUTIONS:|DEBATE SUMMARY:|SCORES:)/);
  
  return {
    final_answer: sections[1]?.trim() || response,
    agent_contributions: parseAgentContributions(sections[2] || ''),
    debate_summary: sections[3]?.trim() || 'Panel debate synthesized multiple perspectives',
    scores: parseScores(sections[4] || '')
  };
}

function parseAgentContributions(text: string): Record<string, string> {
  const contributions: Record<string, string> = {};
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const match = line.match(/^-?\s*(\w+):\s*(.+)$/);
    if (match) {
      contributions[match[1]] = match[2];
    }
  }
  
  return contributions;
}

function parseScores(text: string): Record<string, number> {
  const scores: Record<string, number> = {
    novelty: 8,
    depth: 8,
    coherence: 8,
    relevance: 8
  };
  
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const match = line.match(/(\w+):\s*(\d+)/i);
    if (match) {
      const key = match[1].toLowerCase();
      const value = parseInt(match[2]);
      if (key in scores && value >= 1 && value <= 10) {
        scores[key] = value;
      }
    }
  }
  
  return scores;
}

async function callOpenAI(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
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
        temperature: 0.8,
        maxOutputTokens: 1000,
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
      model: 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
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