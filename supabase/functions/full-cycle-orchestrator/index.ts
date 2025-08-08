// Full Cycle Orchestrator Edge Function
// Advances unattended runs through Phase 1 (Exploration) and Phase 2 (Grounding)
// Uses cron to invoke periodically and perform one safe step per run

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenSet(text: string): Set<string> {
  return new Set((text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\\s]/g, ' ')
    .split(/\\s+/)
    .filter((w) => w.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter((x) => b.has(x))).size;
  const uni = new Set([...a, ...b]).size || 1;
  return inter / uni;
}

async function processRun(supabase: any, run: any) {
  const runId = run.id;
  const rabbitHoleId = run.rabbit_hole_id;

  // Helper to log events
  const logEvent = async (level: string, message: string, payload: Record<string, unknown> = {}) => {
    await supabase.from('automation_events').insert({ run_id: runId, level, message, payload: { rabbitHoleId, phase: run.phase, ...payload } });
  };
  try {
    // Ownership validation
    const nowIso = new Date().toISOString();
    const { data: rh, error: rhErr } = await supabase
      .from('rabbit_holes')
      .select('id, user_id')
      .eq('id', rabbitHoleId)
      .single();
    if (rhErr || !rh || rh.user_id !== run.user_id) {
      await logEvent('error', 'Ownership validation failed', { run_user_id: run.user_id, rabbit_hole_user_id: rh?.user_id });
      await supabase.from('automation_runs').update({ status: 'failed', last_run_at: nowIso }).eq('id', runId);
      return;
    }

    // Acquire run lock (soft lock)
    if (run.in_progress_until && new Date(run.in_progress_until).getTime() > Date.now()) {
      await logEvent('info', 'Run currently in progress, skipping tick', { in_progress_until: run.in_progress_until });
      return;
    }
    await supabase.from('automation_runs').update({ in_progress_until: new Date(Date.now() + 9 * 60 * 1000).toISOString() }).eq('id', runId);

    // Phase 1: Exploration steps with strategy support (single | cycling)
    if (run.phase === 'phase1') {
      const nextStepNumber = (run.p1_steps_completed || 0) + 1;
      const strategy: string = run.p1_mode_strategy || 'single';

      // Determine mode for this step when cycling
      const chooseCyclingMode = (n: number): 'single' | 'exploration' | 'grounding' | 'devils_advocate' => {
        const pos = (n - 1) % 25; // 25-step pattern
        if (pos < 8) return 'single';          // 1-8: Single
        if (pos < 10) return 'exploration';    // 9-10: Exploration panel
        if (pos < 18) return 'single';         // 11-18: Single
        if (pos < 20) return 'grounding';      // 19-20: Grounding panel
        if (pos < 22) return 'devils_advocate';// 21-22: Devil's advocate
        return 'single';                       // 23-25: Single
      };

      const mode = strategy === 'cycling' ? chooseCyclingMode(nextStepNumber) : 'single';
      await logEvent('info', `Phase1 mode chosen: ${mode}`, { strategy, next_step: nextStepNumber });

      // 10 minute timeout safety wrapper
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

      let error: any = null;

      try {
        if (mode === 'exploration') {
          await logEvent('info', 'Phase1: invoking panel-step');
          const { error: err } = await supabase.functions.invoke('panel-step', {
            body: {
              rabbit_hole_id: rabbitHoleId,
              research_mode: run.research_mode_p1,
            },
            signal: controller.signal,
          });
          error = err;
        } else if (mode === 'grounding') {
          await logEvent('info', 'Phase1: invoking grounding-panel-step (P1)');
          const { error: err } = await supabase.functions.invoke('grounding-panel-step', {
            body: {
              rabbit_hole_id: rabbitHoleId,
              research_mode: run.research_mode_p1,
            },
            signal: controller.signal,
          });
          error = err;
        } else {
          const actionType = run.p1_steps_completed === 0 ? 'start' : 'next_step';
          await logEvent('info', `Phase1: invoking rabbit-hole-step (${actionType})`, { generation_mode: mode });
          const { error: err } = await supabase.functions.invoke('rabbit-hole-step', {
            body: {
              rabbit_hole_id: rabbitHoleId,
              action_type: actionType,
              generation_mode: mode === 'devils_advocate' ? 'devils_advocate' : 'single',
            },
            signal: controller.signal,
          });
          error = err;
        }
      } finally {
        clearTimeout(timeout);
      }

      if (error) {
        await logEvent('error', `Phase1 step failed: ${error.message || JSON.stringify(error)}`, { mode });
        // Backoff 2 minutes on error
        await supabase.from('automation_runs').update({
          last_run_at: new Date().toISOString(),
          next_run_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          status: 'active',
        }).eq('id', runId);
        return;
      }

      // Increment steps
      const stepsCompleted = (run.p1_steps_completed || 0) + 1;

      // Optional Early Stop: simple Jaccard convergence on last 3 valid answers
      let shouldEarlyStop = false;
      if (run.p1_early_stop) {
        const { data: answers } = await supabase
          .from('answers')
          .select('answer_text, step_number, is_valid')
          .eq('rabbit_hole_id', rabbitHoleId)
          .eq('is_valid', true)
          .order('step_number', { ascending: false })
          .limit(3);
        if (answers && answers.length === 3) {
          const [a, b, c] = answers.map((x: any) => tokenSet(x.answer_text));
          const sim = (jaccard(a, b) + jaccard(b, c) + jaccard(a, c)) / 3;
          if (sim >= 0.8) {
            shouldEarlyStop = true;
            await logEvent('info', `Early stop triggered by convergence (avg Jaccard=${sim.toFixed(3)})`);
          }
        }
      }

      // Decide next state
      const reachedTarget = stepsCompleted >= run.p1_target_steps;
      if (reachedTarget || shouldEarlyStop) {
        if (run.auto_select_enabled) {
          // Auto-select most interesting hypothesis proxy from recent answers
          const { data: candidates } = await supabase
            .from('answers')
            .select('id, generated_at, judge_scores')
            .eq('rabbit_hole_id', rabbitHoleId)
            .eq('is_valid', true)
            .order('step_number', { ascending: false })
            .limit(25);
          let best: any = null;
          let bestScore = -1;
          for (const c of candidates || []) {
            const js = c.judge_scores || {};
            const novelty = Number(js.novelty ?? 0);
            const support = Number(js.support ?? js.depth ?? js.coherence ?? 0);
            const testability = Number(js.testability ?? 0);
            const score = 0.7 * novelty + 0.3 * support;
            const meetsFloor = novelty >= 6 && support >= 5;
            if (!meetsFloor) continue;
            if (
              score > bestScore ||
              (score === bestScore && testability > Number(best?.judge_scores?.testability ?? 0)) ||
              (score === bestScore && testability === Number(best?.judge_scores?.testability ?? 0) && new Date(c.generated_at).getTime() < new Date(best.generated_at).getTime())
            ) {
              best = c;
              bestScore = score;
            }
          }
          if (best) {
            await logEvent('info', 'auto_selected_hypothesis', {
              selected_answer_id: best.id,
              score: bestScore,
              details: 'score = 0.7*novelty + 0.3*support; ties: testability then older created_at'
            });
          } else {
            await logEvent('info', 'auto_select_skipped', { reason: 'No candidate met floor (novelty >= 6 and support >= 5)' });
          }
        }
        await supabase.from('automation_runs').update({
          p1_steps_completed: stepsCompleted,
          phase: 'phase2',
          last_run_at: new Date().toISOString(),
          next_run_at: new Date(Date.now() + 10 * 1000).toISOString(), // small handoff delay
        }).eq('id', runId);
        await logEvent('info', `Phase1 complete (${stepsCompleted} steps). Moving to Phase2.`);
      } else {
        await supabase.from('automation_runs').update({
          p1_steps_completed: stepsCompleted,
          last_run_at: new Date().toISOString(),
          next_run_at: new Date(Date.now() + (run.p1_delay_sec || 5) * 1000).toISOString(),
        }).eq('id', runId);
        await logEvent('info', `Phase1 progress: ${stepsCompleted}/${run.p1_target_steps}`);
      }
      return;
    }

    // Phase 2: Grounding rounds via grounding-panel-step
    if (run.phase === 'phase2') {
      await logEvent('info', `Phase2: invoking grounding-panel-step (round ${run.p2_rounds_completed + 1}/${run.p2_rounds})`);

      // 10 minute timeout safety wrapper
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

      const { data, error } = await supabase.functions.invoke('grounding-panel-step', {
        body: {
          rabbit_hole_id: rabbitHoleId,
          research_mode: run.research_mode_p2,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (error) {
        await logEvent('error', `grounding-panel-step failed: ${error.message || JSON.stringify(error)}`);
        // Backoff 5 minutes on error
        await supabase.from('automation_runs').update({
          last_run_at: new Date().toISOString(),
          next_run_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          status: 'active',
        }).eq('id', runId);
        return;
      }

      const roundsCompleted = (run.p2_rounds_completed || 0) + 1;
      const finished = roundsCompleted >= run.p2_rounds;

      await supabase.from('automation_runs').update({
        p2_rounds_completed: roundsCompleted,
        last_run_at: new Date().toISOString(),
        next_run_at: finished ? null : new Date(Date.now() + Math.max(30, run.p1_delay_sec || 5) * 1000).toISOString(),
        status: finished ? 'completed' : 'active',
      }).eq('id', runId);

      await logEvent('info', finished ? 'Phase2 complete. Run finished.' : `Phase2 progress: ${roundsCompleted}/${run.p2_rounds}`);
      return;
    }
  } catch (e: any) {
    await supabase.from('automation_runs').update({ status: 'failed', last_run_at: new Date().toISOString() }).eq('id', runId);
    await supabase.from('automation_events').insert({ run_id: runId, level: 'error', message: `Unhandled error: ${e?.message || e}` });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    if (method !== 'POST' && method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = method === 'POST' ? await req.json().catch(() => ({})) : {} as any;

    // If a specific run_id is provided, process only that run
    const targetRunId = body.run_id as string | undefined;

    if (targetRunId) {
      const { data: run, error } = await supabase
        .from('automation_runs')
        .select('*')
        .eq('id', targetRunId)
        .single();

      if (error || !run) {
        return new Response(JSON.stringify({ success: false, error: 'Run not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await processRun(supabase, run);
      return new Response(JSON.stringify({ success: true, processed: 1 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Otherwise, process up to N due runs
    const nowIso = new Date().toISOString();
    const { data: runs, error } = await supabase
      .from('automation_runs')
      .select('*')
      .eq('status', 'active')
      .lte('next_run_at', nowIso)
      .order('next_run_at', { ascending: true })
      .limit(5);

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    for (const run of runs || []) {
      await processRun(supabase, run);
      // brief yield to avoid hot loop
      await sleep(250);
    }

    return new Response(JSON.stringify({ success: true, processed: runs?.length || 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unhandled' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
