/**
 * Main ES Module Entry Point for Cosmic Lander Space Rocket Game
 * Exports all modular subsystems for external ESM consumption and registers window.LunarLanderGame.
 */

export * from './core/Constants.js';
export * from './core/SoundFX.js';
export * from './core/EventBus.js';
export * from './entities/Rocket.js';
export * from './entities/Particles.js';
export * from './entities/Obstacles.js';
export * from './environment/Environment.js';
export * from './environment/Terrain.js';
export * from './systems/ChallengeEngine.js';
export * from './systems/LunarOutpostSystem.js';
export * from './ai/QLearningAgent.js';
export * from './ai/VectorDBEngine.js';
export * from './ai/FlightTrajectoryRecorder.js';
export * from './ai/NeuralFlightPolicy.js';
export * from './ai/ModelForgeStudio.js';
export * from './ai/FlightRegimeArbiter.js';
export * from './ai/AutonomousSupervisor.js';
export * from './ui/Radar.js';
export * from './ui/Scorecard.js';
export * from './ui/UIManager.js';
export { LunarLanderGame } from './Game.js';

import { LunarLanderGame } from './Game.js';

// Auto-initialize when loaded directly in browser environment
if (typeof window !== 'undefined') {
  window.LunarLanderGame = LunarLanderGame;

  // Global helper actions for Custom Models modal
  window.selectCustomFlightModel = function(tag) {
    if (window.gameInstance) {
      const ollamaModelSelect = document.getElementById('ollamaModelSelect');
      if (ollamaModelSelect) {
        ollamaModelSelect.value = tag;
        const idx = window.gameInstance.models.indexOf(tag);
        if (idx !== -1) window.gameInstance.currentModelIndex = idx;
        window.gameInstance.lunarOutpost.updateHUD();
        window.gameInstance.updateVectorHUD();
      }
      const modalEl = document.getElementById('modelForgeModal');
      if (modalEl) modalEl.style.display = 'none';
      window.gameInstance.ui.observerSpeak(`🚀 Active Flight Pilot switched to Custom Model [${tag}]!`, 'win', window.gameInstance.aiAutopilotActive);
    }
  };

  window.deleteCustomFlightModel = function(idx) {
    try {
      let registry = [];
      const raw = localStorage.getItem('cosmic_custom_models_registry_v1');
      if (raw) registry = JSON.parse(raw);
      if (registry[idx] && window.gameInstance) {
        const tag = registry[idx].tag;
        registry.splice(idx, 1);
        localStorage.setItem('cosmic_custom_models_registry_v1', JSON.stringify(registry));
        const oIdx = window.gameInstance.models.indexOf(tag);
        if (oIdx !== -1) window.gameInstance.models.splice(oIdx, 1);
        const ollamaModelSelect = document.getElementById('ollamaModelSelect');
        if (ollamaModelSelect) {
          for (let i = 0; i < ollamaModelSelect.options.length; i++) {
            if (ollamaModelSelect.options[i].value === tag) {
              ollamaModelSelect.remove(i);
              break;
            }
          }
        }
        if (window.gameInstance.modelForge) {
          window.gameInstance.modelForge.renderRegisteredModels();
        }
      }
    } catch (e) {}
  };

  const initGame = () => {
    if (document.getElementById('gameCanvas') && !window.gameInstance) {
      window.gameInstance = new LunarLanderGame();
      window.gameInstance.start();
    }
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
}
