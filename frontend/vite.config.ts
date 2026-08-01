/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// Copia el worker de pdfjs-dist como .js para que nginx lo sirva con MIME correcto
function copyPdfjsWorker() {
  return {
    name: 'copy-pdfjs-worker',
    buildStart() {
      copyFileSync(
        resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
        resolve('public/pdf.worker.min.js'),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyPdfjsWorker()],
  resolve: {
    alias: {
      '@/features': resolve('src/features'),
      '@/components': resolve('src/components'),
      '@/store': resolve('src/store'),
      '@/hooks': resolve('src/hooks'),
      '@/config': resolve('src/config'),
      '@/utils': resolve('src/utils'),
      '@/layouts': resolve('src/layouts'),
      '@/types': resolve('src/types'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
