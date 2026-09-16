/**
 * Particle Systems Engine
 * Pure ES Module
 */

import { ARENA_W } from '../core/Constants.js';

export class ExhaustParticle {
  constructor(x, y, vx, vy, customColor = null, arenaW = ARENA_W) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.arenaW = arenaW;
    this.life = customColor ? 14 : 20;
    this.maxLife = this.life;
    this.size = customColor ? (Math.random() * 2.5 + 1.2) : (Math.random() * 4 + 2);
    this.color = customColor || (Math.random() > 0.4 ? '#f59e0b' : Math.random() > 0.5 ? '#ef4444' : '#fef08a');
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0) this.x += this.arenaW;
    else if (this.x >= this.arenaW) this.x -= this.arenaW;
    this.life--;
    this.size *= 0.94;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ExplosionParticle {
  constructor(x, y, color = null, arenaW = ARENA_W) {
    this.x = x;
    this.y = y;
    this.arenaW = arenaW;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 7 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = Math.floor(Math.random() * 25 + 20);
    this.maxLife = this.life;
    this.size = Math.random() * 4 + 2;
    this.color = color || (Math.random() > 0.5 ? '#ef4444' : Math.random() > 0.5 ? '#f59e0b' : '#ffffff');
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    if (this.x < 0) this.x += this.arenaW;
    else if (this.x >= this.arenaW) this.x -= this.arenaW;
    this.life--;
    this.size *= 0.95;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class SparkleParticle {
  constructor(x, y, color = '#38bdf8', arenaW = ARENA_W) {
    this.x = x;
    this.y = y;
    this.arenaW = arenaW;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.5;
    this.life = Math.floor(Math.random() * 30 + 20);
    this.maxLife = this.life;
    this.size = Math.random() * 3 + 1;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05; // gentle gravity
    if (this.x < 0) this.x += this.arenaW;
    else if (this.x >= this.arenaW) this.x -= this.arenaW;
    this.life--;
    this.size *= 0.96;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
