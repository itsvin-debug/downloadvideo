import axios from 'axios';
import * as cheerio from 'cheerio';

const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const SAVENOW_API_KEY = 'dfcb6d76f2f6a9894gjkege8a4ab232222';

// ===== URL CLEANER & DETECTOR =====
function cleanInputUrl(raw) {
  if (!raw) return '';
  let str = raw.trim();
  // Tangani jika ada slash di awal seperti /www.instagram.com...
  str = str.replace(/^\/+/, '');
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    str = 'https://' + str;
  }
  return str;
}

function detectPlatform(rawUrl) {
  const url = cleanInputUrl(rawUrl);
  if (/tiktok\.com|vt\.tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com|instagr\.am/i.test(url)) return 'instagram';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return null;
}

// ===== HELPER SAVENOW MULTI-PLATFORM SCRAPER =====
async function scrapeViaSaveNow(targetUrl, formatList = ['1080', '720', 'mp3'], defaultTitle = 'Media Video', fallbackAuthor = 'Creator') {
  try {
    const initPromises = formatList.map(async fmt => {
      try {
        const apiUrl = `https://p.savenow.to/api/v2/download?format=${fmt}&url=${encodeURIComponent(targetUrl)}&apikey=${SAVENOW_API_KEY}`;
        const res = await axios.get(apiUrl, {
          headers: { 'User-Agent': UA_DESKTOP, 'Referer': 'https://y2down.cc/' },
          timeout: 7000
        });
        return { format: fmt, progressUrl: res.data?.progress_url, downloadUrl: res.data?.download_url, title: res.data?.title, thumbnail: res.data?.thumbnail_url || res.data?.info?.image };
      } catch (e) {
        return { format: fmt, error: e.message };
      }
    });

    const activeTasks = await Promise.all(initPromises);
    const validTasks = activeTasks.filter(t => t.progressUrl || t.downloadUrl);

    if (validTasks.length > 0) {
      const pollPromises = validTasks.map(async task => {
        let finalUrl = task.downloadUrl || null;
        if (!finalUrl && task.progressUrl) {
          // Poll maksimal 9x (@ 800ms)
          for (let i = 0; i < 9; i++) {
            await new Promise(r => setTimeout(r, 800));
            try {
              const progRes = await axios.get(task.progressUrl, {
                headers: { 'User-Agent': UA_DESKTOP, 'Referer': 'https://y2down.cc/' },
                timeout: 4000
              });
              if (progRes.data?.download_url) {
                finalUrl = progRes.data.download_url;
                break;
              }
            } catch (_) {}
          }
        }

        if (finalUrl) {
          const isAudio = task.format === 'mp3';
          const is1080 = task.format === '1080';
          return {
            label: isAudio ? 'Audio MP3' : is1080 ? 'Resolusi HD 1080p' : 'Resolusi HD 720p',
            quality: isAudio ? '128kbps' : is1080 ? '1080p (Full HD)' : '720p (Standard HD)',
            url: finalUrl,
            type: isAudio ? 'audio' : 'video',
            extension: isAudio ? 'mp3' : 'mp4',
            filename: `media_${Date.now()}_${task.format}.${isAudio ? 'mp3' : 'mp4'}`
          };
        }
        return null;
      });

      const resolved = (await Promise.all(pollPromises)).filter(Boolean);
      if (resolved.length > 0) {
        const video1080 = resolved.find(r => r.label.includes('1080'));
        const video720 = resolved.find(r => r.label.includes('720'));
        const audioMp3 = resolved.find(r => r.type === 'audio');

        const downloadLinks = [];
        if (video1080) downloadLinks.push(video1080);
        if (video720) {
          downloadLinks.push(video720);
        } else if (video1080) {
          downloadLinks.push({
            ...video1080,
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            filename: `media_${Date.now()}_720p.mp4`
          });
        }
        if (audioMp3) downloadLinks.push(audioMp3);

        const firstValid = validTasks.find(t => t.title);
        const title = firstValid?.title || defaultTitle;
        const thumbnail = firstValid?.thumbnail || null;

        return {
          title,
          author: fallbackAuthor,
          thumbnail,
          downloadLinks,
          musicInfo: { title, author: fallbackAuthor }
        };
      }
    }
  } catch (_) {}
  return null;
}

