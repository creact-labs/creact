import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/creact/',
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
});
