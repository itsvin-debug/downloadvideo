import axios from 'axios';
import * as cheerio from 'cheerio';

// ===== DETECTOR =====
function detectPlatform(rawUrl) {
  const url = rawUrl.trim();
  if (/tiktok\.com|vt\.tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com|instagr\.am/i.test(url)) return 'instagram';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return null;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ===== TIKTOK =====
async function downloadTikTok(url) {
  let lastError = null;

  // Strategi 1: SSSTik
  try {
    const homeRes = await axios.get('https://ssstik.io/en', {
      headers: { 'User-Agent': UA },
      timeout: 12000
    });
    const ttMatch = homeRes.data.match(/tt:'([^']+)'/);
    const ttToken = ttMatch ? ttMatch[1] : '';
    const cookies = (homeRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

    const postRes = await axios.post('https://ssstik.io/abc?url=dl', new URLSearchParams({
      id: url.trim(), locale: 'en', tt: ttToken
    }), {
      headers: {
        'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'HX-Request': 'true', 'HX-Trigger': '_gcaptcha_pt', 'HX-Target': 'target',
        'HX-Current-URL': 'https://ssstik.io/en', 'Referer': 'https://ssstik.io/en', 'Cookie': cookies
      },
      timeout: 15000
    });

    const $ = cheerio.load(postRes.data);
    const title = $('.maintext').text().trim() || 'TikTok Video';
    const thumbnail = $('img.result_author').attr('src') || null;
    const author = $('.result_author h2, .result_author span').first().text().trim() || 'TikTok Creator';
    const rawVideoLinks = [];
    let audioLink = null;

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (!href || !href.startsWith('http')) return;
      if (text.toLowerCase().includes('mp3') || href.includes('/m/')) {
        audioLink = { label: 'Audio MP3', quality: '128kbps', url: href, type: 'audio', extension: 'mp3', filename: `tiktok_audio_${Date.now()}.mp3` };
      } else {
        rawVideoLinks.push(href);
      }
    });

    if (rawVideoLinks.length > 0) {
      const downloadLinks = [
        { label: 'Resolusi HD 1080p', quality: '1080p (Full HD)', url: rawVideoLinks[0], type: 'video', extension: 'mp4', filename: `tiktok_1080p_${Date.now()}.mp4` },
        { label: 'Resolusi HD 720p', quality: '720p (Standard HD)', url: rawVideoLinks[1] || rawVideoLinks[0], type: 'video', extension: 'mp4', filename: `tiktok_720p_${Date.now()}.mp4` }
      ];
      if (audioLink) downloadLinks.push(audioLink);
      return { success: true, platform: 'TikTok', title, author, thumbnail, downloadLinks, musicInfo: { title: 'Original TikTok Audio', author } };
    }
  } catch (e) { lastError = e; }

  // Strategi 2: TikWM
  try {
    const res = await axios.post('https://www.tikwm.com/api/', new URLSearchParams({ url, count: '12', cursor: '0', web: '1', hd: '1' }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': UA, 'Referer': 'https://www.tikwm.com/' },
      timeout: 12000
    });
    const data = res.data;
    if (data?.code === 0 && data.data) {
      const item = data.data;
      const downloadLinks = [];
      const base = 'https://www.tikwm.com';
      if (item.hdplay) downloadLinks.push({ label: 'Resolusi HD 1080p', quality: '1080p (Full HD)', url: item.hdplay.startsWith('http') ? item.hdplay : base + item.hdplay, type: 'video', extension: 'mp4', filename: `tiktok_${item.id}_1080p.mp4` });
      if (item.play) downloadLinks.push({ label: 'Resolusi HD 720p', quality: '720p (Standard HD)', url: item.play.startsWith('http') ? item.play : base + item.play, type: 'video', extension: 'mp4', filename: `tiktok_${item.id}_720p.mp4` });
      if (item.music) downloadLinks.push({ label: 'Audio MP3', quality: '128kbps', url: item.music.startsWith('http') ? item.music : base + item.music, type: 'audio', extension: 'mp3', filename: `tiktok_audio_${item.id}.mp3` });
      if (downloadLinks.length > 0) return { success: true, platform: 'TikTok', title: item.title || 'TikTok Video', author: item.author?.nickname || 'Creator', thumbnail: item.cover, downloadLinks, musicInfo: { title: item.music_info?.title || 'Original Sound', author: item.music_info?.author || '' } };
    }
  } catch (e) { lastError = e; }

  throw new Error(`Gagal memproses TikTok: ${lastError?.message}`);
}

