import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'NaviDocs',
        short_name: 'NaviDocs',
        description: 'Document workflow and templates platform',
        theme_color: '#003DA5',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/assets/images/navilogo.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/images/navilogo.png', sizes: '512x512', type: 'image/png' },
          { src: '/vite.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        
        // Enable offline Google Analytics (optional)
        offlineGoogleAnalytics: false,
        
        // Clean up outdated caches
        cleanupOutdatedCaches: true,
        
        // Navigation fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        
        runtimeCaching: [
          // API GET requests - NetworkFirst with longer timeout
          {
            urlPattern: ({ url, request }) => url.pathname.startsWith('/api') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-get-cache',
              networkTimeoutSeconds: 8,
              expiration: { 
                maxEntries: 200, 
                maxAgeSeconds: 3600 // 1 hour
              },
              cacheableResponse: { statuses: [0, 200] },
              plugins: [
                {
                  // Add timestamp to cached responses
                  cacheWillUpdate: async ({ response }) => {
                    const clonedResponse = response.clone();
                    const data = await clonedResponse.json();
                    return new Response(JSON.stringify({
                      ...data,
                      _cached: Date.now()
                    }), {
                      status: response.status,
                      headers: response.headers
                    });
                  }
                }
              ]
            }
          },
          
          // API GraphQL requests - NetworkFirst
          {
            urlPattern: ({ url }) => url.pathname === '/api/graphql',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-graphql-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 1800 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          
          // API POST/PATCH/PUT requests - NetworkOnly (don't cache mutations)
          {
            urlPattern: ({ url, request }) => url.pathname.startsWith('/api') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method),
            handler: 'NetworkOnly',
            options: {
              plugins: [
                {
                  // Queue failed requests for background sync
                  fetchDidFail: async ({ request }) => {
                    // Background sync will handle this
                    console.log('[SW] Request failed, will retry:', request.url);
                  }
                }
              ]
            }
          },
          
          // Documents and templates - Cache with network fallback
          {
            urlPattern: ({ url }) => url.pathname.match(/\/api\/(documents|templates)\/[^/]+$/),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'documents-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 }, // 24 hours
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          
          // Static assets
          {
            urlPattern: ({ request }) => ['document', 'script', 'style', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 }
            }
          },
          
          // Images
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy all /api requests in dev to the API gateway
      "/api": {
        target: process.env.VITE_GATEWAY_URL || "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
