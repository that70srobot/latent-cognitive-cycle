/**
 * Cockpit HUD UI Manager
 * Handles DOM gauges, token economy, observer communications log, zoom controls, and input bindings.
 * Pure ES Module
 */

export class UIManager {
  constructor(game = null) {
    this.game = game;
    this.initDOM();
  }

  initDOM() {
    this.timerBar = document.getElementById('timerBar');
    this.fuelBar = document.getElementById('fuelBar');
    this.shieldBar = document.getElementById('shieldBar');
    this.missionTimerDisplay = document.getElementById('missionTimerDisplay');
    this.vSpeedDisplay = document.getElementById('vSpeedDisplay');
    this.hSpeedDisplay = document.getElementById('hSpeedDisplay');
    this.tiltDisplay = document.getElementById('tiltDisplay');
    this.levelDisplay = document.getElementById('levelDisplay');
    this.scoreDisplay = document.getElementById('scoreDisplay');
    this.tokenDisplay = document.getElementById('tokenDisplay');
    this.gravityDisplay = document.getElementById('gravityDisplay');
    this.observerLog = document.getElementById('observerLog');
    this.aiThought = document.getElementById('aiThought');
    this.hudStartBtn = document.getElementById('hudStartBtn');
    this.hudPauseBtn = document.getElementById('hudPauseBtn');
    this.hudResetBtn = document.getElementById('hudResetBtn');
    this.zoomDisplay = document.getElementById('zoomDisplay');
  }

  observerSpeak(msg, type = 'info', aiAutopilotActive = false) {
    const observerLog = document.getElementById('observerLog');
    const aiThought = document.getElementById('aiThought');
    const timeStr = new Date().toTimeString().split(' ')[0];

    let tagColor = '#38bdf8';
    let tagIcon = '📡';
    if (type === 'warn') { tagColor = '#f59e0b'; tagIcon = '⚠️'; }
    else if (type === 'success' || type === 'win') { tagColor = '#4ade80'; tagIcon = '🎯'; }
    else if (type === 'error') { tagColor = '#f87171'; tagIcon = '🚨'; }
    else if (type === 'curated') { tagColor = '#c084fc'; tagIcon = '🌌'; }

    if (observerLog) {
      const line = document.createElement('div');
      line.style.marginBottom = '4px';
      line.innerHTML = `<span style="color:#64748b; font-size:9px;">[${timeStr}]</span> <strong style="color:${tagColor};">${tagIcon} [OBSERVER]:</strong> <span style="color:#e2e8f0;">${msg}</span>`;
      observerLog.appendChild(line);
      while (observerLog.children.length > 45) {
        observerLog.removeChild(observerLog.firstChild);
      }
      observerLog.scrollTop = observerLog.scrollHeight;
    }
    if (aiThought && !aiAutopilotActive) {
      aiThought.innerText = `${tagIcon} ${msg}`;
    }
  }

  updateHUDButtonStates(gameState) {
    const hudPauseBtn = document.getElementById('hudPauseBtn');
    const hudStartBtn = document.getElementById('hudStartBtn');

    if (hudPauseBtn) {
      if (gameState === 'PAUSED') {
        hudPauseBtn.innerHTML = '▶ RESUME';
        hudPauseBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        hudPauseBtn.style.borderColor = '#fbbf24';
        hudPauseBtn.style.color = '#fff';
        hudPauseBtn.style.boxShadow = '0 0 10px rgba(245,158,11,0.45)';
      } else {
        hudPauseBtn.innerHTML = '⏸ PAUSE';
        hudPauseBtn.style.background = 'rgba(30, 41, 59, 0.9)';
        hudPauseBtn.style.borderColor = '#0284c7';
        hudPauseBtn.style.color = '#38bdf8';
        hudPauseBtn.style.boxShadow = 'none';
      }
    }
    if (hudStartBtn) {
      if (gameState === 'PLAYING') {
        hudStartBtn.innerHTML = '▶ FLYING';
        hudStartBtn.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
        hudStartBtn.style.borderColor = '#38bdf8';
      } else if (gameState === 'GAMEOVER') {
        hudStartBtn.innerHTML = '🔄 RETRY';
        hudStartBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        hudStartBtn.style.borderColor = '#f87171';
      } else if (gameState === 'WON') {
        hudStartBtn.innerHTML = '▶ NEXT';
        hudStartBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        hudStartBtn.style.borderColor = '#34d399';
      } else {
        hudStartBtn.innerHTML = '▶ START';
        hudStartBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        hudStartBtn.style.borderColor = '#34d399';
      }
    }
  }

