import { defineConfig /*, splitVendorChunkPlugin */ } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },

  plugins: [
    react(),
    tailwindcss(),
    // If you want mild auto-splitting later, uncomment:
    // splitVendorChunkPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Duco T-shirt Store',
        short_name: 'Duco',
        description: 'Premium custom T-shirt design and ordering platform.',
        theme_color: '#E5C870',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Keep JS out of precache to avoid the 2 MiB Workbox limit.
        globPatterns: ['**/*.{html,css,svg,png,ico,webp}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'script',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'js-runtime',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 14 }
            }
          }
        ]
      }
    })
  ],

  build: {
    // Only affects CLI warnings, not PWA limits
    chunkSizeWarningLimit: 1200,

    // Let Vite/Rollup decide chunking to prevent TDZ/cycle issues
    // (Removed custom rollupOptions.output.manualChunks)

    commonjsOptions: { transformMixedEsModules: true }
  }
});
