import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Sala Fria - Sistema de Gestão',
        short_name: 'Sala Fria',
        description: 'Controle inteligente de estoque para câmaras frias.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'https://img.icons8.com/bubbles/192/000000/refrigerator.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://img.icons8.com/bubbles/512/000000/refrigerator.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'https://img.icons8.com/bubbles/512/000000/refrigerator.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
