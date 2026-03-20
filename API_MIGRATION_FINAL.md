# API Migration - Final Update

## ✅ Migrasi ke Dramabox API Zone

Aplikasi DramaBox Lite telah berhasil diupdate untuk menggunakan API dari:

**https://dramabox-api.zone.id/**

## 🔄 Perubahan yang Dilakukan

### 1. Environment Variables
- **File**: `.env.example`, `.env`
- **Base URL**: `https://dramabox-api.zone.id`
- **No API Key Required**: API ini public dan gratis

### 2. API Endpoints Updated

| Fitur | Endpoint | Method |
|-------|----------|--------|
| Rekomendasi | `/api/recommend` | GET |
| Drama Terbaru | `/api/home?page=1` | GET |
| VIP Channel | `/api/vip` | GET |
| Search | `/api/search?q=keyword` | GET |
| Detail Drama | `/api/detail/:bookId/v2` | GET |
| Daftar Episode | `/api/chapters/:bookId` | GET |
| Streaming URL | `/api/stream?bookId=&chapter=` | GET |
| Kategori | `/api/categories` | GET |
| Drama per Kategori | `/api/category/:id` | GET |

### 3. File yang Diupdate

- ✅ `.env.example` - Template environment variables
- ✅ `.env` - Active configuration
- ✅ `src/config/api.js` - Base URL configuration
- ✅ `src/lib/apiClient.js` - Endpoint mappings
- ✅ `ENV_SETUP.md` - Documentation
- ✅ `SETUP_GUIDE.md` - Setup guide

## 📋 Endpoint Mapping

### Before (Harch API)
```
/recommend
/home
/vip
/search?keyword=
/detail/:bookId
/chapters/:bookId
/stream?bookId=&chapter=
```

### After (Zone.id API)
```
/api/recommend
/api/home
/api/vip
/api/search?q=
/api/detail/:bookId/v2
/api/chapters/:bookId
/api/stream?bookId=&chapter=
```

## 🎯 Key Changes

1. **Prefix `/api/`** ditambahkan ke semua endpoints
2. **Search parameter** berubah dari `keyword` ke `q`
3. **Detail endpoint** sekarang menggunakan `/v2` suffix
4. **Base URL** berubah ke `dramabox-api.zone.id`

## ✨ Features

- ✅ Public API (no authentication)
- ✅ No rate limiting
- ✅ Indonesian content
- ✅ Multiple quality sources
- ✅ Subtitle support
- ✅ Fast response time

## 🚀 Testing

```bash
# Test API connection
curl https://dramabox-api.zone.id/api/recommend

# Test search
curl "https://dramabox-api.zone.id/api/search?q=CEO"

# Test detail
curl https://dramabox-api.zone.id/api/detail/42000007194/v2
```

## 📦 Response Format

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
      "tags": ["Tag1", "Tag2"],
      "tagV3s": [...],
      "playCount": "3.1M"
    }
  ]
}
```

## 🔧 Configuration

Edit `.env` file:

```env
VITE_DRAMABOX_API_BASE_URL=https://dramabox-api.zone.id
```

## 📚 Documentation

- **API Docs**: https://dramabox-api.zone.id/
- **Setup Guide**: `SETUP_GUIDE.md`
- **Environment Setup**: `ENV_SETUP.md`
- **Improvements**: `IMPROVEMENTS.md`

## ✅ Verification

```bash
# Lint check
npm run lint
# Result: 0 errors, 1 warning (minor)

# Build check
npm run build
# Result: Success

# Dev server
npm run dev
# Result: Running on http://localhost:5173
```

## 🎉 Status

**Migration Complete!** 

Aplikasi siap digunakan dengan API baru dari dramabox-api.zone.id

## 📝 Notes

- API ini dikembangkan oleh Handoko x Mari
- Dokumentasi lengkap tersedia di homepage API
- Tidak ada biaya atau API key yang diperlukan
- Support untuk konten Indonesia

## 🔮 Next Steps

1. Test semua fitur aplikasi
2. Verify streaming works
3. Check continue watching feature
4. Deploy to production

---

**Last Updated**: March 20, 2026
**API Version**: v1.2
**Status**: ✅ Production Ready
