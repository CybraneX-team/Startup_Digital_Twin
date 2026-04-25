import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/three/')) return 'three-core';
          if (id.includes('@react-three/fiber')) return 'r3f-vendor';
          if (id.includes('@react-three/drei')) return 'drei-vendor';
          if (id.includes('recharts')) return 'charts-vendor';
          if (id.includes('react-router')) return 'router-vendor';
          return 'vendor';
        },
      },
    },
  },
})
