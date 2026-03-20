import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["vidstack", "maverick.js", "media-captions"],
  },
  server: {
    proxy: {
      // Proxy untuk API Melolo untuk bypass CORS
      "/melolo-api": {
        target: "https://melolo-api-azure.vercel.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/melolo-api/, ""),
      },
    },
  },
});
