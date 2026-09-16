/**
 * Flight Trajectory Recorder & Dataset Curator
 * Real-time continuous telemetry logging, expert demonstrations seeder, and JSONL exporter.
 * Pure ES Module
 */

import { ARENA_W, ARENA_H } from '../core/Constants.js';

export class FlightTrajectoryRecorder {
  constructor(getActiveModelCallback = null, onUpdate = null) {
    this.storageKey = 'cosmic_flight_dataset_v1';
    this.currentFlightBuffer = [];
    this.trajectories = [];
    this.getActiveModelCallback = getActiveModelCallback || (() => 'command-r:35b');
    this.onUpdate = onUpdate;
    this.load();
  }

  logFrame(r, pad, asts = [], actionObj = {}, cci = 50, drive = 'ACTIVE', windField = null) {
    if (!r || !pad) return;
    let rawDx = (pad.x + pad.width / 2) - r.x;
    if (rawDx > ARENA_W / 2) rawDx -= ARENA_W;
    else if (rawDx < -ARENA_W / 2) rawDx += ARENA_W;
    const dx = Math.round(rawDx);
    const dy = Math.round(pad.y - r.y);
    const vy = Number(r.vy.toFixed(2));
    const vx = Number(r.vx.toFixed(2));
    const windVal = (windField && windField.enabled) ? Number(windField.getWindAt(r.y).toFixed(2)) : 0;

    const normInput = [
      Math.max(0, Math.min(1, dy / ARENA_H)),
      Math.max(-1, Math.min(1, dx / (ARENA_W / 2))),
      Math.max(-2, Math.min(2, vy / 5.0)),
      Math.max(-2, Math.min(2, vx / 5.0)),
      Math.max(-2, Math.min(2, windVal / 2.0)),
      Math.max(0, Math.min(1, cci / 100.0))
    ];

    let actionIdx = 0;
    if (actionObj.left) actionIdx = 2;
    else if (actionObj.right) actionIdx = 3;
    else if (actionObj.thrust) actionIdx = 1;

    this.currentFlightBuffer.push({
      normInput,
      actionIdx,
      raw: { dy, dx, vy, vx, wind: windVal, cci, drive },
      action: { ...actionObj }
    });
    if (this.currentFlightBuffer.length > 800) this.currentFlightBuffer.shift();
  }

  finishFlight(outcome, metadata = {}) {
    if (this.currentFlightBuffer.length === 0) return;
    const trajectory = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      outcome,
      model: this.getActiveModelCallback(),
      score: metadata.score || 0,
      fuelRemaining: metadata.fuel || 0,
      frames: [...this.currentFlightBuffer]
    };
    this.trajectories.push(trajectory);
    if (this.trajectories.length > 60) this.trajectories.shift();
    this.currentFlightBuffer = [];
    this.save();
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.trajectories.slice(-50)));
    } catch (e) {}
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) this.trajectories = JSON.parse(raw);
    } catch (e) {
      this.trajectories = [];
    }
  }

  clear() {
    this.trajectories = [];
    this.currentFlightBuffer = [];
    try { localStorage.removeItem(this.storageKey); } catch (e) {}
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  generateSeedDemonstrations(count = 200) {
    for (let i = 0; i < count; i++) {
      const dy = Math.round(Math.random() * (ARENA_H - 140) + 70);
      const dx = Math.round((Math.random() - 0.5) * (ARENA_W * 0.75));
      const vy = Number(((Math.random() * 3.4) - 0.4).toFixed(2));
      const vx = Number(((Math.random() - 0.5) * 3.8).toFixed(2));
      const wind = Number(((Math.random() - 0.5) * 2.2).toFixed(2));
      const cci = Math.round(Math.random() * 50 + 40);

      let thrust = false;
      let turn = 'none';
      let reason = 'Attitude hold & glide';

      if (dy > 85) {
        if (vy > 1.7) { thrust = true; reason = 'Deceleration burn'; }
        if (dx < -25 || (dx < 0 && vx < -0.7)) {
          turn = 'right';
          reason = thrust ? 'Thrusting rightward to intercept pad' : 'Banking right toward landing pad';
        } else if (dx > 25 || (dx > 0 && vx > 0.7)) {
          turn = 'left';
          reason = thrust ? 'Thrusting leftward to intercept pad' : 'Banking left toward landing pad';
        }
      } else {
        if (vy > 0.75) { thrust = true; reason = 'Terminal braking burn for soft landing'; }
        if (dx < -8) turn = 'right';
        else if (dx > 8) turn = 'left';
      }

      let actionIdx = 0;
      if (turn === 'left') actionIdx = 2;
      else if (turn === 'right') actionIdx = 3;
      else if (thrust) actionIdx = 1;

      const normInput = [
        Math.max(0, Math.min(1, dy / ARENA_H)),
        Math.max(-1, Math.min(1, dx / (ARENA_W / 2))),
        Math.max(-2, Math.min(2, vy / 5.0)),
        Math.max(-2, Math.min(2, vx / 5.0)),
        Math.max(-2, Math.min(2, wind / 2.0)),
        Math.max(0, Math.min(1, cci / 100.0))
      ];

      const frames = [{
        normInput,
        actionIdx,
        raw: { dy, dx, vy, vx, wind, cci, drive: 'PRECISION GLIDE' },
        action: { thrust, left: turn === 'left', right: turn === 'right', tag: thrust ? `T+${turn[0].toUpperCase()}` : turn.toUpperCase(), reason }
      }];

      this.trajectories.push({
        id: Date.now() + i,
        timestamp: new Date().toISOString(),
        outcome: 'TOUCHDOWN',
        model: 'expert-pid-seed',
        score: 1850,
        fuelRemaining: 680,
        frames
      });
    }
    if (this.trajectories.length > 80) this.trajectories = this.trajectories.slice(-80);
    this.save();
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  getAllFrames(onlyTouchdowns = true) {
    const frames = [];
    for (const t of this.trajectories) {
      if (onlyTouchdowns && t.outcome !== 'TOUCHDOWN') continue;
      if (t.frames && Array.isArray(t.frames)) {
        frames.push(...t.frames);
      }
    }
    return frames;
  }

  exportJSONL(onlyTouchdowns = true) {
    const frames = this.getAllFrames(onlyTouchdowns);
    if (frames.length === 0) return '';
    const lines = [];
    for (const f of frames) {
      const sysPrompt = "You are an elite autonomous lunar lander flight computer. Analyze real-time telemetry and output optimal flight thruster actions in strict JSON format: {\"thrust\":boolean,\"turn\":\"left\"|\"right\"|\"none\",\"reason\":\"string\"}";
      const userPrompt = `Lander state: dy=${f.raw.dy}px, dx=${f.raw.dx}px, vy=${f.raw.vy}m/s, vx=${f.raw.vx}m/s, wind=${f.raw.wind}m/s, CCI=${f.raw.cci}%, Drive="${f.raw.drive}". Output flight command JSON.`;
      const assistantResponse = JSON.stringify({
        thrust: Boolean(f.action.thrust),
        turn: f.action.left ? 'left' : (f.action.right ? 'right' : 'none'),
        reason: f.action.reason || 'Telemetry-guided altitude and lateral correction'
      });
      lines.push(JSON.stringify({
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: assistantResponse }
        ]
      }));
    }
    return lines.join('\n');
  }
}
