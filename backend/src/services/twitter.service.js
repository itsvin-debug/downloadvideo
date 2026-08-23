import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ytDlpPath = path.join(__dirname, '..', '..', 'bin', 'yt-dlp.exe');

// STRATEGI 1: Ekstraksi lewat binary yt-dlp lokal
async function extractTwitterViaYtDlp(url) {
  return new Promise((resolve, reject) => {
    execFile(ytDlpPath, ['-J', '--no-warnings', url], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error('yt-dlp gagal: ' + (stderr || error.message)));
      }

      try {
        const info = JSON.parse(stdout);
        const title = info.title || info.description || 'X (Twitter) Video';
        const author = info.uploader || info.channel || 'X Creator';
        const thumbnail = info.thumbnail || null;

        const downloadLinks = [];
        const formats = (info.formats || []).filter(f => f.url && f.ext === 'mp4');

        const hd1080 = formats.find(f => f.height >= 1080) || formats[0] || { url: info.url };
        const hd720 = formats.find(f => f.height >= 720 && f.height < 1080) || formats[1] || formats[0] || { url: info.url };

        if (hd1080 && hd1080.url) {
          downloadLinks.push({
            label: 'Resolusi HD 1080p',
            quality: '1080p (Full HD)',
            url: hd1080.url,
            type: 'video',
            extension: 'mp4',
            filename: `twitter_${info.id || Date.now()}_1080p.mp4`
          });
        }

        if (hd720 && hd720.url) {
          downloadLinks.push({
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            url: hd720.url,
            type: 'video',
            extension: 'mp4',
            filename: `twitter_${info.id || Date.now()}_720p.mp4`
          });
        }

        if (downloadLinks.length > 0) {
          return resolve({
            success: true,
            platform: 'X (Twitter)',
            title,
            author,
            thumbnail,
            downloadLinks
          });
        }

        reject(new Error('Tidak ada format video Twitter yang ditemukan.'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// STRATEGI 2: TwitSave scraper fallback
async function extractTwitterViaTwitSave(url) {
  const twitSaveUrl = `https://twitsave.com/info?url=${encodeURIComponent(url)}`;
  const response = await axios.get(twitSaveUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    timeout: 12000
  });

  const $ = cheerio.load(response.data);
  const title = $('div.leading-tight h2, p.text-gray-600').first().text().trim() || 'X (Twitter) Video';
  const thumbnail = $('div.aspect-w-16 img, div.w-full img').first().attr('src') || null;
  const downloadLinks = [];

  $('a[href*="download"], a.btn-primary, a[download]').each((_, el) => {
    const link = $(el).attr('href');
    const text = $(el).text().trim();

    if (link && (link.startsWith('http') || link.startsWith('/download'))) {
      const fullUrl = link.startsWith('http') ? link : `https://twitsave.com${link}`;
      const is1080 = text.includes('1080') || text.includes('HD');
      downloadLinks.push({
        label: is1080 ? 'Resolusi HD 1080p' : 'Resolusi HD 720p',
        quality: is1080 ? '1080p (Full HD)' : '720p (Standard HD)',
        url: fullUrl,
        type: 'video',
        extension: 'mp4',
        filename: `twitter_${Date.now()}_${is1080 ? '1080p' : '720p'}.mp4`
      });
    }
  });

  if (downloadLinks.length > 0) {
    return {
      success: true,
      platform: 'X (Twitter)',
      title,
      author: 'X User',
      thumbnail,
      downloadLinks
    };
  }

  throw new Error('Tidak ada link video dari TwitSave.');
}

// FUNGSI UTAMA downloadTwitter dengan multi-engine fallback
export async function downloadTwitter(url) {
  let lastError = null;

  try {
    const res1 = await extractTwitterViaYtDlp(url);
    if (res1 && res1.downloadLinks.length > 0) return res1;
  } catch (err) {
    console.warn('Strategi 1 Twitter (yt-dlp) gagal, mencoba fallback... Detail:', err.message);
    lastError = err;
  }

  try {
    const res2 = await extractTwitterViaTwitSave(url);
    if (res2 && res2.downloadLinks.length > 0) return res2;
  } catch (err) {
    console.warn('Strategi 2 Twitter (TwitSave) gagal... Detail:', err.message);
    lastError = err;
  }

  throw new Error(`Gagal mengambil video dari X (Twitter). Pastikan tweet publik dan mengandung media video. (Detail: ${lastError?.message || 'Media tidak ditemukan'})`);
}
