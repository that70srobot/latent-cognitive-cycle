/**
 * Tier-2 Hierarchical Flight Regime Arbiter
 * Dynamically modulates council voting weights based on altitude, velocity, and hazard proximity.
 * Pure ES Module
 */

import { ARENA_W } from '../core/Constants.js';

export class FlightRegimeArbiter {
  constructor(observerSpeak = null) {
    this.currentRegime = 'TRANSIT'; // 'TRANSIT', 'HAZARD', 'GLIDE', 'FLARE'
    this.prevRegime = null;
    this.weights = { rl: 1.4, llm: 1.1, pid: 0.7 };
    this.observerSpeak = observerSpeak || (() => {});
    this.regimeNames = {
      'TRANSIT': { label: 'ORBITAL TRANSIT', badgeClass: 'phase-transit', desc: 'Airspace clearance & fuel economy' },
      'HAZARD': { label: 'HAZARD EVASION', badgeClass: 'phase-hazard', desc: 'Emergency asteroid clearance' },
      'GLIDE': { label: 'GLIDE ALIGNMENT', badgeClass: 'phase-glide', desc: 'Pad centerline & descent rate lock' },
      'FLARE': { label: 'TERMINAL FLARE', badgeClass: 'phase-flare', desc: 'Touchdown cushion & speed floor' }
    };
  }

  evaluate(r, pad, asts = []) {
    const alt = Math.max(0, pad.y - r.y);

    let nearestAstDist = Infinity;
    if (asts && asts.length > 0) {
      for (const a of asts) {
        let dx = Math.abs(a.x - r.x);
        if (dx > ARENA_W / 2) dx = ARENA_W - dx;
        const d = Math.hypot(dx, a.y - r.y);
        if (d < nearestAstDist) nearestAstDist = d;
      }
    }

    let newRegime;

    // 1. Hazard Evasion (<115px)
    if (nearestAstDist < 115) {
      newRegime = 'HAZARD';
      this.weights = { rl: 0.8, llm: 1.3, pid: 1.5 };
    }
    // 2. Terminal Flare (<110px)
    else if (alt < 110) {
      newRegime = 'FLARE';
      this.weights = { rl: 0.8, llm: 0.5, pid: 1.8 };
    }
    // 3. Glide Slope Alignment (110px to 320px)
    else if (alt < 320) {
      newRegime = 'GLIDE';
      this.weights = { rl: 1.2, llm: 1.0, pid: 1.2 };
    }
    // 4. Orbital Transit (>320px)
    else {
      newRegime = 'TRANSIT';
      this.weights = { rl: 1.4, llm: 1.1, pid: 0.7 };
    }

    if (newRegime !== this.currentRegime) {
      this.prevRegime = this.currentRegime;
      this.currentRegime = newRegime;
      this.onRegimeChange(newRegime);
    }

    return {
      regime: this.currentRegime,
      info: this.regimeNames[this.currentRegime],
      weights: this.weights
    };
  }

  onRegimeChange(regime) {
    const info = this.regimeNames[regime];
    this.observerSpeak(`Regime Shift: [${info.label}] active. Tribunal weights: RL=${this.weights.rl}x, LLM=${this.weights.llm}x, PID=${this.weights.pid}x.`, 'info');
  }
}
