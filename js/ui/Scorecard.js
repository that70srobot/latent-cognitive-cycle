/**
 * Mission Scorecard & 15-Second Debrief Controller
 * Pure ES Module
 */

export class ScorecardManager {
  constructor(options = {}) {
    this.victoryTimerInterval = null;
    this.onProceed = options.onProceed || (() => {});
    this.observerSpeak = options.observerSpeak || (() => {});
  }

  clearVictoryTimer() {
    if (this.victoryTimerInterval) {
      clearInterval(this.victoryTimerInterval);
      this.victoryTimerInterval = null;
    }
  }

  showTouchdownDebrief({
    currentLevel,
    maxLevels = 100,
    rocketFuel,
    missionTimeRemaining,
    quantumCoresHarvested = 0,
    totalQuantumCoresInLevel = 0,
    bankedScore,
    aiTokens,
    stationExpansion = null,
    onProceedCallback = null
  }) {
    this.clearVictoryTimer();

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalBtn = document.getElementById('modalBtn');

    if (!modal || !modalTitle || !modalDesc || !modalBtn) return;

    const fuelBonus = Math.floor(rocketFuel * 10);
    const speedrunBonus = missionTimeRemaining > 0 ? Math.floor(missionTimeRemaining * 20) : 0;
    const landingBonus = 1000 + fuelBonus + speedrunBonus;

    const DURATION_SEC = 15;
    const startT = Date.now();
    const targetLevel = currentLevel < maxLevels ? currentLevel + 1 : 1;

    modalTitle.innerText = currentLevel < maxLevels ? 'TOUCHDOWN CONFIRMED!' : '100 SECTORS CONQUERED!';
    modalTitle.style.color = '#4ade80';

    modalDesc.innerHTML = `
      <div class="points-card-debrief">
        <div class="points-header-badge">🚀 SECTOR ${currentLevel} MISSION POINTS DEBRIEF</div>
        <div class="points-grid">
          <div class="points-row">
            <span class="p-label">🎯 Base Touchdown</span>
            <span class="p-val" style="color:#4ade80;">+1,000 pts</span>
          </div>
          <div class="points-row">
            <span class="p-label">⛽ Fuel Efficiency (${Math.round(rocketFuel)}L)</span>
            <span class="p-val" style="color:#38bdf8;">+${fuelBonus} pts</span>
          </div>
          <div class="points-row">
            <span class="p-label">⏱️ Speedrun Precision (${Math.max(0, missionTimeRemaining).toFixed(1)}s)</span>
            <span class="p-val" style="color:${speedrunBonus > 0 ? '#38bdf8' : '#64748b'};">${speedrunBonus > 0 ? `+${speedrunBonus} pts` : '0 pts (Overtime)'}</span>
          </div>
          ${quantumCoresHarvested > 0 ? `
          <div class="points-row">
            <span class="p-label">💎 Quantum Cores (${quantumCoresHarvested}/${totalQuantumCoresInLevel})</span>
            <span class="p-val" style="color:#f472b6;">+${quantumCoresHarvested * 500} pts</span>
          </div>` : ''}
          <div class="points-row points-divider"></div>
          <div class="points-row points-highlight">
            <span class="p-label">🛡️ Career Banked Score</span>
            <span class="p-val" style="color:#fbbf24; font-size:14px;">${bankedScore} pts</span>
          </div>
          <div class="points-row">
            <span class="p-label">🪙 Council Token Reward</span>
            <span class="p-val" style="color:#fbbf24;">+50 Tokens (${aiTokens} Total)</span>
          </div>
        </div>
        ${stationExpansion ? `
        <div class="points-station-badge" style="border-left: 3px solid ${stationExpansion.botConfig.themeColor};">
          🏗️ <strong>${stationExpansion.botConfig.icon} ${stationExpansion.botConfig.shortName} Base:</strong> Built <strong>${stationExpansion.module.name}</strong> (${stationExpansion.module.type})<br>
          <span style="font-size:10px; color:#94a3b8;">Outpost Total: ${stationExpansion.totalCount} modules</span>
        </div>` : ''}
        <div class="points-timer-box">
          <div class="points-timer-track">
            <div id="pointsTimerBar" class="points-timer-bar" style="width: 100%;"></div>
          </div>
          <div id="pointsTimerText" class="points-timer-text">⏱️ Auto-launching Sector ${targetLevel} in 15.0s...</div>
        </div>
      </div>
    `;

    modalBtn.innerText = currentLevel < maxLevels ? `PROCEED TO SECTOR ${targetLevel} (15s) ▶` : `BEGIN NEW CYCLE (15s) ▶`;

    const proceedAction = () => {
      this.clearVictoryTimer();
      modal.style.display = 'none';
      if (onProceedCallback) onProceedCallback(targetLevel);
      else this.onProceed(targetLevel);
    };

    modalBtn.onclick = proceedAction;
    modal.style.display = 'flex';

    this.victoryTimerInterval = setInterval(() => {
      const elapsed = Date.now() - startT;
      const remaining = Math.max(0, (DURATION_SEC * 1000 - elapsed) / 1000);
      const frac = Math.max(0, remaining / DURATION_SEC);

      const timerBar = document.getElementById('pointsTimerBar');
      if (timerBar) timerBar.style.width = `${(frac * 100).toFixed(1)}%`;

      const timerText = document.getElementById('pointsTimerText');
      if (timerText) timerText.innerText = `⏱️ Auto-launching Sector ${targetLevel} in ${remaining.toFixed(1)}s...`;

      if (modalBtn) modalBtn.innerText = currentLevel < maxLevels ? `PROCEED TO SECTOR ${targetLevel} (${Math.ceil(remaining)}s) ▶` : `BEGIN NEW CYCLE (${Math.ceil(remaining)}s) ▶`;

      if (remaining <= 0) {
        this.clearVictoryTimer();
        proceedAction();
      }
    }, 100);

    return landingBonus;
  }
}
