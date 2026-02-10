# Cloudflare Worker KV Gateway (Cache Store Only)

Worker ini **tidak fetch ke upstream API**. Worker hanya jadi storage cache KV.

Alur:
1. Client cek ke Worker (`GET /cache?path=...`)
2. Kalau `hit: true` -> pakai data cache
3. Kalau `hit: false` -> client fetch langsung ke API utama
4. Client simpan hasil ke Worker (`POST /cache`)

## 1) Buat KV Namespace

```bash
npx wrangler kv namespace create DRAMABOX_CACHE
npx wrangler kv namespace create DRAMABOX_CACHE --preview
```

Isi `id` dan `preview_id` ke `worker/wrangler.toml`.

## 2) Set variabel di `worker/wrangler.toml`

- `ALLOWED_ORIGINS`: origin frontend yang boleh akses worker
- `CACHE_WRITE_TOKEN`: token wajib untuk endpoint write cache
- `WRITE_RATE_LIMIT_PER_MINUTE`: limit write per IP per menit

## 3) Login dan deploy

```bash
npx wrangler login
npm run worker:deploy
```

## 4) Set env frontend

```bash
VITE_DRAMABOX_API_BASE_URL=https://dramabox.sansekai.my.id/api/dramabox
VITE_DRAMABOX_CACHE_GATEWAY_URL=https://<worker-subdomain>.workers.dev/cache
VITE_DRAMABOX_CACHE_WRITE_TOKEN=<sama_dengan_CACHE_WRITE_TOKEN_worker>
```

> Catatan: token write ada di client-side env, jadi ini proteksi praktis (bukan secret sempurna). Tetap gunakan `ALLOWED_ORIGINS` + rate limit.

## Endpoint Worker

### `GET /cache?path=<cache-key>`
Response:
```json
{ "hit": true, "payload": { ... } }
```
atau
```json
{ "hit": false }
```

### `POST /cache`
Body JSON:
```json
{
  "path": "v2:/detail?bookId=42000004908",
  "ttl": 86400,
  "status": 200,
  "contentType": "application/json; charset=utf-8",
  "payload": { "bookId": "42000004908" }
}
```
