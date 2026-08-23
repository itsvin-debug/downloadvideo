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

  // Strategi 2: TikWM Scraper Fallback
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

// ===== INSTAGRAM SCRAPER =====
async function downloadInstagram(rawUrl) {
  let lastError = null;

  // Bersihkan URL dan ambil shortcode
  const cleanUrl = rawUrl.split('?')[0].replace(/\/+$/, '');
  const shortcodeMatch = cleanUrl.match(/(?:reel|reels|p|tv|stories)\/([A-Za-z0-9_-]+)/i);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

  if (!shortcode) {
    throw new Error('Link Instagram tidak valid. Masukkan link Reels, Postingan, atau TV Instagram yang lengkap.');
  }

  // STRATEGI 1: SnapSave Media Scraper
  try {
    const snapRes = await axios.post('https://snapinsta.app/action.php', new URLSearchParams({
      url: `https://www.instagram.com/reel/${shortcode}/`,
      action: 'post'
    }), {
      headers: {
        'User-Agent': UA_DESKTOP,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 9000
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
        return {
          success: true,
          platform: 'Instagram',
          title: `Instagram Video ${shortcode}`,
          author: 'Instagram User',
          thumbnail: $('img').first().attr('src') || null,
          downloadLinks
        };
      }
    }
  } catch (e) {
    lastError = e;
  }

  // STRATEGI 2: Instagram Embed HTML5 Inspection
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const res = await axios.get(embedUrl, {
      headers: {
        'User-Agent': UA_MOBILE,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });

    const html = res.data;
    const $ = cheerio.load(html);
    const caption = $('.Caption').text().trim() || $('div.Caption').text().trim() || `Instagram Media (${shortcode})`;
    const author = $('.Avatar img').attr('alt') || 'Instagram Creator';

    const videoMatch = html.match(/"video_url":"([^"]+)"/) || html.match(/video_url\s*:\s*"([^"]+)"/);
    const displayMatch = html.match(/"display_url":"([^"]+)"/) || html.match(/display_url\s*:\s*"([^"]+)"/);

    if (videoMatch && videoMatch[1]) {
      const videoUrl = JSON.parse(`"${videoMatch[1]}"`);
      return {
        success: true,
        platform: 'Instagram',
        title: caption,
        author: author,
        thumbnail: displayMatch ? JSON.parse(`"${displayMatch[1]}"`) : null,
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
          }
        ]
      };
    }

    if (displayMatch && displayMatch[1]) {
      const imgUrl = JSON.parse(`"${displayMatch[1]}"`);
      return {
        success: true,
        platform: 'Instagram',
        title: caption,
        author: author,
        thumbnail: imgUrl,
        downloadLinks: [
          {
            label: 'Foto HD (Original)',
            quality: 'High Resolution',
            url: imgUrl,
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

  // STRATEGI 3: FastDL Fallback
  try {
    const fastRes = await axios.post('https://fastdl.app/c/', new URLSearchParams({
      url: `https://www.instagram.com/reel/${shortcode}/`,
      lang_code: 'en'
    }), {
      headers: {
        'User-Agent': UA_DESKTOP,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': 'https://fastdl.app/'
      },
      timeout: 10000
    });

    const $ = cheerio.load(fastRes.data);
    const downloadLinks = [];
    $('a.download-items__btn, a.btn-download, a[download]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('javascript')) {
        const isVideo = href.includes('.mp4') || href.includes('video');
        downloadLinks.push({
          label: isVideo ? `Resolusi HD ${i === 0 ? '1080p' : '720p'}` : `Download Foto #${i + 1}`,
          quality: isVideo ? (i === 0 ? '1080p (Full HD)' : '720p (Standard HD)') : 'HD Image',
          url: href,
          type: isVideo ? 'video' : 'image',
          extension: isVideo ? 'mp4' : 'jpg',
          filename: `instagram_${shortcode}_${i + 1}.${isVideo ? 'mp4' : 'jpg'}`
        });
      }
    });

    if (downloadLinks.length > 0) {
      return {
        success: true,
        platform: 'Instagram',
        title: `Instagram Media (${shortcode})`,
        author: 'Instagram User',
        thumbnail: $('img').first().attr('src') || null,
        downloadLinks
      };
    }
  } catch (e) {
    lastError = e;
  }

  throw new Error(`Tidak dapat menemukan media dari Instagram. Pastikan akun tidak diprivat dan link video Reels/Postingan bersifat publik.`);
}

// ===== X / TWITTER SCRAPER =====
async function downloadTwitter(rawUrl) {
  let lastError = null;

  // Bersihkan URL dan dapatkan Tweet ID
  const cleanUrl = rawUrl.split('?')[0];
  const tweetIdMatch = cleanUrl.match(/status\/(\d+)/i);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  if (!tweetId) {
    throw new Error('ID Tweet tidak ditemukan. Masukkan link postingan X (Twitter) yang valid.');
  }

  // STRATEGI 1: TwitSave Scraper
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
      return {
        success: true,
        platform: 'X (Twitter)',
        title,
        author: 'X User',
        thumbnail,
        downloadLinks
      };
    }
  } catch (e) {
    lastError = e;
  }

  // STRATEGI 2: VxTwitter API
  try {
    const vxRes = await axios.get(`https://api.vxtwitter.com/Twitter/status/${tweetId}`, {
      headers: { 'User-Agent': UA_DESKTOP },
      timeout: 8000
    });
    if (vxRes.data && (vxRes.data.mediaURLs?.length > 0 || vxRes.data.video_url)) {
      const videoUrl = vxRes.data.video_url || vxRes.data.mediaURLs?.find(u => u.includes('.mp4'));
      if (videoUrl) {
        return {
          success: true,
          platform: 'X (Twitter)',
          title: vxRes.data.text || 'X Video',
          author: vxRes.data.user_name || vxRes.data.user_screen_name || 'X User',
          thumbnail: vxRes.data.mediaURLs?.[0] || null,
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
            }
          ]
        };
      }
    }
  } catch (e) {
    lastError = e;
  }

  throw new Error(`Gagal mengambil video dari X (Twitter). Pastikan tweet bersifat publik dan berisi media video.`);
}

