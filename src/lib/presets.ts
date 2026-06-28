// Strategy presets — the cookbook strategies from the wickra-backtest docs that
// run on plain OHLCV (the funding-carry and order-book ones need feed data, so
// they are described in the Cookbook section but not wired into the demo).

export interface Preset {
  id: string
  name: string
  desc: string
  spec: string
}

const j = (o: unknown) => JSON.stringify(o, null, 2)

export const PRESETS: Preset[] = [
  {
    id: 'ema',
    name: 'EMA cross',
    desc: 'Go long when the fast EMA crosses above the slow EMA, exit on the cross back down. A trailing stop caps the give-back.',
    spec: j({
      symbol: 'DEMO', timeframe: '1h',
      indicators: { fast: { type: 'Ema', params: [9] }, slow: { type: 'Ema', params: [21] } },
      entry: { cross_above: ['fast', 'slow'] },
      exit: { cross_below: ['fast', 'slow'] },
      sizing: { type: 'fixed_fraction', fraction: 0.95 },
      risk: { trailing_stop_pct: 6.0 },
    }),
  },
  {
    id: 'rsi',
    name: 'RSI mean reversion',
    desc: 'Buy oversold (RSI < 30), sell back to the mean (RSI > 50). Half-size, with taker fees and fixed slippage.',
    spec: j({
      symbol: 'DEMO', timeframe: '1h',
      indicators: { rsi: { type: 'Rsi', params: [14] } },
      entry: { lt: ['rsi', 30] },
      exit: { gt: ['rsi', 50] },
      sizing: { type: 'fixed_fraction', fraction: 0.5 },
      costs: { taker_bps: 5, slippage: { type: 'fixed_bps', bps: 2 } },
    }),
  },
  {
    id: 'macd',
    name: 'MACD trend (long + short)',
    desc: 'Trade both sides of the MACD/signal cross — long above, short below — full size.',
    spec: j({
      symbol: 'DEMO', timeframe: '1h',
      indicators: { macd: { type: 'Macd', params: [12, 26, 9] } },
      entry: { cross_above: ['macd.macd', 'macd.signal'] },
      exit: { cross_below: ['macd.macd', 'macd.signal'] },
      short_entry: { cross_below: ['macd.macd', 'macd.signal'] },
      short_exit: { cross_above: ['macd.macd', 'macd.signal'] },
      sizing: { type: 'fixed_fraction', fraction: 0.95 },
    }),
  },
  {
    id: 'bollinger',
    name: 'Bollinger breakout',
    desc: 'Enter when price closes above the upper band, exit back to the middle. Volatility-targeted sizing.',
    spec: j({
      symbol: 'DEMO', timeframe: '1h',
      indicators: { bb: { type: 'Bollinger', params: [20, 2] } },
      entry: { gt: [{ price: 'close' }, 'bb.upper'] },
      exit: { lt: [{ price: 'close' }, 'bb.middle'] },
      sizing: { type: 'vol_target', target_vol: 0.02, lookback: 20 },
    }),
  },
  {
    id: 'donchian',
    name: 'Donchian breakout',
    desc: 'Breakout of the 20-bar high, exit on the 20-bar low. Risk-per-trade sizing.',
    spec: j({
      symbol: 'DEMO', timeframe: '1h',
      indicators: { dc: { type: 'Donchian', params: [20] } },
      entry: { ge: [{ price: 'high' }, 'dc.upper'] },
      exit: { le: [{ price: 'low' }, 'dc.lower'] },
      sizing: { type: 'risk_per_trade', risk_pct: 1.0 },
      risk: { stop_loss_pct: 3.0 },
    }),
  },
]
