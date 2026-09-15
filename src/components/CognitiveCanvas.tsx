import React, { useEffect, useRef } from 'react';
import type { CognitiveState, StreamItem } from '../types/cognitive';
import { sound } from '../utils/audio';

interface CognitiveCanvasProps {
  state: CognitiveState;
  streamItems: StreamItem[];
  currentPrompt: string;
  inferenceProgress: number; // 0 to 1
  feedbackProgress: number; // 0 to 1
  onItemClick?: (item: StreamItem) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  pathProgress: number; // 0 to 1
  laneOffset: number;
}

export const CognitiveCanvas: React.FC<CognitiveCanvasProps> = ({
  state,
  streamItems,
  inferenceProgress,
  feedbackProgress,
  onItemClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const feedbackParticlesRef = useRef<Particle[]>([]);

  // Initialize particle pools
  useEffect(() => {
    const streamParticles: Particle[] = [];
    for (let i = 0; i < 180; i++) {
      streamParticles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: Math.random() * 2.5 + 1.2,
        alpha: Math.random() * 0.7 + 0.3,
        color: Math.random() > 0.4 ? '#38bdf8' : Math.random() > 0.5 ? '#818cf8' : '#c084fc',
        pathProgress: Math.random(),
        laneOffset: (Math.random() - 0.5) * 80,
      });
    }
    particlesRef.current = streamParticles;

    const fbParticles: Particle[] = [];
    for (let i = 0; i < 90; i++) {
      fbParticles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: Math.random() * 2.2 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.4 ? '#c084fc' : '#a855f7',
        pathProgress: Math.random(),
        laneOffset: (Math.random() - 0.5) * 40,
      });
    }
    feedbackParticlesRef.current = fbParticles;
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // COORDINATE LANDMARKS
      // Latent Cube Center & Outlets (positioned on left)
      const cubeX = w * 0.26;
      const cubeY = h * 0.48;
      const cubeEmissionX = cubeX + 110;
      const cubeEmissionY = cubeY - 10;
      const cubeIntakeX = cubeX;
      const cubeIntakeY = cubeY + 120;

      // Stream Hub (center-right)
      const streamHubX = w * 0.76;
      const streamHubY = h * 0.46;

      // Trigger Prompt Position (top right)
      const triggerX = w * 0.72;
      const triggerY = h * 0.18;

      // 1. INFERENCE VECTOR: prompt -> inference -> response (Top Arrow)
      drawInferenceVector(ctx, triggerX, triggerY, cubeEmissionX, cubeEmissionY, inferenceProgress, state);

      // 2. DYNAMIC STREAM TENDRILL LINES (Connecting Cube to Stream Area)
      if (state !== 'IDLE') {
        drawStreamTendrils(ctx, cubeEmissionX, cubeEmissionY, streamHubX, streamHubY, state);
      }

      // 3. STREAM PARTICLES (flowing rightwards)
      if (state === 'STREAMING' || state === 'FEEDBACK' || state === 'INFERENCE') {
        drawStreamParticles(ctx, cubeEmissionX, cubeEmissionY, streamHubX, streamHubY);
      }

      // 4. FEEDBACK LOOP ARC (Curving from Stream Bottom back to Cube Intake)
      drawFeedbackLoop(ctx, streamHubX - 40, streamHubY + 120, cubeIntakeX, cubeIntakeY, feedbackProgress, state);

      // 5. FEEDBACK PARTICLES (looping back)
      if (state === 'FEEDBACK' || feedbackProgress > 0) {
        drawFeedbackParticles(ctx, streamHubX - 40, streamHubY + 120, cubeIntakeX, cubeIntakeY);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, inferenceProgress, feedbackProgress]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // DRAWING HELPER FUNCTIONS

  // 1. Draw Inference Vector (prompt -> inference -> response)
  const drawInferenceVector = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    progress: number,
    currentState: CognitiveState
  ) => {
    const isExcited = currentState === 'TRIGGER' || currentState === 'INFERENCE';
    const midX = (startX + targetX) / 2;
    const midY = startY - 20;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = isExcited ? 'rgba(56, 189, 248, 0.9)' : 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = isExcited ? 2.5 : 1.5;
    ctx.setLineDash([6, 6]);
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Traveling photon pulse along the inference vector
    if (progress > 0 && progress < 1) {
      const t = progress;
      const px = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * targetX;
      const py = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * targetY;

      ctx.beginPath();
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 14);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#38bdf8');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // 2. Stream Tendril Filaments
  const drawStreamTendrils = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    currentState: CognitiveState
  ) => {
    ctx.save();
    const time = Date.now() * 0.002;
    const intensity = currentState === 'STREAMING' ? 1.0 : 0.5;

    // Multiple flowing glowing wave lines
    for (let i = -3; i <= 3; i++) {
      const offset = i * 18;
      const wave = Math.sin(time + i) * 14 * intensity;

      ctx.beginPath();
      ctx.moveTo(x0, y0 + i * 4);
      ctx.bezierCurveTo(
        x0 + (x1 - x0) * 0.35,
        y0 + offset + wave,
        x0 + (x1 - x0) * 0.65,
        y1 + offset - wave,
        x1 + i * 10,
        y1 + offset * 1.5
      );

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, 'rgba(0, 242, 254, 0.8)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0.15)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(0.8, 2.2 - Math.abs(i) * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  };

  // 3. Stream Particles
  const drawStreamParticles = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) => {
    const time = Date.now() * 0.002;
    ctx.save();

    for (const p of particlesRef.current) {
      p.pathProgress += 0.006;
      if (p.pathProgress > 1) p.pathProgress = 0;

      const t = p.pathProgress;
      // Cubic Bezier interpolation
      const cp1x = x0 + (x1 - x0) * 0.35;
      const cp1y = y0 + p.laneOffset + Math.sin(time + p.laneOffset) * 12;
      const cp2x = x0 + (x1 - x0) * 0.7;
      const cp2y = y1 + p.laneOffset * 1.3 - Math.cos(time + p.laneOffset) * 12;

      const cx = 3 * (cp1x - x0);
      const bx = 3 * (cp2x - cp1x) - cx;
      const ax = x1 - x0 - cx - bx;

      const cy = 3 * (cp1y - y0);
      const by = 3 * (cp2y - cp1y) - cy;
      const ay = y1 - y0 - cy - by;

      const px = ax * (t * t * t) + bx * (t * t) + cx * t + x0;
      const py = ay * (t * t * t) + by * (t * t) + cy * t + y0;

      const fade = Math.sin(t * Math.PI); // Smooth fade in and out

      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * fade;
      ctx.arc(px, py, p.size * (0.8 + fade * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // 4. Feedback Loop Arc
  const drawFeedbackLoop = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    targetX: number,
    targetY: number,
    progress: number,
    currentState: CognitiveState
  ) => {
    ctx.save();
    const isFeedback = currentState === 'FEEDBACK' || progress > 0;

    // Arc downward and swoop left to bottom of cube
    const bottomControlY = Math.max(y0, targetY) + 90;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 - 40, bottomControlY, targetX + 80, bottomControlY, targetX, targetY);

    const grad = ctx.createLinearGradient(x0, y0, targetX, targetY);
    grad.addColorStop(0, isFeedback ? 'rgba(192, 132, 252, 0.9)' : 'rgba(192, 132, 252, 0.3)');
    grad.addColorStop(0.5, isFeedback ? 'rgba(168, 85, 247, 0.8)' : 'rgba(168, 85, 247, 0.25)');
    grad.addColorStop(1, isFeedback ? 'rgba(56, 189, 248, 0.9)' : 'rgba(56, 189, 248, 0.3)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = isFeedback ? 3 : 2;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -Date.now() * 0.04;
    ctx.stroke();
    ctx.setLineDash([]);

    // Traveling ring / feedback shockwave along arc
    if (progress > 0) {
      const t = progress;
      const u = 1 - t;
      const cp1x = x0 - 40;
      const cp1y = bottomControlY;
      const cp2x = targetX + 80;
      const cp2y = bottomControlY;

      const px = u * u * u * x0 + 3 * u * u * t * cp1x + 3 * u * t * t * cp2x + t * t * t * targetX;
      const py = u * u * u * y0 + 3 * u * u * t * cp1y + 3 * u * t * t * cp2y + t * t * t * targetY;

      ctx.beginPath();
      const pulseGrad = ctx.createRadialGradient(px, py, 0, px, py, 20);
      pulseGrad.addColorStop(0, '#ffffff');
      pulseGrad.addColorStop(0.4, '#c084fc');
      pulseGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = pulseGrad;
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // 5. Feedback Particles
  const drawFeedbackParticles = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    targetX: number,
    targetY: number
  ) => {
    ctx.save();
    const bottomControlY = Math.max(y0, targetY) + 90;
    const cp1x = x0 - 40;
    const cp1y = bottomControlY;
    const cp2x = targetX + 80;
    const cp2y = bottomControlY;

    for (const p of feedbackParticlesRef.current) {
      p.pathProgress += 0.008;
      if (p.pathProgress > 1) p.pathProgress = 0;

      const t = p.pathProgress;
      const u = 1 - t;

      const px =
        u * u * u * x0 +
        3 * u * u * t * (cp1x + p.laneOffset) +
        3 * u * t * t * (cp2x + p.laneOffset) +
        t * t * t * targetX;
      const py =
        u * u * u * y0 +
        3 * u * u * t * (cp1y + p.laneOffset * 0.5) +
        3 * u * t * t * (cp2y + p.laneOffset * 0.5) +
        t * t * t * targetY;

      const fade = Math.sin(t * Math.PI);

      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * fade;
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  return (
    <div className="relative w-full h-full pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Floating Dynamic Stream Tokens & Symbols Overlay */}
      <div className="absolute inset-0 pointer-events-auto overflow-hidden">
        {streamItems.map((item) => {
          // Calculate position along visual stream curve based on item.progress (0 to 1)
          const p = item.progress;
          // Left % goes from ~38% (cube exit) to ~86% (stream center)
          const leftPercent = 38 + p * 44;
          // Curve in Y: undulating sine wave
          const topPercent = 46 + Math.sin(p * Math.PI * 1.6) * 16 + item.offsetY;

          return (
            <div
              key={item.id}
              onClick={() => {
                sound.playTokenChime();
                if (onItemClick) onItemClick(item);
              }}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: `translate(-50%, -50%) scale(${item.scale})`,
                opacity: item.opacity,
                color: item.color,
                transition: 'transform 0.2s ease-out, opacity 0.3s ease',
              }}
              className="absolute cursor-pointer select-none group"
            >
              {item.type === 'word' && (
                <div className="px-2.5 py-1 rounded-full bg-slate-950/70 border border-cyan-500/40 backdrop-blur-md text-xs font-mono tracking-wider shadow-lg shadow-cyan-500/10 hover:border-cyan-300 hover:scale-110 transition-transform">
                  <span className="text-cyan-200 group-hover:text-white font-medium">{item.text}</span>
                </div>
              )}

              {item.type === 'symbol' && (
                <div className="w-8 h-8 rounded-full bg-indigo-950/60 border border-purple-500/50 flex items-center justify-center text-sm font-serif font-bold text-purple-300 backdrop-blur-sm shadow-md shadow-purple-500/20 hover:scale-125 transition-transform">
                  {item.text}
                </div>
              )}

              {item.type === 'icon' && (
                <div className="px-2 py-1.5 rounded-xl bg-slate-900/80 border border-purple-400/40 flex items-center gap-1.5 backdrop-blur-md shadow-lg shadow-purple-500/20 hover:scale-110 transition-transform">
                  <span className="text-base">{getIconGlyph(item.iconName)}</span>
                  {item.text && (
                    <span className="text-[10px] font-mono text-purple-200">{item.text}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getIconGlyph(name?: string) {
  switch (name) {
    case 'brain':
      return '🧠';
    case 'heart':
      return '🤍';
    case 'lightbulb':
      return '💡';
    case 'infinity':
      return '♾️';
    case 'cube':
      return '🧊';
    case 'sigma':
      return 'Σ';
    default:
      return '✨';
  }
}
