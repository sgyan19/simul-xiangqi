import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxDev: false,
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 100,
    }
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
