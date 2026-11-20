import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Entreno',
        short_name: 'Entreno',
        description: 'Plan de entrenamiento adaptativo: basket, gimnasio y carrera.',
        lang: 'es',
        theme_color: '#0A0A0C',
        background_color: '#0A0A0C',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // Fotos de las demostraciones: se guardan al verlas y luego funcionan sin conexión
            urlPattern: ({ url }) => url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/free-exercise-db@'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'demos',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/demos.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'demos-index' },
          },
        ],
      },
    }),
  ],
  server: { host: true },
})
