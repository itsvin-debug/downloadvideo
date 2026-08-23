import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

// komponen screen 5: Menampilkan hasil ekstraksi video/audio & tombol download
export default function ResultsSection({ result, preferredFormat = '1080p', onReset, onBack }) {
  const [selectedQualityIndex, setSelectedQualityIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const audioRef = useRef(null);

  if (!result || !result.downloadLinks || result.downloadLinks.length === 0) {
    return null;
  }

  // pisahkan file video, audio, dan gambar
  const videoLinks = result.downloadLinks.filter((l) => l.type === 'video');
  const audioLinks = result.downloadLinks.filter((l) => l.type === 'audio');
  const imageLinks = result.downloadLinks.filter((l) => l.type === 'image');

  // auto sesuaikan pilihan awal dengan preferensi dropdown user (1080p vs 720p)
  useEffect(() => {
    if (preferredFormat === '720p' && videoLinks.length > 1) {
      setSelectedQualityIndex(1);
    } else {
      setSelectedQualityIndex(0);
    }
  }, [preferredFormat, result]);

  // link video aktif yang dipilih user
  const activeVideo = videoLinks[selectedQualityIndex] || videoLinks[0];

  // fungsi download pakai fetch + blob agar file beneran tersimpan ke galeri HP / folder Downloads
  const handleDownload = async (mediaItem) => {
    setDownloading(true);
    confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });

    const filename = mediaItem.filename || 'kaze_download.mp4';

    // proxyUrl sudah pakai path relatif /api/proxy-download dari Vercel serverless function
    const proxyUrl = mediaItem.proxyUrl
      ? mediaItem.proxyUrl  // sudah relatif: /api/proxy-download?url=...
      : `/api/proxy-download?url=${encodeURIComponent(mediaItem.url)}&filename=${encodeURIComponent(filename)}`;

    try {
      // fetch dulu biar dapat blob, baru trigger save — cara ini yang bikin file masuk galeri HP
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.setAttribute('download', filename);
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

      // bersihkan blob URL setelah sedikit delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err) {
      console.warn('Blob download gagal, fallback ke direct link:', err.message);
      // fallback: buka link langsung di tab baru kalau blob gagal
      window.open(mediaItem.url, '_blank');
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  // kontrol pemutar audio MP3
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 sm:gap-8 animate-fadeIn mt-2 sm:mt-4">
      
      {/* 1. Kartu Hasil Video (Jika ada video) */}
      {videoLinks.length > 0 && (
        <div className="w-full bg-surface-container/60 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-6 md:gap-8 relative overflow-hidden">
          
          {/* Pratinjau Video / Player */}
          <div className="w-full md:w-64 lg:w-72 aspect-[9/16] sm:aspect-[3/4] max-h-[340px] sm:max-h-[380px] rounded-xl sm:rounded-2xl bg-black/60 border border-outline-variant/20 overflow-hidden relative group shrink-0 flex items-center justify-center mx-auto md:mx-0">
            
            {/* Live Video Player */}
            {activeVideo?.url ? (
              <video
                key={activeVideo.url}
                src={activeVideo.url}
                poster={result.thumbnail || undefined}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            ) : result.thumbnail ? (
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-on-surface-variant/40 p-4 text-center">
                <span className="material-symbols-outlined text-4xl sm:text-5xl text-primary">play_circle</span>
                <span className="text-xs text-on-surface-variant mt-2 font-medium">Video Siap Diputar</span>
              </div>
            )}

            {/* Badge Tanpa Watermark */}
            <div className="absolute top-2.5 left-2.5 bg-primary/90 text-on-primary font-bold text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-lg backdrop-blur-sm pointer-events-none">
              ✨ No Watermark
            </div>
          </div>

          {/* Rincian Video & Pilihan Kualitas */}
          <div className="flex-grow flex flex-col justify-between gap-5 sm:gap-6">
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                  {result.platform}
                </span>
                <span className="text-[11px] sm:text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-md">
                  {activeVideo.quality || 'HD'}
                </span>
                {result.duration && (
                  <span className="text-[11px] sm:text-xs text-on-surface-variant">
                    • {result.duration}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg md:text-xl font-bold text-on-surface line-clamp-3 leading-snug">
                {result.title}
              </h3>

              {result.author && (
                <p className="text-xs text-primary-fixed-dim font-medium">
                  Kreator: @{result.author}
                </p>
              )}

              <p className="text-on-surface-variant/80 text-xs mt-1">
                Pilih resolusi di bawah ini, video bebas watermark:
              </p>
            </div>

            {/* Pilihan Resolusi (1080p HD vs 720p HD) */}
            <div className="flex flex-col gap-3.5 sm:gap-4">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5 w-full">
                {videoLinks.map((link, idx) => {
                  const isSelected = selectedQualityIndex === idx;
                  const is1080p = link.label?.includes('1080') || link.quality?.includes('1080');
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedQualityIndex(idx)}
                      className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] ${
                        isSelected
                          ? 'bg-primary/25 border-2 border-primary text-primary shadow-lg shadow-primary/20 font-bold'
                          : 'bg-surface-container-lowest/70 border border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base text-primary">
                        {isSelected ? 'check_circle' : (is1080p ? 'hd' : 'high_density')}
                      </span>
                      <span className="truncate">{link.label || link.quality}</span>
                      {is1080p && (
                        <span className="hidden sm:inline text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">
                          Max
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tombol Utama: Download Video Langsung */}
              {activeVideo && (
                <button
                  onClick={() => handleDownload(activeVideo)}
                  disabled={downloading}
                  className="w-full bg-gradient-to-r from-primary via-primary-container to-secondary-container hover:from-primary-fixed hover:to-secondary text-on-primary font-bold text-sm sm:text-base md:text-lg rounded-xl sm:rounded-2xl py-3.5 sm:py-4 flex items-center justify-center gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  <span className="material-symbols-outlined text-xl sm:text-2xl">
                    {downloading ? 'sync' : 'download'}
                  </span>
                  <span className="truncate">
                    {downloading ? 'Memulai Download...' : `Download MP4 (${activeVideo.label || activeVideo.quality})`}
                  </span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* 2. Kartu Hasil Audio MP3 */}
      {audioLinks.length > 0 && (
        <div className="w-full bg-surface-container/60 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl flex flex-col gap-4 sm:gap-6 relative overflow-hidden">
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-md shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-2xl">music_note</span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-on-surface truncate">
                {result.musicInfo?.title || 'Audio Musik / MP3'}
              </h3>
              <p className="text-on-surface-variant/80 text-xs truncate">
                {result.musicInfo?.author || result.author || 'Original Audio'}
              </p>
            </div>
          </div>

          {/* Pemutar Audio HTML5 */}
          <audio
            ref={audioRef}
            src={audioLinks[0].url}
            onEnded={() => setIsPlayingAudio(false)}
            className="hidden"
          />

          <div className="w-full bg-surface-container-lowest/60 border border-outline-variant/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <button
              onClick={togglePlayAudio}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0"
              aria-label={isPlayingAudio ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined text-xl sm:text-2xl">
                {isPlayingAudio ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <div className="flex-grow flex flex-col gap-1 overflow-hidden">
              <div className="text-xs text-on-surface-variant flex justify-between">
                <span className="truncate">{isPlayingAudio ? 'Sedang Diputar...' : 'Pratinjau Suara'}</span>
                <span className="shrink-0 font-medium">MP3 128k</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className={`h-full bg-primary rounded-full transition-all duration-300 ${
                    isPlayingAudio ? 'w-full animate-pulse' : 'w-1/4'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Tombol Download MP3 */}
          <button
            onClick={() => handleDownload(audioLinks[0])}
            className="w-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 hover:border-primary/50 text-on-surface font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl py-3 sm:py-3.5 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-md min-h-[44px]"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl text-primary">download</span>
            <span>Download Audio MP3</span>
          </button>

        </div>
      )}

      {/* 3. Kartu Gambar Slide (Jika ada) */}
      {imageLinks.length > 0 && (
        <div className="w-full bg-surface-container/60 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl flex flex-col gap-4 sm:gap-6">
          <h3 className="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">photo_library</span>
            <span>Foto / Slide ({imageLinks.length} Gambar)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {imageLinks.map((img, i) => (
              <div
                key={i}
                className="group relative rounded-xl overflow-hidden border border-outline-variant/30 aspect-square bg-surface-container-high"
              >
                <img
                  src={img.url}
                  alt={`Slide ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <button
                    onClick={() => handleDownload(img)}
                    className="p-2.5 rounded-full bg-primary text-on-primary shadow-lg cursor-pointer hover:scale-110 transition-transform"
                    title="Download Foto Ini"
                  >
                    <span className="material-symbols-outlined text-xl">download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigasi Aksi Bawah: Tombol Back & Tombol Reset (Responsive Stacking) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 w-full">
        {onBack && (
          <button
            onClick={onBack}
            className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface hover:text-primary text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[44px]"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">arrow_back</span>
            <span>Kembali ke Menu Platform</span>
          </button>
        )}

        <button
          onClick={onReset}
          className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl bg-surface-container-lowest/80 hover:bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-primary text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[44px]"
        >
          <span className="material-symbols-outlined text-base sm:text-lg">refresh</span>
          <span>Unduh Link Video Lainnya</span>
        </button>
      </div>

    </div>
  );
}
