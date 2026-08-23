import React, { useState } from 'react';

// komponen header navigasi atas website
export default function Navbar({ activePlatform, onSelectPlatform, onGoHome }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'tiktok', label: 'TikTok', icon: 'music_note' },
    { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { id: 'twitter', label: 'X', icon: 'close' },
    { id: 'youtube', label: 'YouTube', icon: 'play_circle' }
  ];

  return (
    <header className="bg-surface-container/80 backdrop-blur-xl border-b border-outline-variant/15 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop h-16 flex items-center justify-between">
        
        {/* Logo & Judul Brand */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 font-black text-lg md:text-2xl text-primary hover:text-primary-fixed-dim transition-colors tracking-tight text-left"
        >
          <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">download</span>
          <span>website download by kaze</span>
        </button>

        {/* Menu Navigasi Desktop */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          {navItems.map((item) => {
            const isActive = activePlatform === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPlatform(item.id)}
                className={`h-full flex items-center px-1 font-semibold text-base transition-all duration-200 relative ${
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-primary hover:scale-105'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Tombol Toggle Menu Mobile */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
            aria-label="Buka menu"
          >
            <span className="material-symbols-outlined text-3xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Menu Dropdown untuk Layar HP */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-container-high/95 backdrop-blur-2xl border-b border-outline-variant/20 px-4 py-4 flex flex-col gap-2 animate-fadeIn">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectPlatform(item.id);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${
                activePlatform === item.id
                  ? 'bg-primary/15 text-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span>{item.label} Downloader</span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
