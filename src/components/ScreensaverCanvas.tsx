import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';

interface FireflyRGB {
  r: number;
  g: number;
  b: number;
}

interface FireflyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
  size: number;
  color: FireflyRGB;
  phase: number;
  flashSpeed: number;
  jitterTimer: number;
  depth: number;
}

interface Spore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface ScreensaverCanvasProps {
  isActive: boolean;
  onExit: () => void;
}

const FIREFLY_COLORS: FireflyRGB[] = [
  { r: 190, g: 242, b: 100 }, // Lime glow
  { r: 253, g: 224, b: 71 },  // Soft golden yellow
  { r: 163, g: 230, b: 53 },  // Vibrant chartreuse
  { r: 251, g: 191, b: 36 },  // Warm honey amber
  { r: 110, g: 231, b: 183 }, // Soft emerald
];

export const ScreensaverCanvas: React.FC<ScreensaverCanvasProps> = ({ isActive, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const firefliesRef = useRef<FireflyParticle[]>([]);
  const sporesRef = useRef<Spore[]>([]);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const [showHint, setShowHint] = useState(true);

  // Initialize fireflies
  useEffect(() => {
    if (!isActive) return;

    setShowHint(true);
    const hideTimer = setTimeout(() => setShowHint(false), 4000);

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 150 bioluminescent fireflies
    const flies: FireflyParticle[] = [];
    for (let i = 0; i < 150; i++) {
      flies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(Math.random() * 0.4 + 0.15),
        targetVx: (Math.random() - 0.5) * 0.6,
        targetVy: -(Math.random() * 0.4 + 0.15),
        size: Math.random() * 2.2 + 1.2,
        color: FIREFLY_COLORS[Math.floor(Math.random() * FIREFLY_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        flashSpeed: Math.random() * 0.025 + 0.012,
        jitterTimer: Math.floor(Math.random() * 60),
        depth: Math.random() * 0.6 + 0.4,
      });
    }
    firefliesRef.current = flies;

    // Floating twilight spores
    const spores: Spore[] = [];
    for (let i = 0; i < 80; i++) {
      spores.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.2 + 0.05),
        size: Math.random() * 1.2 + 0.5,
        alpha: Math.random() * 0.35 + 0.1,
      });
    }
    sporesRef.current = spores;

    return () => clearTimeout(hideTimer);
  }, [isActive]);

  // Main animation loop
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);

      const w = canvas.width;
      const h = canvas.height;

      // Soft trailing night sky
      ctx.fillStyle = 'rgba(2, 5, 8, 0.28)';
      ctx.fillRect(0, 0, w, h);

      // 1. DRAW SPORES
      ctx.save();
      for (const s of sporesRef.current) {
        s.y += s.vy;
        s.x += s.vx;
        if (s.y < 0) s.y = h;
        if (s.x < 0) s.x = w;
        if (s.x > w) s.x = 0;

        ctx.beginPath();
        ctx.fillStyle = `rgba(163, 230, 53, ${s.alpha * 0.5})`;
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. DRAW FIREFLIES WITH ADDITIVE BIOLUMINESCENT GLOW
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (const f of firefliesRef.current) {
        // Wandering flutter
        f.jitterTimer--;
        if (f.jitterTimer <= 0) {
          f.targetVx = (Math.random() - 0.5) * 1.0;
          f.targetVy = (Math.random() - 0.5) * 0.6 - 0.15;
          f.jitterTimer = Math.floor(Math.random() * 80 + 30);
        }

        f.vx += (f.targetVx - f.vx) * 0.04;
        f.vy += (f.targetVy - f.vy) * 0.04;

        const microJitterX = (Math.random() - 0.5) * 0.25;
        const microJitterY = (Math.random() - 0.5) * 0.25;

        // Curiosity toward cursor
        if (mousePosRef.current.active) {
          const dx = mousePosRef.current.x - f.x;
          const dy = mousePosRef.current.y - f.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 260 && dist > 20) {
            const force = (1 - dist / 260) * 0.06;
            f.vx += (dx / dist) * force;
            f.vy += (dy / dist) * force;
          }
        }

        f.x += (f.vx + microJitterX) * f.depth;
        f.y += (f.vy + microJitterY) * f.depth;

        // Wrap edges
        if (f.x < -30) f.x = w + 20;
        if (f.x > w + 30) f.x = -20;
        if (f.y < -30) f.y = h + 20;
        if (f.y > h + 30) f.y = -20;

        f.phase += f.flashSpeed;

        // Bioluminescent flash curve
        const sinVal = Math.sin(f.phase);
        let brightness = Math.max(0, sinVal);
        brightness = Math.pow(brightness, 2.5);

        const alpha = 0.08 + brightness * 0.92;
        const currentSize = f.size * (0.8 + brightness * 0.7) * f.depth;
        const { r, g, b } = f.color;

        // Outer soft glow
        if (alpha > 0.15) {
          const outerRadius = currentSize * (12 + brightness * 14);
          const outerGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, outerRadius);
          outerGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.45})`);
          outerGrad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${alpha * 0.18})`);
          outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.beginPath();
          ctx.fillStyle = outerGrad;
          ctx.arc(f.x, f.y, outerRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Inner radiant halo
        const innerRadius = currentSize * (3.5 + brightness * 3);
        const innerGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, innerRadius);
        innerGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.95})`);
        innerGrad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
        innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.fillStyle = innerGrad;
        ctx.arc(f.x, f.y, innerRadius, 0, Math.PI * 2);
        ctx.fill();

        // White core
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.2)})`;
        ctx.arc(f.x, f.y, currentSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isActive]);

  // Window Resize, Mouse movement, Click ripple
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      sound.playTokenChime(1.1);
      const clickX = e.clientX;
      const clickY = e.clientY;

      for (const f of firefliesRef.current) {
        const dx = f.x - clickX;
        const dy = f.y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 340) {
          setTimeout(() => {
            f.phase = Math.PI * 0.5; // ignite
          }, dist * 0.8);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
    };
  }, [isActive]);

  // Keyboard shortcut: Press Escape or Space or S to exit
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 's' || e.key === 'S') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onExit]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#020508] overflow-hidden cursor-crosshair">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Subtle Exit Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        className="absolute top-6 right-6 z-10 px-4 py-2 rounded-full bg-slate-950/70 border border-lime-500/30 text-lime-300 hover:bg-slate-900 hover:border-lime-400 backdrop-blur-md text-xs font-mono tracking-wider transition-all shadow-xl shadow-lime-950/30"
      >
        ✕ Exit Screensaver
      </button>

      {/* Ambient Hint Banner */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-950/80 border border-lime-500/30 backdrop-blur-xl text-xs font-mono text-lime-200 pointer-events-none transition-opacity duration-1000 ${
          showHint ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
        <span>Bioluminescent Fireflies · Move cursor to attract · Click to ignite pulse</span>
      </div>
    </div>
  );
};
