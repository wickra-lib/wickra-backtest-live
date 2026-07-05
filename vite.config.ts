import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// wickra-backtest-wasm is a real WebAssembly module; the two wasm plugins let
// Vite bundle and instantiate it client-side. Served at the domain root
// (backtest-live.wickra.org), so base is '/'.
export default defineConfig({
  base: '/',
  plugins: [vue(), wasm(), topLevelAwait()],
  build: { target: 'esnext' },
})
