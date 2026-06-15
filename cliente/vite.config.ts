import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// La URL del backend se inyecta con VITE_SERVER_URL (ver .env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
});
