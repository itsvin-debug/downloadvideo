import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import downloadRoutes from './routes/download.route.js';

// load konfigurasi env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// settingan CORS biar frontend React kita bisa leluasa nembak API
app.use(cors({
  origin: '*', // ijinin akses dari domain/port mana aja (termasuk localhost vite)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// middleware parsing json dan form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// pasang rute API downloader
app.use('/api', downloadRoutes);

// rute dasar buat ngecek server idup atau kagak
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Backend Kaze Media Downloader siap meluncur! 🚀',
    endpoints: {
      download: 'POST /api/download',
      proxyStream: 'GET /api/proxy-download'
    }
  });
});

// penanganan error global biar server gak gampang crash
app.use((err, req, res, next) => {
  console.error('Ada unhandled error nih:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Ups! Terjadi kesalahan internal pada server kami.'
  });
});

// nyalain server express
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 Server Backend Kaze Downloader nyala di:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=============================================`);
});
