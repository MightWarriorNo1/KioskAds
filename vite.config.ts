// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   optimizeDeps: {
//     exclude: ['lucide-react', 'googleapis'],
//   },
//   define: {
//     global: 'globalThis',
//     'process.env': '{}',
//   },
//   resolve: {
//     alias: {
//       process: 'process/browser',
//     },
//   },
//   build: {
//     rollupOptions: {
//       external: ['googleapis'],
//     },
//   },
// });


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', 'googleapis'],
    include: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  resolve: {
    alias: {
      process: 'process/browser',
      './runtimeConfig': './runtimeConfig.browser', // important for aws-sdk
    },
  },
  build: {
    rollupOptions: {
      external: ['googleapis'],
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});
