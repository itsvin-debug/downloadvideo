import React, { useEffect } from 'react';
import ShaderBackground from './ShaderBackground';

// komponen screen 1: Splash Screen pembuka dengan efek glow dan shader
export default function SplashScreen({ onEnter }) {
  // auto direct setelah beberapa detik atau user bisa klik tombol langsung
  useEffect(() => {
    const timer = setTimeout(() => {
      // biarin user klik atau auto enter setelah 4.5 detik
    }, 4500);
    return () => clearTimeout(timer);
  }, [onEnter]);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-background text-on-surface select-none">
      
      {/* background shader webgl */}
      <ShaderBackground />

      {/* konten utama splash */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-4xl">
        
        {/* Judul dengan animasi glow */}
        <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl text-on-surface fade-in-glow tracking-tight leading-tight md:leading-snug mb-8">
          selamat datang di<br />
          <span className="text-primary-fixed-dim bg-clip-text text-transparent bg-gradient-to-r from-primary-fixed-dim via-primary to-secondary">
            website download by kaze
          </span>
        </h1>

        {/* Garis indikator loading berdenyut */}
        <div className="delayed-fade-in flex flex-col items-center gap-4 mt-2" style={{ animationDelay: '0.8s' }}>
          <div className="pulse-loader"></div>
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest opacity-75">
            Menyiapkan Sistem Ekstraksi Video...
          </span>
        </div>

        {/* Tombol masuk ke aplikasi */}
        <div className="delayed-fade-in mt-12" style={{ animationDelay: '1.6s' }}>
          <button
            onClick={onEnter}
            className="px-8 py-3.5 rounded-full border border-outline-variant/40 bg-surface-container/40 backdrop-blur-md text-primary font-semibold text-lg hover:bg-surface-container hover:border-primary/60 hover:shadow-[0_0_30px_rgba(192,193,255,0.25)] transition-all duration-300 ease-out group flex items-center gap-3 cursor-pointer"
          >
            <span>Masuk ke Website</span>
            <span className="inline-block group-hover:translate-x-1.5 transition-transform duration-300">
              →
            </span>
          </button>
        </div>

      </main>
    </div>
  );
}
