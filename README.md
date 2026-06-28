<p align="center">
  <a href="https://wickra.org"><img src="https://raw.githubusercontent.com/wickra-lib/.github/main/profile/wickra-banner.webp?v=514" alt="Wickra" width="100%"></a>
</p>

[![Built on Wickra](https://img.shields.io/badge/built%20on-wickra-3b82f6)](https://github.com/wickra-lib/wickra)
[![License: MIT OR Apache-2.0](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-backtest/license.svg)](#license)

---

# Wickra Backtest — Live

The site behind **[backtest.wickra.org](https://backtest.wickra.org)**: an
in-browser backtesting demo, explanations and docs for the
[wickra-backtest](https://github.com/wickra-lib/wickra-backtest) engine.

A strategy is **data** — a JSON spec. Edit it, hit Run, and the whole engine
backtests over a built-in sample series **100% client-side** via
`wickra-backtest-wasm` (zero backend, nothing uploaded): metrics, equity curve
and the trade list. The same engine, fed live bars, is the live bot — backtest
≡ live, byte-identical across 10 languages.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

The WebAssembly engine is vendored under [`src/wasm/`](src/wasm/), built from the
`wickra-backtest` repo with:

```bash
# in wickra-lib/wickra-backtest
wasm-pack build bindings/wasm --target web --release --out-dir pkg-web
# then copy pkg-web -> this repo's src/wasm/
```

When `wickra-backtest-wasm` is published to npm, the vendored copy can be
replaced with the package dependency.

## Stack

Vite + Vue 3 + [lightweight-charts](https://github.com/tradingview/lightweight-charts),
mirroring [wickra-live](https://github.com/wickra-lib/wickra-live) (live.wickra.org).
Deployed as a static site (e.g. Cloudflare Pages) on `backtest.wickra.org`.

## License

Dual-licensed under [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE) at your option.
Not a trading system; backtest results are not indicative of future performance.
