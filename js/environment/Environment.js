/**
 * Space Environment & Anomalies (WindField, GravityAnomaly, QuantumCore)
 * Pure ES Module
 */

import { ARENA_W, ARENA_H } from '../core/Constants.js';

export class WindField {
  constructor(arenaW = ARENA_W, arenaH = ARENA_H) {
    this.arenaW = arenaW;
    this.arenaH = arenaH;
    this.enabled = true;
    this.particles = [];
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: Math.random() * this.arenaW,
        y: Math.random() * (this.arenaH - 60),
        speed: Math.random() * 0.8 + 0.5,
        length: Math.random() * 20 + 12,
        alpha: Math.random() * 0.35 + 0.15
      });
    }
  }

  getWindAt(y) {
    if (!this.enabled) return 0;
    // Stratospheric solar wind jetstream (y < 260): blows left (-0.55 to -0.85)
    if (y < 260) {
      const gust = Math.sin(Date.now() * 0.0016 + y * 0.02) * 0.25;
      return -0.65 + gust;
    }
    // Crosswind shear layer (260 <= y <= 440): blows right (+0.60 to +0.90)
    else if (y <= 440) {
      const gust = Math.cos(Date.now() * 0.002 + y * 0.015) * 0.25;
      return 0.70 + gust;
    }
    // Surface thermal boundary layer (y > 440): gentle left drift (-0.30)
    else {
      return -0.30 + Math.sin(Date.now() * 0.0025) * 0.15;
    }
  }

  update() {
    if (!this.enabled) return;
    this.particles.forEach(p => {
      const wind = this.getWindAt(p.y);
      p.x += wind * p.speed * 2.2;
      if (p.x < -40) p.x = this.arenaW + 30;
      if (p.x > this.arenaW + 40) p.x = -30;
    });
  }

  draw(ctx) {
    if (!this.enabled) return;
    ctx.save();
    this.particles.forEach(p => {
      const wind = this.getWindAt(p.y);
      const dir = Math.sign(wind) || 1;
      ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + dir * p.length, p.y);
      ctx.stroke();

      // Streamline tip particle
      ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha * 1.6})`;
      ctx.beginPath();
      ctx.arc(p.x + dir * p.length, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Layer boundary indicators
    ctx.font = '7.5px monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.textAlign = 'left';
    ctx.fillText('◀ SOLAR WIND JETSTREAM (-0.7 m/s)', 14, 130);
    ctx.fillText('▶ CROSSWIND SHEAR LAYER (+0.7 m/s)', 14, 330);
    ctx.fillText('◀ GROUND BOUNDARY DRAFT (-0.3 m/s)', 14, 475);
    ctx.restore();
  }
}

export class GravityAnomaly {
  constructor(x, y, mass = 1.2, arenaW = ARENA_W) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.arenaW = arenaW;
    this.radius = 24;
    this.pulse = Math.random() * Math.PI * 2;
    this.particles = [];
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        angle: (i / 20) * Math.PI * 2,
        dist: Math.random() * 34 + 10,
        speed: Math.random() * 0.045 + 0.03,
        size: Math.random() * 2 + 1
      });
    }
  }

  update() {
    this.pulse += 0.04;
    this.particles.forEach(p => {
      p.angle += p.speed;
      p.dist -= 0.14;
      if (p.dist < 6) p.dist = 38 + Math.random() * 8;
    });
  }

  applyForce(obj) {
    let dx = this.x - obj.x;
    if (dx > this.arenaW / 2) dx -= this.arenaW;
    else if (dx < -this.arenaW / 2) dx += this.arenaW;
    const dy = this.y - obj.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    if (dist > 14 && dist < 360) {
      const force = (this.mass * 90) / (distSq + 600);
      obj.vx += (dx / dist) * force;
      obj.vy += (dy / dist) * force;
      return force;
    }
    return 0;
  }

  draw(ctx) {
    ctx.save();
    // 1. Distortion halo
    const glow = 28 + Math.sin(this.pulse) * 6;
    const grad = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, glow);
    grad.addColorStop(0, 'rgba(192, 132, 252, 0.45)');
    grad.addColorStop(0.5, 'rgba(147, 51, 234, 0.18)');
    grad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glow, 0, Math.PI * 2);
    ctx.fill();

    // 2. Accretion particles
    this.particles.forEach(p => {
      const px = this.x + Math.cos(p.angle) * p.dist;
      const py = this.y + Math.sin(p.angle) * p.dist;
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Singularity Core (Dark void + bright magenta event horizon ring)
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#05020c';
    ctx.fill();
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 4. Tactical Callout Label
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#c084fc';
    ctx.textAlign = 'center';
    ctx.fillText('🌀 GRAVITY VORTEX', this.x, this.y - glow - 3);
    ctx.restore();
  }
}

export class QuantumCore {
  constructor(x, y, arenaW = ARENA_W) {
    this.x = x;
    this.y = y;
    this.arenaW = arenaW;
    this.radius = 14;
    this.angle = Math.random() * Math.PI * 2;
    this.collected = false;
    this.floatOffset = Math.random() * Math.PI * 2;
  }

  update() {
    this.angle += 0.035;
    this.floatOffset += 0.045;
  }

  checkCollision(r) {
    if (this.collected) return false;
    let dx = Math.abs(r.x - this.x);
    if (dx > this.arenaW / 2) dx = this.arenaW - dx;
    const dy = r.y - (this.y + Math.sin(this.floatOffset) * 4);
    if (Math.hypot(dx, dy) < r.radius + this.radius) {
      this.collected = true;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.collected) return;
    ctx.save();
    const fy = this.y + Math.sin(this.floatOffset) * 4;

    // Energy aura
    const grad = ctx.createRadialGradient(this.x, fy, 2, this.x, fy, 22);
    grad.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
    grad.addColorStop(0.6, 'rgba(236, 72, 153, 0.12)');
    grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, fy, 22, 0, Math.PI * 2);
    ctx.fill();

    // 3D Wireframe Hypercube Projection
    ctx.save();
    ctx.translate(this.x, fy);
    ctx.rotate(this.angle);

    // Outer box
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 8;
    ctx.strokeRect(-9, -9, 18, 18);

    // Inner rotated box
    ctx.rotate(Math.PI / 4 + this.angle * 0.5);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-6, -6, 12, 12);

    // Singularity spark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tactical Label
    ctx.font = 'bold 7.5px monospace';
    ctx.fillStyle = '#f472b6';
    ctx.textAlign = 'center';
    ctx.fillText('💎 QUANTUM CORE', this.x, fy - 18);
    ctx.restore();
  }
}
