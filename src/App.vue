<script setup lang="ts">
import { ref, shallowRef, onMounted, nextTick } from 'vue'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { ensureWasm, run_json, version } from './lib/wasm'

const DEFAULT_SPEC = `{
  "symbol": "DEMO", "timeframe": "1h",
  "indicators": {
    "fast": { "type": "Ema", "params": [9] },
    "slow": { "type": "Ema", "params": [21] }
  },
  "entry": { "cross_above": ["fast", "slow"] },
  "exit":  { "cross_below": ["fast", "slow"] },
  "sizing": { "type": "fixed_fraction", "fraction": 0.95 },
  "risk":   { "trailing_stop_pct": 6.0 }
}`

const specText = ref(DEFAULT_SPEC)
const capital = ref(10000)
const running = ref(false)
const error = ref('')
const ver = ref('')
const report = shallowRef<any>(null)

const chartEl = ref<HTMLElement | null>(null)
let chart: IChartApi | null = null
let equitySeries: ISeriesApi<'Area'> | null = null

// A deterministic 240-bar OHLCV series (trend up, then chop, then trend down)
// on an hourly grid, so the demo always trades and the chart reads as dates.
function sampleCandles() {
  const base = Math.floor(Date.UTC(2024, 0, 1) / 1000)
  const candles = []
  let p = 100
  for (let i = 0; i < 240; i++) {
    const drift = i < 90 ? 0.55 : i < 150 ? 0 : -0.5
    const wave = Math.sin(i * 0.18) * 2.4 + Math.sin(i * 0.06) * 4
    const open = p
    p = Math.max(5, p + drift + (wave - (Math.sin((i - 1) * 0.18) * 2.4 + Math.sin((i - 1) * 0.06) * 4)) * 0.6)
    const close = p
    candles.push({
      time: base + i * 3600,
      open, high: Math.max(open, close) + 0.8, low: Math.min(open, close) - 0.8,
      close, volume: 1000 + (i % 7) * 50,
    })
  }
  return candles
}

async function runBacktest() {
  error.value = ''
  running.value = true
  try {
    await ensureWasm()
    ver.value = version()
    let spec: unknown
    try { spec = JSON.parse(specText.value) } catch (e) { throw new Error('Spec is not valid JSON: ' + (e as Error).message) }
    const request = JSON.stringify({ capital: capital.value, spec, candles: sampleCandles() })
    const out = run_json(request)
    report.value = JSON.parse(out)
    await nextTick()
    drawEquity()
  } catch (e) {
    report.value = null
    error.value = (e as Error).message || String(e)
  } finally {
    running.value = false
  }
}

function drawEquity() {
  if (!chartEl.value || !report.value) return
  if (!chart) {
    chart = createChart(chartEl.value, {
      height: 300,
      layout: { background: { color: 'transparent' }, textColor: '#9aa6b4' },
      grid: { vertLines: { color: '#1a2230' }, horzLines: { color: '#1a2230' } },
      rightPriceScale: { borderColor: '#222a36' },
      timeScale: { borderColor: '#222a36' },
    })
    equitySeries = chart.addAreaSeries({
      lineColor: '#f8cf63', topColor: 'rgba(248,207,99,0.28)', bottomColor: 'rgba(248,207,99,0.0)', lineWidth: 2,
    })
    new ResizeObserver(() => chart && chartEl.value && chart.applyOptions({ width: chartEl.value.clientWidth })).observe(chartEl.value)
  }
  equitySeries!.setData(report.value.equity.map((e: any) => ({ time: e.time as UTCTimestamp, value: e.equity })))
  chart.timeScale().fitContent()
  chart.applyOptions({ width: chartEl.value.clientWidth })
}

const pct = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2) + '%'
const money = (x: number) => (x >= 0 ? '+' : '') + '$' + x.toFixed(2)
const num = (x: number) => x.toFixed(2)

onMounted(runBacktest)
</script>

