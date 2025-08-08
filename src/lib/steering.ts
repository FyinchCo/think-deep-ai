import { JaccardConvergenceDetector } from '@/algorithms/convergence/jaccard';

// Heuristic: sentences containing hedge words divided by total sentences
export function speculationFraction(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return 0;
  const hedges = /(\bmay\b|\bmight\b|\bcould\b|\bperhaps\b|\bpossibly\b|\bappears to\b|\bseems to\b)/i;
  const speculative = sentences.filter(s => hedges.test(s)).length;
  return speculative / sentences.length;
}

// Heuristic jargon detection: ratio of uncommon tokens and acronym count
export function jargonTriggered(text: string): boolean {
  const tokens = text.toUpperCase().match(/[A-Z][A-Z0-9\-]{1,}/g) || [];
  const acronymMatches = (text.match(/\b[A-Z]{2,6}\b/g) || []).filter(a => a !== 'I' && a !== 'A');
  const longWords = (text.match(/\b[a-zA-Z]{12,}\b/g) || []).length;
  const words = (text.match(/\b[\w'-]+\b/g) || []).length || 1;
  const uncommonRatio = (longWords + acronymMatches.length) / words;
  return uncommonRatio > 0.2 || new Set(acronymMatches).size > 10;
}

export function shouldRouteToGrounding(text: string): boolean {
  return speculationFraction(text) > 0.2 || jargonTriggered(text);
}

export function shouldSteerToExploration(lastScores: Array<{ novelty?: number; depth?: number }>): boolean {
  if (lastScores.length < 2) return false;
  const a = lastScores[lastScores.length - 1];
  const b = lastScores[lastScores.length - 2];
  const low = (s?: number) => typeof s === 'number' && s < 6;
  return (low(a.novelty) || low(a.depth)) && (low(b.novelty) || low(b.depth));
}

export function makeConvergenceDetector(): JaccardConvergenceDetector {
  return new JaccardConvergenceDetector({ jaccardThreshold: 0.8, windowSize: 3, minIterations: 3, stabilityThreshold: 0.9, noveltyThreshold: 0.1 });
}

export function checkEarlyStopByTexts(texts: string[]): boolean {
  const detector = makeConvergenceDetector();
  let converged = false;
  for (const t of texts) {
    const m = detector.addResponse(t);
    converged = m.isConverged || converged;
  }
  return converged;
}

export function deterministicId(title: string, text: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const seed = (text || '').slice(0, 120);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = (hash >>> 0).toString(16);
  return `${slug}-${hex}`;
}
