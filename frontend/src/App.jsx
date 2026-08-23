import React, { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import WelcomeScreen from './components/WelcomeScreen';
import ConverterScreen from './components/ConverterScreen';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ShaderBackground from './components/ShaderBackground';

// komponen utama App: Pengatur alur layar (Splash, Welcome Hub, Converter)
export default function App() {
  // state buat nyimpen layar mana yang lagi aktif: 'splash' | 'welcome' | 'converter'
  const [currentScreen, setCurrentScreen] = useState('splash');
  // platform sosmed aktif yang lagi dibuka user ('tiktok' | 'instagram' | 'twitter' | 'youtube')
  const [activePlatform, setActivePlatform] = useState('tiktok');

  // kalo user masih di splash screen
  if (currentScreen === 'splash') {
    return <SplashScreen onEnter={() => setCurrentScreen('welcome')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface relative overflow-x-hidden">
      
      {/* background shader dinamis */}
      <ShaderBackground />

      {/* Header Navigasi Atas */}
      <Navbar
        activePlatform={currentScreen === 'converter' ? activePlatform : null}
        onSelectPlatform={(platformId) => {
          setActivePlatform(platformId);
          setCurrentScreen('converter');
        }}
        onGoHome={() => setCurrentScreen('welcome')}
      />

      {/* Tampilan Konten Sesuai State */}
      {currentScreen === 'welcome' ? (
        <WelcomeScreen
          onSelectPlatform={(platformId) => {
            setActivePlatform(platformId);
            setCurrentScreen('converter');
          }}
        />
      ) : (
        <ConverterScreen
          activePlatform={activePlatform}
          onBack={() => setCurrentScreen('welcome')}
        />
      )}

      {/* Footer Bawah */}
      <Footer />
    </div>
  );
}
