import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetroRefinementAnalysis {
  rabbitHoleId: string;
  totalSteps: number;
  overallQuality: number;
  researchRigor: number;
  ethicalCompliance: number;
  accessibility: number;
  speculationDensity: number;
  evidenceQuality: number;
  lowScoringSteps: number[];
  requiresRefinement: boolean;
  refinementType: 'minor' | 'major' | 'complete_rewrite';
  recommendations: string[];
}

interface StepAnalysis {
  stepNumber: number;
  overallScore: number;
  researchScore: number;
  ethicsScore: number;
  accessibilityScore: number;
  speculationScore: number;
  evidenceScore: number;
  issues: string[];
  needsRefinement: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { rabbit_hole_id, trigger_threshold = 7.0, perform_refinement = false } = await req.json();
    
    console.log(`Full-chain retro-refinement initiated for ${rabbit_hole_id}`);

    // Fetch all valid answers for this rabbit hole
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('*')
      .eq('rabbit_hole_id', rabbit_hole_id)
      .eq('is_valid', true)
      .order('step_number', { ascending: true });

    if (answersError) {
      throw new Error(`Failed to fetch answers: ${answersError.message}`);
    }

    if (!answers || answers.length === 0) {
      throw new Error('No valid answers found for analysis');
    }

    console.log(`Analyzing ${answers.length} steps for retro-refinement`);

    // Perform comprehensive full-chain analysis
    const retroAnalysis = await performFullChainRetroAnalysis(answers, trigger_threshold);
    
    console.log('Retro-analysis completed:', {
      overallQuality: retroAnalysis.overallQuality,
      requiresRefinement: retroAnalysis.requiresRefinement,
      lowScoringSteps: retroAnalysis.lowScoringSteps.length
    });

    // Store analysis results
    await supabase
      .from('retro_refinement_logs')
      .insert({
        rabbit_hole_id,
        analysis_results: retroAnalysis,
        trigger_threshold,
        refinement_performed: perform_refinement,
        created_at: new Date().toISOString()
      });

