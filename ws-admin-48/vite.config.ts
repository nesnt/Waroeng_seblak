import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'SUPABASE_', 'NEXT_PUBLIC_', 'ANON_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
      // Matikan HMR WebSocket client injection agar WebView iOS (Bluefy) tidak mengalami white-screen / freeze
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3001,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
