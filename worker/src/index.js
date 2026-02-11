const CACHE_PREFIX = "dramabox:v2:";
const MAX_KEY_LENGTH = 512;
const MAX_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_WRITE_LIMIT_PER_MINUTE = 120;
const SUBTITLE_ALLOWED_HOSTS = ["dramaboxdb.com", "dramabox.sansekai.my.id"];

function splitAllowedOrigins(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin, env) {
  const allowed = splitAllowedOrigins(env.ALLOWED_ORIGINS || "");
  if (!allowed.length) return true;
  return allowed.includes(origin);
}

function corsHeaders(origin, env) {
  const allowOrigin = isAllowedOrigin(origin, env) ? origin || "*" : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Cache-Token",
  };
}

function jsonResponse(status, payload, origin, env, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, env),
      ...extraHeaders,
    },
  });
}

function validateCacheKey(path) {
  if (!path || typeof path !== "string") return "path wajib diisi";
  if (!path.startsWith("/")) return "path harus diawali '/'";
  if (path.length > MAX_KEY_LENGTH) return "path terlalu panjang";
  if (path.includes("..")) return "path tidak valid";
  return "";
}

function normalizedCacheKey(path) {
  return `${CACHE_PREFIX}${path}`;
}

function isAllowedSubtitleHost(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return SUBTITLE_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function subtitleResponse(body, status, contentType, origin, env, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType || "application/x-subrip; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...corsHeaders(origin, env),
      ...extraHeaders,
    },
  });
}

function srtToVtt(text = "") {
  const normalized = String(text).replace(/^\uFEFF/, "");
  const withDotTime = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2 --> $3.$4",
  );
  return `WEBVTT\n\n${withDotTime}`;
}

async function enforceWriteRateLimit(env, ip) {
  const limit = Number(env.WRITE_RATE_LIMIT_PER_MINUTE || DEFAULT_WRITE_LIMIT_PER_MINUTE);
  const minuteBucket = Math.floor(Date.now() / 60000);
  const key = `${CACHE_PREFIX}rl:${ip || "unknown"}:${minuteBucket}`;
  const currentRaw = await env.DRAMABOX_CACHE.get(key);
  const current = Number(currentRaw || 0);
  if (current >= limit) {
    return { ok: false, retryAfter: 60 };
  }

  await env.DRAMABOX_CACHE.put(key, String(current + 1), { expirationTtl: 120 });
  return { ok: true };
}

