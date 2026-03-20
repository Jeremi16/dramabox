export function detectSource(id) { const idStr = String(id); if (idStr.startsWith("41")) return "dramabox"; if (idStr.startsWith("42")) return "melolo"; return "unknown"; }
