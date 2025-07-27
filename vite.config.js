import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/scripts/background.js'),
        content: resolve(__dirname, 'src/scripts/content.js'),
        keywordHelper: resolve(__dirname, 'src/scripts/keywordHelper.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content'  || chunkInfo.name === 'keywordHelper') {
            return `scripts/${chunkInfo.name}.js`
          }
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  define: {
    global: 'globalThis',
  }
})