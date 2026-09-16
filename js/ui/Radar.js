/**
 * Tactical Mini-Map Radar HUD Scanner
 * Translucent bottom-right HUD with 360° rotating sweep, ship-centered relative scope, and screen-wrap awareness.
 * Pure ES Module
 */

import { ARENA_W } from '../core/Constants.js';

export class TacticalRadar {
  constructor(arenaW = ARENA_W) {
    this.arenaW = arenaW;
  }

  draw(ctx, screenW, screenH, rocket, landingPad, asteroids = [], fuelOrbs = [], gravityAnomalies = [], quantumCores = []) {
    if (screenW < 220 || screenH < 220 || !rocket) return;
    const radarR = 56;
    const padMargin = 14;
    const cx = screenW - radarR - padMargin;
    const cy = screenH - radarR - padMargin - 10;

    ctx.save();

    // 1. Translucent Radar Glass CRT Background & Bezel
    ctx.beginPath();
    ctx.arc(cx, cy, radarR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(4, 11, 24, 0.32)';
    ctx.fill();

    // Outer bezel ring with subtle cyan glow
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Concentric Range Rings (250m, 500m, 750m)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(frac => {
      ctx.beginPath();
      ctx.arc(cx, cy, radarR * frac, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Reticle crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.beginPath();
    ctx.moveTo(cx - radarR, cy);
    ctx.lineTo(cx + radarR, cy);
    ctx.moveTo(cx, cy - radarR);
    ctx.lineTo(cx, cy + radarR);
    ctx.stroke();

    // Cardinal compass ticks
    ctx.font = '7.5px monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - radarR + 8);
    ctx.fillText('S', cx, cy + radarR - 3);
    ctx.fillText('W', cx - radarR + 6, cy + 3);
    ctx.fillText('E', cx + radarR - 6, cy + 3);

    // 3. 360° Rotating Translucent Phosphor Sweep Beam
    const sweepAngle = (Date.now() * 0.0025) % (Math.PI * 2);
    const sweepArc = 0.55;
    const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, radarR);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.20)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0.01)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radarR - 1, sweepAngle - sweepArc, sweepAngle, false);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Leading beam needle
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * radarR, cy + Math.sin(sweepAngle) * radarR);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // 4. Mapped Radar Targets (Ship-Centered Tactical Scope)
    const radarRangeWorld = 750;
    const scale = (radarR - 6) / radarRangeWorld;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radarR - 2, 0, Math.PI * 2);
    ctx.clip();

    // (A) Landing Pad Target
    if (landingPad) {
      const padCenterX = landingPad.x + landingPad.width / 2;
      const padCenterY = landingPad.y;
      let dx = padCenterX - rocket.x;
      if (dx > this.arenaW / 2) dx -= this.arenaW;
      else if (dx < -this.arenaW / 2) dx += this.arenaW;
      const dy = padCenterY - rocket.y;
      const dist = Math.hypot(dx, dy);

      let blipX = cx + dx * scale;
      let blipY = cy + dy * scale;

      const isOut = dist > radarRangeWorld;
      if (isOut) {
        const angle = Math.atan2(dy, dx);
        blipX = cx + Math.cos(angle) * (radarR - 7);
        blipY = cy + Math.sin(angle) * (radarR - 7);
      }

      ctx.fillStyle = 'rgba(74, 222, 128, 0.85)';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 5;
      ctx.fillRect(blipX - 3.5, blipY - 1.5, 7, 3);

      const padPulse = (Date.now() * 0.005) % 1;
      ctx.strokeStyle = `rgba(74, 222, 128, ${0.7 * (1 - padPulse)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(blipX, blipY, 3 + padPulse * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // (B) Asteroids (Crimson Hazards)
    if (asteroids && asteroids.length > 0) {
      asteroids.forEach(ast => {
        let dx = ast.x - rocket.x;
        if (dx > this.arenaW / 2) dx -= this.arenaW;
        else if (dx < -this.arenaW / 2) dx += this.arenaW;
        const dy = ast.y - rocket.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= radarRangeWorld) {
          const bx = cx + dx * scale;
          const by = cy + dy * scale;
          ctx.fillStyle = 'rgba(248, 113, 113, 0.85)';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }

    // (C) Fuel Pods (Amber Canisters)
    if (fuelOrbs && fuelOrbs.length > 0) {
      fuelOrbs.forEach(orb => {
        let dx = orb.x - rocket.x;
        if (dx > this.arenaW / 2) dx -= this.arenaW;
        else if (dx < -this.arenaW / 2) dx += this.arenaW;
        const dy = orb.y - rocket.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= radarRangeWorld) {
          const bx = cx + dx * scale;
          const by = cy + dy * scale;
          ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }

    // (D) Gravity Anomalies (Violet Vortexes)
    if (gravityAnomalies && gravityAnomalies.length > 0) {
      gravityAnomalies.forEach(anom => {
        let dx = anom.x - rocket.x;
        if (dx > this.arenaW / 2) dx -= this.arenaW;
        else if (dx < -this.arenaW / 2) dx += this.arenaW;
        const dy = anom.y - rocket.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= radarRangeWorld) {
          const bx = cx + dx * scale;
          const by = cy + dy * scale;
          ctx.fillStyle = 'rgba(192, 132, 252, 0.9)';
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(232, 121, 249, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });
    }

    // (E) Quantum Cores (Pink Diamonds)
    if (quantumCores && quantumCores.length > 0) {
      quantumCores.forEach(core => {
        if (!core.collected) {
          let dx = core.x - rocket.x;
          if (dx > this.arenaW / 2) dx -= this.arenaW;
          else if (dx < -this.arenaW / 2) dx += this.arenaW;
          const dy = core.y - rocket.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= radarRangeWorld) {
            const bx = cx + dx * scale;
            const by = cy + dy * scale;
            ctx.fillStyle = 'rgba(244, 114, 182, 0.95)';
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(bx, by - 3);
            ctx.lineTo(bx + 3, by);
            ctx.lineTo(bx, by + 3);
            ctx.lineTo(bx - 3, by);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });
    }

    // (F) Ship Centered Origin Indicator (Cyan Beacon & Heading Needle)
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Directional heading needle
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(rocket.angle) * 7, cy + Math.sin(rocket.angle) * 7);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore(); // Clip pop

    // 5. Radar Header & Distance Readout Callouts
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('RADAR 360°', cx, cy - radarR - 3);

    if (landingPad) {
      const padCenterX = landingPad.x + landingPad.width / 2;
      let dx = padCenterX - rocket.x;
      if (dx > this.arenaW / 2) dx -= this.arenaW;
      else if (dx < -this.arenaW / 2) dx += this.arenaW;
      const dy = landingPad.y - rocket.y;
      const dist = Math.hypot(dx, dy);
      const angleToPad = Math.atan2(dy, dx) * (180 / Math.PI);
      const bearingStr = Math.round((angleToPad + 90 + 360) % 360);

      ctx.font = '7px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`PAD: ${Math.round(dist)}m | BRG: ${bearingStr}°`, cx, cy + radarR + 9);
    }

    ctx.restore();
  }
}
