import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'Vi Sales MNP',
          short_name: 'Vi Sales',
          description: 'Vi Sales MNP - Porting, SIM and Booking Management Application',
          theme_color: '#E60000',
          background_color: '#F8FAFC',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('AIzaSyBMOEFTcBLVo-azih7gK-KGimcvS-oKfHo'),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('vi-seles-mnp-e7594'),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify('vi-seles-mnp-e7594.firebaseapp.com'),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify('vi-seles-mnp-e7594.firebasestorage.app'),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify('1064518972558'),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify('1:1064518972558:web:bc6ad9ca16f166fa2245df'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
