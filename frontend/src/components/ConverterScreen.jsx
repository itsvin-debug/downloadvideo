import React, { useState } from 'react';
import axios from 'axios';
import ResultsSection from './ResultsSection';

// komponen screen 3: Input Form Converter & Downloader (TikTok, IG, X, YouTube)
export default function ConverterScreen({ activePlatform, onBack }) {
  const [urlInput, setUrlInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('1080p');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultData, setResultData] = useState(null);

  // konfigurasi visual masing-masing platform
  const platformMeta = {
    tiktok: {
      name: 'TikTok',
      icon: 'music_note',
      placeholder: 'Tempelkan link video TikTok di sini...',
      hint: 'Mendukung semua link TikTok reguler, link pendek vt.tiktok.com, dan resolusi HD tanpa watermark.'
    },
    instagram: {
      name: 'Instagram',
      icon: 'photo_camera',
      placeholder: 'Tempelkan link Reels, Post, atau Video IG di sini...',
      hint: 'Mendukung video Reels, postingan carousel, feed video, dan foto instagram.'
    },
    twitter: {
      name: 'X (Twitter)',
      icon: 'close',
      placeholder: 'Tempelkan link tweet video X di sini...',
      hint: 'Mendukung video dan gif dari postingan X (Twitter) publik.'
    },
    youtube: {
      name: 'YouTube',
      icon: 'play_circle',
      placeholder: 'Tempelkan link YouTube Shorts atau Video di sini...',
      hint: 'Mendukung video YouTube Shorts dan link video reguler.'
    }
  };

  const currentMeta = platformMeta[activePlatform] || platformMeta.tiktok;

  // fungsi buat paste otomatis dari clipboard user
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text.trim());
          setErrorMsg('');
        }
      }
    } catch (err) {
      console.warn('Gagal membaca clipboard:', err);
    }
  };

  // fungsi utama buat kirim request download ke backend Node.js
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setResultData(null);

    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      setErrorMsg('Tolong masukkan link video terlebih dahulu ya sob!');
      return;
    }

    try {
      setLoading(true);

      // pakai URL relatif /api/download — Vercel serverless function, ga perlu backend terpisah
      const response = await axios.post('/api/download', {
        url: trimmedUrl,
        expectedPlatform: activePlatform
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data && response.data.success && response.data.data) {
        setResultData(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Gagal memproses link.');
      }

    } catch (err) {
      console.error('Error saat submit link:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memproses video.';
      setErrorMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  // reset form buat masukin link baru
  const handleReset = () => {
    setUrlInput('');
    setResultData(null);
    setErrorMsg('');
  };

  return (
    <main className="flex-grow flex flex-col items-center justify-start sm:justify-center px-3 sm:px-6 md:px-margin-desktop py-6 sm:py-10 md:py-16 max-w-container-max mx-auto w-full relative z-10">
      
      <div className="w-full max-w-3xl flex flex-col items-center gap-6 sm:gap-8">
        
        {/* Header Platform */}
        <div className="w-full flex flex-col items-start gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-xs sm:text-sm group cursor-pointer py-1 min-h-[36px]"
          >
            <span className="material-symbols-outlined text-base sm:text-lg group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span>Kembali ke pilihan platform</span>
          </button>

          <div className="flex items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10 shrink-0">
              <span className="material-symbols-outlined text-2xl sm:text-3xl">{currentMeta.icon}</span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-on-surface-variant">
              Download from {currentMeta.name}
            </h1>
          </div>
        </div>

        {/* Kotak Input URL & Tombol Generate */}
        <div className="w-full bg-surface-container/50 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl flex flex-col gap-4 sm:gap-6 relative overflow-hidden focus-within:border-primary/40 transition-all duration-300">
          
          {/* Garis glow tipis di atas box */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <form onSubmit={handleGenerate} className="flex flex-col gap-3 w-full">
            
            {/* Input URL dengan ikon link dan tombol paste */}
            <div className="relative w-full group/input">
              <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-lg sm:text-xl text-on-surface-variant/60 group-focus-within/input:text-primary transition-colors">
                  link
                </span>
              </div>
              
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={currentMeta.placeholder}
                className="w-full bg-surface-container-lowest/70 border border-outline-variant/30 text-on-surface text-xs sm:text-sm md:text-base rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-10 sm:pl-12 pr-20 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-on-surface-variant/40 shadow-inner"
              />

              {/* Tombol Tempel (Paste) Cepat */}
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="absolute inset-y-0 right-1.5 sm:right-2 px-2.5 sm:px-3 my-1.5 sm:my-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl bg-surface-container hover:bg-surface-container-high text-primary border border-outline-variant/20 transition-all flex items-center gap-1 cursor-pointer"
                title="Tempel dari Clipboard"
              >
                <span className="material-symbols-outlined text-xs sm:text-sm">content_paste</span>
                <span>Paste</span>
              </button>
            </div>

            {/* Opsi Pilihan Resolusi & Tombol Submit (Responsive Row on mobile) */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full">
              
              {/* Dropdown Resolusi */}
              <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full appearance-none bg-surface-container border border-outline-variant/30 text-on-surface text-xs sm:text-sm md:text-base rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-4 pr-10 cursor-pointer focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm hover:bg-surface-container-high font-medium"
                >
                  <option value="1080p">HD 1080p (Full HD)</option>
                  <option value="720p">HD 720p (Standard HD)</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">
                    keyboard_arrow_down
                  </span>
                </div>
              </div>

              {/* Tombol Generate */}
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-grow bg-gradient-to-br from-primary via-primary-container to-secondary-container hover:from-primary-fixed hover:to-secondary text-on-primary font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl px-6 py-3.5 sm:py-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-50 group/btn min-h-[44px]"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl group-hover/btn:rotate-12 transition-transform">
                  bolt
                </span>
                <span>{loading ? 'Memproses Video...' : 'Generate Video'}</span>
              </button>

            </div>
          </form>

          {/* Pesan Error jika terjadi kendala */}
          {errorMsg && (
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-error/15 border border-error/30 text-error flex items-start gap-2.5 sm:gap-3 animate-fadeIn text-xs sm:text-sm">
              <span className="material-symbols-outlined text-lg sm:text-xl shrink-0 mt-0.5">error</span>
              <div className="flex-grow">
                <span className="font-semibold leading-relaxed">{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg('')}
                className="text-error/70 hover:text-error text-xs uppercase font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Petunjuk Platform */}
          <div className="flex items-center gap-2 text-on-surface-variant/70 text-[11px] sm:text-xs pl-1">
            <span className="material-symbols-outlined text-sm sm:text-base shrink-0">info</span>
            <span className="leading-tight">{currentMeta.hint}</span>
          </div>

        </div>

        {/* Loading Spinner Skeleton */}
        {loading && (
          <div className="w-full bg-surface-container/30 border border-outline-variant/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 animate-pulse">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="text-center">
              <p className="font-bold text-primary text-sm sm:text-base">Sedang mengekstrak video resolusi HD tanpa watermark...</p>
              <p className="text-xs text-on-surface-variant mt-1">Harap tunggu sebentar, kami sedang mengambil kualitas terbaik untukmu.</p>
            </div>
          </div>
        )}

        {/* Render Bagian Hasil (Screen 5) */}
        {!loading && resultData && (
          <ResultsSection 
            result={resultData} 
            preferredFormat={selectedFormat}
            onReset={handleReset}
            onBack={onBack}
          />
        )}

      </div>
    </main>
  );
}
