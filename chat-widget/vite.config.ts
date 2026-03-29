import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'MentiSphereChat',
      fileName: () => 'chat-widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'chat-widget.[ext]',
      },
    },
    cssCodeSplit: false,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