// ===== TIKTOK SCRAPER =====
async function downloadTikTok(rawUrl) {
  const url = cleanInputUrl(rawUrl);
  let lastError = null;

  // Strategi 1: SSSTik Scraper
  try {
    const homeRes = await axios.get('https://ssstik.io/en', {
      headers: { 'User-Agent': UA_DESKTOP },
      timeout: 10000
    });
    const ttMatch = homeRes.data.match(/tt:'([^']+)'/);
    const ttToken = ttMatch ? ttMatch[1] : '';
    const cookies = (homeRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

    const postRes = await axios.post('https://ssstik.io/abc?url=dl', new URLSearchParams({
      id: url, locale: 'en', tt: ttToken
    }), {
      headers: {
        'User-Agent': UA_DESKTOP,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'HX-Request': 'true',
        'HX-Trigger': '_gcaptcha_pt',
        'HX-Target': 'target',
        'HX-Current-URL': 'https://ssstik.io/en',
        'Referer': 'https://ssstik.io/en',
        'Cookie': cookies
      },
      timeout: 12000
    });

    const $ = cheerio.load(postRes.data);
    const title = $('.maintext').text().trim() || $('p').first().text().trim() || 'TikTok Video';
    const thumbnail = $('img.result_author').attr('src') || $('img').first().attr('src') || null;
    const author = $('.result_author h2, .result_author span').first().text().trim() || 'TikTok Creator';
    const rawVideoLinks = [];
    let audioLink = null;

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (!href || !href.startsWith('http')) return;
      if (text.toLowerCase().includes('mp3') || href.includes('/m/')) {
        audioLink = {
          label: 'Audio MP3',
          quality: '128kbps',
          url: href,
          type: 'audio',
          extension: 'mp3',
          filename: `tiktok_audio_${Date.now()}.mp3`
        };
      } else {
        rawVideoLinks.push(href);
      }
    });

    if (rawVideoLinks.length > 0) {
      const downloadLinks = [
        {
          label: 'Resolusi HD 1080p',
          quality: '1080p (Full HD)',
          url: rawVideoLinks[0],
          type: 'video',
          extension: 'mp4',
          filename: `tiktok_1080p_${Date.now()}.mp4`
        },
        {
          label: 'Resolusi HD 720p',
          quality: '720p (Standard HD)',
          url: rawVideoLinks[1] || rawVideoLinks[0],
          type: 'video',
          extension: 'mp4',
          filename: `tiktok_720p_${Date.now()}.mp4`
        }
      ];
      if (audioLink) downloadLinks.push(audioLink);
      return {
        success: true,
        platform: 'TikTok',
        title,
        author,
        thumbnail,
        downloadLinks,
        musicInfo: { title: 'Original TikTok Audio', author }
      };
    }
  } catch (e) {
    lastError = e;
  }

  // Strategi 2: TikWM Fallback
  try {
    const res = await axios.post('https://www.tikwm.com/api/', new URLSearchParams({
      url: url,
      count: '12',
      cursor: '0',
      web: '1',
      hd: '1'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': UA_DESKTOP,
        'Referer': 'https://www.tikwm.com/'
      },
      timeout: 10000
    });
    const data = res.data;
    if (data?.code === 0 && data.data) {
      const item = data.data;
      const downloadLinks = [];
      const base = 'https://www.tikwm.com';
      if (item.hdplay) {
        downloadLinks.push({
          label: 'Resolusi HD 1080p',
          quality: '1080p (Full HD)',
          url: item.hdplay.startsWith('http') ? item.hdplay : base + item.hdplay,
          type: 'video',
          extension: 'mp4',
          filename: `tiktok_${item.id}_1080p.mp4`
        });
      }
      if (item.play) {
        downloadLinks.push({
          label: 'Resolusi HD 720p',
          quality: '720p (Standard HD)',
          url: item.play.startsWith('http') ? item.play : base + item.play,
          type: 'video',
          extension: 'mp4',
          filename: `tiktok_${item.id}_720p.mp4`
        });
      }
      if (item.music) {
        downloadLinks.push({
          label: 'Audio MP3',
          quality: '128kbps',
          url: item.music.startsWith('http') ? item.music : base + item.music,
          type: 'audio',
          extension: 'mp3',
          filename: `tiktok_audio_${item.id}.mp3`
        });
      }
      if (downloadLinks.length > 0) {
        return {
          success: true,
          platform: 'TikTok',
          title: item.title || 'TikTok Video',
          author: item.author?.nickname || item.author?.unique_id || 'Creator',
          thumbnail: item.cover || item.origin_cover,
          downloadLinks,
          musicInfo: {
            title: item.music_info?.title || 'Original Sound',
            author: item.music_info?.author || ''
          }
        };
      }
    }
  } catch (e) {
    lastError = e;
  }

  throw new Error(`Gagal memproses TikTok: ${lastError?.message || 'Video tidak ditemukan'}`);
}

