/**
 * Vector Database Engine (Curated Master & Private Model Vector Memory)
 * Cosine similarity retrieval over high-dimensional lunar trajectory embeddings.
 * Pure ES Module
 */

import { ARENA_W } from '../core/Constants.js';

export class VectorDBEngine {
  constructor(name = 'shared', storageKey = 'cosmic_vector_db_shared', maxEntries = 250, onUpdate = null) {
    this.name = name;
    this.storageKey = storageKey;
    this.maxEntries = maxEntries;
    this.onUpdate = onUpdate;
    this.vectors = [];
    this.loadVectors();
  }

  computeEmbedding(r, pad, asts = []) {
    let dx = (pad.x + pad.width / 2) - r.x;
    if (dx > ARENA_W / 2) dx -= ARENA_W;
    else if (dx < -ARENA_W / 2) dx += ARENA_W;
    const dy = pad.y - r.y;
    let angleDiff = r.angle - (-Math.PI / 2);
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    let threat = 0;
    if (asts && asts.length > 0) {
      for (const a of asts) {
        let adx = Math.abs(a.x - r.x);
        if (adx > ARENA_W / 2) adx = ARENA_W - adx;
        if (Math.hypot(adx, a.y - r.y) < 110) {
          threat = 1.0;
          break;
        }
      }
    }

    const raw = [
      Math.max(-1, Math.min(1, dx / 300)),
      Math.max(-1, Math.min(1, dy / 300)),
      Math.max(-1, Math.min(1, r.vx / 3.0)),
      Math.max(-1, Math.min(1, r.vy / 3.0)),
      Math.max(-1, Math.min(1, angleDiff / 0.8)),
      threat
    ];

    const mag = Math.sqrt(raw.reduce((acc, v) => acc + v * v, 0)) || 1;
    return raw.map(v => v / mag);
  }

  cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  queryNearest(queryVec, k = 5) {
    if (this.vectors.length === 0) return [];
    const scored = this.vectors.map(entry => ({
      entry,
      similarity: this.cosineSimilarity(queryVec, entry.embedding)
    }));
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, k);
  }

  insertMemory(embedding, outcome, action, note = '', metadata = {}) {
    this.vectors.push({
      id: Date.now() + Math.random(),
      embedding,
      outcome,
      action,
      note,
      model: this.name,
      metadata
    });
    if (this.vectors.length > this.maxEntries) {
      this.vectors.shift();
    }
    this.saveVectors();
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  saveVectors() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.vectors.slice(-120)));
    } catch (e) {}
  }

  loadVectors() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.vectors = JSON.parse(raw);
      }
    } catch (e) {}
  }
}
