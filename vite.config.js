import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'force-exit-after-build',
      apply: 'build',
      closeBundle() {
        console.log('✨ [Vite] Build completed, forcing process exit to avoid Vercel hang.');
        setTimeout(() => process.exit(0), 100);
      }
    }
  ],
  server: {
    proxy: {
      // During local development, proxy /api calls to a local Express server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === 'SOURCEMAP_ERROR' ||
          warning.code === 'CIRCULAR_DEPENDENCY' ||
          warning.code === 'MODULE_LEVEL_DIRECTIVE'
        ) {
          return;
        }
        console.warn(`[Rollup Warning: ${warning.code}] ${warning.message}`);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdfjs';
            }
            if (id.includes('katex')) {
              return 'vendor-katex';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('@google/generative-ai')) {
              return 'vendor-ai';
            }
            if (id.includes('react')) {
              return 'vendor-react';
            }
            return 'vendor-libs';
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'node',
  }
})
