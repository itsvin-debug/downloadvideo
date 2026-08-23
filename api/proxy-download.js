import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, filename } = req.query;
  if (!url) return res.status(400).send('URL diperlukan.');

  const safeFilename = (filename || 'kaze_download.mp4').replace(/[^a-zA-Z0-9_.\-]/g, '_');

  try {
    const decodedUrl = decodeURIComponent(url);

    // Tentukan referer yang cocok sesuai domain target
    let referer = undefined;
    if (decodedUrl.includes('tiktok') || decodedUrl.includes('tikcdn')) {
      referer = 'https://www.tiktok.com/';
    } else if (decodedUrl.includes('instagram') || decodedUrl.includes('cdninstagram') || decodedUrl.includes('fbcdn')) {
      referer = 'https://www.instagram.com/';
    } else if (decodedUrl.includes('twimg') || decodedUrl.includes('twitter') || decodedUrl.includes('x.com')) {
      referer = 'https://twitter.com/';
    } else if (decodedUrl.includes('googlevideo') || decodedUrl.includes('youtube') || decodedUrl.includes('ytimg')) {
      referer = 'https://www.youtube.com/';
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };
    if (referer) headers['Referer'] = referer;

    const response = await axios({
      method: 'GET',
      url: decodedUrl,
      responseType: 'stream',
      headers,
      timeout: 30000
    });

    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.pipe(res);
  } catch (error) {
    console.error('Proxy stream error:', error.message);
    return res.redirect(302, decodeURIComponent(url));
  }
}
