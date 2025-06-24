import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  publicDir: './public',
  build: {
    outDir: 'docs',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  // For GitHub Pages deployment
  base: process.env.NODE_ENV === 'production' ? '/check-extensions/' : '/'
}) 