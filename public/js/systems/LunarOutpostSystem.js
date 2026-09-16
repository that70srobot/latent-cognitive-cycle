/**
 * Lunar Surface Space Stations & Outposts System
 * Modular colony on lunar bedrock underneath horizon line.
 * Pure ES Module
 */

import { ARENA_W, ARENA_H } from '../core/Constants.js';

export const BOT_STATIONS_META = {
  'command-r:35b': {
    name: 'COMMAND CITADEL',
    shortName: 'Command R',
    icon: '⚡',
    themeColor: '#fbbf24', // Amber Gold
    accentColor: '#d97706',
    windowColor: 'rgba(251, 191, 36, 0.85)',
    slotIndex: 0,
    x: 160,
    role: 'Industrial Regolith Smelter'
  },
  'gemma2:9b': {
    name: 'GEMMA CITADEL',
    shortName: 'Gemma 9B',
    icon: '💎',
    themeColor: '#c084fc', // Violet Diamond
    accentColor: '#9333ea',
    windowColor: 'rgba(192, 132, 252, 0.85)',
    slotIndex: 1,
    x: 390,
    role: 'Deep Core Precision Lab'
  },
  'gemma2:27b': {
    name: 'GEMMA APEX',
    shortName: 'Gemma 27B',
    icon: '🌌',
    themeColor: '#818cf8', // Indigo Quantum
    accentColor: '#4f46e5',
    windowColor: 'rgba(129, 140, 248, 0.85)',
    slotIndex: 2,
    x: 630,
    role: 'Quantum Hyper-Compute Node'
  },
  'rl': {
    name: 'DEEP-Q NEXUS',
    shortName: 'RL Agent',
    icon: '🧠',
    themeColor: '#f43f5e', // Rose / Neon Crimson
    accentColor: '#e11d48',
    windowColor: 'rgba(244, 63, 94, 0.85)',
    slotIndex: 3,
    x: 870,
    role: 'Self-Optimizing Q-Node'
  },
  'human': {
    name: 'EARTH PIONEER',
    shortName: 'Human Pilot',
    icon: '🧑‍🚀',
    themeColor: '#00f2fe', // Aqua Neon
    accentColor: '#0284c7',
    windowColor: 'rgba(0, 242, 254, 0.85)',
    slotIndex: 4,
    x: 1080,
    role: 'Primary Expedition Base'
  }
};

export const STATION_MODULE_CATALOG = [
  { id: 'hab_dome', name: 'Alpha Command Biodome', type: 'HABITAT', icon: '🏛️' },
  { id: 'solar_wing', name: 'Photovoltaic Solar Wing', type: 'POWER', icon: '☀️' },
  { id: 'comm_spire', name: 'Sub-Space Comm Dish', type: 'COMMS', icon: '📡' },
  { id: 'q_cluster', name: 'Quantum Compute Node', type: 'COMPUTE', icon: '💻' },
  { id: 'hydro_ring', name: 'Hydroponic Flora Ring', type: 'LIFE SUPPORT', icon: '🌿' },
  { id: 'cryo_tank', name: 'Hydrolox Cryo-Depot', type: 'FUEL', icon: '⛽' },
  { id: 'fusion_core', name: 'Helium-3 Fusion Core', type: 'REACTOR', icon: '⚛️' },
  { id: 'rover_bay', name: 'Autonomous Rover Hangar', type: 'LOGISTICS', icon: '🚜' },
  { id: 'laser_uplink', name: 'Optical Laser Spire', type: 'BEACON', icon: '✨' },
  { id: 'shield_pylon', name: 'Ion Forcefield Pylon', type: 'DEFENSE', icon: '🛡️' },
  { id: 'antigrav_coil', name: 'Graviton Pulse Resonator', type: 'GRAVITY', icon: '🌀' },
  { id: 'space_tether', name: 'Orbital Elevator Gantry', type: 'TRANSPORT', icon: '🚀' }
];

export class LunarOutpostSystem {
  constructor(getActiveBotKeyCallback = null) {
    this.storageKey = 'lunar_colony_stations_v2';
    this.stations = {};
    this.constructionFX = [];
    this.getActiveBotKeyCallback = getActiveBotKeyCallback || (() => 'human');
    this.initStations();
  }

