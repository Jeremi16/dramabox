export const API_CONFIG = {
  dramabox: {
    baseUrl:
      import.meta.env.VITE_DRAMABOX_API_BASE_URL ||
      "https://dramabox-api.zone.id",
    token: "",
  },
  melolo: {
    baseUrl:
      import.meta.env.VITE_MELOLO_API_BASE_URL ||
      "https://melolo-api-azure.vercel.app",
    token: "",
  },
};
