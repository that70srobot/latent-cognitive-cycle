/**
 * Spacecraft Physics & Rendering Engine
 * Pure ES Module
 */

import { ARENA_W, ARENA_H } from '../core/Constants.js';
import { ExhaustParticle } from './Particles.js';

export class Rocket {
  constructor(arenaW = ARENA_W, arenaH = ARENA_H) {
    this.arenaW = arenaW;
    this.arenaH = arenaH;
    this.reset();
  }

  reset(x = this.arenaW * 0.25, y = this.arenaH * 0.20) {
    this.x = x;
    this.y = y;
    this.vx = 0.5;
    this.vy = 0;
    this.angle = -Math.PI / 2; // pointing upward
    this.rotationSpeed = 0.055;
    this.thrustPower = 0.13;
    this.maxFuel = 250;
    this.fuel = this.maxFuel;
    this.shield = 100;
    this.crashed = false;
    this.landed = false;
    this.radius = 16;
    // Two side stabilizing thrusters (port & starboard RCS pods)
    this.leftStabilizer = false;
    this.rightStabilizer = false;
    this.autoStabilize = true;
  }

  update(gravity = 0.038, keys = {}, sound = null, particles = [], windField = null, gravityAnomalies = []) {
    if (this.crashed || this.landed) return;

    this.leftStabilizer = false;
    this.rightStabilizer = false;

    // Steering / Attitude control via side stabilizing thrusters (expelling DOWNWARD)
    if (keys.left) {
      this.angle -= this.rotationSpeed;
      this.rightStabilizer = true; // Starboard thruster expels DOWNWARD -> rolls craft left
      this.vy -= 0.028; // Downward exhaust creates upward cushioning lift
      this.vx -= 0.012;
      if (sound && Math.random() < 0.25) sound.pulseRCS();
    }
    if (keys.right) {
      this.angle += this.rotationSpeed;
      this.leftStabilizer = true; // Port thruster expels DOWNWARD -> rolls craft right
      this.vy -= 0.028; // Downward exhaust creates upward cushioning lift
      this.vx += 0.012;
      if (sound && Math.random() < 0.25) sound.pulseRCS();
    }

    // Active Gyro Autostabilization (Side thrusters fire DOWNWARD to right the craft and cushion descent)
    if (!keys.left && !keys.right && this.autoStabilize) {
      let angleDiff = this.angle - (-Math.PI / 2);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (angleDiff < -0.06) {
        // Tilted left -> Port thruster expels DOWNWARD to lift port side
        this.angle += Math.min(0.022, -angleDiff * 0.18);
        this.vy -= 0.018; // Upward cushioning
        this.leftStabilizer = true;
        if (sound && Math.random() < 0.15) sound.pulseRCS();
      } else if (angleDiff > 0.06) {
        // Tilted right -> Starboard thruster expels DOWNWARD to lift starboard side
        this.angle -= Math.min(0.022, angleDiff * 0.18);
        this.vy -= 0.018; // Upward cushioning
        this.rightStabilizer = true;
        if (sound && Math.random() < 0.15) sound.pulseRCS();
      }
    }

    // Side stabilizing thruster particle emissions (expelling DOWNWARD behind the craft)
    const exhaustAngle = this.angle + Math.PI;
    const aftOffset = 15;
    const lateralOffset = 13;
    if (this.leftStabilizer && particles) {
      const portX = this.x + Math.cos(this.angle - Math.PI / 2) * lateralOffset - Math.cos(this.angle) * aftOffset;
      const portY = this.y + Math.sin(this.angle - Math.PI / 2) * lateralOffset - Math.sin(this.angle) * aftOffset;
      particles.push(new ExhaustParticle(
        portX,
        portY,
        Math.cos(exhaustAngle) * (Math.random() * 3.5 + 2) + (Math.random() - 0.5) * 0.8,
        Math.sin(exhaustAngle) * (Math.random() * 3.5 + 2) + (Math.random() - 0.5) * 0.8,
        '#00f2fe',
        this.arenaW
      ));
    }
    if (this.rightStabilizer && particles) {
      const stbdX = this.x + Math.cos(this.angle + Math.PI / 2) * lateralOffset - Math.cos(this.angle) * aftOffset;
      const stbdY = this.y + Math.sin(this.angle + Math.PI / 2) * lateralOffset - Math.sin(this.angle) * aftOffset;
      particles.push(new ExhaustParticle(
        stbdX,
        stbdY,
        Math.cos(exhaustAngle) * (Math.random() * 3.5 + 2) + (Math.random() - 0.5) * 0.8,
        Math.sin(exhaustAngle) * (Math.random() * 3.5 + 2) + (Math.random() - 0.5) * 0.8,
        '#00f2fe',
        this.arenaW
      ));
    }

    // Main Engine Thrust
    if (keys.thrust && this.fuel > 0) {
      this.vx += Math.cos(this.angle) * this.thrustPower;
      this.vy += Math.sin(this.angle) * this.thrustPower;
      this.fuel = Math.max(0, this.fuel - 0.09);
      if (this.fuel <= 0 && sound) sound.stopThrust();

      // Spawn fiery exhaust particles
      if (particles) {
        for (let i = 0; i < 3; i++) {
          particles.push(new ExhaustParticle(
            this.x - Math.cos(this.angle) * 16,
            this.y - Math.sin(this.angle) * 16,
            -Math.cos(this.angle) * (Math.random() * 4 + 2) + (Math.random() - 0.5),
            -Math.sin(this.angle) * (Math.random() * 4 + 2) + (Math.random() - 0.5),
            null,
            this.arenaW
          ));
        }
      }
    }

    // Natural Space Gravity & Environmental Forces
    this.vy += gravity;

    // 1. Solar Wind Shear Force
    if (windField && windField.enabled) {
      const wind = windField.getWindAt(this.y);
      this.vx += wind * 0.016;
    }

    // 2. Quantum Gravitational Anomaly Attraction
    if (gravityAnomalies && gravityAnomalies.length > 0) {
      for (const anom of gravityAnomalies) {
        anom.applyForce(this);
      }
    }

    this.vx *= 0.998; // slight drag
    this.vy *= 0.998;

    this.x += this.vx;
    this.y += this.vy;

    // Seamless horizontal screen wrap across viewport
    if (this.x < 0) {
      this.x += this.arenaW;
    } else if (this.x >= this.arenaW) {
      this.x -= this.arenaW;
    }

    // Top ceiling buffer
    if (this.y < 15) { this.y = 15; this.vy = Math.max(0, this.vy); }
  }

