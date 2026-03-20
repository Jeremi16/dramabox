# DramaBox Lite - Setup Guide

## 📋 Prerequisites

- Node.js 16+ 
- npm atau yarn

## 🚀 Installation

1. **Clone repository** (jika belum)
   ```bash
   git clone <your-repo-url>
   cd DramaBoxLite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file** (optional)
   ```env
   # Default sudah bisa langsung dipakai
   VITE_DRAMABOX_API_BASE_URL=https://dramabox-api.zone.id
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   ```
   http://localhost:5173
   ```

## 🔧 Configuration

### API Configuration

Edit file `.env`:

```env
# Dramabox API (Default - Recommended)
VITE_DRAMABOX_API_BASE_URL=https://dramabox-api.zone.id

# Atau gunakan Melolo API
# VITE_DRAMABOX_API_BASE_URL=https://lectura.harch.site/api/melolo

# API Key (optional, hanya untuk HarchApi)
# VITE_API_KEY=hng-your_key_here
```

**Lihat:** `ENV_SETUP.md` untuk detail lengkap

## 📦 Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## ✨ Features

### 1. React Query Caching
- Data di-cache 5 menit
- Auto-retry failed requests
- Faster navigation

### 2. Loading Skeletons
- Smooth loading animations
- Better UX
- Shimmer effects

### 3. Continue Watching
- Auto-save progress setiap 10 detik
- Resume dari posisi terakhir
- Tampil di halaman For You
- Hapus history per item

### 4. Error Handling
- Error boundaries
- User-friendly messages
- Retry buttons
- No white screen crashes

## 📁 Project Structure

```
DramaBoxLite/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.jsx
│   │   ├── ContinueWatching.jsx
│   │   ├── CatalogPage.jsx
│   │   ├── AppLayout.jsx
│   │   └── skeletons/
│   │       ├── Skeleton.jsx
│   │       └── Skeleton.css
│   ├── hooks/
│   │   ├── useQueries.js
│   │   └── useContinueWatching.js
│   ├── lib/
│   │   ├── apiClient.js
│   │   ├── normalizers.js
│   │   └── queryClient.js
│   ├── pages/
│   │   ├── ForYouPage.jsx
│   │   ├── NewPage.jsx
│   │   ├── RankPage.jsx
│   │   ├── SearchPage.jsx
│   │   └── WatchPage.jsx
│   ├── utils/
│   │   └── watchHistory.js
│   ├── config/
│   │   └── api.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .gitignore
├── package.json
└── vite.config.js
```

## 🎯 Usage

### Browse Dramas
1. Buka halaman **For You** - Recommended dramas
2. Buka halaman **New** - Latest dramas
3. Buka halaman **Rank** - VIP/Theater dramas

### Search
1. Klik search icon
2. Ketik keyword
3. Tekan Enter

### Watch Drama
1. Klik drama card
2. Pilih episode
3. Video akan auto-play
4. Progress otomatis tersimpan

### Continue Watching
1. Tonton drama beberapa detik
2. Kembali ke halaman For You
3. Lihat section "Lanjutkan Menonton"
4. Klik untuk resume

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port
npm run dev -- --port 3000
```

### API not responding
```bash
# Test API connection
curl https://dramabox-api.zone.id/recommend

# Try alternative API
# Edit .env:
VITE_DRAMABOX_API_BASE_URL=https://lectura.harch.site/api/melolo
```

### Build errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Continue watching not working
```bash
# Clear browser storage
# Open DevTools > Application > Storage > Clear site data
```

## 📚 Documentation

- **API Setup:** `ENV_SETUP.md`
- **Improvements:** `IMPROVEMENTS.md`
- **API Migration:** `API_CHANGES.txt`
- **API Docs:** https://dramabox-api.zone.id/docs

## 🔐 Security

- `.env` file is gitignored
- Never commit API keys
- Use environment variables for sensitive data

## 🚢 Deployment

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
```

### Manual Build
```bash
npm run build
# Upload dist/ folder to your hosting
```

## 📝 Environment Variables for Production

Set these in your hosting platform:

```
VITE_DRAMABOX_API_BASE_URL=https://dramabox-api.zone.id
```

## 🤝 Contributing

1. Fork the project
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

MIT License

## 🙏 Credits

- API by [Dramabox API Zone](https://dramabox-api.zone.id)
- Video Player: [Vidstack](https://www.vidstack.io/)
- State Management: [React Query](https://tanstack.com/query)
- Storage: [LocalForage](https://localforage.github.io/localForage/)
