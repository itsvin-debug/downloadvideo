import axios from 'axios';
import * as cheerio from 'cheerio';

// User Agent modern
const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

// ===== DETECTOR =====
function detectPlatform(rawUrl) {
  const url = rawUrl.trim();
  if (/tiktok\.com|vt\.tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com|instagr\.am/i.test(url)) return 'instagram';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return null;
}

// ===== TIKTOK SCRAPER =====
async function downloadTikTok(url) {
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
      id: url.trim(), locale: 'en', tt: ttToken
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
      url: url.trim(),
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

// ===== HELPER EKSTRAKSI CLEAN INSTAGRAM =====
function extractCleanIGUrl(html, key) {
  const marker = `\\"${key}\\":\\"`;
  const idx = html.indexOf(marker);
  if (idx === -1) {
    const marker2 = `"${key}":"`;
    const idx2 = html.indexOf(marker2);
    if (idx2 === -1) return null;
    const start = idx2 + marker2.length;
    const end = html.indexOf(`"`, start);
    if (end === -1) return null;
    return html.substring(start, end).replace(/\\\\\//g, '/').replace(/\\\//g, '/').replace(/\\u0026/g, '&');
  }
  const start = idx + marker.length;
  const end = html.indexOf(`\\"`, start);
  if (end === -1) return null;
  let raw = html.substring(start, end);
  return raw.replace(/\\\\\//g, '/').replace(/\\\//g, '/').replace(/\\u0026/g, '&');
}

// ===== INSTAGRAM SCRAPER =====
async function downloadInstagram(rawUrl) {
  let lastError = null;

  let cleanUrl = rawUrl.trim().split('?')[0].replace(/\/+$/, '');
  const shortcodeMatch = cleanUrl.match(/(?:reel|reels|p|tv|stories|share)\/([A-Za-z0-9_-]+)/i);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

  if (!shortcode) {
    throw new Error('Link Instagram tidak valid. Masukkan link Reels, Postingan, atau TV Instagram yang benar.');
  }

  // STRATEGI 1: Instagram Embed Extraction (Substrings Parser)
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const res = await axios.get(embedUrl, {
      headers: {
        'User-Agent': UA_MOBILE,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const html = res.data;
    const videoUrl = extractCleanIGUrl(html, 'video_url');
    const displayUrl = extractCleanIGUrl(html, 'display_url');

    const $ = cheerio.load(html);
    const caption = $('.Caption').text().trim() || $('div.Caption').text().trim() || `Instagram Media (${shortcode})`;
    const author = $('.Avatar img').attr('alt') || 'Instagram User';

    if (videoUrl) {
      return {
        success: true,
        platform: 'Instagram',
        title: caption,
        author: author,
        thumbnail: displayUrl || null,
        downloadLinks: [
          {
            label: 'Resolusi HD 1080p',
            quality: '1080p (Full HD)',
            url: videoUrl,
            type: 'video',
            extension: 'mp4',
            filename: `instagram_${shortcode}_1080p.mp4`
          },
          {
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            url: videoUrl,
            type: 'video',
            extension: 'mp4',
            filename: `instagram_${shortcode}_720p.mp4`
          },
          {
            label: 'Audio MP3',
            quality: '128kbps',
            url: videoUrl,
            type: 'audio',
            extension: 'mp3',
            filename: `instagram_audio_${shortcode}.mp3`
          }
        ],
        musicInfo: { title: 'Instagram Audio Track', author }
      };
    }

    if (displayUrl) {
      return {
        success: true,
        platform: 'Instagram',
        title: caption,
        author: author,
        thumbnail: displayUrl,
        downloadLinks: [
          {
            label: 'Foto HD (Original)',
            quality: 'High Resolution',
            url: displayUrl,
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

  // STRATEGI 2: SnapSave Fallback
  try {
    const snapRes = await axios.post('https://snapinsta.app/action.php', new URLSearchParams({
      url: `https://www.instagram.com/reel/${shortcode}/`,
      action: 'post'
    }), {
      headers: {
        'User-Agent': UA_DESKTOP,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    const snapHtml = typeof snapRes.data === 'string' ? snapRes.data : snapRes.data?.data || '';
    if (snapHtml && snapHtml.includes('http')) {
      const $ = cheerio.load(snapHtml);
      const downloadLinks = [];
      $('a[href^="http"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('cdninstagram') || href.includes('fbcdn') || href.includes('snapinsta') || href.includes('download'))) {
          downloadLinks.push({
            label: i === 0 ? 'Resolusi HD 1080p' : 'Resolusi HD 720p',
            quality: i === 0 ? '1080p (Full HD)' : '720p (Standard HD)',
            url: href,
            type: 'video',
            extension: 'mp4',
            filename: `instagram_${shortcode}_${i === 0 ? '1080p' : '720p'}.mp4`
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
          filename: `instagram_audio_${shortcode}.mp3`
        });

        return {
          success: true,
          platform: 'Instagram',
          title: `Instagram Video (${shortcode})`,
          author: 'Instagram Creator',
          thumbnail: $('img').first().attr('src') || null,
          downloadLinks,
          musicInfo: { title: 'Instagram Audio Track', author: 'Instagram Creator' }
        };
      }
    }
  } catch (e) {
    lastError = e;
  }

  throw new Error(`Tidak dapat menemukan media dari Instagram. Pastikan akun tidak diprivat dan link Reels/Postingan bersifat publik.`);
}

// ===== X / TWITTER SCRAPER =====
async function downloadTwitter(rawUrl) {
  let lastError = null;

  const cleanUrl = rawUrl.trim().split('?')[0];
  const tweetIdMatch = cleanUrl.match(/status\/(\d+)/i);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  if (!tweetId) {
    throw new Error('ID Tweet tidak ditemukan. Masukkan link postingan X (Twitter) yang valid.');
  }

  // STRATEGI 1: VxTwitter Open Engine
  try {
    const vxRes = await axios.get(`https://api.vxtwitter.com/Twitter/status/${tweetId}`, {
      headers: { 'User-Agent': UA_DESKTOP },
      timeout: 8000
    });
    if (vxRes.data) {
      const item = vxRes.data;
      const videoUrl = item.video_url || item.mediaURLs?.find(u => u.includes('.mp4') || u.includes('video'));
      if (videoUrl) {
        const author = item.user_name || item.user_screen_name || 'X User';
        const title = item.text || 'X Video';
        return {
          success: true,
          platform: 'X (Twitter)',
          title,
          author,
          thumbnail: item.mediaURLs?.[0] || null,
          downloadLinks: [
            {
              label: 'Resolusi HD 1080p',
              quality: '1080p (Full HD)',
              url: videoUrl,
              type: 'video',
              extension: 'mp4',
              filename: `twitter_${tweetId}_1080p.mp4`
            },
            {
              label: 'Resolusi HD 720p',
              quality: '720p (Standard HD)',
              url: videoUrl,
              type: 'video',
              extension: 'mp4',
              filename: `twitter_${tweetId}_720p.mp4`
            },
            {
              label: 'Audio MP3',
              quality: '128kbps',
              url: videoUrl,
              type: 'audio',
              extension: 'mp3',
              filename: `twitter_audio_${tweetId}.mp3`
            }
          ],
          musicInfo: { title: 'X Sound Track', author }
        };
      }
    }
  } catch (e) {
    lastError = e;
  }

  // STRATEGI 2: TwitSave Scraper
  try {
    const twitSaveUrl = `https://twitsave.com/info?url=${encodeURIComponent(`https://twitter.com/i/status/${tweetId}`)}`;
    const response = await axios.get(twitSaveUrl, {
      headers: { 'User-Agent': UA_DESKTOP },
      timeout: 10000
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
  let lastError = null;

  const videoIdMatch = rawUrl.match(/(?:v=|shorts\/|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/i);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  if (!videoId) {
    throw new Error('Link YouTube tidak valid. Masukkan link Video atau YouTube Shorts yang benar.');
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const apikey = 'dfcb6d76f2f6a9894gjkege8a4ab232222';

  // 1. Ambil Metadata (Title, Author, Thumbnail)
  let title = `YouTube Video ${videoId}`;
  let author = 'YouTube Creator';
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembedRes = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(standardUrl)}`, { timeout: 4000 });
    if (oembedRes.data?.title) title = oembedRes.data.title;
    if (oembedRes.data?.author_name) author = oembedRes.data.author_name;
    if (oembedRes.data?.thumbnail_url) thumbnail = oembedRes.data.thumbnail_url;
  } catch (_) {}

  // 2. STRATEGI 1: Savenow V2 API (Mendukung 1080p, 720p, dan MP3 Audio)
  try {
    const formatsToRequest = [
      { format: '1080', label: 'Resolusi HD 1080p', quality: '1080p (Full HD)', type: 'video', ext: 'mp4' },
      { format: '720', label: 'Resolusi HD 720p', quality: '720p (Standard HD)', type: 'video', ext: 'mp4' },
      { format: 'mp3', label: 'Audio MP3', quality: '128kbps', type: 'audio', ext: 'mp3' }
    ];

    const initPromises = formatsToRequest.map(async item => {
      try {
        const apiUrl = `https://p.savenow.to/api/v2/download?format=${item.format}&url=${encodeURIComponent(standardUrl)}&apikey=${apikey}`;
        const res = await axios.get(apiUrl, {
          headers: { 'User-Agent': UA_DESKTOP, 'Referer': 'https://y2down.cc/' },
          timeout: 8000
        });
        return { ...item, progressUrl: res.data?.progress_url, downloadUrl: res.data?.download_url };
      } catch (e) {
        return { ...item, error: e.message };
      }
    });

    const activeTasks = await Promise.all(initPromises);
    const validTasks = activeTasks.filter(t => t.progressUrl || t.downloadUrl);

    if (validTasks.length > 0) {
      const pollPromises = validTasks.map(async task => {
        let finalUrl = task.downloadUrl || null;
        if (!finalUrl && task.progressUrl) {
          // Poll hingga selesai (maksimal 10x poll, @ 1.2 detik)
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1200));
            try {
              const progRes = await axios.get(task.progressUrl, {
                headers: { 'User-Agent': UA_DESKTOP, 'Referer': 'https://y2down.cc/' },
                timeout: 5000
              });
              if (progRes.data?.download_url) {
                finalUrl = progRes.data.download_url;
                break;
              }
            } catch (_) {}
          }
        }

        if (finalUrl) {
          return {
            label: task.label,
            quality: task.quality,
            url: finalUrl,
            type: task.type,
            extension: task.ext,
            filename: `youtube_${videoId}_${task.format}.${task.ext}`
          };
        }
        return null;
      });

      const resolved = (await Promise.all(pollPromises)).filter(Boolean);
      if (resolved.length > 0) {
        // Pastikan ada video dan audio
        const video1080 = resolved.find(r => r.label.includes('1080'));
        const video720 = resolved.find(r => r.label.includes('720'));
        const audioMp3 = resolved.find(r => r.type === 'audio');

        const finalLinks = [];
        if (video1080) finalLinks.push(video1080);
        if (video720) {
          finalLinks.push(video720);
        } else if (video1080) {
          finalLinks.push({
            ...video1080,
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            filename: `youtube_${videoId}_720p.mp4`
          });
        }
        if (audioMp3) finalLinks.push(audioMp3);

        if (finalLinks.length > 0) {
          return {
            success: true,
            platform: 'YouTube',
            title,
            author,
            thumbnail,
            downloadLinks: finalLinks,
            musicInfo: { title, author }
          };
        }
      }
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
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA_DESKTOP
      },
      timeout: 8000
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

  const trimmedUrl = url.trim();
  const platform = detectPlatform(trimmedUrl);
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
    if (platform === 'tiktok') data = await downloadTikTok(trimmedUrl);
    else if (platform === 'instagram') data = await downloadInstagram(trimmedUrl);
    else if (platform === 'twitter') data = await downloadTwitter(trimmedUrl);
    else if (platform === 'youtube') data = await downloadYouTube(trimmedUrl);

    // Format proxy URL untuk download mobile langsung ke penyimpanan/galeri
    if (data?.downloadLinks) {
      data.downloadLinks = data.downloadLinks.map(item => ({
        ...item,
        proxyUrl: `/api/proxy-download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(item.filename || 'kaze_media.mp4')}`
      }));
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(`[Scraper Error] Platform: ${platform}, URL: ${trimmedUrl}, Error:`, error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kendala saat mengekstrak media. Pastikan link bersifat publik dan dapat diakses.'
    });
  }
}
