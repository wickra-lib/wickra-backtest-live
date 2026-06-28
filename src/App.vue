<script setup lang="ts">
import { ref, shallowRef, onMounted, nextTick } from 'vue'
import {
  createChart, CrosshairMode,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import { ensureWasm, run_json, version } from './lib/wasm'
import { PRESETS } from './lib/presets'
import { makeCandles, REGIMES, type Regime, type Candle } from './lib/data'

const specText = ref(PRESETS[0].spec)
const activePreset = ref(PRESETS[0].id)
const regime = ref<Regime>('bull-then-bear')
const capital = ref(10000)
const running = ref(false)
const error = ref('')
const ver = ref('')
const report = shallowRef<any>(null)
let candles: Candle[] = []

const priceEl = ref<HTMLElement | null>(null)
const equityEl = ref<HTMLElement | null>(null)
let priceChart: IChartApi | null = null
let equityChart: IChartApi | null = null
let candleSeries: ISeriesApi<'Candlestick'> | null = null
let equitySeries: ISeriesApi<'Area'> | null = null
let ddSeries: ISeriesApi<'Area'> | null = null

function loadPreset(id: string) {
  const p = PRESETS.find((x) => x.id === id)!
  activePreset.value = id
  specText.value = p.spec
  runBacktest()
}

function loadAndScroll(id: string) {
  loadPreset(id)
  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
}

async function runBacktest() {
  error.value = ''
  running.value = true
  try {
    await ensureWasm()
    ver.value = version()
    let spec: unknown
    try { spec = JSON.parse(specText.value) } catch (e) { throw new Error('Spec is not valid JSON: ' + (e as Error).message) }
    candles = makeCandles(regime.value)
    const out = run_json(JSON.stringify({ capital: capital.value, spec, candles }))
    report.value = JSON.parse(out)
    await nextTick()
    draw()
  } catch (e) {
    report.value = null
    error.value = (e as Error).message || String(e)
  } finally {
    running.value = false
  }
}

function ensureCharts() {
  const common = {
    layout: { background: { color: 'transparent' }, textColor: '#9aa6b4', fontSize: 11 },
    grid: { vertLines: { color: '#161d29' }, horzLines: { color: '#161d29' } },
    rightPriceScale: { borderColor: '#222a36' },
    timeScale: { borderColor: '#222a36', timeVisible: true },
    crosshair: { mode: CrosshairMode.Normal },
  } as const
  if (!priceChart && priceEl.value) {
    priceChart = createChart(priceEl.value, { height: 300, ...common })
    candleSeries = priceChart.addCandlestickSeries({
      upColor: '#4ade80', downColor: '#f87171', borderVisible: false, wickUpColor: '#4ade80', wickDownColor: '#f87171',
    })
    new ResizeObserver(() => priceChart && priceEl.value && priceChart.applyOptions({ width: priceEl.value.clientWidth })).observe(priceEl.value)
  }
  if (!equityChart && equityEl.value) {
    equityChart = createChart(equityEl.value, { height: 210, ...common })
    equitySeries = equityChart.addAreaSeries({ lineColor: '#f8cf63', topColor: 'rgba(248,207,99,0.26)', bottomColor: 'rgba(248,207,99,0)', lineWidth: 2, priceScaleId: 'right' })
    ddSeries = equityChart.addAreaSeries({ lineColor: 'rgba(248,113,113,0.9)', topColor: 'rgba(248,113,113,0)', bottomColor: 'rgba(248,113,113,0.30)', lineWidth: 1, priceScaleId: 'dd' })
    equityChart.priceScale('dd').applyOptions({ scaleMargins: { top: 0.75, bottom: 0 }, visible: false })
    new ResizeObserver(() => equityChart && equityEl.value && equityChart.applyOptions({ width: equityEl.value.clientWidth })).observe(equityEl.value)
  }
}

function draw() {
  ensureCharts()
  if (!report.value) return
  candleSeries!.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })))
  const markers = report.value.trades.flatMap((t: any) => ([
    { time: t.entry_time as UTCTimestamp, position: 'belowBar', color: '#4ade80', shape: 'arrowUp', text: t.qty < 0 ? 'short' : 'long' },
    { time: t.exit_time as UTCTimestamp, position: 'aboveBar', color: '#f87171', shape: 'arrowDown', text: 'exit' },
  ]))
  markers.sort((a: any, b: any) => a.time - b.time)
  candleSeries!.setMarkers(markers)
  priceChart!.timeScale().fitContent()
  priceChart!.applyOptions({ width: priceEl.value!.clientWidth })

  let peak = -Infinity
  const eq = report.value.equity.map((e: any) => ({ time: e.time as UTCTimestamp, value: e.equity }))
  const dd = report.value.equity.map((e: any) => { peak = Math.max(peak, e.equity); return { time: e.time as UTCTimestamp, value: e.equity - peak } })
  equitySeries!.setData(eq)
  ddSeries!.setData(dd)
  equityChart!.timeScale().fitContent()
  equityChart!.applyOptions({ width: equityEl.value!.clientWidth })
}

