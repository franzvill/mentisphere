import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../chat-service/public/widgets'),
    emptyOutDir: false,        // don't wipe existing /widgets — be safe
    lib: {
      entry: 'src/index.tsx',
      name: 'MentiSphereBrain',
      fileName: () => 'brain-widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: { assetFileNames: 'brain-widget.[ext]' },
    },
    cssCodeSplit: false,
  },
  define: { 'process.env.NODE_ENV': '"production"' },
});
