const isDev = import.meta.env.DEV;

export const API_CONFIG = {
  dramabox: {
    baseUrl:
      import.meta.env.VITE_DRAMABOX_API_BASE_URL ||
      "https://dramabox-api.zone.id",
    token: "",
  },
  melolo: {
    // Saat development: gunakan proxy Vite untuk bypass CORS
    // Saat production: gunakan proxy Vercel (relative path)
    baseUrl: isDev ? "/melolo-api" : "/api/melolo",
    token: "",
  },
};