const pct = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2) + '%'
const money = (x: number) => (x >= 0 ? '+$' : '-$') + Math.abs(x).toFixed(2)
const num = (x: number) => x.toFixed(2)

onMounted(runBacktest)
</script>

<template>
  <div class="wrap">
    <!-- HERO -->
    <header class="hero">
      <div class="brand">
        <svg class="logo" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#11161f" stroke="#2a3342"/><rect x="44" y="20" width="12" height="60" rx="6" fill="#f8cf63"/><rect x="38" y="36" width="24" height="28" rx="6" fill="#f8cf63"/></svg>
        <h1>wickra <b>backtest</b></h1>
        <nav class="topnav">
          <a href="#demo">Demo</a><a href="#spec">Spec</a><a href="#install">Install</a><a href="#cookbook">Cookbook</a>
          <a href="https://github.com/wickra-lib/wickra-backtest">GitHub ↗</a>
        </nav>
      </div>
      <p class="tag">Backtest a strategy in your browser — backtest ≡ live, byte-identical in 10 languages.</p>
      <p class="sub">
        A streaming-native, event-driven backtester built on the Wickra indicator core. A strategy is
        <b>data</b> — a JSON spec, not code — so a backtest and a live run over the same spec produce identical
        signals. The whole engine below runs <b>100% in your browser</b> via WebAssembly: zero backend, nothing uploaded.
      </p>
      <div class="pills">
        <span class="pill"><b>O(1)</b> per bar · ~1.7M bars/s</span>
        <span class="pill"><b>495</b> indicators</span>
        <span class="pill"><b>10</b> languages</span>
        <span class="pill">order book · trades · funding</span>
        <span class="pill">long/short · leverage · fees · slippage</span>
        <span class="pill">0 backend</span>
      </div>
    </header>

    <!-- DEMO -->
    <h2 id="demo">Live demo</h2>
    <p class="section-sub">
      Pick a strategy, choose a market regime, hit Run — it backtests over a deterministic sample series entirely
      client-side via <code>wickra-backtest-wasm</code>. The same engine, fed live bars, becomes the live bot.
    </p>

    <div class="presetbar">
      <button v-for="p in PRESETS" :key="p.id" class="preset" :class="{ on: activePreset === p.id }" @click="loadPreset(p.id)">{{ p.name }}</button>
    </div>
    <p class="muted preset-desc">{{ PRESETS.find(p => p.id === activePreset)?.desc }}</p>

    <div class="grid2">
      <div class="panel">
        <div class="demo-head">
          <span class="ttl">Strategy spec <span class="muted">(JSON)</span></span>
          <span class="muted">
            regime
            <select v-model="regime" @change="runBacktest" class="sel">
              <option v-for="r in REGIMES" :key="r.id" :value="r.id">{{ r.label }}</option>
            </select>
            &nbsp;capital
            <input v-model.number="capital" type="number" min="100" step="100" class="cap"/>
          </span>
        </div>
        <textarea class="spec" v-model="specText" spellcheck="false"></textarea>
        <div class="run-row">
          <button class="run" :disabled="running" @click="runBacktest">{{ running ? 'Running…' : 'Run backtest' }}</button>
          <span v-if="ver" class="muted">engine wasm v{{ ver }} · runs in-browser</span>
        </div>
        <p v-if="error" class="err">⚠ {{ error }}</p>
      </div>

      <div class="panel">
        <div class="ttl" style="font-weight:600;margin-bottom:10px">Report</div>
        <div v-if="report" class="metrics">
          <div class="metric"><div class="k">Return</div><div class="v" :class="report.metrics.return_pct>=0?'pos':'neg'">{{ pct(report.metrics.return_pct) }}</div></div>
          <div class="metric"><div class="k">PnL</div><div class="v" :class="report.metrics.pnl>=0?'pos':'neg'">{{ money(report.metrics.pnl) }}</div></div>
          <div class="metric"><div class="k">Trades</div><div class="v">{{ report.metrics.num_trades }}</div></div>
          <div class="metric"><div class="k">Sharpe</div><div class="v">{{ num(report.metrics.sharpe) }}</div></div>
          <div class="metric"><div class="k">Sortino</div><div class="v">{{ num(report.metrics.sortino) }}</div></div>
          <div class="metric"><div class="k">Calmar</div><div class="v">{{ num(report.metrics.calmar) }}</div></div>
          <div class="metric"><div class="k">Max drawdown</div><div class="v neg">{{ num(report.metrics.max_drawdown) }}%</div></div>
          <div class="metric"><div class="k">Win rate</div><div class="v">{{ num(report.metrics.win_rate*100) }}%</div></div>
          <div class="metric"><div class="k">Profit factor</div><div class="v">{{ num(report.metrics.profit_factor) }}</div></div>
        </div>
        <div v-else class="muted">Run the backtest to see the report.</div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="ttl" style="font-weight:600;margin-bottom:10px">Price &amp; trades <span class="muted">— entry ▲ / exit ▼</span></div>
      <div ref="priceEl" class="chart"></div>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="ttl" style="font-weight:600;margin-bottom:10px">Equity curve &amp; drawdown</div>
      <div ref="equityEl" class="chart"></div>
    </div>

    <div v-if="report && report.trades.length" class="panel" style="margin-top:18px">
      <div class="ttl" style="font-weight:600;margin-bottom:10px">Trades <span class="muted">({{ report.trades.length }})</span></div>
      <div class="tbl-scroll">
        <table class="trades">
          <thead><tr><th>#</th><th>Side</th><th>Entry</th><th>Exit</th><th>Qty</th><th>PnL</th><th>Return</th><th>Reason</th></tr></thead>
          <tbody>
            <tr v-for="(t, i) in report.trades" :key="i">
              <td>{{ i + 1 }}</td>
              <td style="text-align:left">{{ t.qty < 0 ? 'short' : 'long' }}</td>
              <td>{{ t.entry_price.toFixed(2) }}</td>
              <td>{{ t.exit_price.toFixed(2) }}</td>
              <td>{{ Math.abs(t.qty).toFixed(2) }}</td>
              <td :style="{color: t.pnl>=0 ? 'var(--green)' : 'var(--red)'}">{{ money(t.pnl) }}</td>
              <td :style="{color: t.return_pct>=0 ? 'var(--green)' : 'var(--red)'}">{{ pct(t.return_pct) }}</td>
              <td style="text-align:left;color:var(--dim)">{{ t.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- WHY -->
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

    <!-- SPEC -->
    <h2 id="spec">How a strategy spec works</h2>
    <p class="section-sub">A spec is one JSON object. Full grammar in the <a href="https://github.com/wickra-lib/wickra-backtest/blob/main/docs/STRATEGY_SPEC.md">spec reference</a>.</p>
    <div class="cards">
      <div class="panel card"><h3>Indicators</h3><p>Name indicators by key: <code>{ "fast": { "type": "Ema", "params": [9] } }</code>. Multi-output indicators address a field as <code>"name.field"</code> — <code>macd.signal</code>, <code>bb.upper</code>, <code>dc.lower</code>. Microstructure indicators add <code>"feed": "orderbook"</code>.</p></div>
      <div class="panel card"><h3>Operands</h3><p>An operand is an indicator key, a <code>"name.field"</code>, a price (<code>{ "price": "close" }</code> — open/high/low/close) or a number. Conditions compare operands.</p></div>
      <div class="panel card"><h3>Conditions</h3><p><code>cross_above</code> · <code>cross_below</code> · <code>gt</code> · <code>lt</code> · <code>ge</code> · <code>le</code> · <code>eq</code>, combined with <code>and</code> / <code>or</code> / <code>not</code>. Set <code>entry</code>/<code>exit</code> and optional <code>short_entry</code>/<code>short_exit</code>.</p></div>
      <div class="panel card"><h3>Sizing</h3><p><code>fixed_fraction</code> · <code>fixed_qty</code> · <code>fixed_cash</code> · <code>risk_per_trade</code> (sizes off the stop) · <code>vol_target</code> (targets a realised-vol level).</p></div>
      <div class="panel card"><h3>Costs</h3><p><code>taker_bps</code> / <code>maker_bps</code> fees, <code>slippage</code> (<code>fixed_bps</code>, <code>spread</code>, <code>volume_impact</code>), and perpetual <code>funding</code> charged per bar.</p></div>
      <div class="panel card"><h3>Risk &amp; execution</h3><p><code>stop_loss_pct</code>, <code>take_profit_pct</code>, <code>trailing_stop_pct</code>, position caps — checked intrabar. Execution models order type and latency. The result is the <code>BacktestReport</code> you see above.</p></div>
    </div>

    <!-- INSTALL -->
    <h2 id="install">Install in your language</h2>
    <p class="section-sub">One engine kernel behind every binding — byte-identical reports.</p>
    <div class="install">
      <div class="ins"><span class="lang">Rust</span><code>cargo add wickra-backtest</code></div>
      <div class="ins"><span class="lang">Python</span><code>pip install wickra-backtest</code></div>
      <div class="ins"><span class="lang">Node.js</span><code>npm i wickra-backtest</code></div>
      <div class="ins"><span class="lang">WASM</span><code>npm i wickra-backtest-wasm</code></div>
      <div class="ins"><span class="lang">C#</span><code>dotnet add package Wickra.Backtest</code></div>
      <div class="ins"><span class="lang">Go</span><code>go get github.com/wickra-lib/wickra-backtest-go</code></div>
      <div class="ins"><span class="lang">Java</span><code>org.wickra:wickra-backtest&nbsp;(Maven Central)</code></div>
      <div class="ins"><span class="lang">R</span><code>install.packages("wickrabacktest", repos="https://wickra-lib.r-universe.dev")</code></div>
      <div class="ins"><span class="lang">C / C++</span><code>C ABI header + library — see bindings/c</code></div>
    </div>
    <p class="muted" style="margin-top:10px">Registries populate as <code>wickra-backtest</code> is published; until then build from <a href="https://github.com/wickra-lib/wickra-backtest">source</a>.</p>

    <!-- COOKBOOK -->
    <h2 id="cookbook">Cookbook</h2>
    <p class="section-sub">Ready-to-run strategies. The first five load straight into the demo; funding-carry and order-book imbalance need a derivatives / order-book feed.</p>
    <div class="cards">
      <div v-for="p in PRESETS" :key="p.id" class="panel card cb">
        <h3>{{ p.name }}</h3><p>{{ p.desc }}</p>
        <button class="loadbtn" @click="loadAndScroll(p.id)">Load in demo →</button>
      </div>
      <div class="panel card cb"><h3>Funding carry <span class="muted">(perp)</span></h3><p>Hold when perpetual funding is negative — you get paid to hold — and charge funding to the position each bar. Needs a derivatives feed.</p></div>
      <div class="panel card cb"><h3>Order-book imbalance</h3><p>Trade off top-of-book bid/ask imbalance. Needs an order-book feed replayed alongside the candles.</p></div>
    </div>

    <footer>
      <div class="links">
        <a href="https://github.com/wickra-lib/wickra-backtest">GitHub</a>
        <a href="https://github.com/wickra-lib/wickra-backtest/blob/main/docs/STRATEGY_SPEC.md">Spec reference</a>
        <a href="https://github.com/wickra-lib/wickra-backtest/blob/main/docs/COOKBOOK.md">Cookbook</a>
        <a href="https://github.com/wickra-lib/wickra-backtest/blob/main/docs/MICROSTRUCTURE.md">Microstructure</a>
        <a href="https://wickra.org">wickra.org</a>
        <a href="https://live.wickra.org">live indicator demo</a>
      </div>
      Built on <a href="https://github.com/wickra-lib/wickra">Wickra</a>. Not a trading system — backtest results are
      deterministic transforms of the input data, not financial advice and not indicative of future performance.
      Dual-licensed MIT OR Apache-2.0.
    </footer>
  </div>
</template>
