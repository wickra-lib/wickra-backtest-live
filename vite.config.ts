import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from 'vite-plugin-wasm'

// wickra-backtest-wasm is a real WebAssembly module; the wasm plugin lets Vite
// bundle and instantiate it client-side. Served at the domain root
// (backtest-live.wickra.org), so base is '/'. The module's top-level await is
// supported natively by the esnext build target below --
// vite-plugin-top-level-await is not needed for that and does not work under
// Vite 8's Rolldown build.
export default defineConfig({
  base: '/',
  plugins: [vue(), wasm()],
  build: { target: 'esnext' },
})
