import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'MeshPaw: Off-Grid Mesh',
          short_name: 'MeshPaw',
          description: 'Secure, peer-to-peer mesh communication without internet.',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2309090b"/><circle cx="50" cy="50" r="48" stroke="%2310b981" stroke-width="2" stroke-dasharray="4 4" opacity="0.2"/><path d="M50 35C45.5 35 42 38.5 42 43C42 47.4 45.5 51 50 51C54.4 51 58 47.4 58 43C58 38.5 54.4 35 50 35Z" fill="%2310b981"/><path d="M30 50C25.5 50 22 53.5 22 58C22 62.4 25.5 66 30 66C34.4 66 38 62.4 38 58C38 54.4 34.4 50 30 50Z" fill="%2310b981"/><path d="M70 50C65.5 50 62 53.5 62 58C62 62.4 65.5 66 70 66C74.4 66 78 62.4 78 58C78 54.4 74.4 50 70 50Z" fill="%2310b981"/><path d="M50 65C40 65 30 72 30 80C30 84.4 33.5 88 38 88H62C66.4 88 70 84.4 70 80C70 72 60 65 50 65Z" fill="%2310b981"/></svg>',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
    },
  };
});
