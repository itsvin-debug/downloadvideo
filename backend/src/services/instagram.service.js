import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ytDlpPath = path.join(__dirname, '..', '..', 'bin', 'yt-dlp.exe');
const agent = new https.Agent({ rejectUnauthorized: false });

// pembantu buat ambil shortcode dari berbagai format URL Instagram
function getInstagramShortcode(url) {
  const match = url.match(/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  return match ? match[1] : null;
}

// STRATEGI 1: Ekstraksi lewat binary yt-dlp lokal
async function extractInstagramViaYtDlp(url) {
  return new Promise((resolve, reject) => {
    execFile(ytDlpPath, [
      '-J',
      '--no-warnings',
      '--user-agent',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      url
    ], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error('yt-dlp gagal: ' + (stderr || error.message)));
      }

      try {
        const info = JSON.parse(stdout);
        const title = info.title || info.description || 'Instagram Video / Reel';
        const author = info.uploader || info.channel || 'Instagram User';
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
            filename: `instagram_${Date.now()}_1080p.mp4`
          });
        }

        if (hd720 && hd720.url) {
          downloadLinks.push({
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            url: hd720.url,
            type: 'video',
            extension: 'mp4',
            filename: `instagram_${Date.now()}_720p.mp4`
          });
        }

        if (downloadLinks.length > 0) {
          return resolve({
            success: true,
            platform: 'Instagram',
            title,
            author,
            thumbnail,
            downloadLinks
          });
        }

        reject(new Error('Format video Instagram tidak ditemukan lewat yt-dlp.'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// STRATEGI 2: Ekstraksi lewat Instagram Embed Page
async function extractInstagramViaEmbed(url) {
  const shortcode = getInstagramShortcode(url);
  if (!shortcode) throw new Error('Shortcode Instagram tidak valid.');

  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const res = await axios.get(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    httpsAgent: agent,
    timeout: 10000
  });

  const html = res.data;
  const $ = cheerio.load(html);
  const caption = $('.Caption').text().trim() || $('div.Caption').text().trim() || 'Instagram Media';
  const author = $('.Avatar img').attr('alt') || 'Instagram Creator';

  const videoMatch = html.match(/video_url\s*:\s*"([^"]+)"/) || html.match(/"video_url":"([^"]+)"/);
  const displayMatch = html.match(/display_url\s*:\s*"([^"]+)"/) || html.match(/"display_url":"([^"]+)"/);

  const downloadLinks = [];

  if (videoMatch && videoMatch[1]) {
    const rawVideoUrl = JSON.parse(`"${videoMatch[1]}"`);
    downloadLinks.push({
      label: 'Resolusi HD 1080p',
      quality: '1080p (Full HD)',
      url: rawVideoUrl,
      type: 'video',
      extension: 'mp4',
      filename: `instagram_${shortcode}_1080p.mp4`
    });
    downloadLinks.push({
      label: 'Resolusi HD 720p',
      quality: '720p (Standard HD)',
      url: rawVideoUrl,
      type: 'video',
      extension: 'mp4',
      filename: `instagram_${shortcode}_720p.mp4`
    });
  } else if (displayMatch && displayMatch[1]) {
    const rawImgUrl = JSON.parse(`"${displayMatch[1]}"`);
    downloadLinks.push({
      label: 'Foto HD (Original)',
      quality: 'High Resolution',
      url: rawImgUrl,
      type: 'image',
      extension: 'jpg',
      filename: `instagram_${shortcode}.jpg`
    });
  }

  if (downloadLinks.length > 0) {
    return {
      success: true,
      platform: 'Instagram',
      title: caption,
      author: author,
      thumbnail: displayMatch ? JSON.parse(`"${displayMatch[1]}"`) : null,
      downloadLinks
    };
  }

  throw new Error('Tidak dapat menemukan media dari embed Instagram.');
}

// STRATEGI 3: FastDL / SaveIG scraper fallback
async function extractInstagramViaFastDL(url) {
  const res = await axios.post('https://fastdl.app/c/', new URLSearchParams({
    url: url,
    lang_code: 'en'
  }), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': 'https://fastdl.app/'
    },
    httpsAgent: agent,
    timeout: 10000
  });

  const $ = cheerio.load(res.data);
  const downloadLinks = [];
  $('a.download-items__btn, a.btn-download, a[download], a[href*="cdninstagram"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('javascript')) {
      const isVideo = href.includes('.mp4');
      downloadLinks.push({
        label: isVideo ? `Resolusi HD ${i === 0 ? '1080p' : '720p'}` : `Download Foto #${i + 1}`,
        quality: isVideo ? (i === 0 ? '1080p (Full HD)' : '720p (Standard HD)') : 'HD Image',
        url: href,
        type: isVideo ? 'video' : 'image',
        extension: isVideo ? 'mp4' : 'jpg',
        filename: `instagram_${Date.now()}_${i + 1}.${isVideo ? 'mp4' : 'jpg'}`
      });
    }
  });

  if (downloadLinks.length > 0) {
    return {
      success: true,
      platform: 'Instagram',
      title: 'Instagram Media',
      author: 'Instagram User',
      thumbnail: $('img').first().attr('src') || null,
      downloadLinks
    };
  }

  throw new Error('Gagal mengekstrak media dari FastDL.');
}

// FUNGSI UTAMA downloadInstagram dengan multi-engine fallback
export async function downloadInstagram(url) {
  let lastError = null;

  try {
    const res1 = await extractInstagramViaEmbed(url);
    if (res1 && res1.downloadLinks.length > 0) return res1;
  } catch (err) {
    console.warn('Strategi 1 Instagram (Embed) gagal, mencoba fallback... Detail:', err.message);
    lastError = err;
  }

  try {
    const res2 = await extractInstagramViaYtDlp(url);
    if (res2 && res2.downloadLinks.length > 0) return res2;
  } catch (err) {
    console.warn('Strategi 2 Instagram (yt-dlp) gagal, mencoba fallback... Detail:', err.message);
    lastError = err;
  }

  try {
    const res3 = await extractInstagramViaFastDL(url);
    if (res3 && res3.downloadLinks.length > 0) return res3;
  } catch (err) {
    console.warn('Strategi 3 Instagram (FastDL) gagal... Detail:', err.message);
    lastError = err;
  }

  throw new Error(`Gagal mengambil media Instagram. Pastikan akun tidak diprivat dan link video Reels/Post valid. (Detail: ${lastError?.message || 'Media tidak ditemukan'})`);
}
