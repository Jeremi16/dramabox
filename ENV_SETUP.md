# Environment Variables Setup

## Quick Start

1. Copy file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit file `.env` sesuai kebutuhan (optional, default sudah bisa dipakai)

## Available Variables

### VITE_DRAMABOX_API_BASE_URL

Base URL untuk API drama content.

**Default:** `https://dramabox-api.zone.id`

**Dokumentasi:** https://dramabox-api.zone.id/

#### Endpoints yang Digunakan

```
GET /api/recommend          - Daftar drama rekomendasi
GET /api/home?page=1        - Drama terbaru di homepage
GET /api/vip                - Drama dari channel VIP/Theater
GET /api/search?q=keyword   - Cari drama berdasarkan keyword
GET /api/detail/:bookId/v2  - Detail lengkap sebuah drama
GET /api/chapters/:bookId   - Daftar semua chapter/episode
GET /api/stream?bookId=&chapter= - Link streaming (m3u8/mp4)
GET /api/categories         - Daftar semua kategori
GET /api/category/:id       - Drama per kategori
```

**Features:**
- ✅ Public API (no auth required)
- ✅ No rate limiting
- ✅ Multiple quality sources
- ✅ Subtitle support
- ✅ Indonesian content

## Configuration Examples

### Default Setup
```env
VITE_DRAMABOX_API_BASE_URL=https://dramabox-api.zone.id
```

### Custom API Server
```env
VITE_DRAMABOX_API_BASE_URL=https://your-custom-api.com
```

## Testing Configuration

After updating `.env`, restart the dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

Test the API connection:
```bash
# Check if API responds
curl https://dramabox-api.zone.id/api/recommend
```

## Troubleshooting

### Issue: API not responding
**Solution:** 
- Check if base URL is correct
- Verify internet connection
- Check API status at https://dramabox-api.zone.id/

### Issue: Changes not applied
**Solution:**
- Restart dev server after changing `.env`
- Clear browser cache
- Check if variable name starts with `VITE_`

### Issue: CORS errors
**Solution:**
- API sudah support CORS
- Pastikan menggunakan HTTPS
- Clear browser cache

## Security Notes

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use `.env.example`** for documentation only
3. **Public API** is safe to use without keys

## API Documentation

Full API documentation: https://dramabox-api.zone.id/

## Response Format

API mengembalikan data dalam format JSON:

```json
{
  "success": true,
  "data": [
    {
      "bookId": "42000007194",
      "bookName": "Drama Title",
      "coverWap": "https://...",
      "chapterCount": 54,
      "introduction": "Description...",
      "tags": ["Tag1", "Tag2"]
    }
  ]
}
```

## Support

For API issues:
- Documentation: https://dramabox-api.zone.id/
- Check API status
- Contact: Developer info on API homepage
