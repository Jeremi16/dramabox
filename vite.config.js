import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), "");

  const meloloApiUrl =
    env.VITE_MELOLO_API_BASE_URL || "https://melolo-api-azure.vercel.app";

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ["vidstack", "maverick.js", "media-captions"],
    },
    server: {
      proxy: {
        // Proxy untuk API Melolo untuk bypass CORS
        "/melolo-api": {
          target: meloloApiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/melolo-api/, ""),
        },
      },
    },
  };
});
