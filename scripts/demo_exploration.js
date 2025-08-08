#!/usr/bin/env node

/**
 * Demo Exploration Script
 *
 * Usage:
 *   node scripts/demo_exploration.js "Your question here"
 *
 * Creates a minimal exploration with a single response so reviewers
 * can see data without clicking through the UI.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDemo() {
  const question = process.argv.slice(2).join(' ') || 'What is the best cheeseburger in Virginia?';
  console.log('🍔 Running demo exploration with question:', question);

  try {
    // Ensure a demo profile exists
    const demoUser = {
      user_id: 'demo-user-id',
      display_name: 'Demo User',
      avatar_url: null,
      bio: 'Demonstration user for The Axiom Project'
    };

    await supabase.from('profiles').upsert(demoUser, { onConflict: 'user_id' });

    // Create exploration
    const exploration = {
      user_id: 'demo-user-id',
      question,
      mode: 'exploration',
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: exp, error: expErr } = await supabase
      .from('explorations')
      .insert(exploration)
      .select()
      .single();

    if (expErr) {
      console.error('⚠️ Failed to create exploration:', expErr.message);
      process.exit(1);
    }

    // Create a single response
    const response = {
      exploration_id: exp.id,
      step_number: 1,
      model_provider: 'openai',
      response_text: `Here is a structured approach to answer: "${question}"\n\n- Define criteria (taste, freshness, price).\n- Sample 3-5 local favorites.\n- Apply a weighted scorecard.\n\nConclusion: Use evidence over vibes—this platform helps you reason transparently.`,
      quality_metrics: {
        novelty: 0.42,
        coherence: 0.88,
        depth: 0.52,
        relevance: 0.93,
        creativity: 0.38,
        logic: 0.81,
        insight: 0.57
      },
      breakthrough_detected: false,
      created_at: new Date().toISOString()
    };

    const { data: resp, error: respErr } = await supabase
      .from('responses')
      .insert(response)
      .select()
      .single();

    if (respErr) {
      console.error('⚠️ Failed to create response:', respErr.message);
      process.exit(1);
    }

    console.log('\n✅ Demo exploration created!');
    console.log('   Exploration ID:', exp.id);
    console.log('   Response ID   :', resp.id);
    console.log('\nTip: Open /cognitive-lab to view visualizations.');
  } catch (e) {
    console.error('❌ Demo run failed:', e);
    process.exit(1);
  }
}

runDemo();
