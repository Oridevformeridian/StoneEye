import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

// Get git commit hash
const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(),tailwindcss()],
  define: {
    '__COMMIT_HASH__': JSON.stringify(commitHash)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {}
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false
      }
    }
  }
})
