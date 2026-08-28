import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Komponen Halaman Awal 3D (Stitch 3D Splash Screen)
export default function SplashScreen({ onEnter }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Inisialisasi Scene & Kamera Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    // 2. Pencahayaan (Ambient + Neon Point Lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x6366f1, 2.5, 12);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    const pinkLight = new THREE.PointLight(0xec4899, 2.5, 12);
    pinkLight.position.set(-2, -2, 2);
    scene.add(pinkLight);

    // 3. Grup Objek 3D (Chrome & Neon)
    const textGroup = new THREE.Group();
    scene.add(textGroup);

    const chromeMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0xffffff,
      shininess: 100,
      reflectivity: 1,
      flatShading: false,
    });

    const neonMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 2 }), // Pink
      new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 2 }), // Purple
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 2 }), // Blue
    ];

    const geometries = [
      new THREE.BoxGeometry(0.8, 0.2, 0.2),
      new THREE.BoxGeometry(0.2, 0.8, 0.2),
      new THREE.TorusGeometry(0.3, 0.1, 16, 32),
      new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16),
    ];

    const components = [];

    for (let i = 0; i < 15; i++) {
      const geo = geometries[Math.floor(Math.random() * geometries.length)];
      const mesh = new THREE.Mesh(geo, chromeMaterial);

      // Tambahkan neon core di beberapa objek
      if (Math.random() > 0.4) {
        const coreGeo = geo.clone();
        coreGeo.scale(0.8, 0.8, 0.8);
        const coreMesh = new THREE.Mesh(coreGeo, neonMaterials[i % 3]);
        mesh.add(coreMesh);
      }

      mesh.position.set(
        (Math.random() - 0.5) * 3.2,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.2
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      const speed = {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01,
      };

      components.push({ mesh, speed });
      textGroup.add(mesh);
    }

    // 4. Background Bintang (Deep Space Void)
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 50;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 5. Animasi Loop
    let animationFrameId;
    function animate() {
      animationFrameId = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      components.forEach((item, index) => {
        item.mesh.rotation.x += item.speed.x;
        item.mesh.rotation.y += item.speed.y;
        item.mesh.position.y += Math.sin(time + index) * 0.002;
      });

      textGroup.rotation.y = Math.sin(time * 0.2) * 0.3;

      // Pulse neon glow
      neonMaterials.forEach((mat) => {
        mat.emissiveIntensity = 1 + Math.sin(time * 2) * 1;
      });

      renderer.render(scene, camera);
    }

    animate();

    // 6. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 7. Cleanup saat unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometries.forEach((g) => g.dispose());
      chromeMaterial.dispose();
      neonMaterials.forEach((m) => m.dispose());
      starGeo.dispose();
      starMat.dispose();
    };
  }, []);

  return (
    <div className="bg-surface-container-lowest text-on-surface h-screen w-screen overflow-hidden flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container relative select-none">
      {/* 3D Three.js Background Canvas */}
      <div className="fixed inset-0 z-0 bg-[#000000]">
        <div ref={containerRef} className="absolute inset-0 w-full h-full object-cover" />
        {/* Overlay agar teks tetap terbaca tajam */}
        <div className="absolute inset-0 bg-surface-container-lowest/40 backdrop-blur-[2px] mix-blend-overlay pointer-events-none" />
      </div>

      {/* Konten Utama */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-between w-full h-full py-16 sm:py-20 pointer-events-none">
        {/* Teks Judul Atas */}
        <div className="text-center pointer-events-auto px-4">
          <h1 className="font-semibold text-lg sm:text-xl md:text-2xl text-pink-400 fade-in-glow tracking-widest uppercase">
            selamat datang di
          </h1>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white fade-in-glow tracking-tight mt-2 drop-shadow-[0_0_20px_rgba(236,72,153,0.4)]">
            website download by kaze
          </h2>
        </div>

        {/* Area Tengah (Ruang Kosong untuk Elemen 3D) */}
        <div className="flex-grow w-full pointer-events-none" />

        {/* Elemen Bawah (Loading Indicator & Tombol Masuk) */}
        <div className="flex flex-col items-center gap-8 pointer-events-auto px-4 pb-4">
          {/* Loading Indicator */}
          <div className="delayed-fade-in flex flex-col items-center gap-3" style={{ animationDelay: '0.8s' }}>
            <div className="pulse-loader" />
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest opacity-60">
              Menyiapkan Sistem Ekstraksi Video...
            </span>
          </div>

          {/* Tombol Masuk */}
          <div className="delayed-fade-in" style={{ animationDelay: '1.8s' }}>
            <button
              onClick={onEnter}
              className="px-8 py-3.5 rounded-full bg-blue-900/80 text-white font-semibold text-lg hover:bg-blue-800 transition-all duration-300 ease-out group flex items-center shadow-[0_0_20px_rgba(30,58,138,0.6)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] border border-blue-500/30 cursor-pointer"
            >
              <span>Masuk ke Website</span>
              <span className="inline-block ml-2 group-hover:translate-x-1.5 transition-transform duration-300">
                →
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
