import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
  server: {
    hmr: process.env.DISABLE_HMR !== "true",
    allowedHosts: true,
    host: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
});
