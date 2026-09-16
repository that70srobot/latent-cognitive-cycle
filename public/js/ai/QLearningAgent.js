/**
 * Reinforcement Learning (Q-Learning) Pilot Engine
 * Tabular Q-learning with Boltzmann exploration, macro-actions, and eligibility traces.
 * Pure ES Module
 */

import { ARENA_W, ARENA_H } from '../core/Constants.js';

export class QLearningAgent {
  constructor(observerSpeak = null) {
    this.actions = [
      { name: 'COAST', thrust: false, left: false, right: false },
      { name: 'THRUST', thrust: true, left: false, right: false },
      { name: 'LEFT', thrust: false, left: true, right: false },
      { name: 'RIGHT', thrust: false, left: false, right: true },
      { name: 'THRUST_LEFT', thrust: true, left: true, right: false },
      { name: 'THRUST_RIGHT', thrust: true, left: false, right: true }
    ];

    this.alpha = 0.18;       // Learning rate
    this.gamma = 0.96;       // Discount factor
    this.epsilon = 0.40;     // Initial exploration
    this.minEpsilon = 0.04;  // Exploitation floor
    this.decay = 0.990;      // Slower decay
    this.tau = 1.2;          // Boltzmann temperature

    this.qTable = {};
    this.episodes = 0;
    this.wins = 0;
    this.recentHistory = [];

    this.prevState = null;
    this.prevActionIdx = null;
    this.prevDistToPad = null;

    // Macro-action commitment
    this.MACRO_INTERVAL = 8;
    this.macroAction = null;
    this.macroFramesLeft = 0;
    this.macroRewardAccum = 0;

    // Eligibility traces (TD(λ))
    this.lambda = 0.7;
    this.trajectoryBuffer = [];

    this.observerSpeak = observerSpeak || (() => {});
    this.loadWeights();
  }

  discretize(r, pad, asts = []) {
    let dx = (pad.x + pad.width / 2) - r.x;
    if (dx > ARENA_W / 2) dx -= ARENA_W;
    else if (dx < -ARENA_W / 2) dx += ARENA_W;
    const dy = pad.y - r.y;

    let dxBin;
    if (dx < -120) dxBin = -2;
    else if (dx < -25) dxBin = -1;
    else if (dx <= 25) dxBin = 0;
    else if (dx <= 120) dxBin = 1;
    else dxBin = 2;

    let dyBin;
    if (dy > 300) dyBin = 3;
    else if (dy > 140) dyBin = 2;
    else if (dy > 45) dyBin = 1;
    else dyBin = 0;

    let vyBin;
    if (r.vy < -1.0) vyBin = 0;
    else if (r.vy < 0.8) vyBin = 1;
    else if (r.vy <= 2.2) vyBin = 2;
    else vyBin = 3;

    let vxBin = Math.abs(r.vx) < 0.6 ? 0 : (r.vx > 0 ? 1 : -1);

    let angleDiff = r.angle - (-Math.PI / 2);
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    let tiltBin = Math.abs(angleDiff) < 0.22 ? 0 : (angleDiff > 0 ? 1 : -1);

    let astThreat = 0;
    if (asts && asts.length > 0) {
      for (const a of asts) {
        let adx = Math.abs(a.x - r.x);
        if (adx > ARENA_W / 2) adx = ARENA_W - adx;
        if (Math.hypot(adx, a.y - r.y) < 95) {
          astThreat = 1;
          break;
        }
      }
    }

    return `${dxBin}:${dyBin}:${vyBin}:${vxBin}:${tiltBin}:${astThreat}`;
  }

  getQValues(state) {
    if (!this.qTable[state]) {
      this.qTable[state] = new Array(this.actions.length).fill(0.0);
    }
    return this.qTable[state];
  }

