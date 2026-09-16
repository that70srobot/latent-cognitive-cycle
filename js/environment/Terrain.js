/**
 * Lunar Ground, Starfield, and Space Environment Renderer
 * Pure ES Module
 */

import { ARENA_W, ARENA_H } from '../core/Constants.js';

export class TerrainRenderer {
  constructor(arenaW = ARENA_W, arenaH = ARENA_H) {
    this.arenaW = arenaW;
    this.arenaH = arenaH;
    this.stars = [];
    this.initStarfield();
  }

  initStarfield(count = 120) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.arenaW,
        y: Math.random() * (this.arenaH - 40),
        size: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  drawStarfield(ctx) {
    ctx.save();
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPortals(ctx) {
    ctx.save();
    const wrapTime = Date.now() * 0.003;
    const pulseAlpha = 0.28 + Math.sin(wrapTime) * 0.12;

    // Top ceiling boundary barrier
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(this.arenaW, 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Left Portal Slipstream (x = 0)
    const leftPortalGrad = ctx.createLinearGradient(0, 0, 22, 0);
    leftPortalGrad.addColorStop(0, `rgba(56, 189, 248, ${pulseAlpha * 0.7})`);
    leftPortalGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = leftPortalGrad;
    ctx.fillRect(0, 0, 22, this.arenaH - 35);

    ctx.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha * 1.5})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -wrapTime * 15;
    ctx.beginPath();
    ctx.moveTo(1, 15);
    ctx.lineTo(1, this.arenaH - 35);
    ctx.stroke();

    // Right Portal Slipstream (x = arenaW)
    const rightPortalGrad = ctx.createLinearGradient(this.arenaW, 0, this.arenaW - 22, 0);
    rightPortalGrad.addColorStop(0, `rgba(56, 189, 248, ${pulseAlpha * 0.7})`);
    rightPortalGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = rightPortalGrad;
    ctx.fillRect(this.arenaW - 22, 0, 22, this.arenaH - 35);

    ctx.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha * 1.5})`;
    ctx.beginPath();
    ctx.moveTo(this.arenaW - 1, 15);
    ctx.lineTo(this.arenaW - 1, this.arenaH - 35);
    ctx.stroke();
    ctx.setLineDash([]);

    // Edge Warp Chevron Indicators
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = `rgba(0, 242, 254, ${pulseAlpha * 1.3})`;
    for (let wy = 120; wy < this.arenaH - 80; wy += 140) {
      ctx.textAlign = 'left';
      ctx.fillText('◀ WRAP', 5, wy);
      ctx.textAlign = 'right';
      ctx.fillText('WRAP ▶', this.arenaW - 5, wy);
    }
    ctx.restore();
  }

  drawGuidanceBeam(ctx, rocket, landingPad) {
    if (!rocket || rocket.crashed || rocket.landed || !landingPad) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    const padCenterX = landingPad.x + landingPad.width / 2;
    let dx = padCenterX - rocket.x;
    if (Math.abs(dx) > this.arenaW / 2) {
      // Wrap path is shorter: draw two continuous segments through screen edges
      if (dx > 0) {
        const totalDist = rocket.x + (this.arenaW - padCenterX);
        const t = rocket.x / (totalDist || 1);
        const edgeY = rocket.y + (landingPad.y - rocket.y) * t;
        ctx.moveTo(rocket.x, rocket.y);
        ctx.lineTo(0, edgeY);
        ctx.moveTo(this.arenaW, edgeY);
        ctx.lineTo(padCenterX, landingPad.y);
      } else {
        const totalDist = (this.arenaW - rocket.x) + padCenterX;
        const t = (this.arenaW - rocket.x) / (totalDist || 1);
        const edgeY = rocket.y + (landingPad.y - rocket.y) * t;
        ctx.moveTo(rocket.x, rocket.y);
        ctx.lineTo(this.arenaW, edgeY);
        ctx.moveTo(0, edgeY);
        ctx.lineTo(padCenterX, landingPad.y);
      }
    } else {
      ctx.moveTo(rocket.x, rocket.y);
      ctx.lineTo(padCenterX, landingPad.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawGround(ctx, lunarStationSystem = null) {
    ctx.save();
    const groundY = this.arenaH - 35;
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, this.arenaH);
    groundGrad.addColorStop(0, '#1e293b');
    groundGrad.addColorStop(1, '#070b14');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, this.arenaW, 35);

    // Draw Modular Space Stations & Colony Bases for each bot underneath/along the horizon line
    if (lunarStationSystem) {
      lunarStationSystem.update();
      lunarStationSystem.draw(ctx, groundY);
    }

    // Neon surface horizon border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(this.arenaW, groundY);
    ctx.stroke();

    // Surface radar grid hashes
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < this.arenaW; gx += 45) {
      ctx.beginPath();
      ctx.moveTo(gx, groundY);
      ctx.lineTo(gx, this.arenaH);
      ctx.stroke();
    }

    // Altitude Ladder on Right Viewport Edge
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.textAlign = 'right';
    for (let altMark = 100; altMark <= 600; altMark += 100) {
      const my = (this.arenaH - 35) - altMark;
      if (my > 50) {
        ctx.fillText(`-${altMark}m`, this.arenaW - 12, my + 3);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath();
        ctx.moveTo(this.arenaW - 8, my);
        ctx.lineTo(this.arenaW - 3, my);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