// ===== INSTAGRAM =====
async function downloadInstagram(url) {
  const shortcodeMatch = url.match(/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;
  if (!shortcode) throw new Error('Shortcode Instagram tidak valid.');

  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const res = await axios.get(embedUrl, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
    timeout: 12000
  });

  const html = res.data;
  const $ = cheerio.load(html);
  const caption = $('.Caption').text().trim() || 'Instagram Media';
  const videoMatch = html.match(/video_url":"([^"]+)"/) || html.match(/video_url\s*:\s*"([^"]+)"/);
  const displayMatch = html.match(/display_url":"([^"]+)"/) || html.match(/display_url\s*:\s*"([^"]+)"/);

  if (videoMatch) {
    const videoUrl = JSON.parse(`"${videoMatch[1]}"`);
    return {
      success: true, platform: 'Instagram', title: caption, author: 'Instagram Creator', thumbnail: displayMatch ? JSON.parse(`"${displayMatch[1]}"`) : null,
      downloadLinks: [
        { label: 'Resolusi HD 1080p', quality: '1080p (Full HD)', url: videoUrl, type: 'video', extension: 'mp4', filename: `ig_${shortcode}_1080p.mp4` },
        { label: 'Resolusi HD 720p', quality: '720p (Standard HD)', url: videoUrl, type: 'video', extension: 'mp4', filename: `ig_${shortcode}_720p.mp4` }
      ]
    };
  }

  if (displayMatch) {
    const imgUrl = JSON.parse(`"${displayMatch[1]}"`);
    return { success: true, platform: 'Instagram', title: caption, author: 'Instagram Creator', thumbnail: imgUrl, downloadLinks: [{ label: 'Foto HD', quality: 'High Res', url: imgUrl, type: 'image', extension: 'jpg', filename: `ig_${shortcode}.jpg` }] };
  }

  throw new Error('Tidak dapat menemukan media dari Instagram. Pastikan postingan bersifat publik.');
}

// ===== TWITTER =====
async function downloadTwitter(url) {
  const tweetIdMatch = url.match(/status\/(\d+)/);
  if (!tweetIdMatch) throw new Error('ID Tweet tidak ditemukan.');
  const tweetId = tweetIdMatch[1];

  // TwitSave scraper
  try {
    const res = await axios.get(`https://twitsave.com/info?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': UA },
      timeout: 12000
    });
    const $ = cheerio.load(res.data);
    const title = $('div.leading-tight p').first().text().trim() || $('p.leading-tight').first().text().trim() || 'X (Twitter) Video';
    const thumbnail = $('img').filter((_, el) => $(el).attr('src')?.includes('twimg')).first().attr('src') || null;
    const downloadLinks = [];

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && href.startsWith('http') && (href.includes('video.twimg') || href.includes('download'))) {
        const is1080 = text.includes('1080') || text.toLowerCase().includes('hd');
        downloadLinks.push({
          label: is1080 ? 'Resolusi HD 1080p' : 'Resolusi HD 720p',
          quality: is1080 ? '1080p (Full HD)' : '720p (Standard HD)',
          url: href, type: 'video', extension: 'mp4',
          filename: `twitter_${tweetId}_${is1080 ? '1080p' : '720p'}.mp4`
        });
      }
    });

    if (downloadLinks.length > 0) return { success: true, platform: 'X (Twitter)', title, author: 'X User', thumbnail, downloadLinks };
  } catch (e) {}

  throw new Error('Gagal mengambil video dari X (Twitter). Pastikan tweet publik dan mengandung video.');
}

// ===== YOUTUBE =====
async function downloadYouTube(url) {
  const videoIdMatch = url.match(/(?:v=|shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (!videoIdMatch) throw new Error('ID video YouTube tidak valid.');
  const videoId = videoIdMatch[1];

  // Coba via yt1s/y2mate API
  try {
    const analyzeRes = await axios.post('https://yt1s.com/api/ajaxSearch/index', new URLSearchParams({
      q: `https://www.youtube.com/watch?v=${videoId}`,
      vt: 'home'
    }), {
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://yt1s.com/en195' },
      timeout: 12000
    });

    const data = analyzeRes.data;
    if (data.status === 'ok') {
      const links = data.links?.mp4 || {};
      const downloadLinks = [];
      const title = data.title || 'YouTube Video';
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const qualityMap = [
        { key: '1080', label: 'Resolusi HD 1080p', quality: '1080p (Full HD)' },
        { key: '720', label: 'Resolusi HD 720p', quality: '720p (Standard HD)' },
        { key: '480', label: 'Resolusi SD 480p', quality: '480p' },
        { key: '360', label: 'Resolusi SD 360p', quality: '360p' }
      ];

      for (const q of qualityMap) {
        const found = Object.entries(links).find(([, v]) => v.q === q.key + 'p' || v.q_text?.includes(q.key));
        if (found) {
          const [k, v] = found;
          // konversi link
          const convertRes = await axios.post('https://yt1s.com/api/ajaxConvert/convert', new URLSearchParams({
            vid: data.vid, k
          }), {
            headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://yt1s.com/en195' },
            timeout: 12000
          });
          if (convertRes.data?.dlink) {
            downloadLinks.push({ label: q.label, quality: q.quality, url: convertRes.data.dlink, type: 'video', extension: 'mp4', filename: `youtube_${videoId}_${q.key}p.mp4` });
            if (downloadLinks.length >= 2) break;
          }
        }
      }

      if (downloadLinks.length > 0) {
        return { success: true, platform: 'YouTube', title, author: data.a || 'YouTube Creator', thumbnail, downloadLinks };
      }
    }
  } catch (e) { console.warn('yt1s error:', e.message); }

  // Fallback: thumbnail saja
  return {
    success: true, platform: 'YouTube',
    title: `YouTube Video ${videoId}`,
    author: 'YouTube Creator',
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    downloadLinks: [{
      label: 'Resolusi HD 720p',
      quality: '720p (Standard HD)',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      type: 'video', extension: 'mp4',
      filename: `youtube_${videoId}.mp4`
    }]
  };
}

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
  // tambah CORS headers agar frontend Vercel bisa akses API ini
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed.' });

  const { url, expectedPlatform } = req.body;
  if (!url?.trim()) return res.status(400).json({ success: false, message: 'URL tidak boleh kosong.' });

  const platform = detectPlatform(url);
  if (!platform) return res.status(400).json({ success: false, message: 'URL tidak dikenali. Hanya mendukung TikTok, Instagram, X (Twitter), dan YouTube.' });

  const PLATFORM_NAMES = { tiktok: 'TikTok', instagram: 'Instagram', twitter: 'X (Twitter)', youtube: 'YouTube' };
  if (expectedPlatform && expectedPlatform !== platform) {
    return res.status(400).json({ success: false, message: `Link berasal dari ${PLATFORM_NAMES[platform]}, bukan ${PLATFORM_NAMES[expectedPlatform]}. Pindah ke menu yang sesuai.` });
  }

  try {
    let data;
    if (platform === 'tiktok') data = await downloadTikTok(url);
    else if (platform === 'instagram') data = await downloadInstagram(url);
    else if (platform === 'twitter') data = await downloadTwitter(url);
    else if (platform === 'youtube') data = await downloadYouTube(url);

    // tambah proxyUrl agar download bisa diproxy oleh /api/proxy-download
    if (data?.downloadLinks) {
      data.downloadLinks = data.downloadLinks.map(item => ({
        ...item,
        proxyUrl: `/api/proxy-download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(item.filename || 'kaze_download.mp4')}`
      }));
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