  selectAction(state) {
    const qVals = this.getQValues(state);

    if (Math.random() < this.epsilon * 0.3) {
      const idx = Math.floor(Math.random() * this.actions.length);
      return { action: this.actions[idx], index: idx, explored: true, qValue: qVals[idx] || 0 };
    }

    const maxQ = Math.max(...qVals);
    const expVals = qVals.map(q => Math.exp((q - maxQ) / Math.max(0.1, this.tau)));
    const sumExp = expVals.reduce((a, b) => a + b, 0);
    const probs = expVals.map(e => e / sumExp);

    let r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r <= cumulative) {
        return { action: this.actions[i], index: i, explored: (i !== qVals.indexOf(maxQ)), qValue: qVals[i] };
      }
    }

    const lastIdx = this.actions.length - 1;
    return { action: this.actions[lastIdx], index: lastIdx, explored: true, qValue: qVals[lastIdx] };
  }

  computeStepReward(r, pad, asts = [], prevDist = null, currentDist = 0, state = null, windField = null, gravityAnomalies = [], keys = {}, missionTimeRemaining = 50) {
    const padCenterX = pad.x + pad.width / 2;
    const dyToPad = pad.y - r.y;
    let dxToPad = padCenterX - r.x;
    if (dxToPad > ARENA_W / 2) dxToPad -= ARENA_W;
    else if (dxToPad < -ARENA_W / 2) dxToPad += ARENA_W;

    let reward = 0;

    const vyTarget = dyToPad > 300 ? 2.5 : (dyToPad > 140 ? 1.5 : (dyToPad > 45 ? 0.8 : 0.3));
    const vyError = r.vy - vyTarget;
    reward -= vyError * vyError * 0.12;

    let angleDiff = r.angle - (-Math.PI / 2);
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    reward -= Math.abs(angleDiff) * 0.35;

    reward -= (Math.abs(dxToPad) / ARENA_W) * 0.25;

    if (prevDist !== null) reward += (prevDist - currentDist) * 0.01;

    if (r.fuel <= 0) reward -= 2;

    if (dyToPad < 100 && Math.abs(dxToPad) < 40 && r.vy < 1.5 && r.vy > 0 && Math.abs(angleDiff) < 0.2) {
      reward += 1.5;
    }

    if (state) {
      if (!this.stateVisits) this.stateVisits = {};
      const visits = this.stateVisits[state] || 0;
      this.stateVisits[state] = visits + 1;
      const curiosityBonus = 0.35 / Math.sqrt(visits + 1);
      reward += curiosityBonus;
    }

    if (windField && windField.enabled) {
      const curWind = Math.abs(windField.getWindAt(r.y));
      if (curWind > 0.4 && Math.abs(angleDiff) < 0.22) {
        reward += 0.30;
      }
    }

    if (gravityAnomalies && gravityAnomalies.length > 0) {
      for (const anom of gravityAnomalies) {
        let adx = Math.abs(anom.x - r.x);
        if (adx > ARENA_W / 2) adx = ARENA_W - adx;
        const d = Math.hypot(adx, anom.y - r.y);
        if (d > 35 && d < 130 && r.vy > 0 && r.vy < 3.0) {
          reward += 0.45;
          break;
        }
      }
    }

    if (dyToPad < 130 && dyToPad > 30 && r.vy > 1.2 && r.vy < 2.4 && keys.thrust) {
      reward += 0.50;
    }

    if (missionTimeRemaining <= 0) {
      reward -= 0.65;
    } else if (missionTimeRemaining < 10.0) {
      reward -= 0.15;
    } else if (missionTimeRemaining < 20.0) {
      reward -= 0.05;
    }

    return reward;
  }

  stepUpdate(currentState, reward) {
    if (this.prevState !== null && this.prevActionIdx !== null) {
      this.trajectoryBuffer.push({
        state: this.prevState,
        actionIdx: this.prevActionIdx,
        reward: reward
      });

      const prevQ = this.getQValues(this.prevState);
      const currQ = this.getQValues(currentState);
      const maxNextQ = Math.max(...currQ);

      prevQ[this.prevActionIdx] += this.alpha * (reward + this.gamma * maxNextQ - prevQ[this.prevActionIdx]);
    }
  }

  recordEpisode(success) {
    this.episodes++;
    if (success) this.wins++;
    this.recentHistory.push(success ? 1 : 0);
    if (this.recentHistory.length > 25) this.recentHistory.shift();

    const terminalReward = success ? 100 : -80;

    if (this.prevState !== null && this.prevActionIdx !== null) {
      const prevQ = this.getQValues(this.prevState);
      prevQ[this.prevActionIdx] += this.alpha * (terminalReward - prevQ[this.prevActionIdx]);
    }

    let traceCredit = terminalReward;
    for (let i = this.trajectoryBuffer.length - 1; i >= 0; i--) {
      const entry = this.trajectoryBuffer[i];
      if (entry.state && entry.actionIdx !== null && entry.actionIdx !== undefined) {
        traceCredit *= this.gamma * this.lambda;
        const qVals = this.getQValues(entry.state);
        qVals[entry.actionIdx] += this.alpha * 0.15 * traceCredit;
      }
    }

    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.decay);
    this.tau = Math.max(0.3, this.tau * 0.998);

    this.prevState = null;
    this.prevActionIdx = null;
    this.prevDistToPad = null;
    this.macroAction = null;
    this.macroFramesLeft = 0;
    this.macroRewardAccum = 0;
    this.trajectoryBuffer = [];

    this.updateHUDStats();
    this.saveWeights();
  }

  updateHUDStats() {
    const aiEpisodeDisplay = document.getElementById('aiEpisodeDisplay');
    if (aiEpisodeDisplay) aiEpisodeDisplay.innerText = this.episodes;
    const rate = this.recentHistory.length > 0 
      ? Math.round((this.recentHistory.reduce((a, b) => a + b, 0) / this.recentHistory.length) * 100) 
      : 0;
    const successEl = document.getElementById('aiSuccessRateDisplay');
    if (successEl) successEl.innerText = `${rate}%`;
    const epsEl = document.getElementById('aiEpsilonDisplay');
    if (epsEl) epsEl.innerText = this.epsilon.toFixed(2);
    const statesEl = document.getElementById('aiStatesDisplay');
    if (statesEl) statesEl.innerText = Object.keys(this.qTable).length;
  }

  clearQTable() {
    this.qTable = {};
    this.episodes = 0;
    this.wins = 0;
    this.recentHistory = [];
    this.epsilon = 0.40;
    this.tau = 1.2;
    this.trajectoryBuffer = [];
    this.macroAction = null;
    this.macroFramesLeft = 0;
    this.macroRewardAccum = 0;
    this.saveWeights();
    this.updateHUDStats();
    this.observerSpeak("Q-DIM Cleared! Q-Table reset to 0 states. Exploration re-engaged.", "warn");
  }

  saveWeights() {
    try {
      const data = {
        qTable: this.qTable,
        episodes: this.episodes,
        wins: this.wins,
        epsilon: this.epsilon,
        tau: this.tau
      };
      localStorage.setItem('cosmic_lander_q_v3', JSON.stringify(data));
    } catch (e) {}
  }

  loadWeights() {
    try {
      const raw = localStorage.getItem('cosmic_lander_q_v3');
      if (raw) {
        const data = JSON.parse(raw);
        this.qTable = data.qTable || {};
        this.episodes = data.episodes || 0;
        this.wins = data.wins || 0;
        this.epsilon = data.epsilon !== undefined ? data.epsilon : 0.40;
        this.tau = data.tau !== undefined ? data.tau : 1.2;
      } else {
        localStorage.removeItem('cosmic_lander_q_v2');
        localStorage.removeItem('cosmic_lander_q_learning');
        this.qTable = {};
        this.episodes = 0;
        this.wins = 0;
        this.epsilon = 0.40;
        this.tau = 1.2;
        this.saveWeights();
      }
      setTimeout(() => this.updateHUDStats(), 100);
    } catch (e) {}
  }
}
