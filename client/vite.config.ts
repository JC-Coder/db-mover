import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Splitting these out keeps the landing page off the critical path of the app-only libraries
    // and lets the vendor chunk stay cached across deploys. Skipped for the SSR build, which is a
    // single-file bundle consumed by scripts/prerender.mjs.
    rollupOptions: isSsrBuild
      ? {}
      : {
          output: {
            manualChunks: {
              "react-vendor": ["react", "react-dom", "react-router-dom"],
              motion: ["framer-motion"],
            },
          },
        },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
}))
