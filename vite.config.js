import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  base: '/MultiPlayerGridGame/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});