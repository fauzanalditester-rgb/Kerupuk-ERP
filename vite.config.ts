
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/auth/v1': {
          target: env.VITE_SUPABASE_URL + '/auth/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth\/v1/, ''),
        },
        '/rest/v1': {
          target: env.VITE_SUPABASE_URL + '/rest/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/rest\/v1/, ''),
        },
        '/realtime/v1': {
          target: env.VITE_SUPABASE_URL + '/realtime/v1',
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/realtime\/v1/, ''),
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
