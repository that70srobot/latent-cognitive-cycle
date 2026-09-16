/**
 * Dynamic Challenge & Complexity Engine
 * Pure ES Module
 */

import { ARENA_W } from '../core/Constants.js';

export class ChallengeEngine {
  constructor(observerSpeak = null) {
    this.mode = 'extreme'; // 'standard', 'wind', 'gravity', 'kinetic', 'extreme'
    this.windEnabled = true;
    this.kineticPadEnabled = true;
    this.cci = 85;
    this.driveState = 'ANOMALY HUNTER';
    this.observerSpeak = observerSpeak || (() => {});
  }

  setMode(mode, windField = null, landingPad = null) {
    this.mode = mode;
    if (mode === 'standard') {
      this.windEnabled = false;
      this.kineticPadEnabled = false;
    } else if (mode === 'wind') {
      this.windEnabled = true;
      this.kineticPadEnabled = false;
    } else if (mode === 'gravity') {
      this.windEnabled = false;
      this.kineticPadEnabled = false;
    } else if (mode === 'kinetic') {
      this.windEnabled = true;
      this.kineticPadEnabled = true;
    } else if (mode === 'extreme') {
      this.windEnabled = true;
      this.kineticPadEnabled = true;
    }
    if (windField) windField.enabled = this.windEnabled;
    if (landingPad) landingPad.isKinetic = this.kineticPadEnabled;
    this.updateButtons();
    this.observerSpeak(`⚡ Challenge Vector set to [${mode.toUpperCase()}]. Intrinsic Drive: ${this.driveState}`, 'warn');
  }

  updateButtons() {
    const btnToggleWind = document.getElementById('btnToggleWind');
    const btnToggleKinetic = document.getElementById('btnToggleKinetic');
    if (btnToggleWind) {
      btnToggleWind.innerText = this.windEnabled ? 'WIND ON' : 'WIND OFF';
      btnToggleWind.className = this.windEnabled ? 'small-btn-accent active' : 'small-btn-accent';
    }
    if (btnToggleKinetic) {
      btnToggleKinetic.innerText = this.kineticPadEnabled ? 'KINETIC ON' : 'KINETIC OFF';
      btnToggleKinetic.className = this.kineticPadEnabled ? 'small-btn-accent active' : 'small-btn-accent';
    }
  }

  evaluateCCI(r, pad, asts = [], anomalies = [], wind = null, quantumCores = []) {
    let score = 25; // baseline

    // 1. Wind shear resistance strain
    if (this.windEnabled && wind) {
      const w = Math.abs(wind.getWindAt(r.y));
      score += Math.min(25, w * 30);
    }

    // 2. Gravity vortex warp tension
    if (anomalies && anomalies.length > 0) {
      let minAnomDist = Infinity;
      for (const a of anomalies) {
        let dx = Math.abs(a.x - r.x);
        if (dx > ARENA_W / 2) dx = ARENA_W - dx;
        const d = Math.hypot(dx, a.y - r.y);
        if (d < minAnomDist) minAnomDist = d;
      }
      if (minAnomDist < 250) {
        score += Math.min(25, (250 - minAnomDist) * 0.12);
      }
    }

    // 3. Asteroid hazard proximity margin
    let minAstDist = Infinity;
    if (asts && asts.length > 0) {
      for (const a of asts) {
        let dx = Math.abs(a.x - r.x);
        if (dx > ARENA_W / 2) dx = ARENA_W - dx;
        const d = Math.hypot(dx, a.y - r.y);
        if (d < minAstDist) minAstDist = d;
      }
      if (minAstDist < 140) {
        score += Math.min(25, (140 - minAstDist) * 0.22);
      }
    }

    // 4. Moving pad kinetic intercept
    if (this.kineticPadEnabled) {
      score += 15;
    }

    this.cci = Math.max(10, Math.min(100, Math.round(score)));

    // Determine Intrinsic Drive state
    if (quantumCores && quantumCores.length > 0 && !quantumCores.every(c => c.collected)) {
      this.driveState = 'ANOMALY HUNTER';
    } else if (minAstDist < 100) {
      this.driveState = 'DARING SLALOM';
    } else if (this.windEnabled && wind && Math.abs(wind.getWindAt(r.y)) > 0.5) {
      this.driveState = 'WIND MASTER';
    } else {
      this.driveState = 'PRECISION GLIDE';
    }

    return this.cci;
  }
}
