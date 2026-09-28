/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

// Copia el worker de pdfjs-dist como .js para que nginx lo sirva con MIME correcto
function copyPdfjsWorker() {
  return {
    name: 'copy-pdfjs-worker',
    buildStart() {
      const src = resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
      const dest = resolve('public/pdf.worker.min.js')
      if (existsSync(src)) {
        const destDir = dirname(dest)
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true })
        }
        copyFileSync(src, dest)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyPdfjsWorker()],
  resolve: {
    alias: {
      '@': resolve('src'),
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack') || id.includes('axios')) {
              return 'vendor-query'
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd'
            }
          }
        },
      },
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
