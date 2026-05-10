import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Output directly into chat-service/public/chat-assets so both `npm run dev`
// (chat-service) and the chat-service Docker COPY pick the bundle up — no
// docker volume mount needed.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../chat-service/public/chat-assets'),
    emptyOutDir: false,
    lib: {
      entry: 'src/index.tsx',
      name: 'MentiSphereChat',
      // Use a neutral filename — corporate proxies (e.g. Zscaler) block
      // anything named "chat-widget.js" by URL pattern, even though the
      // sibling .css file passes. "mentisphere-widget" sidesteps that.
      fileName: () => 'mentisphere-widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'mentisphere-widget.[ext]',
      },
    },
    cssCodeSplit: false,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