// ===== INSTAGRAM SCRAPER =====
function extractAllIGMedia(html) {
  const videoUrls = [];
  const imageUrls = [];

  const videoMatches = html.matchAll(/video_url\\?":\\?"([^"]+)\\?"/gi);
  for (const m of videoMatches) {
    if (m[1]) {
      let clean = m[1].replace(/\\/g, '').replace(/&amp;/g, '&').replace(/u0026/g, '&').replace(/u00253D/gi, '=');
      if (clean.startsWith('http') && !videoUrls.includes(clean)) {
        videoUrls.push(clean);
      }
    }
  }

  const displayMatches = html.matchAll(/display_url\\?":\\?"([^"]+)\\?"/gi);
  for (const m of displayMatches) {
    if (m[1]) {
      let clean = m[1].replace(/\\/g, '').replace(/&amp;/g, '&').replace(/u0026/g, '&').replace(/u00253D/gi, '=');
      if (clean.startsWith('http') && !imageUrls.includes(clean)) {
        imageUrls.push(clean);
      }
    }
  }

  return { videoUrls, imageUrls };
}

async function downloadInstagram(rawUrl) {
  const url = cleanInputUrl(rawUrl);
  let lastError = null;

  const shortcodeMatch = url.match(/(?:reel|reels|p|tv|stories|share)\/([A-Za-z0-9_-]+)/i);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

  if (!shortcode) {
    throw new Error('Link Instagram tidak valid. Masukkan link Reels, Postingan, atau TV Instagram yang benar.');
  }

  // STRATEGI 1: Instagram Embed Substring Parser (Sangat Cepat & Direct)
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const res = await axios.get(embedUrl, {
      headers: {
        'User-Agent': UA_MOBILE,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 7000
    });

    const html = res.data;
    const { videoUrls, imageUrls } = extractAllIGMedia(html);
    const $ = cheerio.load(html);
    const caption = $('.Caption').text().trim() || $('div.Caption').text().trim() || `Instagram Media (${shortcode})`;
    const author = $('.Avatar img').attr('alt') || 'Instagram User';

    if (videoUrls.length > 0) {
      const primaryVideo = videoUrls[0];
      return {
        success: true,
        platform: 'Instagram',
        title: caption,
        author: author,
        thumbnail: imageUrls[0] || null,
        downloadLinks: [
          {
            label: 'Resolusi HD 1080p',
            quality: '1080p (Full HD)',
            url: primaryVideo,
            type: 'video',
            extension: 'mp4',
            filename: `instagram_${shortcode}_1080p.mp4`
          },
          {
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            url: primaryVideo,
            type: 'video',
            extension: 'mp4',
            filename: `instagram_${shortcode}_720p.mp4`
          },
          {
            label: 'Audio MP3',
            quality: '128kbps',
            url: primaryVideo,
            type: 'audio',
            extension: 'mp3',
            filename: `instagram_audio_${shortcode}.mp3`
          }
        ],
        musicInfo: { title: 'Instagram Audio Track', author }
      };
    }

    if (imageUrls.length > 0) {
      return {
        success: true,
        platform: 'Instagram',
        title: caption,
        author: author,
        thumbnail: imageUrls[0],
        downloadLinks: [
          {
            label: 'Foto HD (Original)',
            quality: 'High Resolution',
            url: imageUrls[0],
            type: 'image',
            extension: 'jpg',
            filename: `instagram_${shortcode}.jpg`
          }
        ]
      };
    }
  } catch (e) {
    lastError = e;
  }

  // STRATEGI 2: Savenow V2 Fallback
  try {
    const snData = await scrapeViaSaveNow(`https://www.instagram.com/reel/${shortcode}/`, ['1080', '720', 'mp3'], `Instagram Media (${shortcode})`, 'Instagram Creator');
    if (snData && snData.downloadLinks?.length > 0) {
      return {
        success: true,
        platform: 'Instagram',
        ...snData
      };
    }
  } catch (e) {
    lastError = e;
  }

  throw new Error(`Tidak dapat menemukan media dari Instagram. Pastikan akun tidak diprivat dan link Reels/Postingan bersifat publik.`);
}

// ===== X / TWITTER SCRAPER =====
async function downloadTwitter(rawUrl) {
  const url = cleanInputUrl(rawUrl);
  let lastError = null;

  const tweetIdMatch = url.match(/status\/(\d+)/i);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  if (!tweetId) {
    throw new Error('ID Tweet tidak ditemukan. Masukkan link postingan X (Twitter) yang valid.');
  }

  // STRATEGI 1: Savenow V2 Engine
  try {
    const snData = await scrapeViaSaveNow(url, ['1080', '720', 'mp3'], `X (Twitter) Video ${tweetId}`, 'X User');
    if (snData && snData.downloadLinks?.length > 0) {
      return {
        success: true,
        platform: 'X (Twitter)',
        ...snData
      };
    }
  } catch (e) {
    lastError = e;
  }

  // STRATEGI 2: TwitSave Scraper
  try {
    const twitSaveUrl = `https://twitsave.com/info?url=${encodeURIComponent(`https://twitter.com/i/status/${tweetId}`)}`;
    const response = await axios.get(twitSaveUrl, {
      headers: { 'User-Agent': UA_DESKTOP },
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const title = $('div.leading-tight h2, p.text-gray-600, div.leading-tight p').first().text().trim() || 'X (Twitter) Video';
    const thumbnail = $('div.aspect-w-16 img, div.w-full img, img[src*="twimg"]').first().attr('src') || null;
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
          filename: `twitter_${tweetId}_${is1080 ? '1080p' : '720p'}.mp4`
        });
      }
    });

    if (downloadLinks.length > 0) {
      downloadLinks.push({
        label: 'Audio MP3',
        quality: '128kbps',
        url: downloadLinks[0].url,
        type: 'audio',
        extension: 'mp3',
        filename: `twitter_audio_${tweetId}.mp3`
      });

      return {
        success: true,
        platform: 'X (Twitter)',
        title,
        author: 'X User',
        thumbnail,
        downloadLinks,
        musicInfo: { title: 'X Sound Track', author: 'X User' }
      };
    }
  } catch (e) {
    lastError = e;
  }

  throw new Error(`Gagal mengambil video dari X (Twitter). Pastikan tweet bersifat publik dan mengandung video.`);
}

// ===== YOUTUBE SCRAPER =====
async function downloadYouTube(rawUrl) {
  const url = cleanInputUrl(rawUrl);
  let lastError = null;

  const videoIdMatch = url.match(/(?:v=|shorts\/|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/i);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  if (!videoId) {
    throw new Error('Link YouTube tidak valid. Masukkan link Video atau YouTube Shorts yang benar.');
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // 1. Ambil Metadata (Title, Author, Thumbnail) secara instan
  let title = `YouTube Video ${videoId}`;
  let author = 'YouTube Creator';
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembedRes = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(standardUrl)}`, { timeout: 4000 });
    if (oembedRes.data?.title) title = oembedRes.data.title;
    if (oembedRes.data?.author_name) author = oembedRes.data.author_name;
    if (oembedRes.data?.thumbnail_url) thumbnail = oembedRes.data.thumbnail_url;
  } catch (_) {}

  // 2. STRATEGI 1: Savenow V2 Engine (1080p, 720p, MP3)
  try {
    const snData = await scrapeViaSaveNow(standardUrl, ['1080', '720', 'mp3'], title, author);
    if (snData && snData.downloadLinks?.length > 0) {
      return {
        success: true,
        platform: 'YouTube',
        title: snData.title || title,
        author: snData.author || author,
        thumbnail: snData.thumbnail || thumbnail,
        downloadLinks: snData.downloadLinks,
        musicInfo: { title: snData.title || title, author: snData.author || author }
      };
    }
  } catch (e) {
    lastError = e;
  }

  // 3. STRATEGI 2: Fallback Innertube ANDROID_VR Engine
  try {
    const playerRes = await axios.post('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.43.32',
          deviceMake: 'Oculus',
          deviceModel: 'Quest 3',
          hl: 'en',
          gl: 'US'
        }
      },
      videoId: videoId
    }, {
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA_DESKTOP },
      timeout: 6000
    });

    const sData = playerRes.data?.streamingData;
    if (sData) {
      const formats = (sData.formats || []).concat(sData.adaptiveFormats || []);
      const direct = formats.filter(f => f.url);
      if (direct.length > 0) {
        const downloadLinks = [
          {
            label: 'Resolusi HD 1080p',
            quality: '1080p (Full HD)',
            url: direct[0].url,
            type: 'video',
            extension: 'mp4',
            filename: `youtube_${videoId}_1080p.mp4`
          },
          {
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            url: direct[1]?.url || direct[0].url,
            type: 'video',
            extension: 'mp4',
            filename: `youtube_${videoId}_720p.mp4`
          },
          {
            label: 'Audio MP3',
            quality: '128kbps',
            url: direct[0].url,
            type: 'audio',
            extension: 'mp3',
            filename: `youtube_audio_${videoId}.mp3`
          }
        ];
        return {
          success: true,
          platform: 'YouTube',
          title,
          author,
          thumbnail,
          downloadLinks,
          musicInfo: { title, author }
        };
      }
    }
  } catch (e) {
    lastError = e;
  }

  throw new Error(`Gagal mengambil media YouTube. Pastikan video bersifat publik dan tidak dibatasi usia.`);
}

// ===== MAIN SERVERLESS ROUTE HANDLER =====
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed.' });

  const { url, expectedPlatform } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ success: false, message: 'URL tidak boleh kosong.' });
  }

  const cleaned = cleanInputUrl(url);
  const platform = detectPlatform(cleaned);
  if (!platform) {
    return res.status(400).json({
      success: false,
      message: 'URL tidak dikenali. Pastikan memasukkan link dari TikTok, Instagram, X (Twitter), atau YouTube.'
    });
  }

  const PLATFORM_NAMES = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    twitter: 'X (Twitter)',
    youtube: 'YouTube'
  };

  if (expectedPlatform && expectedPlatform !== platform) {
    return res.status(400).json({
      success: false,
      message: `Link yang kamu masukkan adalah link ${PLATFORM_NAMES[platform]}, bukan ${PLATFORM_NAMES[expectedPlatform]}. Silakan pilih platform yang sesuai.`
    });
  }

  try {
    let data;
    if (platform === 'tiktok') data = await downloadTikTok(cleaned);
    else if (platform === 'instagram') data = await downloadInstagram(cleaned);
    else if (platform === 'twitter') data = await downloadTwitter(cleaned);
    else if (platform === 'youtube') data = await downloadYouTube(cleaned);

    // Format proxy URL untuk download mobile langsung ke penyimpanan/galeri
    if (data?.downloadLinks) {
      data.downloadLinks = data.downloadLinks.map(item => ({
        ...item,
        proxyUrl: `/api/proxy-download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(item.filename || 'kaze_media.mp4')}`
      }));
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(`[Scraper Error] Platform: ${platform}, URL: ${cleaned}, Error:`, error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kendala saat mengekstrak media. Pastikan link bersifat publik dan dapat diakses.'
    });
  }
}