<template>
  <div class="wrap">
    <header class="hero">
      <div class="brand">
        <svg class="logo" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#11161f" stroke="#2a3342"/><rect x="44" y="20" width="12" height="60" rx="6" fill="#f8cf63"/><rect x="38" y="36" width="24" height="28" rx="6" fill="#f8cf63"/></svg>
        <h1>wickra <b>backtest</b></h1>
      </div>
      <p class="tag">Backtest a strategy in your browser — backtest ≡ live, byte-identical in 10 languages.</p>
      <p class="sub">
        A streaming-native, event-driven backtester built on the Wickra indicator core. A strategy is
        <b>data</b> — a JSON spec, not code — so a backtest and a live run over the same spec produce identical
        signals. The whole engine below runs <b>100% in your browser</b> via WebAssembly: zero backend, no upload.
      </p>
      <div class="pills">
        <span class="pill"><b>O(1)</b> per bar</span>
        <span class="pill"><b>495</b> indicators</span>
        <span class="pill"><b>10</b> languages</span>
        <span class="pill">order book · trades · funding</span>
        <span class="pill">long/short · leverage · fees · slippage</span>
        <span class="pill">0 backend</span>
      </div>
    </header>

    <h2>Live demo</h2>
    <p class="section-sub">
      Edit the strategy spec, hit Run — it backtests over a built-in 240-bar sample series, entirely client-side
      (powered by <code>wickra-backtest-wasm</code>). The exact same engine, fed live bars, becomes the live bot.
    </p>

    <div class="grid2">
      <div class="panel">
        <div class="demo-head">
          <span class="ttl">Strategy spec <span class="muted">(JSON)</span></span>
          <span class="muted">capital&nbsp;
            <input v-model.number="capital" type="number" min="100" step="100"
                   style="width:90px;background:#0c111a;border:1px solid var(--line);color:#d7e0ea;border-radius:6px;padding:4px 6px"/>
          </span>
        </div>
        <textarea class="spec" v-model="specText" spellcheck="false"></textarea>
        <div class="run-row">
          <button class="run" :disabled="running" @click="runBacktest">{{ running ? 'Running…' : 'Run backtest' }}</button>
          <span v-if="ver" class="muted">engine wasm v{{ ver }}</span>
        </div>
        <p v-if="error" class="err">⚠ {{ error }}</p>
      </div>

      <div class="panel">
        <div class="ttl" style="font-weight:600;margin-bottom:10px">Result</div>
        <div v-if="report" class="metrics">
          <div class="metric"><div class="k">Return</div><div class="v" :class="report.metrics.return_pct>=0?'pos':'neg'">{{ pct(report.metrics.return_pct) }}</div></div>
          <div class="metric"><div class="k">PnL</div><div class="v" :class="report.metrics.pnl>=0?'pos':'neg'">{{ money(report.metrics.pnl) }}</div></div>
          <div class="metric"><div class="k">Trades</div><div class="v">{{ report.metrics.num_trades }}</div></div>
          <div class="metric"><div class="k">Sharpe</div><div class="v">{{ num(report.metrics.sharpe) }}</div></div>
          <div class="metric"><div class="k">Sortino</div><div class="v">{{ num(report.metrics.sortino) }}</div></div>
          <div class="metric"><div class="k">Calmar</div><div class="v">{{ num(report.metrics.calmar) }}</div></div>
          <div class="metric"><div class="k">Max drawdown</div><div class="v neg">{{ num(report.metrics.max_drawdown) }}%</div></div>
          <div class="metric"><div class="k">Win rate</div><div class="v">{{ num(report.metrics.win_rate*100) }}%</div></div>
          <div class="metric"><div class="k">Fees paid</div><div class="v">${{ num(report.fees_paid) }}</div></div>
        </div>
        <div v-else class="muted">Run the backtest to see the report.</div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="ttl" style="font-weight:600;margin-bottom:10px">Equity curve</div>
      <div id="chart" ref="chartEl"></div>
    </div>

    <div v-if="report && report.trades.length" class="panel" style="margin-top:18px">
      <div class="ttl" style="font-weight:600;margin-bottom:10px">Trades <span class="muted">({{ report.trades.length }})</span></div>
      <table class="trades">
        <thead><tr><th>#</th><th>Entry</th><th>Exit</th><th>Qty</th><th>PnL</th><th>Return</th><th>Reason</th></tr></thead>
        <tbody>
          <tr v-for="(t, i) in report.trades" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ t.entry_price.toFixed(2) }}</td>
            <td>{{ t.exit_price.toFixed(2) }}</td>
            <td>{{ t.qty.toFixed(2) }}</td>
            <td :style="{color: t.pnl>=0 ? 'var(--green)' : 'var(--red)'}">{{ money(t.pnl) }}</td>
            <td :style="{color: t.return_pct>=0 ? 'var(--green)' : 'var(--red)'}">{{ pct(t.return_pct) }}</td>
            <td style="text-align:left;color:var(--dim)">{{ t.reason }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>Why it's different</h2>
    <p class="section-sub">Off-the-shelf backtesters recompute indicators over the whole history every tick and reimplement the math per language. Wickra doesn't.</p>
    <div class="cards">
      <div class="panel card"><h3>Backtest ≡ live</h3><p>The engine consumes the same O(1) <code>wickra-core</code> indicator kernels as live Wickra. Feed it historical bars → backtest; feed it live bars → the bot. One code path, no reimplementation drift.</p></div>
      <div class="panel card"><h3>O(1) per bar</h3><p>Every indicator is a streaming state machine that updates in constant time — years of tick data in seconds, not hours. About 1.7M bars/second on one core.</p></div>
      <div class="panel card"><h3>10 languages, one result</h3><p>Rust, Python, Node.js, WASM, C, C++, C#, Go, Java, R. A shared golden corpus pins every binding to byte-identical reports — for OHLCV and every microstructure feed.</p></div>
      <div class="panel card"><h3>Microstructure</h3><p>Replay the order book, trades, perpetual funding and open interest as strategy inputs — backtesting most off-the-shelf tools can't do.</p></div>
      <div class="panel card"><h3>Realistic execution</h3><p>Long/short, market/limit/stop orders, leverage and position caps, five sizing models, intrabar SL/TP/trailing stops, maker/taker fees, three slippage models, funding, liquidation, latency.</p></div>
      <div class="panel card"><h3>Strategy = data</h3><p>A strategy is a JSON spec, validated by a JSON Schema. No code to deploy, no DSL to learn twice — the same spec runs from every language binding.</p></div>
    </div>

    <h2>Docs &amp; getting started</h2>
    <div class="cards">
      <div class="panel card"><h3>Strategy spec reference</h3><p>The full DSL — operands, conditions, sizing, costs, slippage, risk, execution and the report shape.<br/><a href="https://github.com/wickra-lib/wickra-backtest/blob/main/docs/STRATEGY_SPEC.md">STRATEGY_SPEC.md →</a></p></div>
      <div class="panel card"><h3>Cookbook</h3><p>Ready-to-run strategies — RSI mean reversion, MACD trend, Bollinger breakout, Donchian, funding carry, order-book imbalance.<br/><a href="https://github.com/wickra-lib/wickra-backtest/blob/main/docs/COOKBOOK.md">COOKBOOK.md →</a></p></div>
      <div class="panel card"><h3>Install</h3><p><code>pip install wickra-backtest</code> · <code>npm i wickra-backtest</code> · <code>cargo add wickra-backtest</code> — plus C#, Go, Java, R.<br/><a href="https://github.com/wickra-lib/wickra-backtest">GitHub →</a></p></div>
    </div>

    <footer>
      <div class="links">
        <a href="https://github.com/wickra-lib/wickra-backtest">GitHub</a>
        <a href="https://github.com/wickra-lib/wickra-backtest/blob/main/docs/STRATEGY_SPEC.md">Spec reference</a>
        <a href="https://github.com/wickra-lib/wickra-backtest/blob/main/docs/COOKBOOK.md">Cookbook</a>
        <a href="https://wickra.org">wickra.org</a>
        <a href="https://live.wickra.org">live indicator demo</a>
      </div>
      Built on <a href="https://github.com/wickra-lib/wickra">Wickra</a>. Not a trading system — backtest results are not
      indicative of future performance. Dual-licensed MIT OR Apache-2.0.
    </footer>
  </div>
</template>