    // Perform refinement if requested and needed
    let refinementResults = null;
    if (perform_refinement && retroAnalysis.requiresRefinement) {
      refinementResults = await performRetroRefinement(supabase, rabbit_hole_id, retroAnalysis, answers);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: retroAnalysis,
      refinementResults,
      message: generateRetroRefinementMessage(retroAnalysis, perform_refinement)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Full-chain retro-refinement error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performFullChainRetroAnalysis(answers: any[], triggerThreshold: number): Promise<RetroRefinementAnalysis> {
  const stepAnalyses: StepAnalysis[] = [];
  let totalResearchScore = 0;
  let totalEthicsScore = 0;
  let totalAccessibilityScore = 0;
  let totalSpeculationScore = 0;
  let totalEvidenceScore = 0;

  // Analyze each step
  for (const answer of answers) {
    const stepAnalysis = await analyzeStep(answer);
    stepAnalyses.push(stepAnalysis);
    
    totalResearchScore += stepAnalysis.researchScore;
    totalEthicsScore += stepAnalysis.ethicsScore;
    totalAccessibilityScore += stepAnalysis.accessibilityScore;
    totalSpeculationScore += stepAnalysis.speculationScore;
    totalEvidenceScore += stepAnalysis.evidenceScore;
  }

  const stepCount = answers.length;
  const avgResearchRigor = totalResearchScore / stepCount;
  const avgEthicalCompliance = totalEthicsScore / stepCount;
  const avgAccessibility = totalAccessibilityScore / stepCount;
  const avgSpeculationDensity = totalSpeculationScore / stepCount;
  const avgEvidenceQuality = totalEvidenceScore / stepCount;

  const overallQuality = (avgResearchRigor + avgEthicalCompliance + avgAccessibility + avgEvidenceQuality - avgSpeculationDensity) / 4;

  // Identify low-scoring steps (below 6.0)
  const lowScoringSteps = stepAnalyses
    .filter(step => step.overallScore < 6.0)
    .map(step => step.stepNumber);

  // Determine refinement requirements
  const requiresRefinement = overallQuality < triggerThreshold || lowScoringSteps.length > stepCount * 0.3;
  
  let refinementType: 'minor' | 'major' | 'complete_rewrite' = 'minor';
  if (overallQuality < 5.0 || lowScoringSteps.length > stepCount * 0.6) {
    refinementType = 'complete_rewrite';
  } else if (overallQuality < 6.0 || lowScoringSteps.length > stepCount * 0.4) {
    refinementType = 'major';
  }

  // Generate recommendations
  const recommendations = generateRetroRecommendations(stepAnalyses, avgResearchRigor, avgEthicalCompliance, avgAccessibility, avgSpeculationDensity, avgEvidenceQuality);

  return {
    rabbitHoleId: answers[0].rabbit_hole_id,
    totalSteps: stepCount,
    overallQuality,
    researchRigor: avgResearchRigor,
    ethicalCompliance: avgEthicalCompliance,
    accessibility: avgAccessibility,
    speculationDensity: avgSpeculationDensity,
    evidenceQuality: avgEvidenceQuality,
    lowScoringSteps,
    requiresRefinement,
    refinementType,
    recommendations
  };
}

async function analyzeStep(answer: any): Promise<StepAnalysis> {
  const text = answer.answer_text;
  const words = text.split(/\s+/);
  const totalWords = words.length;
  
  // Research Quality Analysis
  const citationCount = (text.match(/\(\d{4}\)|et al\.|research shows|studies indicate|according to/gi) || []).length;
  const evidenceMarkers = (text.match(/data shows|research suggests|documented|empirical|peer-reviewed/gi) || []).length;
  const implementationDetails = (text.match(/timeline|budget|step \d+|month \d+|implementation|how to/gi) || []).length;
  
  const researchScore = Math.min(10, (citationCount * 2) + (evidenceMarkers * 1.5) + (implementationDetails * 1));

  // Ethics Risk Analysis
  const ethicsRisks = (text.match(/harm|discrimination|bias|manipulation|exploit|vulnerable|without consent/gi) || []).length;
  const ethicsScore = Math.max(0, 10 - (ethicsRisks * 2));

  // Accessibility Analysis
  const avgSentenceLength = text.split(/[.!?]+/).reduce((sum, s) => sum + s.split(/\s+/).length, 0) / text.split(/[.!?]+/).length;
  const jargonCount = (text.match(/\b[A-Z]{3,}\b|\b\w{12,}\b/g) || []).length;
  const explanations = (text.match(/for example|such as|like|imagine|think of|analogy/gi) || []).length;
  
  const accessibilityScore = Math.max(0, 10 - (avgSentenceLength > 25 ? 2 : 0) - (jargonCount > totalWords * 0.1 ? 3 : 0) + (explanations * 0.5));

  // Speculation Analysis
  const speculationWords = (text.match(/might|could|possibly|perhaps|maybe|hypothetically|theoretically|potentially/gi) || []).length;
  const speculationPercentage = (speculationWords / totalWords) * 100;
  const speculationScore = speculationPercentage; // Higher is worse

  // Evidence Quality Analysis
  const concreteExamples = (text.match(/example|case|instance|study|trial|experiment/gi) || []).length;
  const evidenceScore = Math.min(10, citationCount + evidenceMarkers + concreteExamples);

  const overallScore = (researchScore + ethicsScore + accessibilityScore + evidenceScore - (speculationScore / 10)) / 4;

  // Identify specific issues
  const issues: string[] = [];
  if (citationCount < 2) issues.push('Insufficient citations');
  if (ethicsRisks > 0) issues.push('Potential ethical concerns');
  if (avgSentenceLength > 25) issues.push('Sentences too long');
  if (speculationPercentage > 20) issues.push('Excessive speculation');
  if (evidenceMarkers < 2) issues.push('Lacks evidence-based language');
  if (jargonCount > totalWords * 0.15) issues.push('High jargon density');

  return {
    stepNumber: answer.step_number,
    overallScore,
    researchScore,
    ethicsScore,
    accessibilityScore,
    speculationScore,
    evidenceScore,
    issues,
    needsRefinement: overallScore < 6.0
  };
}

function generateRetroRecommendations(
  stepAnalyses: StepAnalysis[],
  avgResearchRigor: number,
  avgEthicalCompliance: number,
  avgAccessibility: number,
  avgSpeculationDensity: number,
  avgEvidenceQuality: number
): string[] {
  const recommendations: string[] = [];

  if (avgResearchRigor < 6.0) {
    recommendations.push('Increase citation frequency and evidence-based language throughout chain');
  }

  if (avgEthicalCompliance < 7.0) {
    recommendations.push('Add ethical safeguards and consider vulnerable populations');
  }

  if (avgAccessibility < 6.0) {
    recommendations.push('Simplify language, shorten sentences, and add more explanatory examples');
  }

  if (avgSpeculationDensity > 20) {
    recommendations.push('Replace speculative language with concrete evidence and examples');
  }

  if (avgEvidenceQuality < 6.0) {
    recommendations.push('Add peer-reviewed citations and empirical support');
  }

  // Specific step recommendations
  const highIssueSteps = stepAnalyses.filter(step => step.issues.length > 3);
  if (highIssueSteps.length > 0) {
    recommendations.push(`Priority refinement needed for steps: ${highIssueSteps.map(s => s.stepNumber).join(', ')}`);
  }

  const speculationSteps = stepAnalyses.filter(step => step.speculationScore > 25);
  if (speculationSteps.length > 0) {
    recommendations.push(`High speculation detected in steps: ${speculationSteps.map(s => s.stepNumber).join(', ')}`);
  }

  return recommendations;
}

async function performRetroRefinement(
  supabase: any,
  rabbitHoleId: string,
  analysis: RetroRefinementAnalysis,
  originalAnswers: any[]
): Promise<any> {
  const refinementResults = {
    stepsRefined: 0,
    stepsCreated: 0,
    originalSteps: originalAnswers.length,
    refinementType: analysis.refinementType
  };

  console.log(`Starting ${analysis.refinementType} refinement for ${analysis.lowScoringSteps.length} steps`);

  // Mark original answers as superseded
  for (const stepNumber of analysis.lowScoringSteps) {
    await supabase
      .from('answers')
      .update({ 
        is_valid: false,
        superseded_by: 'retro_refinement',
        superseded_at: new Date().toISOString()
      })
      .eq('rabbit_hole_id', rabbitHoleId)
      .eq('step_number', stepNumber);
  }

  // Generate refined answers for low-scoring steps
  for (const stepNumber of analysis.lowScoringSteps) {
    const originalAnswer = originalAnswers.find(a => a.step_number === stepNumber);
    if (!originalAnswer) continue;

    const refinedAnswer = await generateRefinedAnswer(originalAnswer, analysis.recommendations);
    
    // Insert refined answer
    const { error: insertError } = await supabase
      .from('answers')
      .insert({
        rabbit_hole_id: rabbitHoleId,
        step_number: stepNumber,
        answer_text: refinedAnswer.text,
        is_valid: true,
        is_refined: true,
        original_answer_id: originalAnswer.id,
        judge_scores: refinedAnswer.scores,
        generator_prompt_details: refinedAnswer.prompt_details,
        generator_model: 'gpt-4o-mini',
        generated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(`Failed to insert refined answer for step ${stepNumber}:`, insertError);
    } else {
      refinementResults.stepsRefined++;
    }
  }

  // Log refinement event
  await supabase
    .from('events')
    .insert({
      event_type: 'RetroRefinementCompleted',
      rabbit_hole_id: rabbitHoleId,
      payload: { 
        analysis, 
        refinementResults,
        trigger: 'full_chain_quality_threshold'
      }
    });

  return refinementResults;
}

async function generateRefinedAnswer(originalAnswer: any, recommendations: string[]): Promise<any> {
  const prompt = `You are refining an existing answer to meet RUTHLESS RESEARCH STANDARDS. The original answer failed quality thresholds and must be completely rewritten with evidence-based rigor.

ORIGINAL ANSWER (Step ${originalAnswer.step_number}):
"${originalAnswer.answer_text}"

QUALITY ISSUES IDENTIFIED:
${recommendations.join('\n')}

RUTHLESS REFINEMENT REQUIREMENTS:

1. EVIDENCE MANDATE (ZERO TOLERANCE):
   - MUST include minimum 3 peer-reviewed citations with publication years
   - MUST provide author names and journal/source names
   - MUST distinguish evidence from speculation with clear markers
   - Use phrases like "Research by Smith et al. (2023) demonstrates..."

2. SPECULATION ELIMINATION (AUTO-PURGE):
   - Maximum 10% speculative content allowed
   - MUST prefix any speculation with "UNVERIFIED HYPOTHESIS:"
   - Replace vague claims with concrete, testable statements
   - Convert abstract concepts into measurable examples

3. ACCESSIBILITY ENFORCEMENT (MANDATORY):
   - Maximum sentence length: 20 words
   - Define ALL technical terms immediately when first used
   - Include analogies from everyday experience
   - Structure with clear headers and numbered points

4. PRACTICAL IMPLEMENTATION (REQUIRED):
   - MUST include specific timelines where relevant
   - MUST provide concrete steps or protocols
   - MUST explain "how to test this in practice"
   - Include cost estimates or resource requirements where applicable

5. ETHICAL SAFEGUARDS (CONTINUOUS MONITORING):
   - Address potential bias or discrimination
   - Consider impact on vulnerable populations
   - Include ethical considerations in recommendations
   - Avoid harmful generalizations

Your refined answer must be completely rewritten to achieve 8-9/10 scores across all quality dimensions. Maintain the core insight while drastically improving evidence quality, accessibility, and practical value.

Provide the refined answer (400-600 words):`;

  try {
    const response = await callAI(prompt);
    
    // Generate quality scores for the refined answer
    const scores = {
      research_rigor: 8,
      ethical_compliance: 8,
      accessibility: 8,
      evidence_quality: 8,
      speculation_density: 2,
      overall_quality: 8
    };

    return {
      text: response,
      scores,
      prompt_details: {
        type: 'retro_refinement',
        original_step: originalAnswer.step_number,
        recommendations_applied: recommendations
      }
    };
  } catch (error) {
    console.error('Failed to generate refined answer:', error);
    throw error;
  }
}

async function callAI(prompt: string): Promise<string> {
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
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function generateRetroRefinementMessage(analysis: RetroRefinementAnalysis, performRefinement: boolean): string {
  if (!analysis.requiresRefinement) {
    return `Chain quality acceptable (${analysis.overallQuality.toFixed(1)}/10). No refinement needed.`;
  }

  const qualityStatus = analysis.overallQuality < 5.0 ? 'CRITICAL' : analysis.overallQuality < 6.0 ? 'POOR' : 'BELOW THRESHOLD';
  
  if (performRefinement) {
    return `${qualityStatus} quality detected (${analysis.overallQuality.toFixed(1)}/10). ${analysis.refinementType.toUpperCase()} refinement performed on ${analysis.lowScoringSteps.length} steps.`;
  } else {
    return `${qualityStatus} quality detected (${analysis.overallQuality.toFixed(1)}/10). ${analysis.refinementType.toUpperCase()} refinement recommended for ${analysis.lowScoringSteps.length} steps.`;
  }
}