import axios from 'axios';
import * as cheerio from 'cheerio';

// service ekstraksi video TikTok tanpa watermark dengan opsi resolusi 1080p HD dan 720p HD + MP3
export async function downloadTikTok(rawUrl) {
  let lastError = null;

  // browser user-agent konsisten
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // STRATEGI 1: SSSTik Scraper dengan token dinamis
  try {
    const homeRes = await axios.get('https://ssstik.io/en', {
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 12000
    });

    const ttMatch = homeRes.data.match(/tt:'([^']+)'/) || homeRes.data.match(/data-hx-vals='{"tt":"([^"]+)"}/);
    const ttToken = ttMatch ? ttMatch[1] : '';
    const cookies = homeRes.headers['set-cookie'] 
      ? homeRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') 
      : '';

    const postRes = await axios.post('https://ssstik.io/abc?url=dl', new URLSearchParams({
      id: rawUrl.trim(),
      locale: 'en',
      tt: ttToken
    }), {
      headers: {
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'HX-Request': 'true',
        'HX-Trigger': '_gcaptcha_pt',
        'HX-Target': 'target',
        'HX-Current-URL': 'https://ssstik.io/en',
        'Referer': 'https://ssstik.io/en',
        'Cookie': cookies
      },
      timeout: 15000
    });

    const $ = cheerio.load(postRes.data);
    const title = $('.maintext').text().trim() || $('p').first().text().trim() || 'TikTok Video';
    const thumbnail = $('img.result_author').attr('src') || $('img').first().attr('src') || null;
    const author = $('.result_author h2, .result_author span').first().text().trim() || 'TikTok Creator';

    const rawVideoLinks = [];
    let audioLink = null;

    // loop cari link download di dalam HTML hasil respon
    $('a').each((_, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();

      if (href && (href.startsWith('http') || href.includes('tikcdn'))) {
        const isMp3 = text.toLowerCase().includes('mp3') || text.toLowerCase().includes('audio') || href.includes('/m/');
        
        if (isMp3) {
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
      }
    });

    if (rawVideoLinks.length > 0) {
      const primaryVideoUrl = rawVideoLinks[0];
      const downloadLinks = [];

      // 1. Opsi Resolusi HD 1080p (Full HD, Tanpa Watermark)
      downloadLinks.push({
        label: 'Resolusi HD 1080p',
        quality: '1080p (Full HD)',
        url: primaryVideoUrl,
        type: 'video',
        extension: 'mp4',
        filename: `tiktok_1080p_nowm_${Date.now()}.mp4`
      });

      // 2. Opsi Resolusi HD 720p (Standard HD, Tanpa Watermark)
      const standardUrl = rawVideoLinks[1] || primaryVideoUrl;
      downloadLinks.push({
        label: 'Resolusi HD 720p',
        quality: '720p (Standard HD)',
        url: standardUrl,
        type: 'video',
        extension: 'mp4',
        filename: `tiktok_720p_nowm_${Date.now()}.mp4`
      });

      // 3. Opsi Audio MP3
      if (audioLink) {
        downloadLinks.push(audioLink);
      }

      return {
        success: true,
        platform: 'TikTok',
        title,
        author,
        thumbnail,
        duration: null,
        musicInfo: {
          title: 'Original TikTok Audio',
          author: author
        },
        downloadLinks
      };
    }
  } catch (err) {
    console.warn('Strategi 1 (SSSTik) gagal, mencoba fallback... Detail:', err.message);
    lastError = err;
  }

  // STRATEGI 2: TikWM Fallback
  try {
    const tikwmRes = await axios.post(
      'https://www.tikwm.com/api/',
      new URLSearchParams({
        url: rawUrl,
        count: '12',
        cursor: '0',
        web: '1',
        hd: '1'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': userAgent,
          'Referer': 'https://www.tikwm.com/'
        },
        timeout: 12000
      }
    );

    const data = tikwmRes.data;
    if (data && data.code === 0 && data.data) {
      const item = data.data;
      const downloadLinks = [];

      // 1080p HD
      if (item.hdplay) {
        downloadLinks.push({
          label: 'Resolusi HD 1080p',
          quality: '1080p (Full HD)',
          url: item.hdplay.startsWith('http') ? item.hdplay : `https://www.tikwm.com${item.hdplay}`,
          type: 'video',
          extension: 'mp4',
          filename: `tiktok_${item.id || Date.now()}_1080p.mp4`
        });
      }

      // 720p HD
      if (item.play) {
        downloadLinks.push({
          label: 'Resolusi HD 720p',
          quality: '720p (Standard HD)',
          url: item.play.startsWith('http') ? item.play : `https://www.tikwm.com${item.play}`,
          type: 'video',
          extension: 'mp4',
          filename: `tiktok_${item.id || Date.now()}_720p.mp4`
        });
      }

      // MP3 Audio
      if (item.music) {
        downloadLinks.push({
          label: 'Audio MP3',
          quality: '128kbps',
          url: item.music.startsWith('http') ? item.music : `https://www.tikwm.com${item.music}`,
          type: 'audio',
          extension: 'mp3',
          filename: `tiktok_audio_${item.id || Date.now()}.mp3`
        });
      }

      if (downloadLinks.length > 0) {
        return {
          success: true,
          platform: 'TikTok',
          id: item.id || '',
          title: item.title || 'TikTok Video',
          author: item.author?.nickname || item.author?.unique_id || 'TikTok Creator',
          thumbnail: item.cover || item.origin_cover,
          duration: item.duration ? `${item.duration}s` : null,
          musicInfo: {
            title: item.music_info?.title || 'Original Sound',
            author: item.music_info?.author || item.author?.nickname || 'TikTok'
          },
          downloadLinks
        };
      }
    }
  } catch (err) {
    console.warn('Strategi 2 (TikWM) gagal... Detail:', err.message);
    lastError = err;
  }

  throw new Error(`Gagal memproses video TikTok. Pastikan video publik dan link dapat diakses. (Detail: ${lastError?.message || 'Media tidak ditemukan'})`);
}