  draw(ctx, keys = {}, modelName = 'command-r:35b', landingPad = null) {
    this.renderRocket(ctx, this.x, this.y, keys, modelName, landingPad);

    // Seamless horizontal screen wrap ghost rendering
    if (this.x < 65) {
      this.renderRocket(ctx, this.x + this.arenaW, this.y, keys, modelName, landingPad);
    } else if (this.x > this.arenaW - 65) {
      this.renderRocket(ctx, this.x - this.arenaW, this.y, keys, modelName, landingPad);
    }
  }

  renderRocket(ctx, px, py, keys = {}, modelName = 'command-r:35b', landingPad = null) {
    // 1. Draw Tactical AR Target Reticle around the rocket (in screen space)
    ctx.save();
    const boxSize = 28;
    ctx.strokeStyle = this.shield < 30 ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 1.6;

    // Pulsing radar target beacon circle
    const beaconPulse = 8 + Math.sin(Date.now() * 0.006) * 4;
    ctx.beginPath();
    ctx.arc(px, py, boxSize + beaconPulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Reticle corner brackets
    ctx.beginPath();
    // Top-left
    ctx.moveTo(px - boxSize, py - boxSize + 7);
    ctx.lineTo(px - boxSize, py - boxSize);
    ctx.lineTo(px - boxSize + 7, py - boxSize);
    // Top-right
    ctx.moveTo(px + boxSize - 7, py - boxSize);
    ctx.lineTo(px + boxSize, py - boxSize);
    ctx.lineTo(px + boxSize, py - boxSize + 7);
    // Bottom-left
    ctx.moveTo(px - boxSize, py + boxSize - 7);
    ctx.lineTo(px - boxSize, py + boxSize);
    ctx.lineTo(px - boxSize + 7, py + boxSize);
    // Bottom-right
    ctx.moveTo(px + boxSize - 7, py + boxSize);
    ctx.lineTo(px + boxSize, py + boxSize);
    ctx.lineTo(px + boxSize, py + boxSize - 7);
    ctx.strokeStyle = this.shield < 30 ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Velocity heading vector arrow
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.4;
    ctx.moveTo(px, py);
    ctx.lineTo(px + this.vx * 16, py + this.vy * 16);
    ctx.stroke();

    // AR Ship HUD Callout
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    const modelLabel = modelName ? modelName.split(':')[0].toUpperCase() : 'SHIP';
    ctx.fillText(`🚀 [${modelLabel}]`, px + boxSize + 5, py - 4);
    const alt = landingPad ? Math.max(0, Math.round(landingPad.y - py)) : 0;
    const spd = Math.hypot(this.vx, this.vy).toFixed(1);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`ALT: ${alt}m | ${spd} m/s`, px + boxSize + 5, py + 8);

    // Stabilizing Thrusters Live Indicator
    const stabTag = (this.leftStabilizer ? '◀' : '·') + ' STAB ' + (this.rightStabilizer ? '▶' : '·');
    ctx.fillStyle = (this.leftStabilizer || this.rightStabilizer) ? '#00f2fe' : '#64748b';
    ctx.fillText(stabTag, px + boxSize + 5, py + 20);
    ctx.restore();

    // 2. Draw Rocket Hull (Oriented in Local Rotational Space)
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.angle + Math.PI / 2);

