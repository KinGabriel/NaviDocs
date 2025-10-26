import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
