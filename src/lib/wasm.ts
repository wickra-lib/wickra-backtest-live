// Loads and instantiates the wickra-backtest WebAssembly module once, then
// exposes the engine entry points. The web-target build needs init() called
// before any export is used; ensureWasm() makes that idempotent.
import init, { run_json, version } from '../wasm/wickra_backtest_wasm.js'

let ready: Promise<void> | null = null

export function ensureWasm(): Promise<void> {
  if (!ready) ready = init().then(() => undefined)
  return ready
}

export { run_json, version }
