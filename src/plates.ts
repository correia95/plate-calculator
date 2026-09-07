// Barbell plate maths: given a target total, a bar weight and the plates you
// own, work out what to load on each side.

export type Unit = 'kg' | 'lb';

export const PLATE_SETS: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5],
  lb: [45, 35, 25, 10, 5, 2.5, 1.25],
};

export const BARS: Record<Unit, { label: string; weight: number }[]> = {
  kg: [
    { label: 'Olympic barbell', weight: 20 },
    { label: "Women's Olympic bar", weight: 15 },
    { label: 'Training / technique bar', weight: 10 },
    { label: 'EZ curl bar', weight: 7 },
    { label: 'No bar', weight: 0 },
  ],
  lb: [
    { label: 'Olympic barbell', weight: 45 },
    { label: "Women's Olympic bar", weight: 35 },
    { label: 'Training bar', weight: 22 },
    { label: 'EZ curl bar', weight: 15 },
    { label: 'No bar', weight: 0 },
  ],
};

export interface PlatePick {
  weight: number;
  count: number; // per side
}

export interface Result {
  perSide: PlatePick[];
  loadedTotal: number; // bar + all plates
  perSideWeight: number;
  shortfall: number; // how far under target (0 if exact or over)
  exact: boolean;
}

// greedy from largest plate; `available` is per-side counts (Infinity if unlimited)
export function loadBar(
  target: number,
  bar: number,
  plates: number[],
  availablePerSide: Record<number, number> | null,
): Result | null {
  if (!Number.isFinite(target) || target < 0) return null;
  if (target < bar) {
    return { perSide: [], loadedTotal: bar, perSideWeight: 0, shortfall: 0, exact: target === bar };
  }
  let remainingPerSide = (target - bar) / 2;
  const perSide: PlatePick[] = [];
  const sorted = [...plates].sort((a, b) => b - a);

  for (const p of sorted) {
    if (p > remainingPerSide + 1e-9) continue;
    const cap = availablePerSide ? Math.floor((availablePerSide[p] ?? 0) / 1) : Infinity;
    let n = Math.floor((remainingPerSide + 1e-9) / p);
    if (n > cap) n = cap;
    if (n > 0) {
      perSide.push({ weight: p, count: n });
      remainingPerSide -= n * p;
    }
  }

  const perSideWeight = perSide.reduce((s, x) => s + x.weight * x.count, 0);
  const loadedTotal = bar + perSideWeight * 2;
  const shortfall = Math.max(0, Math.round((target - loadedTotal) * 100) / 100);
  return {
    perSide,
    loadedTotal: Math.round(loadedTotal * 100) / 100,
    perSideWeight: Math.round(perSideWeight * 100) / 100,
    shortfall,
    exact: Math.abs(target - loadedTotal) < 1e-6,
  };
}

// warm-up ladder: even steps from an empty bar to the working weight
export function warmup(working: number, bar: number, steps = 4): number[] {
  if (working <= bar) return [];
  const out: number[] = [];
  for (let i = 1; i <= steps; i++) {
    const w = bar + ((working - bar) * i) / (steps + 1);
    out.push(Math.round(w / 2.5) * 2.5);
  }
  out.push(working);
  return [...new Set(out)];
}

export function fmt(n: number): string {
  const s = (Math.round(n * 100) / 100).toString();
  return s;
}
