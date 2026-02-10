export const API_CONFIG = {
  baseUrl:
    import.meta.env.VITE_DRAMABOX_API_BASE_URL ||
    "https://dramabox.sansekai.my.id/api/dramabox",
  cacheGatewayUrl:
    import.meta.env.VITE_DRAMABOX_CACHE_GATEWAY_URL ||
    "https://your-worker-subdomain.workers.dev/cache",
  cacheWriteToken: import.meta.env.VITE_DRAMABOX_CACHE_WRITE_TOKEN || "",
  token: "",
};
