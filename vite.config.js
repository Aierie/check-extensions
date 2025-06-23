import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  publicDir: '.',
  build: {
    outDir: 'dist'
  }
}) 