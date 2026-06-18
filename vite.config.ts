import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Keep TF.js and nsfwjs out of the bundle — loaded from CDN at runtime
      external: ['@tensorflow/tfjs', 'nsfwjs'],
      output: {
        globals: {
          '@tensorflow/tfjs': 'tf',
          'nsfwjs': 'nsfwjs',
        },
      },
    },
  },
})
