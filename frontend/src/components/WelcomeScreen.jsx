import React from 'react';

// komponen screen 2: Welcome Hub dengan pilihan platform sosmed
export default function WelcomeScreen({ onSelectPlatform }) {
  const platforms = [
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: 'music_note',
      desc: 'Unduh video HD tanpa watermark & audio MP3 kualitas jernih.',
      badge: 'Populer'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'photo_camera',
      desc: 'Ekstrak Reels, Postingan Video, Foto, dan Stories dalam sekejap.',
      badge: 'Instan'
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: 'close',
      desc: 'Ambil video resolusi tinggi dari linimasa tweet langsung ke galeri.',
      badge: 'HD Max'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: 'play_circle',
      desc: 'Simpan video Shorts & audio stream dengan kecepatan maksimal.',
      badge: 'Cepat'
    }
  ];

  return (
    <main className="flex-grow relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 md:px-margin-desktop py-8 sm:py-12 md:py-16 w-full max-w-container-max mx-auto">
      
      {/* Hero Section */}
      <div className="text-center mb-8 sm:mb-12 md:mb-14 max-w-3xl animate-fadeIn">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-on-surface mb-3 sm:mb-5 bg-clip-text text-transparent bg-gradient-to-r from-primary-fixed via-primary to-secondary-fixed leading-tight tracking-tight">
          selamat datang di website download by kaze
        </h1>
        <p className="text-xs sm:text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Ubah media video dari berbagai platform media sosial jadi file lokal di perangkatmu dengan kecepatan kilat, kualitas terbaik, dan tanpa watermark. Pilih platform untuk mulai:
        </p>
      </div>

      {/* Grid Kartu Platform (Responsive 1 col on small mobile, 2 col on tablet, 4 col on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPlatform(p.id)}
            className="glass-panel glass-panel-hover rounded-2xl p-5 sm:p-7 md:p-8 flex flex-col items-center text-center cursor-pointer relative group text-left w-full focus:outline-none min-h-[220px]"
          >
            {/* Badge kecil di pojok kartu */}
            <span className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/30 text-primary-fixed-dim">
              {p.badge}
            </span>

            {/* Lingkaran Ikon Platform */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-all duration-300 shadow-inner shrink-0">
              <span className="material-symbols-outlined text-3xl sm:text-4xl text-on-surface-variant group-hover:text-primary transition-colors">
                {p.icon}
              </span>
            </div>

            {/* Nama & Deskripsi */}
            <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-1.5 sm:mb-2.5 group-hover:text-primary transition-colors">
              {p.name}
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant/80 leading-normal mb-3 sm:mb-4">
              {p.desc}
            </p>

            {/* Tombol Panah Bawah */}
            <div className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <span>Buka Downloader</span>
              <span>→</span>
            </div>
          </button>
        ))}
      </div>

    </main>
  );
}
