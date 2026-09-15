import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';

interface ShinyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  color: string;
  alpha: number;
  angle: number;
  spin: number;
  pulsePhase: number;
}

interface DriftingGlyph {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  size: number;
  alpha: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

interface SparkleTrail {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface ScreensaverCanvasProps {
  isActive: boolean;
  onExit: () => void;
}

const SHINY_COLORS = [
  '#00f2fe', // Cyan neon
  '#4facfe', // Electric blue
  '#a855f7', // Vivid purple
  '#c084fc', // Soft violet
  '#ec4899', // Hot magenta
  '#38bdf8', // Sky glow
  '#fbcfe8', // Starlight pink
  '#fef08a', // Cosmic gold
];

const GLYPH_POOL = ['Σ', '∞', 'ψ', '∇', 'λ', 'Ω', '∮', '≈', '⊗', '✨', '✦', '✳', '⟲', '⨁', '◈'];

export const ScreensaverCanvas: React.FC<ScreensaverCanvasProps> = ({ isActive, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ShinyParticle[]>([]);
  const glyphsRef = useRef<DriftingGlyph[]>([]);
  const sparklesRef = useRef<SparkleTrail[]>([]);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const [showHint, setShowHint] = useState(true);

  // Initialize shiny particle pool
  useEffect(() => {
    if (!isActive) return;

    setShowHint(true);
    const hideTimer = setTimeout(() => setShowHint(false), 3500);

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 450 shiny floating cosmic particles
    const particles: ShinyParticle[] = [];
    for (let i = 0; i < 450; i++) {
      const baseSize = Math.random() * 2.8 + 1.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: baseSize,
        baseSize,
        color: SHINY_COLORS[Math.floor(Math.random() * SHINY_COLORS.length)],
        alpha: Math.random() * 0.8 + 0.2,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.02,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;

    // 35 drifting cosmic glyphs
    const glyphs: DriftingGlyph[] = [];
    for (let i = 0; i < 35; i++) {
      glyphs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        char: GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)],
        size: Math.random() * 18 + 14,
        alpha: Math.random() * 0.6 + 0.3,
        color: SHINY_COLORS[Math.floor(Math.random() * SHINY_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015,
      });
    }
    glyphsRef.current = glyphs;

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
    let time = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      time += 0.015;

      const w = canvas.width;
      const h = canvas.height;

      // Deep void with subtle motion trails
      ctx.fillStyle = 'rgba(3, 5, 12, 0.2)';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // Makes everything glow and blend

      // 1. UPDATE & DRAW SHINY PARTICLES
      for (const p of particlesRef.current) {
        // Natural curved cosmic flow field
        const flowAngle = Math.sin(p.x * 0.003 + time) + Math.cos(p.y * 0.003 + time);
        p.vx += Math.cos(flowAngle) * 0.04;
        p.vy += Math.sin(flowAngle) * 0.04;

        // Damping
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Mouse interaction: gentle stardust attraction
        if (mousePosRef.current.active) {
          const dx = mousePosRef.current.x - p.x;
          const dy = mousePosRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && dist > 5) {
            const force = (1 - dist / 200) * 0.15;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Pulse size and glow
        p.pulsePhase += 0.03;
        const currentSize = p.baseSize * (1 + Math.sin(p.pulsePhase) * 0.4);

        // Draw glowing particle
        ctx.beginPath();
        const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 3);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.3, p.color);
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGrad;
        ctx.arc(p.x, p.y, currentSize * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. UPDATE & DRAW DRIFTING GLYPHS
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const g of glyphsRef.current) {
        g.x += g.vx;
        g.y += g.vy;
        g.rotation += g.rotSpeed;

        if (g.x < -30) g.x = w + 30;
        if (g.x > w + 30) g.x = -30;
        if (g.y < -30) g.y = h + 30;
        if (g.y > h + 30) g.y = -30;

        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rotation);
        ctx.font = `${g.size}px serif`;
        ctx.shadowColor = g.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = g.color;
        ctx.globalAlpha = g.alpha * (0.8 + Math.sin(time * 2 + g.x) * 0.2);
        ctx.fillText(g.char, 0, 0);
        ctx.restore();
      }

      // 3. MOUSE SPARKLE TRAILS
      for (let i = sparklesRef.current.length - 1; i >= 0; i--) {
        const s = sparklesRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 1;

        if (s.life <= 0) {
          sparklesRef.current.splice(i, 1);
          continue;
        }

        const progress = s.life / s.maxLife;
        ctx.beginPath();
        const sGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 2);
        sGrad.addColorStop(0, '#ffffff');
        sGrad.addColorStop(0.4, s.color);
        sGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sGrad;
        ctx.globalAlpha = progress;
        ctx.arc(s.x, s.y, s.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isActive]);

  // Window Resize & Mouse movement
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

      // Emit new shiny stardust sparkles on move
      if (Math.random() > 0.4) {
        sparklesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          life: 35,
          maxLife: 35,
          color: SHINY_COLORS[Math.floor(Math.random() * SHINY_COLORS.length)],
          size: Math.random() * 3 + 2,
        });
      }
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
    };

    const handleClick = () => {
      // Create a shockwave of stardust!
      sound.playTokenChime(1.2);
      const mx = mousePosRef.current.x || window.innerWidth / 2;
      const my = mousePosRef.current.y || window.innerHeight / 2;

      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        const speed = Math.random() * 6 + 3;
        sparklesRef.current.push({
          x: mx,
          y: my,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 50,
          maxLife: 50,
          color: SHINY_COLORS[Math.floor(Math.random() * SHINY_COLORS.length)],
          size: Math.random() * 4 + 2,
        });
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

  // Keyboard shortcut: Press Escape or Space to exit
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
    <div className="fixed inset-0 z-50 bg-[#03050c] overflow-hidden cursor-crosshair">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Floating Exit Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        className="absolute top-6 right-6 z-10 px-4 py-2 rounded-full bg-slate-900/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950 hover:border-cyan-300 backdrop-blur-md text-xs font-mono tracking-wider transition-all shadow-xl shadow-cyan-500/20"
      >
        ✕ Exit Screensaver
      </button>

      {/* Ambient Hint Banner (fades out after 3.5 seconds) */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-950/80 border border-slate-800 backdrop-blur-xl text-xs font-mono text-slate-300 pointer-events-none transition-opacity duration-1000 ${
          showHint ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>Screensaver Active · Move mouse or click for stardust · Press Esc to wake</span>
      </div>
    </div>
  );
};
