import React, { useEffect, useRef } from 'react';

// komponen background WebGL Shader interaktif (sesuai screen 4 Stitch)
export default function ShaderBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId;

    // sesuaikan ukuran kanvas sama viewport biar tajem
    function syncSize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    syncSize();
    window.addEventListener('resize', syncSize);

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = v_texCoord;
        
        // efek pergerakan gelombang gradien gelap halus
        float noise = sin(uv.x * 2.5 + u_time * 0.4) * cos(uv.y * 2.5 + u_time * 0.4) * 0.12;
        vec3 color1 = vec3(0.043, 0.075, 0.149); // Dark navy (#0b1326)
        vec3 color2 = vec3(0.024, 0.055, 0.125); // Deep navy
        vec3 glow = vec3(0.12, 0.14, 0.28); // Subtle purple/indigo hint

        float mask = smoothstep(0.35, 0.65, uv.y + noise);
        vec3 finalColor = mix(color1, color2, mask);
        
        // sedikit sentuhan pendar di tengah
        float centerDist = length(uv - vec2(0.5, 0.5));
        finalColor += glow * (1.0 - smoothstep(0.0, 0.8, centerDist)) * 0.25;

        // vignette lembut di pinggiran
        float dist = distance(uv, vec2(0.5));
        finalColor *= 1.0 - dist * 0.4;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    function createShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    const vertShader = createShader(gl.VERTEX_SHADER, vs);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fs);
    const prog = gl.createProgram();
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');

    let startTime = performance.now();

    function render() {
      gl.viewport(0, 0, canvas.width, canvas.height);
      const elapsed = (performance.now() - startTime) * 0.001;
      if (uTime) gl.uniform1f(uTime, elapsed);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }
    render();

    return () => {
      window.removeEventListener('resize', syncSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Kanvas WebGL */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover block"
      />
      {/* Overlay pendaran warna gradien halus */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[12px] pointer-events-none" />
    </div>
  );
}
