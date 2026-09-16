/**
 * Obstacles and Space Objects (Asteroid, FuelOrb, LandingPad)
 * Pure ES Module
 */

import { ARENA_W, ARENA_H } from '../core/Constants.js';

export class Asteroid {
  constructor(x, y, radius, vx = 0, vy = 0, arenaW = ARENA_W, arenaH = ARENA_H) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = vx;
    this.vy = vy;
    this.arenaW = arenaW;
    this.arenaH = arenaH;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.02;

    // Generate jagged polygon vertices
    this.points = [];
    const numPoints = 8;
    for (let i = 0; i < numPoints; i++) {
      const a = (i / numPoints) * Math.PI * 2;
      const r = radius * (0.8 + Math.random() * 0.4);
      this.points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;

    if (this.x < -this.radius) this.x = this.arenaW + this.radius;
    if (this.x > this.arenaW + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = this.arenaH + this.radius;
    if (this.y > this.arenaH + this.radius) this.y = -this.radius;
  }

  draw(ctx) {
    this.renderAsteroid(ctx, this.x, this.y);
    // Ghost render for screen wrapping
    if (this.x < this.radius) {
      this.renderAsteroid(ctx, this.x + this.arenaW, this.y);
    } else if (this.x > this.arenaW - this.radius) {
      this.renderAsteroid(ctx, this.x - this.arenaW, this.y);
    }
  }

  renderAsteroid(ctx, px, py) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.rotation);
    ctx.beginPath();
    this.points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }
}

export class FuelOrb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update() {
    this.pulse += 0.05;
  }

  draw(ctx) {
    ctx.save();
    const glow = 10 + Math.sin(this.pulse) * 4;
    ctx.beginPath();
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glow * 1.6);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#38bdf8');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.arc(this.x, this.y, glow * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#00f2fe';
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class LandingPad {
  constructor(x, y, width = 110, arenaW = ARENA_W, arenaH = ARENA_H) {
    this.baseX = x;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = 12;
    this.arenaW = arenaW;
    this.arenaH = arenaH;
    this.isKinetic = false;
    this.oscillationAmp = 90;
    this.oscillationSpeed = 0.0011;
  }

  update() {
    if (this.isKinetic) {
      this.x = this.baseX + Math.sin(Date.now() * this.oscillationSpeed) * this.oscillationAmp;
      this.x = Math.max(25, Math.min(this.arenaW - this.width - 25, this.x));
    } else {
      this.x = this.baseX;
    }
  }

  draw(ctx) {
    ctx.save();

    // 1. Vertical Holographic Landing Guide Beam
    const beamGrad = ctx.createLinearGradient(0, this.y, 0, 0);
    beamGrad.addColorStop(0, 'rgba(74, 222, 128, 0.28)');
    beamGrad.addColorStop(0.35, 'rgba(74, 222, 128, 0.10)');
    beamGrad.addColorStop(1, 'rgba(74, 222, 128, 0.0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(this.x, 0, this.width, this.y);

    // Dashed landing approach centerline
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, 0);
    ctx.lineTo(this.x + this.width / 2, this.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Elevated Gantry Foundation Support Pylons
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    const groundLevel = this.arenaH - 35;
    // Left Pylon
    ctx.beginPath();
    ctx.moveTo(this.x + 8, this.y + this.height);
    ctx.lineTo(this.x + 8, groundLevel);
    ctx.stroke();
    // Right Pylon
    ctx.beginPath();
    ctx.moveTo(this.x + this.width - 8, this.y + this.height);
    ctx.lineTo(this.x + this.width - 8, groundLevel);
    ctx.stroke();
    // Cross Truss Bracing
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x + 8, this.y + this.height);
    ctx.lineTo(this.x + this.width - 8, groundLevel);
    ctx.moveTo(this.x + this.width - 8, this.y + this.height);
    ctx.lineTo(this.x + 8, groundLevel);
    ctx.stroke();

    // 3. Landing Pad Deck & Hazard Chevrons
    ctx.fillStyle = '#090d16';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Diagonal Yellow/Black Hazard Stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    for (let sx = -this.height; sx < this.width + this.height; sx += 14) {
      ctx.beginPath();
      ctx.moveTo(this.x + sx, this.y + this.height);
      ctx.lineTo(this.x + sx + this.height, this.y);
      ctx.stroke();
    }
    ctx.restore();

    // Perimeter illuminated neon green border
    ctx.strokeStyle = this.isKinetic ? '#38bdf8' : '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // 4. Strobe Beacon Towers with Bright Flares
    const t = Date.now() * 0.007;
    const strobeA = Math.sin(t) > 0;
    const strobeB = Math.cos(t) > 0;

    // Left Beacon Strobe
    ctx.fillStyle = strobeA ? '#4ade80' : '#15803d';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = strobeA ? 12 : 2;
    ctx.fillRect(this.x - 4, this.y - 8, 8, 8);

    // Right Beacon Strobe
    ctx.fillStyle = strobeB ? '#38bdf8' : '#0369a1';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = strobeB ? 12 : 2;
    ctx.fillRect(this.x + this.width - 4, this.y - 8, 8, 8);
    ctx.shadowBlur = 0;

    // 5. Target Label & Coordinates
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = this.isKinetic ? '#38bdf8' : '#4ade80';
    ctx.textAlign = 'center';
    const kineticTag = this.isKinetic ? ' ⟷ KINETIC' : '';
    ctx.fillText(`🎯 TARGET PAD [X: ${Math.round(this.x + this.width / 2)}]${kineticTag}`, this.x + this.width / 2, this.y + this.height + 15);
    ctx.restore();
  }
}
