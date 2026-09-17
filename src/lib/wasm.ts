// Loads the published wickra-backtest-wasm bundle once, then exposes the engine
// entry points. The package is the bundler-target build, so Vite's wasm plugin
// instantiates the module on import; ensureWasm() makes that single, lazy load
// idempotent and surfaces a load failure before any export is used.
type Engine = typeof import('wickra-backtest-wasm')

let ready: Promise<Engine> | null = null
let engine: Engine | null = null

export function ensureWasm(): Promise<Engine> {
  if (!ready) {
    ready = import('wickra-backtest-wasm').then((mod) => {
      if (!mod.version()) throw new Error('wickra-backtest-wasm loaded but reported an empty version')
      engine = mod
      return mod
    })
  }
  return ready
}

function loaded(): Engine {
  if (!engine) throw new Error('wickra-backtest-wasm is not loaded yet; await ensureWasm() first')
  return engine
}

export function run_json(request: string): string {
  return loaded().run_json(request)
}

export function version(): string {
  return loaded().version()
}
