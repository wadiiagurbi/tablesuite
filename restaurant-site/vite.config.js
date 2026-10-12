import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@react-three") || id.includes("three")) return "three";
          if (id.includes("motion") || id.includes("@motion") || id.includes("framer-motion")) return "motion";
          if (id.includes("@phosphor-icons")) return "icons";
          if (id.includes("react") || id.includes("react-router")) return "react";
          return "vendor";
        },
      },
    },
  },
  // Lets containerized tools (Obscura browser) reach the dev server.
  server: { allowedHosts: ["host.docker.internal"] },
  preview: { allowedHosts: ["host.docker.internal"] },
})
