import React from 'react';

// komponen footer bawah website
export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest/80 border-t border-outline-variant/15 w-full mt-auto py-8 relative z-10">
      <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-primary">website download by kaze</span>
        </div>
        <p className="text-sm text-on-surface-variant/80">
          © {new Date().getFullYear()} website download by kaze. Unduh video tanpa watermark secara instan.
        </p>
      </div>
    </footer>
  );
}
