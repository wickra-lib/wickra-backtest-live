// Deterministic OHLCV sample series on an hourly grid, so the demo is
// reproducible and the chart reads as dates. Several regimes let you see how a
// strategy behaves in trend vs chop vs high volatility.

export interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number }

export type Regime = 'trend-up' | 'chop' | 'volatile' | 'trend-down' | 'bull-then-bear'

export const REGIMES: { id: Regime; label: string }[] = [
  { id: 'bull-then-bear', label: 'Bull → bear' },
  { id: 'trend-up', label: 'Uptrend' },
  { id: 'trend-down', label: 'Downtrend' },
  { id: 'chop', label: 'Choppy range' },
  { id: 'volatile', label: 'High volatility' },
]

// Small seeded PRNG (mulberry32) for reproducible noise.
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeCandles(regime: Regime, bars = 260): Candle[] {
  const base = Math.floor(Date.UTC(2024, 0, 1) / 1000)
  const r = rng(regime.length * 9176 + bars)
  const out: Candle[] = []
  let p = 100
  for (let i = 0; i < bars; i++) {
    let drift = 0, vol = 1
    switch (regime) {
      case 'trend-up': drift = 0.45; vol = 1; break
      case 'trend-down': drift = -0.42; vol = 1; break
      case 'chop': drift = 0; vol = 0.8; break
      case 'volatile': drift = 0.1; vol = 2.6; break
      case 'bull-then-bear': drift = i < bars * 0.55 ? 0.5 : -0.55; vol = 1.2; break
    }
    const wave = Math.sin(i * 0.16) * 1.8 * vol
    const noise = (r() - 0.5) * 3.2 * vol
    const open = p
    p = Math.max(5, p + drift + wave * 0.25 + noise)
    const close = p
    const hi = Math.max(open, close) + Math.abs(noise) * 0.4 + 0.5
    const lo = Math.min(open, close) - Math.abs(noise) * 0.4 - 0.5
    out.push({ time: base + i * 3600, open, high: hi, low: lo, close, volume: 800 + Math.floor(r() * 600) })
  }
  return out
}
