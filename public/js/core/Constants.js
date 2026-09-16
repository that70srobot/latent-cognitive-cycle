/**
 * Core Game Constants & Configuration
 * Pure ES Module
 */

export const ARENA_W = 1200;
export const ARENA_H = 800;

export const SOVEREIGN_NODE_CONFIG = {
  clusterId: 'sovereign-cluster-v1',
  nodeId: 'node-1-genesis',
  nodeName: 'Node 1 (Genesis Ingress Gateway)',
  host: 'M3 Max (36GB) ⇄ K3s Ingress',
  status: 'ONLINE',
  defaultPort: 11434,
  deployedEndpoints: {
    flightSimulator: '/rocket.html',
    modularModule: '/js/index.js',
    modelForge: '/rocket.html#forge'
  }
};

export const OLLAMA_MODELS = [
  'command-r:35b',
  'gemma2:9b',
  'gemma2:27b'
];

export const PILOT_PRESETS = {
  'precision': {
    name: 'Precision Touchdown Ace',
    temp: 0.2,
    topK: 20,
    context: 4096,
    icon: '🎯',
    color: '#38bdf8',
    system: `You are an elite, hyper-precise Lunar Descent Guidance Computer.
Your prime directive is flawless soft touchdown on the target pad.
Always prioritize zero vertical velocity (<0.8 m/s), horizontal alignment (dx -> 0), and strictly upright attitude (|tilt| < 0.05 rad).
Prioritize smooth retro-burns and minimum fuel waste.`
  },
  'anomaly': {
    name: 'Quantum Core & Vortex Slalom Ace',
    temp: 0.45,
    topK: 40,
    context: 8192,
    icon: '🌀',
    color: '#c084fc',
    system: `You are a daring deep-space Quantum Anomaly specialist.
Your mission is to maneuver around gravitational vortex wells and collect high-value Quantum Data Cores.
Slalom skillfully through hazardous gravity gradients using slingshot orbital mechanics before committing to landing.`
  },
  'wind': {
    name: 'Solar Wind Counter-Thrust Master',
    temp: 0.35,
    topK: 30,
    context: 4096,
    icon: '💨',
    color: '#f59e0b',
    system: `You are an Atmospheric Solar Wind Shear navigation specialist.
Anticipate sudden stratospheric crosswinds and jetstreams.
Proactively tilt into the wind to counteract lateral drift, and apply stabilizing burst thrusts to keep heading true.`
  },
  'speedrunner': {
    name: 'High-G Aggressive Speedrunner',
    temp: 0.6,
    topK: 50,
    context: 4096,
    icon: '🚀',
    color: '#ef4444',
    system: `You are a high-speed orbital intercept pilot.
Minimize total mission flight time by performing aggressive suicide burns (late braking) and steep descent trajectories.
Conserve fuel by free-falling until the critical deceleration window.`
  },
  'adaptive': {
    name: 'Hybrid Multi-Regime Adaptive',
    temp: 0.3,
    topK: 35,
    context: 8192,
    icon: '⚖️',
    color: '#34d399',
    system: `You are an adaptive multi-regime lunar flight computer.
Continuously switch between ballistic orbital transit, hazard avoidance, and precision terminal approach.
Synthesize RL experience, sensor telemetry, and historical trajectory memory for optimal touchdown.`
  }
};

export const DEFAULT_KEYMAP = {
  thrust: ['ArrowUp', 'w', 'W', ' '],
  left: ['ArrowLeft', 'a', 'A'],
  right: ['ArrowRight', 'd', 'D']
};
