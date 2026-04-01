import { defineConfig } from 'vite';

// Production: GitHub Pages subpath. Development: '/' so /game1.mp4 etc. load on localhost.
export default defineConfig(({ mode }) => ({
  root: 'client',
  base: mode === 'production' ? '/MultiPlayerGridGame/' : '/',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
}));