    // Attached Engine Exhaust Plume (visible whenever thrusting)
    if (keys.thrust && this.fuel > 0) {
      ctx.save();
      const flameLen = 22 + Math.random() * 14;
      // Outer fire jet
      ctx.beginPath();
      ctx.moveTo(-5, 18);
      ctx.quadraticCurveTo(0, 18 + flameLen * 1.3, 0, 18 + flameLen);
      ctx.quadraticCurveTo(0, 18 + flameLen * 1.3, 5, 18);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.fill();

      // Inner plasma spear
      ctx.beginPath();
      ctx.moveTo(-3, 18);
      ctx.lineTo(0, 18 + flameLen * 0.6);
      ctx.lineTo(3, 18);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    // Two Side Stabilizing Thruster Pods (Port & Starboard Outriggers, Firing DOWNWARD)
    // Port (Left) Stabilizer Outrigger Pylon, Pod & Downward Nozzle
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-14, 4, 5, 8); // Outrigger pylon
    ctx.fillStyle = '#334155';
    ctx.fillRect(-15.5, 8, 6, 8); // Thruster pod casing
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-14.5, 16);
    ctx.lineTo(-16.5, 19);
    ctx.lineTo(-9.5, 19);
    ctx.lineTo(-11.5, 16);
    ctx.closePath();
    ctx.fill();

    // Starboard (Right) Stabilizer Outrigger Pylon, Pod & Downward Nozzle
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(9, 4, 5, 8); // Outrigger pylon
    ctx.fillStyle = '#334155';
    ctx.fillRect(9.5, 8, 6, 8); // Thruster pod casing
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(11.5, 16);
    ctx.lineTo(9.5, 19);
    ctx.lineTo(16.5, 19);
    ctx.lineTo(14.5, 16);
    ctx.closePath();
    ctx.fill();

    // Port (Left) Stabilizer Active Plasma Jet (Expelling DOWNWARD along +y)
    if (this.leftStabilizer) {
      ctx.save();
      const rcsLen = 14 + Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(-16, 19);
      ctx.lineTo(-13, 19 + rcsLen);
      ctx.lineTo(-10, 19);
      ctx.closePath();
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fill();
      // Core needle
      ctx.beginPath();
      ctx.moveTo(-15, 19);
      ctx.lineTo(-13, 19 + rcsLen * 0.55);
      ctx.lineTo(-11, 19);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    // Starboard (Right) Stabilizer Active Plasma Jet (Expelling DOWNWARD along +y)
    if (this.rightStabilizer) {
      ctx.save();
      const rcsLen = 14 + Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(10, 19);
      ctx.lineTo(13, 19 + rcsLen);
      ctx.lineTo(16, 19);
      ctx.closePath();
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fill();
      // Core needle
      ctx.beginPath();
      ctx.moveTo(11, 19);
      ctx.lineTo(13, 19 + rcsLen * 0.55);
      ctx.lineTo(15, 19);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    // Rocket Body Gradient (Sleek titanium hull)
    const hullGrad = ctx.createLinearGradient(0, -22, 0, 16);
    hullGrad.addColorStop(0, '#ffffff');
    hullGrad.addColorStop(0.3, '#38bdf8');
    hullGrad.addColorStop(1, '#0f172a');

    ctx.beginPath();
    ctx.moveTo(0, -22);     // Sharp aerodynamic nose
    ctx.lineTo(9, 6);
    ctx.lineTo(16, 16);     // Starboard fin
    ctx.lineTo(7, 16);
    ctx.lineTo(5, 18);      // Engine bell
    ctx.lineTo(-5, 18);
    ctx.lineTo(-7, 16);
    ctx.lineTo(-16, 16);    // Port fin
    ctx.lineTo(-9, 6);
    ctx.closePath();

    ctx.fillStyle = hullGrad;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = this.shield < 30 ? '#ef4444' : '#38bdf8';
    ctx.stroke();

    // High-contrast Center Fuselage Core
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(5, 4);
    ctx.lineTo(4, 15);
    ctx.lineTo(-4, 15);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fillStyle = '#0284c7';
    ctx.fill();

    // Cockpit Window / Sensor Visor
    ctx.beginPath();
    ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Deployable Landing Shock-Absorber Struts
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    // Port landing leg
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(-11, 21);
    ctx.lineTo(-14, 21); // Footpad
    ctx.stroke();
    // Starboard landing leg
    ctx.beginPath();
    ctx.moveTo(6, 14);
    ctx.lineTo(11, 21);
    ctx.lineTo(14, 21); // Footpad
    ctx.stroke();

    // Flashing Navigation Strobe Lights on Wingtips
    const strobeT = Date.now() * 0.008;
    const strobeOn = Math.sin(strobeT) > 0;
    // Port wingtip: RED
    ctx.fillStyle = strobeOn ? '#ef4444' : '#7f1d1d';
    ctx.fillRect(-17, 14, 3, 3);
    // Starboard wingtip: GREEN
    ctx.fillStyle = strobeOn ? '#22c55e' : '#14532d';
    ctx.fillRect(14, 14, 3, 3);

    ctx.restore();
  }
}
