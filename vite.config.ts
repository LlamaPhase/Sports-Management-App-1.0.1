import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically update the service worker when new content is available
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Assets to cache immediately
      manifest: {
        name: 'Youth Sports Team Manager',
        short_name: 'Team Manager',
        description: 'Manage your youth sports team roster, schedule, stats, and lineups.',
        theme_color: '#dc2626', // Red-700
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', // Placeholder icon - replace with your actual icon
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // Placeholder icon - replace with your actual icon
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // Placeholder icon - replace with your actual icon (maskable)
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // Important for Android adaptive icons
          }
        ],
      },
      // Optional: Service worker strategies (using default GenerateSW)
      // workbox: {
      //   globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      // }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