  initStations() {
    let loaded = null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) loaded = JSON.parse(raw);
    } catch(e) {}

    for (const botKey in BOT_STATIONS_META) {
      if (loaded && loaded[botKey] && Array.isArray(loaded[botKey].modules)) {
        this.stations[botKey] = loaded[botKey];
      } else {
        this.stations[botKey] = {
          modules: [ STATION_MODULE_CATALOG[0] ],
          level: 1,
          touchdowns: 0
        };
      }
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stations));
    } catch(e) {}
  }

  getActiveBotKey() {
    return this.getActiveBotKeyCallback();
  }

  addModule(botKey) {
    if (!this.stations[botKey]) {
      this.stations[botKey] = { modules: [], level: 1, touchdowns: 0 };
    }
    const st = this.stations[botKey];
    st.touchdowns = (st.touchdowns || 0) + 1;

    // Choose next module in sequence with tier expansion
    const modIdx = st.modules.length % STATION_MODULE_CATALOG.length;
    const tier = Math.floor(st.modules.length / STATION_MODULE_CATALOG.length) + 1;
    const baseMod = STATION_MODULE_CATALOG[modIdx];
    const newMod = {
      ...baseMod,
      name: tier > 1 ? `${baseMod.name} Mk.${tier}` : baseMod.name,
      tier: tier,
      unlockedAt: Date.now()
    };

    st.modules.push(newMod);
    st.level = st.modules.length;
    this.save();

    // Trigger visual construction FX
    const meta = BOT_STATIONS_META[botKey] || BOT_STATIONS_META['human'];
    this.triggerConstructionEffect(meta.x, ARENA_H - 35, meta.themeColor, newMod.name, meta.shortName);

    this.updateHUD();
    return { module: newMod, totalCount: st.modules.length, botConfig: meta };
  }

  getModuleCount(botKey) {
    return (this.stations[botKey] && this.stations[botKey].modules) ? this.stations[botKey].modules.length : 0;
  }

  triggerConstructionEffect(x, y, color, moduleName, botName) {
    // Welding sparks
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI - Math.PI;
      const speed = Math.random() * 4 + 1.5;
      this.constructionFX.push({
        type: 'spark',
        x: x + (Math.random() - 0.5) * 40,
        y: y - Math.random() * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        alpha: 1.0,
        life: Math.random() * 45 + 30,
        maxLife: 60
      });
    }
    // Expanding holographic blueprint ring
    this.constructionFX.push({
      type: 'blueprint_ring',
      x: x,
      y: y - 10,
      radius: 6,
      maxRadius: 45,
      color: color,
      alpha: 1.0,
      life: 50,
      maxLife: 50
    });
    // Floating label
    this.constructionFX.push({
      type: 'text',
      x: x,
      y: y - 25,
      text: `+1 ${moduleName.toUpperCase()}`,
      color: color,
      alpha: 1.0,
      vy: -0.6,
      life: 90,
      maxLife: 90
    });
  }

  update() {
    for (let i = this.constructionFX.length - 1; i >= 0; i--) {
      const fx = this.constructionFX[i];
      fx.life--;
      if (fx.type === 'spark') {
        fx.x += fx.vx;
        fx.y += fx.vy;
        fx.vy += 0.08;
        fx.alpha = fx.life / fx.maxLife;
      } else if (fx.type === 'blueprint_ring') {
        fx.radius += (fx.maxRadius - fx.radius) * 0.1;
        fx.alpha = fx.life / fx.maxLife;
      } else if (fx.type === 'text') {
        fx.y += fx.vy;
        fx.alpha = fx.life / fx.maxLife;
      }
      if (fx.life <= 0) {
        this.constructionFX.splice(i, 1);
      }
    }
  }

  draw(ctx, groundY) {
    const activeBotKey = this.getActiveBotKey();
    const now = Date.now();

    for (const botKey in BOT_STATIONS_META) {
      const meta = BOT_STATIONS_META[botKey];
      const st = this.stations[botKey] || { modules: [] };
      const mods = st.modules;
      const isActive = (botKey === activeBotKey);
      const x = meta.x;

      ctx.save();

      // Subsurface Regolith Bedrock Foundation
      ctx.fillStyle = isActive ? 'rgba(15, 23, 42, 0.95)' : 'rgba(10, 16, 32, 0.85)';
      ctx.fillRect(x - 55, groundY + 1, 110, 32);

      // Subsurface structural border
      ctx.strokeStyle = isActive ? meta.themeColor : 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = isActive ? 1.4 : 0.8;
      ctx.strokeRect(x - 55, groundY + 1, 110, 32);

      // Subsurface Transit Tube
      ctx.strokeStyle = meta.accentColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 52, groundY + 16);
      ctx.lineTo(x + 52, groundY + 16);
      ctx.stroke();

      // Light pulse packet
      const pulseOffset = ((now * 0.04) % 104) - 52;
      ctx.fillStyle = meta.themeColor;
      ctx.beginPath();
      ctx.arc(x + pulseOffset, groundY + 16, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Active Station Beacon
      if (isActive) {
        const beaconAlpha = 0.35 + Math.sin(now * 0.006) * 0.25;
        const grad = ctx.createLinearGradient(x, groundY, x, groundY - 40);
        grad.addColorStop(0, meta.themeColor);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalAlpha = beaconAlpha;
        ctx.beginPath();
        ctx.moveTo(x - 12, groundY);
        ctx.lineTo(x + 12, groundY);
        ctx.lineTo(x + 4, groundY - 36);
        ctx.lineTo(x - 4, groundY - 36);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.font = 'bold 7px monospace';
        ctx.fillStyle = meta.themeColor;
        ctx.textAlign = 'center';
        ctx.fillText('▼ PILOT BASE ▼', x, groundY - 26 + Math.sin(now * 0.008) * 2);
      }

      // Draw Modules
      if (mods.length >= 1) {
        ctx.beginPath();
        ctx.arc(x, groundY, 13, Math.PI, 0, false);
        ctx.fillStyle = meta.windowColor;
        ctx.fill();
        ctx.strokeStyle = meta.themeColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x - 8, groundY);
        ctx.lineTo(x, groundY - 12);
        ctx.lineTo(x + 8, groundY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.fillRect(x - 6, groundY + 4, 12, 12);
        ctx.strokeStyle = meta.themeColor;
        ctx.strokeRect(x - 6, groundY + 4, 12, 12);
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(x, groundY + 10, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      if (mods.length >= 2) {
        const sx = x - 26;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, groundY);
        ctx.lineTo(sx, groundY - 16);
        ctx.stroke();

        ctx.save();
        ctx.translate(sx, groundY - 16);
        ctx.rotate(-0.25 + Math.sin(now * 0.001) * 0.08);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-8, -4, 16, 8);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-8, -4, 16, 8);
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(0, 4);
        ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
        ctx.stroke();
        ctx.restore();
      }

      if (mods.length >= 3) {
        const rx = x + 26;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(rx, groundY);
        ctx.lineTo(rx, groundY - 18);
        ctx.stroke();

        const dishAngle = (now * 0.002) % (Math.PI * 2);
        ctx.save();
        ctx.translate(rx, groundY - 18);
        ctx.strokeStyle = meta.themeColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, 7, dishAngle, dishAngle + Math.PI);
        ctx.stroke();
        if (Math.floor(now / 400) % 2 === 0) {
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(0, -2, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (mods.length >= 4) {
        const qx = x - 24;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(qx - 8, groundY + 4, 16, 11);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(qx - 8, groundY + 4, 16, 11);

        for (let b = 0; b < 3; b++) {
          ctx.fillStyle = (Math.floor(now / (200 + b * 100)) % 2 === 0) ? '#4ade80' : '#38bdf8';
          ctx.fillRect(qx - 5 + b * 4, groundY + 6, 2, 7);
        }
      }

      if (mods.length >= 5) {
        const hx = x - 44;
        ctx.beginPath();
        ctx.arc(hx, groundY - 4, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(74, 222, 128, 0.45)';
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(hx, groundY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (mods.length >= 6) {
        const cx = x + 44;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        ctx.beginPath();
        ctx.arc(cx - 4, groundY - 6, 6, 0, Math.PI * 2);
        ctx.arc(cx + 4, groundY - 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      if (mods.length >= 7) {
        const fx = x + 24;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(fx - 8, groundY + 4, 16, 11);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(fx - 8, groundY + 4, 16, 11);

        const spin = (now * 0.008) % (Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(fx, groundY + 9, 3.5, spin, spin + Math.PI);
        ctx.stroke();
      }

      if (mods.length >= 8) {
        const rovx = x - 36;
        ctx.fillStyle = '#334155';
        ctx.fillRect(rovx - 5, groundY - 4, 10, 4);
        ctx.fillStyle = 'rgba(253, 224, 71, 0.6)';
        ctx.beginPath();
        ctx.moveTo(rovx - 5, groundY - 2);
        ctx.lineTo(rovx - 14, groundY - 6);
        ctx.lineTo(rovx - 14, groundY + 1);
        ctx.closePath();
        ctx.fill();
      }

      if (mods.length >= 9) {
        const lx = x + 36;
        ctx.strokeStyle = meta.themeColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(lx, groundY);
        ctx.lineTo(lx, groundY - 24);
        ctx.stroke();

        if (Math.floor(now / 700) % 3 === 0) {
          ctx.strokeStyle = meta.themeColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(lx, groundY - 24);
          ctx.lineTo(lx, groundY - 60);
          ctx.stroke();
        }
      }

      if (mods.length >= 10) {
        ctx.strokeStyle = meta.themeColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(x, groundY, 48, Math.PI, 0, false);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (mods.length >= 11) {
        ctx.fillStyle = '#4c1d95';
        ctx.beginPath();
        ctx.arc(x, groundY + 22, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (mods.length >= 12) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, groundY - 14);
        ctx.lineTo(x, 0);
        ctx.stroke();
      }

      // Base Station Label
      ctx.font = 'bold 7.5px monospace';
      ctx.fillStyle = meta.themeColor;
      ctx.textAlign = 'center';
      ctx.fillText(`${meta.icon} ${meta.shortName}`, x, groundY + 28);

      ctx.font = '6.5px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`[${mods.length} MODS]`, x, groundY + 20);

      ctx.restore();
    }

    // Draw Construction FX
    for (const fx of this.constructionFX) {
      ctx.save();
      if (fx.type === 'spark') {
        ctx.fillStyle = fx.color;
        ctx.globalAlpha = fx.alpha;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (fx.type === 'blueprint_ring') {
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = fx.alpha;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'text') {
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = fx.color;
        ctx.globalAlpha = fx.alpha;
        ctx.textAlign = 'center';
        ctx.fillText(fx.text, fx.x, fx.y);
      }
      ctx.restore();
    }
  }

  updateHUD() {
    const activeBotKey = this.getActiveBotKey();
    const activeMeta = BOT_STATIONS_META[activeBotKey] || BOT_STATIONS_META['human'];
    const activeCount = this.getModuleCount(activeBotKey);

    const activeStationBadge = document.getElementById('activeStationBadge');
    if (activeStationBadge) {
      activeStationBadge.innerText = `${activeMeta.icon} ${activeMeta.shortName.toUpperCase()} [${activeCount} MODS]`;
      activeStationBadge.style.color = activeMeta.themeColor;
      activeStationBadge.style.borderColor = activeMeta.themeColor;
    }

    const grid = document.getElementById('stationGridTelemetry');
    if (grid) {
      let html = '';
      for (const botKey in BOT_STATIONS_META) {
        const meta = BOT_STATIONS_META[botKey];
        const count = this.getModuleCount(botKey);
        const isActive = (botKey === activeBotKey);
        html += `
          <div class="station-pilot-item ${isActive ? 'active-pilot' : ''}">
            <span class="station-pilot-name" style="color:${meta.themeColor};">${meta.icon} ${meta.shortName}</span>
            <span class="station-pilot-mods">${count} Mod${count === 1 ? '' : 's'}</span>
          </div>
        `;
      }
      grid.innerHTML = html;
    }
  }
}