function checkWriteAuth(request, env) {
  const requiredToken = env.CACHE_WRITE_TOKEN || "";
  if (!requiredToken) {
    return { ok: false, message: "CACHE_WRITE_TOKEN belum diset" };
  }

  const authHeader = request.headers.get("Authorization") || "";
  const headerToken = request.headers.get("X-Cache-Token") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const token = bearerToken || headerToken;

  if (!token || token !== requiredToken) {
    return { ok: false, message: "Unauthorized token" };
  }

  return { ok: true };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env),
      });
    }

    if (!env.DRAMABOX_CACHE) {
      return jsonResponse(500, { error: "KV DRAMABOX_CACHE belum terpasang" }, origin, env);
    }

    const url = new URL(request.url);
    if (url.pathname === "/subtitle" && request.method === "GET") {
      const subtitleUrlRaw = url.searchParams.get("url") || "";
      if (!subtitleUrlRaw) {
        return jsonResponse(400, { error: "url subtitle wajib diisi" }, origin, env);
      }

      let subtitleUrl;
      try {
        subtitleUrl = new URL(subtitleUrlRaw);
      } catch {
        return jsonResponse(400, { error: "url subtitle tidak valid" }, origin, env);
      }

      if (!["http:", "https:"].includes(subtitleUrl.protocol)) {
        return jsonResponse(400, { error: "protocol subtitle tidak didukung" }, origin, env);
      }

      if (!isAllowedSubtitleHost(subtitleUrl.hostname)) {
        return jsonResponse(403, { error: "host subtitle tidak diizinkan" }, origin, env);
      }

      try {
        const upstream = await fetch(subtitleUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/x-subrip,text/plain,text/vtt,*/*",
          },
        });

        if (!upstream.ok) {
          return jsonResponse(
            502,
            { error: `Gagal mengambil subtitle upstream (${upstream.status})` },
            origin,
            env,
          );
        }

        const text = await upstream.text();
        const vtt = srtToVtt(text);
        return subtitleResponse(vtt, 200, "text/vtt; charset=utf-8", origin, env);
      } catch {
        return jsonResponse(502, { error: "Gagal mengambil subtitle upstream" }, origin, env);
      }
    }

    if (url.pathname !== "/cache") {
      return jsonResponse(404, { error: "Route not found" }, origin, env);
    }

    if (!isAllowedOrigin(origin, env) && origin) {
      return jsonResponse(403, { error: "Origin tidak diizinkan" }, origin, env);
    }

    if (request.method === "GET") {
      const path = url.searchParams.get("path") || "";
      const validationError = validateCacheKey(path);
      if (validationError) {
        return jsonResponse(400, { error: validationError }, origin, env);
      }

      const key = normalizedCacheKey(path);
      const raw = await env.DRAMABOX_CACHE.get(key);
      if (!raw) {
        return jsonResponse(200, { hit: false }, origin, env, { "X-Cache": "MISS" });
      }

      try {
        const parsed = JSON.parse(raw);
        const now = Date.now();
        const expiresAt = Number(parsed.expiresAt || 0);
        if (!expiresAt || now >= expiresAt) {
          return jsonResponse(200, { hit: false }, origin, env, { "X-Cache": "EXPIRED" });
        }

        return jsonResponse(
          200,
          {
            hit: true,
            status: parsed.status || 200,
            contentType: parsed.contentType || "application/json; charset=utf-8",
            payload: parsed.payload,
            expiresAt,
          },
          origin,
          env,
          { "X-Cache": "HIT" },
        );
      } catch {
        return jsonResponse(200, { hit: false }, origin, env, { "X-Cache": "CORRUPT" });
      }
    }

    if (request.method === "POST") {
      const auth = checkWriteAuth(request, env);
      if (!auth.ok) {
        return jsonResponse(401, { error: auth.message }, origin, env);
      }

      const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
      const rateLimit = await enforceWriteRateLimit(env, ip);
      if (!rateLimit.ok) {
        return jsonResponse(
          429,
          { error: "Rate limit write cache terlampaui" },
          origin,
          env,
          { "Retry-After": String(rateLimit.retryAfter || 60) },
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(400, { error: "Body harus JSON valid" }, origin, env);
      }

      const path = body?.path || "";
      const validationError = validateCacheKey(path);
      if (validationError) {
        return jsonResponse(400, { error: validationError }, origin, env);
      }

      const ttl = Math.min(Math.max(Number(body?.ttl || 0), 1), MAX_TTL_SECONDS);
      if (!ttl || Number.isNaN(ttl)) {
        return jsonResponse(400, { error: "ttl wajib angka > 0 (detik)" }, origin, env);
      }

      const entry = {
        status: Number(body?.status || 200),
        contentType: body?.contentType || "application/json; charset=utf-8",
        payload: body?.payload ?? null,
        storedAt: Date.now(),
        expiresAt: Date.now() + ttl * 1000,
      };

      const key = normalizedCacheKey(path);
      await env.DRAMABOX_CACHE.put(key, JSON.stringify(entry), {
        expirationTtl: Math.min(ttl + 120, MAX_TTL_SECONDS),
      });

      return jsonResponse(200, { ok: true, key: path, ttl }, origin, env, { "X-Cache": "WRITE" });
    }

    return jsonResponse(405, { error: "Method not allowed" }, origin, env);
  },
};
