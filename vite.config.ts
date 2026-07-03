import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// base السحابي: GitHub Pages تُخدَّم من username.github.io/<repo>/ فنحتاج مسارًا
// فرعيًا في الإنتاج فقط؛ التطوير يبقى على الجذر '/'.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/AbuFadiMarket/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: { enabled: true },
      manifest: {
        name: 'فادي لوجيك برو',
        short_name: 'فادي لوجيك',
        description: 'نظام إدارة الموردين والفواتير والشيكات',
        lang: 'ar',
        dir: 'rtl',
        display: 'standalone',
        theme_color: '#05060f',
        background_color: '#05060f',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}'],
        // قراءة Supabase (GET فقط) تُخزَّن NetworkFirst لتعمل دون اتصال.
        // الطفرات (POST/PATCH/DELETE/RPC/auth) لا تُطابَق (method الافتراضي GET)
        // فتذهب للشبكة مباشرة وتفشل دون اتصال — كما يقتضي القسم 8 (المالية متّصلة).
        runtimeCaching: [
          {
            urlPattern: /\/rest\/v1\//,
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-get',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}))
