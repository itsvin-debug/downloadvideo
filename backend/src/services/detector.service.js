// service buat ngecek dan nentuin url ini dari sosmed mana (TikTok, IG, X, YouTube)

// regex buat nyocokin url masing-masing platform
const PLATFORM_REGEX = {
  tiktok: /(?:https?:\/\/)?(?:www\.|v[mt]\.|vt\.)?tiktok\.com\/(?:@[\w.-]+\/video\/\d+|[\w.-]+|\S+)/i,
  instagram: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)\/(?:p|reel|reels|tv|stories|share)?\/?([\w.-]+)?/i,
  twitter: /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/i,
  youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/i
};

// fungsi utama buat ngedeteksi platform dari url yang diinput user
export function detectPlatform(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, platform: null, cleanedUrl: null };
  }

  // bersihin url dari spasi atau karakter gak jelas di ujung
  const cleanedUrl = rawUrl.trim();

  // cek satu per satu pake regex
  if (PLATFORM_REGEX.tiktok.test(cleanedUrl)) {
    return { valid: true, platform: 'tiktok', cleanedUrl };
  }

  if (PLATFORM_REGEX.instagram.test(cleanedUrl)) {
    return { valid: true, platform: 'instagram', cleanedUrl };
  }

  if (PLATFORM_REGEX.twitter.test(cleanedUrl)) {
    return { valid: true, platform: 'twitter', cleanedUrl };
  }

  if (PLATFORM_REGEX.youtube.test(cleanedUrl)) {
    return { valid: true, platform: 'youtube', cleanedUrl };
  }

  // kalo gak cocok sama sekali berarti bukan url yang didukung
  return { valid: false, platform: 'unknown', cleanedUrl };
}