  updateGauges(rocket, landingPad, missionTimeRemaining, missionTimeLimit, currentLevel, score, highScore, bankedScore, currentSectorScore) {
    if (!rocket) return;

    // Fuel Bar
    const fuelBar = document.getElementById('fuelBar');
    if (fuelBar) {
      const fuelPct = (rocket.fuel / rocket.maxFuel) * 100;
      fuelBar.style.width = `${Math.max(0, fuelPct)}%`;
      if (fuelPct < 20) fuelBar.style.background = '#ef4444';
      else if (fuelPct < 45) fuelBar.style.background = '#f59e0b';
      else fuelBar.style.background = 'linear-gradient(90deg, #38bdf8, #00f2fe)';
    }

    // Shield Bar
    const shieldBar = document.getElementById('shieldBar');
    if (shieldBar) {
      shieldBar.style.width = `${Math.max(0, rocket.shield)}%`;
      if (rocket.shield < 30) shieldBar.style.background = '#ef4444';
      else shieldBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
    }

    // Timer Bar
    const timerBar = document.getElementById('timerBar');
    const missionTimerDisplay = document.getElementById('missionTimerDisplay');
    if (timerBar && missionTimeLimit > 0) {
      const timerPct = Math.max(0, (missionTimeRemaining / missionTimeLimit) * 100);
      timerBar.style.width = `${timerPct}%`;
      if (missionTimeRemaining <= 0) {
        timerBar.style.background = '#ef4444';
        if (missionTimerDisplay) {
          missionTimerDisplay.innerText = `OVERTIME (-${Math.abs(missionTimeRemaining).toFixed(1)}s)`;
          missionTimerDisplay.style.color = '#f87171';
        }
      } else {
        if (missionTimeRemaining <= 10) timerBar.style.background = '#f59e0b';
        else timerBar.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
        if (missionTimerDisplay) {
          missionTimerDisplay.innerText = `${missionTimeRemaining.toFixed(1)}s`;
          missionTimerDisplay.style.color = missionTimeRemaining <= 10 ? '#f59e0b' : '#38bdf8';
        }
      }
    }

    // Speeds & Tilt
    const vSpeedDisplay = document.getElementById('vSpeedDisplay');
    if (vSpeedDisplay) {
      const vs = rocket.vy.toFixed(1);
      vSpeedDisplay.innerText = `${vs > 0 ? '+' : ''}${vs} m/s`;
      vSpeedDisplay.style.color = Math.abs(rocket.vy) > 2.2 ? '#f87171' : '#4ade80';
    }

    const hSpeedDisplay = document.getElementById('hSpeedDisplay');
    if (hSpeedDisplay) {
      const hs = rocket.vx.toFixed(1);
      hSpeedDisplay.innerText = `${hs > 0 ? '+' : ''}${hs} m/s`;
      hSpeedDisplay.style.color = Math.abs(rocket.vx) > 1.2 ? '#f87171' : '#4ade80';
    }

    const tiltDisplay = document.getElementById('tiltDisplay');
    if (tiltDisplay) {
      let angleDiff = rocket.angle - (-Math.PI / 2);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const deg = Math.round(angleDiff * (180 / Math.PI));
      tiltDisplay.innerText = `${deg > 0 ? '+' : ''}${deg}°`;
      tiltDisplay.style.color = Math.abs(angleDiff) > 0.32 ? '#f87171' : '#4ade80';
    }

    const levelDisplay = document.getElementById('levelDisplay');
    if (levelDisplay) levelDisplay.innerText = currentLevel;

    const scoreDisplay = document.getElementById('scoreDisplay');
    if (scoreDisplay) {
      scoreDisplay.innerText = score;
      scoreDisplay.title = `Total: ${score} pts | Banked: ${bankedScore} pts | Sector: +${currentSectorScore} pts | High Score: ${highScore} pts`;
    }

    // Pad telemetry readouts
    if (landingPad) {
      const padCenterX = landingPad.x + landingPad.width / 2;
      let dx = padCenterX - rocket.x;
      const ARENA_W = 1200;
      if (dx > ARENA_W / 2) dx -= ARENA_W;
      else if (dx < -ARENA_W / 2) dx += ARENA_W;
      const dy = landingPad.y - rocket.y;
      const dist = Math.round(Math.hypot(dx, dy));
      const angleToPad = Math.atan2(dy, dx) * (180 / Math.PI);
      const bearingStr = Math.round((angleToPad + 90 + 360) % 360);

      const footerPadDist = document.getElementById('footerPadDist');
      const footerBearing = document.getElementById('footerBearing');
      const sidebarPadDist = document.getElementById('sidebarPadDist');
      if (footerPadDist) footerPadDist.innerText = `${dist}m`;
      if (footerBearing) footerBearing.innerText = `${bearingStr}°`;
      if (sidebarPadDist) sidebarPadDist.innerText = `${dist}m`;
    }
  }
}
