/**
 * Autonomous Flight Supervisor & Health Monitor
 * Stall watchdog, anomalous trajectory corrector, and curated vector memory gatekeeper.
 * Pure ES Module
 */

import { ARENA_W } from '../core/Constants.js';

export class AutonomousSupervisor {
  constructor(options = {}) {
    this.consecutiveCrashes = 0;
    this.consecutiveWins = 0;
    this.lastHeartbeat = Date.now();
    this.stallDetectTime = 0;
    this.prevRocketX = null;
    this.prevRocketY = null;

    this.curatedVectorDB = options.curatedVectorDB || null;
    this.getActivePrivateDBCallback = options.getActivePrivateDBCallback || (() => null);
    this.getActiveModelCallback = options.getActiveModelCallback || (() => 'command-r:35b');
    this.observerSpeak = options.observerSpeak || (() => {});
    this.onReconfigure = options.onReconfigure || (() => {});

    // Health monitor check every 1.5 seconds
    setInterval(() => this.runSupervisoryCheck(), 1500);
  }

  runSupervisoryCheck() {
    const watchdogStatus = document.getElementById('watchdogStatus');
    const supervisorAction = document.getElementById('supervisorAction');
    const modal = document.getElementById('modal');
    const modalBtn = document.getElementById('modalBtn');

    // 1. STALL WATCHDOG
    if (window.LunarLanderGameState === 'MENU' || window.LunarLanderGameState === 'GAMEOVER') {
      if (modal && modal.style.display !== 'none') {
        if (watchdogStatus) watchdogStatus.innerText = 'RELAUNCHING';
        if (supervisorAction) supervisorAction.innerText = 'AUTO-PROCEED';
        setTimeout(() => { if (modalBtn) modalBtn.click(); }, 300);
      }
    }

    if (this.consecutiveCrashes >= 3) {
      this.reconfigureCouncil("Consecutive crash threshold exceeded");
    } else if (this.consecutiveWins >= 3) {
      if (supervisorAction) supervisorAction.innerText = 'OPTIMIZING';
    } else {
      if (supervisorAction) supervisorAction.innerText = 'HEALTHY';
    }

    if (watchdogStatus) watchdogStatus.innerText = 'MONITORING';
  }

  recordOutcome(success) {
    if (success) {
      this.consecutiveWins++;
      this.consecutiveCrashes = 0;
    } else {
      this.consecutiveCrashes++;
      this.consecutiveWins = 0;
    }
  }

  curateFlightEpisode(success, r, pad, asts, finalAction, note, flightCheckpoints = [], currentLevel = 1) {
    this.recordOutcome(success);
    const currentM = this.getActiveModelCallback();
    const pvtDB = this.getActivePrivateDBCallback();
    const supervisorAction = document.getElementById('supervisorAction');

    if (!this.curatedVectorDB) return;
    const emb = this.curatedVectorDB.computeEmbedding(r, pad, asts);

    if (success) {
      if (pvtDB) {
        pvtDB.insertMemory(emb, 'WIN', finalAction, `[${currentM}] ${note}`);
        if (flightCheckpoints && flightCheckpoints.length > 0) {
          const step = Math.max(1, Math.floor(flightCheckpoints.length / 3));
          for (let idx = 0; idx < flightCheckpoints.length; idx += step) {
            const cp = flightCheckpoints[idx];
            const alt = Math.round(cp.padY - cp.y);
            const phase = alt > 240 ? 'HIGH_APPROACH' : (alt > 90 ? 'MID_GLIDE' : 'FINAL_FLARE');
            pvtDB.insertMemory(cp.emb, 'WIN', cp.action, `[${currentM}] ${phase} (+${alt}px)`);
          }
        }
      }

      const vy = Math.abs(r.vy);
      const vx = Math.abs(r.vx);
      let tilt = Math.abs(r.angle - (-Math.PI / 2));
      while (tilt > Math.PI) tilt -= Math.PI * 2;
      tilt = Math.abs(tilt);

      const safeDescent = vy <= 2.2 && vx <= 1.2 && tilt <= 0.35;
      if (safeDescent) {
        const nearestCurated = this.curatedVectorDB.queryNearest(emb, 1);
        const isDuplicate = nearestCurated.length > 0 && nearestCurated[0].similarity > 0.96;

        if (!isDuplicate) {
          const quality = Number((1.0 - Math.min(0.4, tilt) - Math.min(0.3, vy * 0.12)).toFixed(2));
          this.curatedVectorDB.insertMemory(emb, 'WIN', finalAction, `Curated [${currentM}] Touchdown`, {
            promotedBy: 'AutonomousSupervisor',
            sourceModel: currentM,
            qualityScore: quality,
            sector: currentLevel
          });

          if (supervisorAction) {
            supervisorAction.innerText = `PROMOTED [${currentM.split(':')[0]}]`;
            supervisorAction.style.color = '#c084fc';
            setTimeout(() => { if (supervisorAction) supervisorAction.style.color = '#38bdf8'; }, 2200);
          }
          this.observerSpeak(`Observer Curated: [${currentM}] touchdown promoted to Master Vector DB (Quality: ${quality}).`, 'curated');
        }
      }
    } else {
      if (pvtDB) {
        pvtDB.insertMemory(emb, 'CRASH', finalAction, `[${currentM}] ${note}`);
      }

      let hitAsteroid = false;
      if (asts && asts.length > 0) {
        for (const a of asts) {
          let adx = Math.abs(a.x - r.x);
          if (adx > ARENA_W / 2) adx = ARENA_W - adx;
          if (Math.hypot(adx, a.y - r.y) < 70) {
            hitAsteroid = true;
            break;
          }
        }
      }

      if (hitAsteroid) {
        const nearestHazard = this.curatedVectorDB.queryNearest(emb, 1);
        if (nearestHazard.length === 0 || nearestHazard[0].similarity < 0.92) {
          this.curatedVectorDB.insertMemory(emb, 'HAZARD', { thrust: false, left: false, right: false }, `Curated Hazard Zone: Asteroid threat`, {
            promotedBy: 'AutonomousSupervisor',
            hazardType: 'ASTEROID'
          });
          if (supervisorAction) {
            supervisorAction.innerText = `CURATED HAZARD`;
            supervisorAction.style.color = '#f87171';
            setTimeout(() => { if (supervisorAction) supervisorAction.style.color = '#38bdf8'; }, 2000);
          }
          this.observerSpeak("Observer: Hazard vector logged in Shared Master DB (Asteroid threat).", "warn");
        }
      }
    }
  }

  reconfigureCouncil(triggerReason) {
    this.onReconfigure();
    const newModel = this.getActiveModelCallback();
    const supervisorAction = document.getElementById('supervisorAction');

    if (supervisorAction) {
      supervisorAction.innerText = `RECONFIG: [${newModel.split(':')[0]}]`;
      supervisorAction.style.color = '#f59e0b';
      setTimeout(() => { if (supervisorAction) supervisorAction.style.color = '#38bdf8'; }, 2000);
    }

    this.observerSpeak(`Supervisor Intervened: ${triggerReason}. Reconfigured to [${newModel}] & tuned RL exploration.`, 'warn');
    this.consecutiveCrashes = 0;
  }
}
