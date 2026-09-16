/**
 * Lunar Lander Main Game Engine
 * Pure ES Module orchestrating physics, rendering loop, AI Tribunal, and game state.
 */

import { ARENA_W, ARENA_H, OLLAMA_MODELS, PILOT_PRESETS } from './core/Constants.js';
import { SoundFX } from './core/SoundFX.js';
import { Rocket } from './entities/Rocket.js';
import { ExhaustParticle, ExplosionParticle, SparkleParticle } from './entities/Particles.js';
import { Asteroid, FuelOrb, LandingPad } from './entities/Obstacles.js';
import { WindField, GravityAnomaly, QuantumCore } from './environment/Environment.js';
import { TerrainRenderer } from './environment/Terrain.js';
import { ChallengeEngine } from './systems/ChallengeEngine.js';
import { LunarOutpostSystem, BOT_STATIONS_META, STATION_MODULE_CATALOG } from './systems/LunarOutpostSystem.js';
import { QLearningAgent } from './ai/QLearningAgent.js';
import { VectorDBEngine } from './ai/VectorDBEngine.js';
import { FlightTrajectoryRecorder } from './ai/FlightTrajectoryRecorder.js';
import { NeuralFlightPolicy } from './ai/NeuralFlightPolicy.js';
import { ModelForgeStudio } from './ai/ModelForgeStudio.js';
import { FlightRegimeArbiter } from './ai/FlightRegimeArbiter.js';
import { AutonomousSupervisor } from './ai/AutonomousSupervisor.js';
import { TacticalRadar } from './ui/Radar.js';
import { ScorecardManager } from './ui/Scorecard.js';
import { UIManager } from './ui/UIManager.js';

