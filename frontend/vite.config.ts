import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// Copia el worker de pdfjs-dist a public/ en cada build
function copyPdfjsWorker() {
  return {
    name: 'copy-pdfjs-worker',
    buildStart() {
      copyFileSync(
        resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
        resolve('public/pdf.worker.min.mjs'),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyPdfjsWorker()],
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
})