// ===== YOUTUBE SCRAPER =====
async function downloadYouTube(rawUrl) {
  let lastError = null;

  // Ekstrak YouTube Video ID (mendukung shorts, live, youtu.be, watch?v=)
  const videoIdMatch = rawUrl.match(/(?:v=|shorts\/|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/i);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  if (!videoId) {
    throw new Error('Link YouTube tidak valid. Masukkan link Video atau YouTube Shorts yang benar.');
  }

  // STRATEGI 1: YouTube Official Innertube Engine (ANDROID_VR Client)
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
      timeout: 10000
    });

    const sData = playerRes.data?.streamingData;
    const vDetails = playerRes.data?.videoDetails;

    if (sData) {
      const formats = sData.formats || [];
      const adaptive = sData.adaptiveFormats || [];
      const downloadLinks = [];

      // Cari format video direct playable (progressive mp4)
      const directVideos = formats.filter(f => f.url && f.mimeType?.includes('video'));
      const directAudios = adaptive.filter(f => f.url && f.mimeType?.includes('audio'));

      // 1080p / 720p formats
      const bestVideo = directVideos.find(f => f.qualityLabel?.includes('720') || f.qualityLabel?.includes('1080')) || directVideos[0];
      const secondVideo = directVideos[1] || bestVideo;

      if (bestVideo && bestVideo.url) {
        downloadLinks.push({
          label: 'Resolusi HD 1080p',
          quality: bestVideo.qualityLabel || '1080p (Full HD)',
          url: bestVideo.url,
          type: 'video',
          extension: 'mp4',
          filename: `youtube_${videoId}_hd.mp4`
        });
      }

      if (secondVideo && secondVideo.url) {
        downloadLinks.push({
          label: 'Resolusi HD 720p',
          quality: secondVideo.qualityLabel || '720p (Standard HD)',
          url: secondVideo.url,
          type: 'video',
          extension: 'mp4',
          filename: `youtube_${videoId}_720p.mp4`
        });
      }

      // MP3 Audio stream
      const bestAudio = directAudios.find(a => a.mimeType?.includes('mp4a')) || directAudios[0];
      if (bestAudio && bestAudio.url) {
        downloadLinks.push({
          label: 'Audio MP3',
          quality: `${Math.round((bestAudio.bitrate || 128000) / 1000)}kbps`,
          url: bestAudio.url,
          type: 'audio',
          extension: 'mp3',
          filename: `youtube_audio_${videoId}.mp3`
        });
      }

      if (downloadLinks.length > 0) {
        const title = vDetails?.title || `YouTube Video ${videoId}`;
        const author = vDetails?.author || 'YouTube Creator';
        const thumbnail = vDetails?.thumbnail?.thumbnails?.pop()?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        return {
          success: true,
          platform: 'YouTube',
          title,
          author,
          thumbnail,
          downloadLinks,
          musicInfo: {
            title: title,
            author: author
          }
        };
      }
    }
  } catch (e) {
    lastError = e;
  }

  // STRATEGI 2: YT1s API Fallback
  try {
    const analyzeRes = await axios.post('https://yt1s.com/api/ajaxSearch/index', new URLSearchParams({
      q: `https://www.youtube.com/watch?v=${videoId}`,
      vt: 'home'
    }), {
      headers: {
        'User-Agent': UA_DESKTOP,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://yt1s.com/en195'
      },
      timeout: 10000
    });

    const data = analyzeRes.data;
    if (data.status === 'ok') {
      const links = data.links?.mp4 || {};
      const downloadLinks = [];
      const title = data.title || 'YouTube Video';
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const keys = Object.keys(links);
      if (keys.length > 0) {
        const convertRes = await axios.post('https://yt1s.com/api/ajaxConvert/convert', new URLSearchParams({
          vid: data.vid,
          k: links[keys[0]].k
        }), {
          headers: {
            'User-Agent': UA_DESKTOP,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        });

        if (convertRes.data?.dlink) {
          downloadLinks.push({
            label: 'Resolusi HD 1080p',
            quality: '1080p (Full HD)',
            url: convertRes.data.dlink,
            type: 'video',
            extension: 'mp4',
            filename: `youtube_${videoId}_1080p.mp4`
          });
          downloadLinks.push({
            label: 'Resolusi HD 720p',
            quality: '720p (Standard HD)',
            url: convertRes.data.dlink,
            type: 'video',
            extension: 'mp4',
            filename: `youtube_${videoId}_720p.mp4`
          });

          return {
            success: true,
            platform: 'YouTube',
            title,
            author: data.a || 'YouTube Creator',
            thumbnail,
            downloadLinks
          };
        }
      }
    }
  } catch (e) {
    lastError = e;
  }

  throw new Error(`Gagal mengambil media YouTube. Pastikan link video atau shorts publik dan tidak dibatasi usia.`);
}

// ===== MAIN SERVERLESS ROUTE HANDLER =====
export default async function handler(req, res) {
  // Set CORS headers
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

    // Format proxy URL untuk mempermudah download mobile
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
      message: error.message || 'Terjadi kendala saat mengekstrak video. Pastikan link publik dan dapat diakses.'
    });
  }
}