export class LunarLanderGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.canvasContainer = document.getElementById('canvasContainer');

    this.width = 800;
    this.height = 600;
    this.dpr = 1;
    this.userZoom = 0.85;

    // Keys state
    this.keys = { thrust: false, left: false, right: false };

    // Core Subsystems
    this.sound = new SoundFX();
    this.ui = new UIManager(this);
    this.terrain = new TerrainRenderer(ARENA_W, ARENA_H);
    this.radar = new TacticalRadar(ARENA_W);
    this.scorecard = new ScorecardManager({
      onProceed: (targetLvl) => this.initLevel(targetLvl),
      observerSpeak: (msg, type) => this.ui.observerSpeak(msg, type, this.aiAutopilotActive)
    });

    // Economy & Scoring
    this.aiTokens = 2000;
    this.bankedScore = 0;
    this.currentSectorScore = 0;
    this.score = 0;
    this.highScore = 0;
    this.loadEconomy();

    // Models & Roster
    this.models = [...OLLAMA_MODELS];
    this.currentModelIndex = 0;

    // AI Pilot & Vector DBs
    this.aiAutopilotActive = true;
    this.aiCycleCounter = 0;
    this.telemetryCounter = 0;
    this.flightCheckpoints = [];

    this.curatedVectorDB = new VectorDBEngine('CuratedMaster', 'cosmic_vector_db_curated_master', 300, () => this.updateVectorHUD());
    this.privateVectorDBs = {};
    for (const m of this.models) {
      const cleanKey = m.replace(/[:.]/g, '_');
      this.privateVectorDBs[m] = new VectorDBEngine(m, `cosmic_vector_db_${cleanKey}`, 150, () => this.updateVectorHUD());
    }
    this.privateVectorDBs['rl'] = new VectorDBEngine('rl', 'cosmic_vector_db_rl', 150, () => this.updateVectorHUD());

    // AI Agents
    this.rlAgent = new QLearningAgent((msg, type) => this.ui.observerSpeak(msg, type, this.aiAutopilotActive));
    this.flightRecorder = new FlightTrajectoryRecorder(() => this.getActiveModelName(), () => {
      if (this.modelForge) this.modelForge.updateDatasetStats();
    });
    this.neuralPolicy = new NeuralFlightPolicy();
    this.regimeArbiter = new FlightRegimeArbiter((msg, type) => this.ui.observerSpeak(msg, type, this.aiAutopilotActive));
    this.supervisor = new AutonomousSupervisor({
      curatedVectorDB: this.curatedVectorDB,
      getActivePrivateDBCallback: () => this.getActivePrivateDB(),
      getActiveModelCallback: () => this.getActiveModelName(),
      observerSpeak: (msg, type) => this.ui.observerSpeak(msg, type, this.aiAutopilotActive),
      onReconfigure: () => this.rotateModel()
    });

    // Challenge Engine & Outposts
    this.challengeEngine = new ChallengeEngine((msg, type) => this.ui.observerSpeak(msg, type, this.aiAutopilotActive));
    this.lunarOutpost = new LunarOutpostSystem(() => this.getActiveBotKey());

    // Game Entities
    this.rocket = new Rocket(ARENA_W, ARENA_H);
    this.landingPad = new LandingPad(ARENA_W * 0.45, ARENA_H - 120, 110, ARENA_W, ARENA_H);
    this.windField = new WindField(ARENA_W, ARENA_H);
    this.asteroids = [];
    this.fuelOrbs = [];
    this.gravityAnomalies = [];
    this.quantumCores = [];
    this.particles = [];

    // Game State
    this.currentLevel = 1;
    this.maxLevels = 100;
    this.currentGravity = 0.015;
    this.gameState = 'MENU';
    this.missionTimeLimit = 50.0;
    this.missionTimeRemaining = 50.0;
    this.overtimePenaltyCounter = 0;
    this.quantumCoresHarvested = 0;
    this.totalQuantumCoresInLevel = 0;

    // Ollama connection state
    this.ollamaPending = false;
    this.lastOllamaDecision = null;
    this.lastOllamaTime = 0;

    // Initialize Model Forge Studio
    this.modelForge = new ModelForgeStudio({
      flightRecorder: this.flightRecorder,
      neuralPolicy: this.neuralPolicy,
      curatedVectorDB: this.curatedVectorDB,
      observerSpeak: (msg, type) => this.ui.observerSpeak(msg, type, this.aiAutopilotActive),
      onModelRegistered: (data) => this.registerCustomModel(data)
    });

    this.bindEvents();
    this.loadCustomModels();
    this.resize();
  }

  loadEconomy() {
    try {
      const savedTokens = localStorage.getItem('cosmic_ai_tokens');
      if (savedTokens !== null) this.aiTokens = parseInt(savedTokens, 10);
      const savedBanked = localStorage.getItem('cosmic_banked_score');
      if (savedBanked !== null) this.bankedScore = parseInt(savedBanked, 10) || 0;
      const savedHigh = localStorage.getItem('cosmic_high_score');
      if (savedHigh !== null) this.highScore = parseInt(savedHigh, 10) || 0;
    } catch(e) {}
    this.score = this.bankedScore;
  }

  updateTokens(delta = 0) {
    this.aiTokens = Math.max(0, this.aiTokens + delta);
    try { localStorage.setItem('cosmic_ai_tokens', this.aiTokens); } catch(e) {}
    const tokenDisplay = document.getElementById('tokenDisplay');
    if (tokenDisplay) {
      tokenDisplay.innerText = this.aiTokens;
      if (delta > 0) {
        tokenDisplay.style.color = '#4ade80';
        setTimeout(() => { if (tokenDisplay) tokenDisplay.style.color = '#fbbf24'; }, 600);
      } else if (delta < 0) {
        tokenDisplay.style.color = '#f87171';
        setTimeout(() => { if (tokenDisplay) tokenDisplay.style.color = '#fbbf24'; }, 600);
      }
    }
  }

  updateScore() {
    this.score = this.bankedScore + this.currentSectorScore;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try { localStorage.setItem('cosmic_high_score', this.highScore); } catch(e) {}
    }
    const scoreDisplay = document.getElementById('scoreDisplay');
    if (scoreDisplay) {
      scoreDisplay.innerText = this.score;
      scoreDisplay.title = `Total: ${this.score} pts | Banked: ${this.bankedScore} pts | Sector: +${this.currentSectorScore} pts | High Score: ${this.highScore} pts`;
    }
  }

  getActiveModelName() {
    return this.models[this.currentModelIndex % this.models.length];
  }

  getActiveBotKey() {
    if (!this.aiAutopilotActive) return 'human';
    const aiModeSelect = document.getElementById('aiModeSelect');
    if (aiModeSelect && aiModeSelect.value === 'rl') return 'rl';
    return this.getActiveModelName();
  }

  getActivePrivateDB() {
    const currentM = this.getActiveModelName();
    return this.privateVectorDBs[currentM] || this.privateVectorDBs['command-r:35b'] || this.privateVectorDBs[this.models[0]];
  }

  rotateModel() {
    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
    this.syncModelUI();
  }

  syncModelUI() {
    const active = this.getActiveModelName();
    const ollamaModelSelect = document.getElementById('ollamaModelSelect');
    if (ollamaModelSelect && ollamaModelSelect.value !== active) {
      ollamaModelSelect.value = active;
    }
    this.updateVectorHUD();
    this.lunarOutpost.updateHUD();
  }

  updateVectorHUD() {
    const activeDB = this.getActivePrivateDB();
    const curCount = this.curatedVectorDB ? this.curatedVectorDB.vectors.length : 0;
    const pvtCount = activeDB ? activeDB.vectors.length : 0;
    const curatedVectorsDisplay = document.getElementById('curatedVectorsDisplay');
    const privateVectorsDisplay = document.getElementById('privateVectorsDisplay');
    if (curatedVectorsDisplay) curatedVectorsDisplay.innerText = curCount;
    if (privateVectorsDisplay) privateVectorsDisplay.innerText = pvtCount;
  }

  registerCustomModel(modelData, save = true) {
    const tag = modelData.tag || 'custom-model';
    const cleanKey = tag.replace(/[:.]/g, '_');

    if (!this.models.includes(tag)) {
      this.models.push(tag);
    }

    const ollamaModelSelect = document.getElementById('ollamaModelSelect');
    if (ollamaModelSelect) {
      let exists = false;
      for (let i = 0; i < ollamaModelSelect.options.length; i++) {
        if (ollamaModelSelect.options[i].value === tag) { exists = true; break; }
      }
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = tag;
        opt.innerText = `${modelData.icon || '⚡'} ${modelData.name || tag} (${modelData.baseModel || 'Custom'})`;
        ollamaModelSelect.appendChild(opt);
      }
    }

    if (!BOT_STATIONS_META[tag]) {
      const slotIdx = Object.keys(BOT_STATIONS_META).length;
      const slotX = 140 + (slotIdx % 6) * 190;
      BOT_STATIONS_META[tag] = {
        name: (modelData.colonyName || modelData.name || tag).toUpperCase(),
        shortName: modelData.name || tag,
        icon: modelData.icon || '⚡',
        themeColor: modelData.themeColor || '#38bdf8',
        accentColor: modelData.accentColor || '#0284c7',
        windowColor: modelData.themeColor ? `${modelData.themeColor}dd` : 'rgba(56, 189, 248, 0.85)',
        slotIndex: slotIdx,
        x: slotX,
        role: modelData.role || 'Custom Autonomous Research Colony'
      };
      if (!this.lunarOutpost.stations[tag]) {
        this.lunarOutpost.stations[tag] = {
          modules: [ STATION_MODULE_CATALOG[0] ],
          level: 1,
          touchdowns: 0
        };
      }
    }

    if (!this.privateVectorDBs[tag]) {
      this.privateVectorDBs[tag] = new VectorDBEngine(tag, `cosmic_vector_db_${cleanKey}`, 150, () => this.updateVectorHUD());
    }

    if (save) {
      try {
        let registry = [];
        const raw = localStorage.getItem('cosmic_custom_models_registry_v1');
        if (raw) registry = JSON.parse(raw);
        const existingIdx = registry.findIndex(m => m.tag === tag);
        if (existingIdx !== -1) registry[existingIdx] = modelData;
        else registry.push(modelData);
        localStorage.setItem('cosmic_custom_models_registry_v1', JSON.stringify(registry));
      } catch (e) {}
    }

    this.lunarOutpost.updateHUD();
    this.updateVectorHUD();
    if (this.modelForge) this.modelForge.renderRegisteredModels();
  }

  loadCustomModels() {
    try {
      const raw = localStorage.getItem('cosmic_custom_models_registry_v1');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(m => this.registerCustomModel(m, false));
        }
      }
    } catch (e) {}
  }

  initLevel(level) {
    this.currentLevel = level;
    this.scorecard.clearVictoryTimer();

    // Gravity progression: 0.015 (Earth moon) to 0.045
    this.currentGravity = Math.min(0.045, 0.015 + (level - 1) * 0.00035);
    const gravityDisplay = document.getElementById('gravityDisplay');
    if (gravityDisplay) gravityDisplay.innerText = `${(this.currentGravity * 100).toFixed(1)} m/s²`;

    this.missionTimeLimit = Math.max(25.0, 50.0 - (level - 1) * 0.25);
    this.missionTimeRemaining = this.missionTimeLimit;
    this.overtimePenaltyCounter = 0;
    this.currentSectorScore = 0;
    this.flightCheckpoints = [];

    // Position rocket
    this.rocket.reset(ARENA_W * (0.2 + (level % 5) * 0.12), ARENA_H * 0.18);

    // Position landing pad
    const padWidth = Math.max(75, 115 - level * 0.4);
    const padX = Math.max(35, Math.min(ARENA_W - padWidth - 35, ARENA_W * (0.35 + Math.random() * 0.4)));
    this.landingPad = new LandingPad(padX, ARENA_H - 120, padWidth, ARENA_W, ARENA_H);

    // Apply challenge engine modes
    this.challengeEngine.setMode(this.challengeEngine.mode, this.windField, this.landingPad);

    // Spawn Asteroids
    this.asteroids = [];
    const astCount = Math.min(8, 2 + Math.floor(level / 5));
    for (let i = 0; i < astCount; i++) {
      const r = Math.random() * 14 + 16;
      let ax, ay;
      do {
        ax = Math.random() * ARENA_W;
        ay = ARENA_H * 0.25 + Math.random() * (ARENA_H * 0.5);
      } while (Math.hypot(ax - this.rocket.x, ay - this.rocket.y) < 140 || Math.hypot(ax - padX, ay - (ARENA_H - 120)) < 110);
      const vx = (Math.random() - 0.5) * (0.4 + level * 0.01);
      const vy = (Math.random() - 0.5) * (0.2 + level * 0.01);
      this.asteroids.push(new Asteroid(ax, ay, r, vx, vy, ARENA_W, ARENA_H));
    }

    // Spawn Fuel Orbs
    this.fuelOrbs = [];
    for (let i = 0; i < 2; i++) {
      this.fuelOrbs.push(new FuelOrb(
        ARENA_W * (0.15 + Math.random() * 0.7),
        ARENA_H * (0.2 + Math.random() * 0.45)
      ));
    }

    // Spawn Gravity Anomalies
    this.gravityAnomalies = [];
    if (this.challengeEngine.mode === 'gravity' || this.challengeEngine.mode === 'extreme' || level >= 3) {
      const anomCount = (this.challengeEngine.mode === 'extreme' || level >= 6) ? 2 : 1;
      for (let i = 0; i < anomCount; i++) {
        this.gravityAnomalies.push(new GravityAnomaly(
          ARENA_W * (0.25 + Math.random() * 0.5),
          ARENA_H * (0.25 + Math.random() * 0.4),
          1.2,
          ARENA_W
        ));
      }
    }

    // Spawn Quantum Cores
    this.quantumCores = [];
    this.quantumCoresHarvested = 0;
    this.totalQuantumCoresInLevel = 2;
    for (let i = 0; i < this.totalQuantumCoresInLevel; i++) {
      this.quantumCores.push(new QuantumCore(
        ARENA_W * (0.18 + Math.random() * 0.64),
        ARENA_H * (0.22 + Math.random() * 0.45),
        ARENA_W
      ));
    }

    const qDisplay = document.getElementById('quantumCoresDisplay');
    if (qDisplay) qDisplay.innerText = `0/${this.totalQuantumCoresInLevel}`;

    this.particles = [];
    this.gameState = 'PLAYING';
    window.LunarLanderGameState = this.gameState;
    this.ui.updateHUDButtonStates(this.gameState);
    this.ui.updateGauges(this.rocket, this.landingPad, this.missionTimeRemaining, this.missionTimeLimit, this.currentLevel, this.score, this.highScore, this.bankedScore, this.currentSectorScore);
  }

  checkCollisions() {
    if (this.rocket.crashed || this.rocket.landed) return;

    // Check fuel orbs
    for (let i = this.fuelOrbs.length - 1; i >= 0; i--) {
      const orb = this.fuelOrbs[i];
      let dx = Math.abs(this.rocket.x - orb.x);
      if (dx > ARENA_W / 2) dx = ARENA_W - dx;
      const dy = this.rocket.y - orb.y;
      if (Math.hypot(dx, dy) < this.rocket.radius + orb.radius) {
        this.rocket.fuel = Math.min(this.rocket.maxFuel, this.rocket.fuel + 65);
        this.fuelOrbs.splice(i, 1);
        this.sound.playChime();
        this.ui.observerSpeak(`Fuel canister secured (+65 Fuel).`, 'info', this.aiAutopilotActive);
      }
    }

    // Check Quantum Cores
    for (const core of this.quantumCores) {
      if (core.checkCollision(this.rocket)) {
        this.quantumCoresHarvested++;
        this.currentSectorScore += 500;
        this.updateTokens(+50);
        this.rocket.shield = Math.min(100, this.rocket.shield + 25);
        this.updateScore();
        const qDisplay = document.getElementById('quantumCoresDisplay');
        if (qDisplay) qDisplay.innerText = `${this.quantumCoresHarvested}/${this.totalQuantumCoresInLevel}`;
        this.sound.playWin();
        this.ui.observerSpeak(`💎 QUANTUM CORE SECURED! (+500 pts, +50 Tokens, +25% Shield, Intrinsic Curiosity Boost).`, 'success', this.aiAutopilotActive);

        const coreEmb = this.curatedVectorDB.computeEmbedding(this.rocket, this.landingPad, this.asteroids);
        this.curatedVectorDB.insertMemory(coreEmb, 'WIN', { thrust: this.keys.thrust, left: this.keys.left, right: this.keys.right }, 'High-Risk Quantum Core Extraction Maneuver', { level: this.currentLevel, cci: this.challengeEngine.cci });
      }
    }

    // Check Asteroids
    for (const ast of this.asteroids) {
      let dx = Math.abs(this.rocket.x - ast.x);
      if (dx > ARENA_W / 2) dx = ARENA_W - dx;
      const dy = this.rocket.y - ast.y;
      if (Math.hypot(dx, dy) < this.rocket.radius + ast.radius * 0.85) {
        this.explodeRocket('Asteroid impact! Hull integrity breached.');
        return;
      }
    }

    // Check Ground / Landing Pad
    if (this.rocket.y + 16 >= this.landingPad.y) {
      if (this.rocket.x >= this.landingPad.x && this.rocket.x <= this.landingPad.x + this.landingPad.width) {
        const vSpeed = this.rocket.vy;
        const hSpeed = Math.abs(this.rocket.vx);
        let angleDiff = Math.abs(this.rocket.angle - (-Math.PI / 2));
        angleDiff = Math.min(angleDiff, Math.abs(angleDiff - Math.PI * 2));

        const safeVSpeed = vSpeed <= 2.2;
        const safeHSpeed = hSpeed <= 1.2;
        const safeAngle = angleDiff <= 0.32;

        if (safeVSpeed && safeHSpeed && safeAngle) {
          this.landSuccess();
        } else {
          this.explodeRocket(`Hard impact! V-Speed: ${vSpeed.toFixed(1)} m/s (Limit: 2.2)`);
        }
      } else if (this.rocket.y + 16 >= ARENA_H - 35) {
        this.explodeRocket('Crashed into lunar surface!');
      }
    }
  }

  landSuccess() {
    this.scorecard.clearVictoryTimer();
    this.rocket.landed = true;
    this.rocket.vx = 0;
    this.rocket.vy = 0;
    this.sound.stopThrust();
    this.sound.playWin();

    const fuelBonus = Math.floor(this.rocket.fuel * 10);
    const speedrunBonus = this.missionTimeRemaining > 0 ? Math.floor(this.missionTimeRemaining * 20) : 0;
    const landingBonus = 1000 + fuelBonus + speedrunBonus;

    this.currentSectorScore += landingBonus;
    this.bankedScore += this.currentSectorScore;
    try { localStorage.setItem('cosmic_banked_score', this.bankedScore); } catch(e) {}
    this.currentSectorScore = 0;
    this.updateScore();

    this.flightRecorder.finishFlight('TOUCHDOWN', { score: landingBonus, fuel: this.rocket.fuel });
    this.updateTokens(+50);

    const pilotKey = this.getActiveBotKey();
    const stationExpansion = this.lunarOutpost.addModule(pilotKey);

    this.gameState = 'WON';
    window.LunarLanderGameState = this.gameState;
    this.ui.updateHUDButtonStates(this.gameState);

    this.scorecard.showTouchdownDebrief({
      currentLevel: this.currentLevel,
      maxLevels: this.maxLevels,
      rocketFuel: this.rocket.fuel,
      missionTimeRemaining: this.missionTimeRemaining,
      quantumCoresHarvested: this.quantumCoresHarvested,
      totalQuantumCoresInLevel: this.totalQuantumCoresInLevel,
      bankedScore: this.bankedScore,
      aiTokens: this.aiTokens,
      stationExpansion,
      onProceedCallback: (targetLvl) => {
        this.initLevel(targetLvl);
        this.gameState = 'PLAYING';
        window.LunarLanderGameState = this.gameState;
        this.ui.observerSpeak(`Proceeding to Sector ${targetLvl}! Gravity calibrated to ${this.currentGravity.toFixed(3)}g.`, 'info', this.aiAutopilotActive);
      }
    });

    if (stationExpansion) {
      this.ui.observerSpeak(`🏗️ LUNAR BASE EXPANSION: ${stationExpansion.botConfig.icon} ${stationExpansion.botConfig.name} commissioned ${stationExpansion.module.name}! Station Total: ${stationExpansion.totalCount} modules.`, 'success', this.aiAutopilotActive);
    }

    this.rlAgent.recordEpisode(true);
    this.supervisor.curateFlightEpisode(true, this.rocket, this.landingPad, this.asteroids, { thrust: true, left: this.keys.left, right: this.keys.right }, `Touchdown Lvl ${this.currentLevel}`, this.flightCheckpoints, this.currentLevel);

    this.rotateModel();
  }

  explodeRocket(reason) {
    this.scorecard.clearVictoryTimer();
    this.rocket.crashed = true;
    this.sound.stopThrust();
    this.sound.playExplosion();

    this.flightRecorder.finishFlight('CRASH', { reason, score: 0 });
    this.currentSectorScore = 0;
    this.updateScore();

    const tokenPenalty = Math.min(10, Math.max(0, this.aiTokens - 100));
    if (tokenPenalty > 0) this.updateTokens(-tokenPenalty);

    for (let i = 0; i < 40; i++) {
      this.particles.push(new ExplosionParticle(this.rocket.x, this.rocket.y, null, ARENA_W));
    }

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalBtn = document.getElementById('modalBtn');

    if (modal && modalTitle && modalDesc && modalBtn) {
      modalTitle.innerText = 'HULL BREACHED';
      modalTitle.style.color = '#f87171';
      modalDesc.innerHTML = `${reason}<br>
      <div style="margin: 8px 0; padding: 7px 10px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; text-align: left; font-size: 11px;">
        🛡️ <strong style="color:#38bdf8;">CAREER SCORE PROTECTED:</strong> <span style="color:#fbbf24; font-weight:bold;">${this.bankedScore} pts</span> secured.<br>
        <span style="color:#94a3b8; font-size: 10px;">(Crashing never wipes out previously banked sector points)</span><br>
        Emergency salvage deductible: <strong style="color:#f87171;">-${tokenPenalty} Tokens</strong> (Treasury: ${this.aiTokens})
      </div>
      Telemetry logged to Vector DB.`;

      modalBtn.innerText = 'RETRY MISSION';
      modalBtn.onclick = () => {
        modal.style.display = 'none';
        this.initLevel(this.currentLevel);
        this.gameState = 'PLAYING';
        window.LunarLanderGameState = this.gameState;
        this.ui.observerSpeak(`Retrying Sector ${this.currentLevel} with updated vector corrections.`, 'info', this.aiAutopilotActive);
      };
      modal.style.display = 'flex';
    }

    this.gameState = 'GAMEOVER';
    window.LunarLanderGameState = this.gameState;
    this.ui.updateHUDButtonStates(this.gameState);

    this.rlAgent.recordEpisode(false);
    this.supervisor.curateFlightEpisode(false, this.rocket, this.landingPad, this.asteroids, { thrust: this.keys.thrust, left: this.keys.left, right: this.keys.right }, reason, this.flightCheckpoints, this.currentLevel);

    this.rotateModel();

    if (this.aiAutopilotActive) {
      setTimeout(() => {
        if (this.aiAutopilotActive && this.gameState === 'GAMEOVER') {
          if (modalBtn) modalBtn.click();
        }
      }, 2200);
    }
  }

  async runAIPilot() {
    this.aiCycleCounter++;
    const aiModeSelect = document.getElementById('aiModeSelect');
    const mode = aiModeSelect ? aiModeSelect.value : 'tribunal';
    const currentEmb = this.curatedVectorDB.computeEmbedding(this.rocket, this.landingPad, this.asteroids);

    if (this.aiCycleCounter % 40 === 0 && this.flightCheckpoints.length < 16 && !this.rocket.crashed && !this.rocket.landed) {
      this.flightCheckpoints.push({
        emb: currentEmb,
        action: { thrust: this.keys.thrust, left: this.keys.left, right: this.keys.right },
        y: this.rocket.y,
        vy: this.rocket.vy,
        padY: this.landingPad.y
      });
    }

    if (mode === 'tribunal') {
      const activePrivateDB = this.getActivePrivateDB();
      const curatedMatches = this.curatedVectorDB.queryNearest(currentEmb, 4);
      const privateMatches = activePrivateDB ? activePrivateDB.queryNearest(currentEmb, 4) : [];

      const fusedNeighbors = [
        ...curatedMatches.map(m => ({ ...m, source: 'Curated', effectiveSim: m.similarity * 1.35 })),
        ...privateMatches.map(m => ({ ...m, source: 'Private', effectiveSim: m.similarity * 1.0 }))
      ];
      fusedNeighbors.sort((a, b) => b.effectiveSim - a.effectiveSim);
      const topNeighbors = fusedNeighbors.slice(0, 5);

      const padCenterX = this.landingPad.x + this.landingPad.width / 2;
      const currentDist = Math.hypot(padCenterX - this.rocket.x, this.landingPad.y - this.rocket.y);
      const qState = this.rlAgent.discretize(this.rocket, this.landingPad, this.asteroids);

      const stepReward = this.rlAgent.computeStepReward(this.rocket, this.landingPad, this.asteroids, this.rlAgent.prevDistToPad, currentDist, qState, this.windField, this.gravityAnomalies, this.keys, this.missionTimeRemaining);
      this.rlAgent.macroRewardAccum += stepReward;

      let rlChoice;
      if (this.rlAgent.macroFramesLeft <= 0) {
        this.rlAgent.stepUpdate(qState, this.rlAgent.macroRewardAccum);
        this.rlAgent.macroRewardAccum = 0;
        rlChoice = this.rlAgent.selectAction(qState);
        this.rlAgent.macroAction = rlChoice;
        this.rlAgent.macroFramesLeft = this.rlAgent.MACRO_INTERVAL;
        this.rlAgent.prevState = qState;
        this.rlAgent.prevActionIdx = rlChoice.index;
        this.rlAgent.prevDistToPad = currentDist;
      } else {
        rlChoice = this.rlAgent.macroAction || this.rlAgent.selectAction(qState);
      }
      this.rlAgent.macroFramesLeft--;

      const voteRLAction = {
        thrust: rlChoice.action.thrust && this.rocket.fuel > 0,
        left: rlChoice.action.left,
        right: rlChoice.action.right,
        tag: rlChoice.action.name
      };

      const curWins = curatedMatches.filter(n => n.entry.outcome === 'WIN').length;
      const pvtWins = privateMatches.filter(n => n.entry.outcome === 'WIN').length;
      const currentModel = this.getActiveModelName();
      const shortModel = currentModel.split(':')[0];
      const ragContext = topNeighbors.length > 0 
        ? `Curated Master Memory: ${curWins}/${curatedMatches.length} wins; ${shortModel} Private Memory: ${pvtWins}/${privateMatches.length} wins.` 
        : '';
      this.queryOllamaPilot(this.rocket, this.landingPad, this.asteroids, ragContext);

      const voteLLMAction = this.lastOllamaDecision ? {
        thrust: Boolean(this.lastOllamaDecision.thrust && this.rocket.fuel > 0),
        left: this.lastOllamaDecision.turn === 'left',
        right: this.lastOllamaDecision.turn === 'right',
        tag: this.lastOllamaDecision.thrust ? `T+${this.lastOllamaDecision.turn||'N'}` : (this.lastOllamaDecision.turn || 'COAST').toUpperCase()
      } : null;

      const votePIDAction = this.computeHeuristicAction(this.rocket, this.landingPad);

      const regimeState = this.regimeArbiter.evaluate(this.rocket, this.landingPad, this.asteroids);
      const { rl: wRL, llm: wLLM, pid: wPID } = regimeState.weights;

      if (regimeState.regime === 'FLARE') {
        rlChoice.explored = false;
      }

      let thrustVotes = 0;
      let leftVotes = 0;
      let rightVotes = 0;

      if (votePIDAction.thrust) thrustVotes += wPID;
      if (votePIDAction.left) leftVotes += wPID;
      if (votePIDAction.right) rightVotes += wPID;

      const effectiveRLWeight = wRL * Math.min(1.3, 0.95 + (this.rlAgent.wins * 0.02));
      if (voteRLAction.thrust) thrustVotes += effectiveRLWeight;
      if (voteRLAction.left) leftVotes += effectiveRLWeight;
      if (voteRLAction.right) rightVotes += effectiveRLWeight;

      const effectiveLLMWeight = voteLLMAction ? wLLM : 0;
      if (voteLLMAction) {
        if (voteLLMAction.thrust) thrustVotes += effectiveLLMWeight;
        if (voteLLMAction.left) leftVotes += effectiveLLMWeight;
        if (voteLLMAction.right) rightVotes += effectiveLLMWeight;
      }

      const totalCouncil = wPID + effectiveRLWeight + effectiveLLMWeight;
      const finalThrust = (thrustVotes / totalCouncil) >= 0.48 && this.rocket.fuel > 0;
      const finalLeft = (leftVotes / totalCouncil) >= 0.45 && !((rightVotes / totalCouncil) >= 0.45);
      const finalRight = (rightVotes / totalCouncil) >= 0.45 && !finalLeft;

      this.keys.thrust = finalThrust;
      this.keys.left = finalLeft;
      this.keys.right = finalRight;

      if (this.keys.thrust) this.sound.startThrust();
      else this.sound.stopThrust();

      if (this.aiCycleCounter % 6 === 0) {
        const modelIcon = shortModel.startsWith('command') ? '⚡' : '💎';
        const voteRL = document.getElementById('voteRL');
        const voteLLM = document.getElementById('voteLLM');
        const votePID = document.getElementById('votePID');
        if (voteRL) voteRL.innerText = `🧠 ${voteRLAction.tag}`;
        if (voteLLM) voteLLM.innerText = `${modelIcon} ${voteLLMAction ? voteLLMAction.tag : '...'}`;
        if (votePID) votePID.innerText = `🚀 ${votePIDAction.tag}`;
      }
    } else if (mode === 'rl') {
      const padCenterX = this.landingPad.x + this.landingPad.width / 2;
      const currentDist = Math.hypot(padCenterX - this.rocket.x, this.landingPad.y - this.rocket.y);
      const state = this.rlAgent.discretize(this.rocket, this.landingPad, this.asteroids);

      const stepReward = this.rlAgent.computeStepReward(this.rocket, this.landingPad, this.asteroids, this.rlAgent.prevDistToPad, currentDist, state, this.windField, this.gravityAnomalies, this.keys, this.missionTimeRemaining);
      this.rlAgent.macroRewardAccum += stepReward;

      let choice;
      if (this.rlAgent.macroFramesLeft <= 0) {
        this.rlAgent.stepUpdate(state, this.rlAgent.macroRewardAccum);
        this.rlAgent.macroRewardAccum = 0;
        choice = this.rlAgent.selectAction(state);
        this.rlAgent.macroAction = choice;
        this.rlAgent.macroFramesLeft = this.rlAgent.MACRO_INTERVAL;
        this.rlAgent.prevState = state;
        this.rlAgent.prevActionIdx = choice.index;
        this.rlAgent.prevDistToPad = currentDist;
      } else {
        choice = this.rlAgent.macroAction || this.rlAgent.selectAction(state);
      }
      this.rlAgent.macroFramesLeft--;

      this.keys.thrust = choice.action.thrust && this.rocket.fuel > 0;
      this.keys.left = choice.action.left;
      this.keys.right = choice.action.right;

      if (this.keys.thrust) this.sound.startThrust();
      else this.sound.stopThrust();
    } else {
      const action = this.computeHeuristicAction(this.rocket, this.landingPad);
      this.keys.thrust = action.thrust;
      this.keys.left = action.left;
      this.keys.right = action.right;
      if (this.keys.thrust) this.sound.startThrust();
      else this.sound.stopThrust();
    }
  }

  async queryOllamaPilot(r, pad, asts, ragContext = '') {
    if (this.ollamaPending) return;
    if (Date.now() - this.lastOllamaTime < 650) return;

    this.ollamaPending = true;
    this.lastOllamaTime = Date.now();

    let rawDx = (pad.x + pad.width / 2) - r.x;
    if (rawDx > ARENA_W / 2) rawDx -= ARENA_W;
    else if (rawDx < -ARENA_W / 2) rawDx += ARENA_W;
    const dx = Math.round(rawDx);
    const dy = Math.round(pad.y - r.y);
    const vy = Number(r.vy.toFixed(1));
    const vx = Number(r.vx.toFixed(1));
    const windVal = (this.windField && this.windField.enabled) ? this.windField.getWindAt(r.y).toFixed(1) : '0';
    const cciVal = this.challengeEngine.cci;
    const driveVal = this.challengeEngine.driveState;

    const targetModel = this.getActiveModelName();

    if (targetModel.startsWith('neural-policy')) {
      const normInput = [
        Math.max(0, Math.min(1, dy / ARENA_H)),
        Math.max(-1, Math.min(1, dx / (ARENA_W / 2))),
        Math.max(-2, Math.min(2, vy / 5.0)),
        Math.max(-2, Math.min(2, vx / 5.0)),
        Math.max(-2, Math.min(2, parseFloat(windVal) / 2.0)),
        Math.max(0, Math.min(1, cciVal / 100.0))
      ];
      const pred = this.neuralPolicy.predict(normInput);
      this.lastOllamaDecision = {
        thrust: pred.action.thrust,
        turn: pred.action.left ? 'left' : (pred.action.right ? 'right' : 'none'),
        reason: `Custom Neural Policy (${(Math.max(...pred.probabilities)*100).toFixed(0)}%)`
      };
      this.ollamaPending = false;
      return;
    }

    const prompt = `Lander state: dy=${dy}px, dx=${dx}px, vy=${vy}m/s, vx=${vx}m/s, wind=${windVal}m/s, CCI=${cciVal}%, Drive="${driveVal}". ${ragContext} Output JSON ONLY: {"thrust":boolean,"turn":"left"|"right"|"none","reason":"string"}`;

    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          prompt: prompt,
          stream: false,
          format: 'json',
          options: { temperature: 0.15, num_predict: 40 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        this.lastOllamaDecision = JSON.parse(data.response);
      }
    } catch (e) {
    } finally {
      this.ollamaPending = false;
    }
  }

  computeHeuristicAction(r, pad) {
    const padCenterX = pad.x + pad.width / 2;
    const padTopY = pad.y;
    let dxToPad = padCenterX - r.x;
    if (dxToPad > ARENA_W / 2) dxToPad -= ARENA_W;
    else if (dxToPad < -ARENA_W / 2) dxToPad += ARENA_W;
    const dyToPad = padTopY - r.y;

    let targetVx = Math.sign(dxToPad) * Math.min(2.8, Math.abs(dxToPad) * 0.015);
    if (Math.abs(dxToPad) < 30) targetVx = Math.sign(dxToPad) * 0.4;
    const vxDiff = targetVx - r.vx;

    let targetAngleOffset = Math.max(-0.45, Math.min(0.45, vxDiff * 0.35));
    let desiredAngle = -Math.PI / 2 + targetAngleOffset;

    let currentAngle = r.angle;
    let angleDiff = desiredAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const right = angleDiff > 0.08;
    const left = angleDiff < -0.08;

    let safeVy = dyToPad > 250 ? 2.8 : (dyToPad > 120 ? 1.8 : 1.0);
    let fireThrust = (r.vy > safeVy) || (dyToPad < 40 && Math.abs(dxToPad) > 60 && r.vy > 0);

    return {
      thrust: fireThrust && r.fuel > 0,
      left,
      right,
      tag: fireThrust ? (left ? 'T+L' : (right ? 'T+R' : 'THRUST')) : (left ? 'LEFT' : (right ? 'RIGHT' : 'COAST'))
    };
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    if (this.canvasContainer && this.canvasContainer.clientWidth > 0) {
      this.width = this.canvasContainer.clientWidth;
      this.height = this.canvasContainer.clientHeight;
    } else {
      this.width = window.innerWidth || 800;
      this.height = window.innerHeight || 600;
    }
    if (this.canvas && this.ctx) {
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { this.keys.thrust = true; this.sound.startThrust(); }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { this.keys.thrust = false; this.sound.stopThrust(); }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
    });

    // Touch controls
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnThrust = document.getElementById('btnThrust');

    if (btnLeft) {
      btnLeft.addEventListener('pointerdown', () => this.keys.left = true);
      btnLeft.addEventListener('pointerup', () => this.keys.left = false);
      btnLeft.addEventListener('pointercancel', () => this.keys.left = false);
    }
    if (btnRight) {
      btnRight.addEventListener('pointerdown', () => this.keys.right = true);
      btnRight.addEventListener('pointerup', () => this.keys.right = false);
      btnRight.addEventListener('pointercancel', () => this.keys.right = false);
    }
    if (btnThrust) {
      btnThrust.addEventListener('pointerdown', () => { this.keys.thrust = true; this.sound.startThrust(); });
      btnThrust.addEventListener('pointerup', () => { this.keys.thrust = false; this.sound.stopThrust(); });
      btnThrust.addEventListener('pointercancel', () => { this.keys.thrust = false; this.sound.stopThrust(); });
    }

    // HUD buttons
    const hudStartBtn = document.getElementById('hudStartBtn');
    if (hudStartBtn) {
      hudStartBtn.addEventListener('click', () => {
        this.sound.init();
        const modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
        if (this.gameState === 'MENU' || this.gameState === 'GAMEOVER' || this.gameState === 'WON') {
          const modalBtn = document.getElementById('modalBtn');
          if (modalBtn) modalBtn.click();
        } else {
          this.initLevel(this.currentLevel);
          this.gameState = 'PLAYING';
          window.LunarLanderGameState = this.gameState;
        }
        this.ui.observerSpeak(`Start command received. Flight initiated in Sector ${this.currentLevel}!`, 'info', this.aiAutopilotActive);
        this.ui.updateHUDButtonStates(this.gameState);
      });
    }

    const hudPauseBtn = document.getElementById('hudPauseBtn');
    if (hudPauseBtn) {
      hudPauseBtn.addEventListener('click', () => {
        this.sound.init();
        if (this.gameState === 'PLAYING') {
          this.gameState = 'PAUSED';
          this.ui.observerSpeak("Flight paused by user. Click [▶ RESUME] at the top of this box to continue.", "warn", this.aiAutopilotActive);
        } else if (this.gameState === 'PAUSED') {
          this.gameState = 'PLAYING';
          this.ui.observerSpeak("Flight resumed. AI guidance active.", "info", this.aiAutopilotActive);
        }
        window.LunarLanderGameState = this.gameState;
        this.ui.updateHUDButtonStates(this.gameState);
      });
    }

    const hudResetBtn = document.getElementById('hudResetBtn');
    if (hudResetBtn) {
      hudResetBtn.addEventListener('click', () => {
        this.sound.init();
        const modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
        this.initLevel(this.currentLevel);
        this.gameState = 'PLAYING';
        window.LunarLanderGameState = this.gameState;
        this.ui.observerSpeak(`Sector ${this.currentLevel} reset to initial launch telemetry.`, 'warn', this.aiAutopilotActive);
        this.ui.updateHUDButtonStates(this.gameState);
      });
    }

    // Zoom buttons
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomReset = document.getElementById('btnZoomReset');
    const zoomDisplay = document.getElementById('zoomDisplay');

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.userZoom = Math.max(0.35, Math.round((this.userZoom - 0.1) * 100) / 100);
        if (zoomDisplay) zoomDisplay.innerText = `${Math.round(this.userZoom * 100)}%`;
      });
    }
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.userZoom = Math.min(2.2, Math.round((this.userZoom + 0.1) * 100) / 100);
        if (zoomDisplay) zoomDisplay.innerText = `${Math.round(this.userZoom * 100)}%`;
      });
    }
    if (btnZoomReset) {
      btnZoomReset.addEventListener('click', () => {
        this.userZoom = 0.85;
        if (zoomDisplay) zoomDisplay.innerText = `${Math.round(this.userZoom * 100)}%`;
      });
    }

    // AI Toggle & Select
    const aiToggle = document.getElementById('aiToggle');
    const aiSlider = document.getElementById('aiSlider');
    const aiThought = document.getElementById('aiThought');
    if (aiToggle) {
      aiToggle.addEventListener('change', (e) => {
        this.aiAutopilotActive = e.target.checked;
        this.lunarOutpost.updateHUD();
        if (this.aiAutopilotActive) {
          if (aiSlider) aiSlider.style.backgroundColor = '#0284c7';
        } else {
          if (aiSlider) aiSlider.style.backgroundColor = '#334155';
          if (aiThought) aiThought.innerText = "Autopilot Standby. Human manual control restored.";
          this.keys.thrust = false;
          this.keys.left = false;
          this.keys.right = false;
          this.sound.stopThrust();
        }
      });
    }

    // Model Selector
    const ollamaModelSelect = document.getElementById('ollamaModelSelect');
    if (ollamaModelSelect) {
      ollamaModelSelect.addEventListener('change', (e) => {
        const idx = this.models.indexOf(e.target.value);
        if (idx !== -1) {
          this.currentModelIndex = idx;
          this.updateVectorHUD();
          this.lunarOutpost.updateHUD();
        }
      });
    }
    const rotateModelBtn = document.getElementById('rotateModelBtn');
    if (rotateModelBtn) {
      rotateModelBtn.addEventListener('click', () => {
        this.rotateModel();
      });
    }
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    if (!this.ctx) return;

    this.ctx.fillStyle = '#05070d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    const fitScale = Math.min(this.width / ARENA_W, this.height / ARENA_H);
    const cameraScale = fitScale * this.userZoom;
    const arenaPixW = ARENA_W * cameraScale;
    const arenaPixH = ARENA_H * cameraScale;
    const offsetX = (this.width - arenaPixW) / 2;
    const offsetY = (this.height - arenaPixH) / 2;

    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(cameraScale, cameraScale);

    // Arena backdrop & starfield
    this.ctx.fillStyle = '#070b14';
    this.ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    this.terrain.drawStarfield(this.ctx);
    this.terrain.drawPortals(this.ctx);
    this.terrain.drawGuidanceBeam(this.ctx, this.rocket, this.landingPad);
    this.terrain.drawGround(this.ctx, this.lunarOutpost);

    // Environmental elements
    this.windField.update();
    this.windField.draw(this.ctx);

    this.gravityAnomalies.forEach(anom => {
      anom.update();
      anom.draw(this.ctx);
    });

    this.quantumCores.forEach(core => {
      core.update();
      core.draw(this.ctx);
    });

    this.landingPad.update();
    this.landingPad.draw(this.ctx);

    this.fuelOrbs.forEach(orb => {
      orb.update();
      orb.draw(this.ctx);
    });

    this.asteroids.forEach(ast => {
      ast.update();
      ast.draw(this.ctx);
    });

    // Rocket updates and AI guidance
    if (!this.rocket.crashed) {
      if (this.gameState === 'PLAYING') {
        if (!this.rocket.landed) {
          this.missionTimeRemaining -= (1 / 60);
          if (this.missionTimeRemaining <= 0) {
            this.overtimePenaltyCounter++;
            if (this.overtimePenaltyCounter % 60 === 0) {
              if (this.currentSectorScore > 0) {
                this.currentSectorScore = Math.max(0, this.currentSectorScore - 25);
                this.updateScore();
              }
              this.rocket.shield = Math.max(0, this.rocket.shield - 1.0);
              if (this.overtimePenaltyCounter % 180 === 0) {
                this.ui.observerSpeak(`⚠️ OVERTIME: Orbital thermal decay draining unbanked bonus and hull (-1%)! Touch down immediately!`, 'error', this.aiAutopilotActive);
                this.sound.playWarningBeep();
              }
              if (this.rocket.shield <= 0) {
                this.explodeRocket('Hull collapse due to prolonged orbital decay & thermal burnout!');
              }
            }
          }
        }

        if (this.aiAutopilotActive) {
          this.runAIPilot();
        }

        this.rocket.update(this.currentGravity, this.keys, this.sound, this.particles, this.windField, this.gravityAnomalies);
        this.checkCollisions();

        if (this.flightRecorder && !this.rocket.landed && !this.rocket.crashed && (this.telemetryCounter++ % 3 === 0)) {
          this.flightRecorder.logFrame(this.rocket, this.landingPad, this.asteroids, {
            thrust: this.keys.thrust,
            left: this.keys.left,
            right: this.keys.right,
            tag: this.keys.thrust ? (this.keys.left ? 'T+LFT' : (this.keys.right ? 'T+RGT' : 'THR')) : (this.keys.left ? 'LFT' : (this.keys.right ? 'RGT' : 'CST'))
          }, this.challengeEngine.cci, this.challengeEngine.driveState, this.windField);
        }
      }

      this.rocket.draw(this.ctx, this.keys, this.getActiveModelName(), this.landingPad);
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      p.draw(this.ctx);
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.ctx.restore(); // Pop arena transform

    // Render Radar in screen space
    this.radar.draw(this.ctx, this.width, this.height, this.rocket, this.landingPad, this.asteroids, this.fuelOrbs, this.gravityAnomalies, this.quantumCores);

    // Update gauges & telemetry
    this.ui.updateGauges(this.rocket, this.landingPad, this.missionTimeRemaining, this.missionTimeLimit, this.currentLevel, this.score, this.highScore, this.bankedScore, this.currentSectorScore);
  }

  start() {
    this.initLevel(1);
    this.loop();
    this.ui.observerSpeak("Sovereign Cluster Node 1 Ingress verified. Strict Modular Flight Stack online. Ready for mission flight.", "info", this.aiAutopilotActive);
  }
}
