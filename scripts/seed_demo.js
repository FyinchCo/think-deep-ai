#!/usr/bin/env node

/**
 * Demo Seed Script
 * 
 * Creates sample data and runs a demonstration exploration
 * to showcase the AI system capabilities.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDemo() {
  console.log('🌱 Seeding demonstration data...');

  try {
    // Create demo user profile
    const demoUser = {
      user_id: 'demo-user-id',
      display_name: 'Demo User',
      avatar_url: null,
      bio: 'Demonstration user for The Axiom Project'
    };

    console.log('👤 Creating demo user profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(demoUser, { onConflict: 'user_id' });

    if (profileError && !profileError.message.includes('already exists')) {
      console.warn('⚠️ Profile creation warning:', profileError.message);
    }

    // Seed sample exploration questions
    const sampleQuestions = [
      {
        question: "What if consciousness is not produced by the brain but rather filtered by it?",
        domain: "consciousness",
        complexity: "high",
        expected_breakthrough: true
      },
      {
        question: "How would ethics change if we discovered free will was an illusion?",
        domain: "ethics", 
        complexity: "high",
        expected_breakthrough: true
      },
      {
        question: "What would morality look like in a universe where time flows backwards?",
        domain: "ethics",
        complexity: "high", 
        expected_breakthrough: true
      }
    ];

    console.log('❓ Creating sample questions...');
    for (const q of sampleQuestions) {
      console.log(`   - "${q.question.substring(0, 50)}..."`);
    }

    // Create a sample exploration session
    const sampleExploration = {
      user_id: 'demo-user-id',
      question: sampleQuestions[0].question,
      mode: 'exploration',
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🔬 Creating sample exploration...');
    const { data: exploration, error: explorationError } = await supabase
      .from('explorations')
      .insert(sampleExploration)
      .select()
      .single();

    if (explorationError) {
      console.warn('⚠️ Exploration creation warning:', explorationError.message);
      return;
    }

    // Create sample responses
    const sampleResponses = [
      {
        exploration_id: exploration.id,
        step_number: 1,
        model_provider: 'grok',
        response_text: `The brain-as-filter hypothesis represents a profound paradigm shift in consciousness studies. Rather than generating consciousness, the brain might act as a sophisticated antenna, tuning into and constraining a broader field of awareness that exists independently.

This reframes neurological damage not as consciousness destruction, but as filtering disruption - like static interfering with a radio signal. The implications are staggering: consciousness might be fundamental to reality itself, with brains serving as biological receivers that create the illusion of localized, individual minds.

Consider how this transforms our understanding of death, mental illness, and the hard problem of consciousness. If consciousness is primary and brains are secondary, we're not biological machines that somehow produce awareness, but rather awareness itself, temporarily constrained by biological architecture.`,
        quality_metrics: {
          novelty: 0.87,
          coherence: 0.91,
          depth: 0.85,
          relevance: 0.94,
          creativity: 0.79,
          logic: 0.83,
          insight: 0.88
        },
        breakthrough_detected: true,
        created_at: new Date().toISOString()
      },
      {
        exploration_id: exploration.id,
        step_number: 2,
        model_provider: 'claude',
        response_text: `Building on the filter hypothesis, we encounter the transmission theory's deepest implications. If consciousness is received rather than generated, the brain becomes a constraint mechanism - a bottleneck that creates the specific character of human experience.

This suggests our normal waking consciousness is just one possible configuration among infinite potential states. Altered states, mystical experiences, and even mental illness might represent different filtering patterns rather than malfunctions.

The philosophical revolution here is profound: instead of consciousness emerging from complexity, complexity emerges from consciousness being filtered. This inverts our entire materialist framework and suggests that what we call "reality" is actually consciousness experiencing itself through biological limitations.`,
        quality_metrics: {
          novelty: 0.82,
          coherence: 0.89,
          depth: 0.91,
          relevance: 0.88,
          creativity: 0.74,
          logic: 0.86,
          insight: 0.85
        },
        breakthrough_detected: false,
        created_at: new Date().toISOString()
      }
    ];

    console.log('💭 Creating sample responses...');
    for (const response of sampleResponses) {
      const { error: responseError } = await supabase
        .from('responses')
        .insert(response);

      if (responseError) {
        console.warn('⚠️ Response creation warning:', responseError.message);
      } else {
        console.log(`   ✓ Step ${response.step_number} (${response.model_provider})`);
      }
    }

    // Create sample breakthrough detection
    const breakthroughIndicators = {
      response_id: sampleResponses[0].exploration_id, // Using exploration_id as placeholder
      temporal_displacement: 0.72,
      assumption_inversion: 0.85,
      meta_cognitive_framing: 0.78,
      constraint_paradox: 0.65,
      conceptual_novelty: 0.87,
      overall_score: 0.774,
      is_paradigm_shift: true,
      created_at: new Date().toISOString()
    };

    console.log('🚀 Creating breakthrough detection record...');
    const { error: breakthroughError } = await supabase
      .from('breakthrough_indicators')
      .insert(breakthroughIndicators);

    if (breakthroughError) {
      console.warn('⚠️ Breakthrough creation warning:', breakthroughError.message);
    }

    console.log('✅ Demo seeding completed successfully!');
    console.log('🎯 You can now run the application and see sample data.');
    console.log('🔗 Navigate to /cognitive-lab to explore the demonstration.');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDemo();