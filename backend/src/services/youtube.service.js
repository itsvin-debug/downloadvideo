import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ytDlpPath = path.join(__dirname, '..', '..', 'bin', 'yt-dlp.exe');

// service buat extract video YouTube dan YouTube Shorts dalam resolusi HD 1080p dan 720p
export async function downloadYouTube(url) {
  return new Promise((resolve, reject) => {
    // panggil binary yt-dlp secara lokal buat ambil metadata format lengkap
    execFile(ytDlpPath, ['-J', '--no-warnings', '--no-playlist', url], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error saat menjalankan yt-dlp untuk YouTube:', stderr || error.message);
        return reject(new Error('Gagal mengambil data video YouTube. Pastikan link video publik dan valid.'));
      }

      try {
        const info = JSON.parse(stdout);
        const title = info.title || 'YouTube Video';
        const author = info.uploader || info.channel || 'YouTube Creator';
        const thumbnail = info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url) || null;
        const duration = info.duration ? `${info.duration}s` : null;

        const downloadLinks = [];

        // filter format video mp4 yang playable
        const formats = info.formats || [];
        const combinedFormats = formats.filter(f => f.url && (f.ext === 'mp4' || f.container === 'mp4'));

        // cari format kualitas 1080p atau resolusi tertinggi
        const hd1080 = combinedFormats.find(f => f.height >= 1080) || combinedFormats[0] || { url: info.url };
        // cari format kualitas 720p atau standard
        const hd720 = combinedFormats.find(f => f.height >= 720 && f.height < 1080) || combinedFormats[1] || combinedFormats[0] || { url: info.url };

        if (hd1080 && hd1080.url) {
          downloadLinks.push({
            label: 'Resolusi HD 1080p',
            quality: '1080p (Full HD)',
            url: hd1080.url,
            type: 'video',
            extension: 'mp4',
            filename: `youtube_${info.id || Date.now()}_1080p.mp4`
          });
        }

        if (hd720 && hd720.url) {
          downloadLinks.push({
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            url: hd720.url,
            type: 'video',
            extension: 'mp4',
            filename: `youtube_${info.id || Date.now()}_720p.mp4`
          });
        }

        // jika format spesifik tidak ditemukan namun url direct ada
        if (downloadLinks.length === 0 && info.url) {
          downloadLinks.push({
            label: 'Resolusi HD (Default)',
            quality: 'HD Video',
            url: info.url,
            type: 'video',
            extension: 'mp4',
            filename: `youtube_${info.id || Date.now()}.mp4`
          });
        }

        if (downloadLinks.length > 0) {
          return resolve({
            success: true,
            platform: 'YouTube',
            title,
            author,
            thumbnail,
            duration,
            downloadLinks
          });
        }

        reject(new Error('Tidak ditemukan format video YouTube yang dapat diunduh langsung.'));

      } catch (parseErr) {
        console.error('Gagal parsing output yt-dlp YouTube:', parseErr.message);
        reject(new Error('Gagal memproses metadata video YouTube.'));
      }
    });
  });
}
