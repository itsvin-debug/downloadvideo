# 🌟 Kaze Media Downloader (TikTok, Instagram & X)

Aplikasi Web Downloader Video & Audio Modern tanpa watermark untuk **TikTok**, **Instagram**, dan **X (Twitter)** dengan arsitektur **Node.js (Express)** di Backend dan **React (Vite)** di Frontend. Mengadopsi visual dan tema interaktif 5 screen dari Stitch UI Design & WebGL Shader.

---

## 📁 Struktur Folder Proyek

```text
download/
├── backend/                  # Server Node.js & Express API
│   ├── package.json
│   └── src/
│       ├── server.js         # Server express utama, CORS & error handler
│       ├── routes/
│       │   └── download.route.js    # Endpoint POST /api/download & GET /api/proxy-download
│       └── services/
│           ├── detector.service.js  # Deteksi platform via Regex (TikTok, IG, X)
│           ├── tiktok.service.js    # Scraper & extractor TikTok no-watermark & MP3
│           ├── instagram.service.js # Scraper & extractor Instagram Reels & Post HD
│           └── twitter.service.js   # Scraper & extractor X (Twitter) Video HD
│
├── frontend/                 # Client React (Vite + Tailwind Theme Stitch)
│   ├── index.html            # Google Fonts Inter, Material Symbols & Stitch Theme
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx           # State router pengatur Screen (Splash, Welcome, Converter)
│       ├── index.css         # Styling Glassmorphism, Glow effect & animasi
│       └── components/
│           ├── ShaderBackground.jsx # WebGL dynamic canvas background (Screen 4)
│           ├── SplashScreen.jsx     # Screen 1: Splash screen animasi glow
│           ├── WelcomeScreen.jsx    # Screen 2: Welcome Hub & Grid Platform Card
│           ├── ConverterScreen.jsx  # Screen 3: Input link, format MP4/MP3 & instant paste
│           ├── ResultsSection.jsx   # Screen 5: Preview thumbnail, quality chips, & MP3 player
│           ├── Navbar.jsx           # Header navigasi desktop & responsive mobile
│           └── Footer.jsx           # Footer brand & hak cipta
│
└── stitch_designs/           # File HTML dan screenshot dari project Stitch
```

---

## 🚀 Cara Menjalankan Aplikasi

Pastikan di komputermu sudah terpasang [Node.js](https://nodejs.org/) (versi 18 ke atas).

### 1. Jalankan Backend (Node.js + Express)
Buka terminal baru di folder `backend`:
```bash
cd backend
npm install
npm run dev
```
> Server backend akan berjalan di **`http://localhost:5000`**.

---

### 2. Jalankan Frontend (React + Vite)
Buka terminal baru di folder `frontend`:
```bash
cd frontend
npm install
npm run dev
```
> Buka browser dan akses alamat **`http://localhost:5173`**.

---

## 📡 Dokumentasi Spesifikasi API Backend

### 1. Ekstraksi Video & Audio
- **URL**: `POST /api/download`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "url": "https://www.tiktok.com/@user/video/1234567890"
  }
  ```
- **Response Sukses (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Berhasil mengambil media!",
    "data": {
      "platform": "TikTok",
      "title": "Judul Video",
      "author": "Nama Pembuat",
      "thumbnail": "https://...",
      "duration": "15s",
      "downloadLinks": [
        {
          "label": "HD (No Watermark)",
          "quality": "1080p / HD",
          "url": "https://direct-cdn-link.mp4",
          "proxyUrl": "/api/proxy-download?url=...&filename=...",
          "type": "video",
          "extension": "mp4",
          "filename": "tiktok_123_hd.mp4"
        },
        {
          "label": "Audio MP3",
          "quality": "128kbps",
          "url": "https://direct-cdn-link.mp3",
          "proxyUrl": "/api/proxy-download?url=...&filename=...",
          "type": "audio",
          "extension": "mp3",
          "filename": "tiktok_audio_123.mp3"
        }
      ]
    }
  }
  ```

### 2. Proxy Stream Direct Download (Bypass CORS CDN)
- **URL**: `GET /api/proxy-download?url={ENCODED_URL}&filename={FILENAME}`
- **Fungsi**: Memaksa browser mengunduh file media langsung ke penyimpanan lokal / galeri dengan header `Content-Disposition: attachment; filename="..."` tanpa kendala CORS.

---

## 🎨 Fitur & Keunggulan Frontend
- **WebGL Dynamic Shader Background**: Latar kanvas interaktif berbasis GPU 60fps tanpa lag.
- **Glassmorphism & Glow Design System**: Tema gelap navy elegan (`#0b1326`) sesuai token Stitch.
- **Smooth Flow**: Transisi mulus antara Splash Screen -> Welcome Screen -> Media Converter -> Results.
- **Direct Save to Gallery/Disk**: Pengunduhan video/audio langsung tersimpan di komputer/smartphone pengguna.
- **Informal Indonesian Code Comments**: Seluruh komentar kode ditulis dalam bahasa Indonesia yang santai dan mudah dimengerti.
