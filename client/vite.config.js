import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configure Vite to look one directory up for .env so the root .env is picked up.
// This lets you keep a single env file at repo root instead of duplicating inside client/.
// NOTE: Anything prefixed with VITE_ becomes public in the browser bundle. Do NOT put secrets
// (like real service / OpenAI keys) behind VITE_ unless you intend to expose them.
export default defineConfig({
  envDir: '../',
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api requests to the backend server
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
