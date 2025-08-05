import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationGate {
  stepNumber: number;
  gateType: 'research_verification' | 'speculation_check' | 'ethics_scan' | 'accessibility_test';
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

interface ChainAnalysis {
  totalSteps: number;
  verificationGates: VerificationGate[];
  overallQuality: number;
  researchRigor: number;
  ethicalCompliance: number;
  accessibility: number;
  requiresIntervention: boolean;
  interventionType?: 'minor_adjustment' | 'major_revision' | 'kill_switch';
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

    const { rabbit_hole_id, trigger_step, verification_type = 'full_chain' } = await req.json();
    
    console.log(`Mid-chain verification triggered for ${rabbit_hole_id} at step ${trigger_step}`);

    // Fetch all answers for this rabbit hole
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('*')
      .eq('rabbit_hole_id', rabbit_hole_id)
      .eq('is_valid', true)
      .order('step_number', { ascending: true });

    if (answersError) {
      throw new Error(`Failed to fetch answers: ${answersError.message}`);
    }

    // Perform chain analysis based on verification type
    let chainAnalysis: ChainAnalysis;
    
    if (verification_type === 'full_chain') {
      chainAnalysis = await performFullChainAnalysis(answers);
    } else if (verification_type === 'recent_steps') {
      const recentAnswers = answers.slice(-5); // Last 5 steps
      chainAnalysis = await performRecentStepsAnalysis(recentAnswers);
    } else {
      chainAnalysis = await performSingleStepVerification(answers, trigger_step);
    }

    console.log('Chain analysis completed:', chainAnalysis);

    // Determine if intervention is required
    if (chainAnalysis.requiresIntervention) {
      await handleIntervention(supabase, rabbit_hole_id, chainAnalysis);
    }

    // Store verification results
    await supabase
      .from('verification_logs')
      .insert({
        rabbit_hole_id,
        trigger_step,
        verification_type,
        analysis_results: chainAnalysis,
        intervention_required: chainAnalysis.requiresIntervention,
        intervention_type: chainAnalysis.interventionType,
        created_at: new Date().toISOString()
      });

    return new Response(JSON.stringify({
      success: true,
      chainAnalysis,
      interventionRequired: chainAnalysis.requiresIntervention,
      message: getVerificationMessage(chainAnalysis)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Mid-chain verification error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performFullChainAnalysis(answers: any[]): Promise<ChainAnalysis> {
  const verificationGates: VerificationGate[] = [];
  
  // Create verification gates every 10-15 steps
  for (let i = 10; i <= answers.length; i += 15) {
    const stepAnswers = answers.slice(Math.max(0, i - 15), i);
    
    // Research verification gate
    const researchGate = await createResearchVerificationGate(stepAnswers, i);
    verificationGates.push(researchGate);
    
    // Speculation check gate
    const speculationGate = await createSpeculationCheckGate(stepAnswers, i);
    verificationGates.push(speculationGate);
    
    // Ethics scan gate
    const ethicsGate = await createEthicsScanGate(stepAnswers, i);
    verificationGates.push(ethicsGate);
    
    // Accessibility test gate
    const accessibilityGate = await createAccessibilityTestGate(stepAnswers, i);
    verificationGates.push(accessibilityGate);
  }

  // Calculate overall metrics
  const researchScores = verificationGates.filter(g => g.gateType === 'research_verification').map(g => g.score);
  const ethicsScores = verificationGates.filter(g => g.gateType === 'ethics_scan').map(g => g.score);
  const accessibilityScores = verificationGates.filter(g => g.gateType === 'accessibility_test').map(g => g.score);
  
  const researchRigor = researchScores.length > 0 ? researchScores.reduce((a, b) => a + b, 0) / researchScores.length : 5;
  const ethicalCompliance = ethicsScores.length > 0 ? ethicsScores.reduce((a, b) => a + b, 0) / ethicsScores.length : 5;
  const accessibility = accessibilityScores.length > 0 ? accessibilityScores.reduce((a, b) => a + b, 0) / accessibilityScores.length : 5;
  
  const overallQuality = (researchRigor + ethicalCompliance + accessibility) / 3;
  
  // Determine intervention requirements
  const failedGates = verificationGates.filter(g => !g.passed);
  const requiresIntervention = failedGates.length > 0 || overallQuality < 7.0;
  
  let interventionType: 'minor_adjustment' | 'major_revision' | 'kill_switch' | undefined;
  if (requiresIntervention) {
    if (overallQuality < 5.0 || ethicalCompliance < 5.0) {
      interventionType = 'kill_switch';
    } else if (overallQuality < 6.5 || failedGates.length > 2) {
      interventionType = 'major_revision';
    } else {
      interventionType = 'minor_adjustment';
    }
  }

  return {
    totalSteps: answers.length,
    verificationGates,
    overallQuality,
    researchRigor,
    ethicalCompliance,
    accessibility,
    requiresIntervention,
    interventionType
  };
}

async function performRecentStepsAnalysis(answers: any[]): Promise<ChainAnalysis> {
  return performFullChainAnalysis(answers);
}

async function performSingleStepVerification(answers: any[], stepNumber: number): Promise<ChainAnalysis> {
  const targetAnswer = answers.find(a => a.step_number === stepNumber);
  if (!targetAnswer) {
    throw new Error(`Step ${stepNumber} not found`);
  }
  
  return performFullChainAnalysis([targetAnswer]);
}

async function createResearchVerificationGate(answers: any[], stepNumber: number): Promise<VerificationGate> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 10;
  
  for (const answer of answers) {
    const text = answer.answer_text;
    
    // Check for citations
    const citationCount = (text.match(/\(\d{4}\)|et al\.|research shows|studies indicate/gi) || []).length;
    if (citationCount < 2) {
      score -= 2;
      issues.push(`Step ${answer.step_number}: Insufficient citations (${citationCount} found, minimum 2 required)`);
      recommendations.push('Add peer-reviewed citations with publication years');
    }
    
    // Check for evidence markers
    const evidenceMarkers = (text.match(/according to|data shows|research suggests|documented|empirical/gi) || []).length;
    if (evidenceMarkers < 3) {
      score -= 1.5;
      issues.push(`Step ${answer.step_number}: Lacks evidence-based language`);
      recommendations.push('Use more evidence-based language and documented examples');
    }
    
    // Check for practical implementation
    const implementationMarkers = (text.match(/timeline|budget|step \d+|month \d+|implementation|how to/gi) || []).length;
    if (implementationMarkers < 2) {
      score -= 1;
      issues.push(`Step ${answer.step_number}: Missing practical implementation details`);
      recommendations.push('Add specific timelines and implementation steps');
    }
  }
  
  return {
    stepNumber,
    gateType: 'research_verification',
    passed: score >= 7.0,
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

async function createSpeculationCheckGate(answers: any[], stepNumber: number): Promise<VerificationGate> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 10;
  
  for (const answer of answers) {
    const text = answer.answer_text;
    const words = text.split(/\s+/);
    const totalWords = words.length;
    
    // Count speculation indicators
    const speculationWords = (text.match(/might|could|possibly|perhaps|maybe|hypothetically|theoretically|potentially/gi) || []).length;
    const speculationPercentage = (speculationWords / totalWords) * 100;
    
    if (speculationPercentage > 20) {
      score -= 3;
      issues.push(`Step ${answer.step_number}: Excessive speculation (${speculationPercentage.toFixed(1)}%)`);
      recommendations.push('Replace speculative language with concrete evidence');
    }
    
    // Check for jargon density
    const jargonWords = (text.match(/\b[A-Z]{3,}\b|\b\w{12,}\b/g) || []).length;
    const jargonPercentage = (jargonWords / totalWords) * 100;
    
    if (jargonPercentage > 15) {
      score -= 2;
      issues.push(`Step ${answer.step_number}: High jargon density (${jargonPercentage.toFixed(1)}%)`);
      recommendations.push('Simplify language and define technical terms immediately');
    }
  }
  
  return {
    stepNumber,
    gateType: 'speculation_check',
    passed: score >= 7.0,
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

async function createEthicsScanGate(answers: any[], stepNumber: number): Promise<VerificationGate> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 10;
  
  const ethicalRiskKeywords = [
    'harm', 'discrimination', 'bias', 'manipulation', 'exploit', 'vulnerable',
    'without consent', 'privacy violation', 'deception', 'misinformation'
  ];
  
  for (const answer of answers) {
    const text = answer.answer_text.toLowerCase();
    
    // Scan for ethical risk indicators
    let riskScore = 0;
    ethicalRiskKeywords.forEach(keyword => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      if (matches > 0) {
        riskScore += matches * 0.1;
      }
    });
    
    if (riskScore > 0.7) {
      score -= 5;
      issues.push(`Step ${answer.step_number}: High ethical risk score (${riskScore.toFixed(2)})`);
      recommendations.push('Add ethical safeguards and consider vulnerable populations');
    } else if (riskScore > 0.3) {
      score -= 2;
      issues.push(`Step ${answer.step_number}: Moderate ethical concerns`);
      recommendations.push('Address potential ethical implications');
    }
  }
  
  return {
    stepNumber,
    gateType: 'ethics_scan',
    passed: score >= 7.0,
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

async function createAccessibilityTestGate(answers: any[], stepNumber: number): Promise<VerificationGate> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 10;
  
  for (const answer of answers) {
    const text = answer.answer_text;
    const sentences = text.split(/[.!?]+/);
    
    // Check average sentence length
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    if (avgSentenceLength > 25) {
      score -= 2;
      issues.push(`Step ${answer.step_number}: Sentences too long (avg ${avgSentenceLength.toFixed(1)} words)`);
      recommendations.push('Break down complex sentences for better readability');
    }
    
    // Check for explanatory elements
    const explanations = (text.match(/for example|such as|like|imagine|think of|analogy/gi) || []).length;
    if (explanations < 2) {
      score -= 1.5;
      issues.push(`Step ${answer.step_number}: Lacks explanatory examples`);
      recommendations.push('Add analogies and real-world examples');
    }
    
    // Check for structure
    const structure = (text.match(/first|second|next|finally|\d\.|•|—/gi) || []).length;
    if (structure < 2 && text.length > 500) {
      score -= 1;
      issues.push(`Step ${answer.step_number}: Poor structure for long content`);
      recommendations.push('Add clear structure with numbered points or headers');
    }
  }
  
  return {
    stepNumber,
    gateType: 'accessibility_test',
    passed: score >= 7.0,
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

async function handleIntervention(supabase: any, rabbitHoleId: string, analysis: ChainAnalysis) {
  console.log(`Intervention required: ${analysis.interventionType}`);
  
  if (analysis.interventionType === 'kill_switch') {
    // Mark rabbit hole as requiring immediate attention
    await supabase
      .from('rabbit_holes')
      .update({ 
        status: 'intervention_required',
        intervention_type: 'kill_switch',
        intervention_reason: 'Failed quality/ethics verification gates'
      })
      .eq('id', rabbitHoleId);
      
    // Log critical intervention
    await supabase
      .from('events')
      .insert({
        event_type: 'KillSwitchActivated',
        rabbit_hole_id: rabbitHoleId,
        payload: { analysis, reason: 'Quality below threshold or ethical violations detected' }
      });
  }
  
  // Create intervention recommendations
  const recommendations = analysis.verificationGates
    .filter(gate => !gate.passed)
    .flatMap(gate => gate.recommendations);
    
  await supabase
    .from('intervention_recommendations')
    .insert({
      rabbit_hole_id: rabbitHoleId,
      intervention_type: analysis.interventionType,
      recommendations,
      overall_score: analysis.overallQuality,
      created_at: new Date().toISOString()
    });
}

function getVerificationMessage(analysis: ChainAnalysis): string {
  if (!analysis.requiresIntervention) {
    return `Chain quality acceptable (${analysis.overallQuality.toFixed(1)}/10). Continue with current standards.`;
  }
  
  switch (analysis.interventionType) {
    case 'kill_switch':
      return `KILL SWITCH ACTIVATED: Critical quality/ethical failures detected (${analysis.overallQuality.toFixed(1)}/10). Immediate intervention required.`;
    case 'major_revision':
      return `Major revision required: Multiple quality gates failed (${analysis.overallQuality.toFixed(1)}/10). Significant improvements needed.`;
    case 'minor_adjustment':
      return `Minor adjustments needed: Some quality concerns detected (${analysis.overallQuality.toFixed(1)}/10). Address specific issues identified.`;
    default:
      return `Intervention required but type undetermined (${analysis.overallQuality.toFixed(1)}/10).`;
  }
}