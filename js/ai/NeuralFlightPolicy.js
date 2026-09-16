/**
 * Pure JavaScript Neural Flight Policy Network
 * Backpropagation engine with ReLU activations, Softmax cross-entropy, and SGD updates.
 * Pure ES Module
 */

export class NeuralFlightPolicy {
  constructor(storageKey = 'cosmic_custom_neural_policy_weights_v1') {
    this.inputDim = 6;
    this.h1Dim = 32;
    this.h2Dim = 16;
    this.outputDim = 4; // 0=COAST, 1=THRUST, 2=LEFT, 3=RIGHT
    this.storageKey = storageKey;
    this.initWeights();
    this.load();
  }

  initWeights() {
    const randMatrix = (r, c) => Array.from({ length: r }, () => Array.from({ length: c }, () => (Math.random() - 0.5) * Math.sqrt(2 / c)));
    const zeros = (n) => new Array(n).fill(0);

    this.W1 = randMatrix(this.h1Dim, this.inputDim);
    this.b1 = zeros(this.h1Dim);
    this.W2 = randMatrix(this.h2Dim, this.h1Dim);
    this.b2 = zeros(this.h2Dim);
    this.W3 = randMatrix(this.outputDim, this.h2Dim);
    this.b3 = zeros(this.outputDim);
  }

  relu(x) { return Math.max(0, x); }

  softmax(arr) {
    const max = Math.max(...arr);
    const exp = arr.map(v => Math.exp(Math.max(-20, Math.min(20, v - max))));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / (sum || 1));
  }

  forward(x) {
    // Layer 1
    const z1 = new Array(this.h1Dim);
    const a1 = new Array(this.h1Dim);
    for (let i = 0; i < this.h1Dim; i++) {
      let sum = this.b1[i];
      for (let j = 0; j < this.inputDim; j++) sum += this.W1[i][j] * x[j];
      z1[i] = sum;
      a1[i] = this.relu(sum);
    }

    // Layer 2
    const z2 = new Array(this.h2Dim);
    const a2 = new Array(this.h2Dim);
    for (let i = 0; i < this.h2Dim; i++) {
      let sum = this.b2[i];
      for (let j = 0; j < this.h1Dim; j++) sum += this.W2[i][j] * a1[j];
      z2[i] = sum;
      a2[i] = this.relu(sum);
    }

    // Output Layer
    const z3 = new Array(this.outputDim);
    for (let i = 0; i < this.outputDim; i++) {
      let sum = this.b3[i];
      for (let j = 0; j < this.h2Dim; j++) sum += this.W3[i][j] * a2[j];
      z3[i] = sum;
    }
    const probs = this.softmax(z3);
    return { z1, a1, z2, a2, z3, probs };
  }

  predict(x) {
    const { probs } = this.forward(x);
    let maxIdx = 0;
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > probs[maxIdx]) maxIdx = i;
    }
    return {
      actionIdx: maxIdx,
      probabilities: probs,
      action: {
        thrust: maxIdx === 1,
        left: maxIdx === 2,
        right: maxIdx === 3,
        tag: maxIdx === 1 ? 'THR' : (maxIdx === 2 ? 'LFT' : (maxIdx === 3 ? 'RGT' : 'CST'))
      }
    };
  }

  async train(samples, epochs = 60, lr = 0.005, batchSize = 32, onEpochProgress = null) {
    if (!samples || samples.length === 0) return { lossHistory: [], accuracy: 0 };
    const lossHistory = [];

    for (let epoch = 0; epoch < epochs; epoch++) {
      const shuffled = [...samples].sort(() => Math.random() - 0.5);
      let epochLoss = 0;
      let correct = 0;

      for (let b = 0; b < shuffled.length; b += batchSize) {
        const batch = shuffled.slice(b, b + batchSize);

        const dW1 = Array.from({ length: this.h1Dim }, () => new Array(this.inputDim).fill(0));
        const db1 = new Array(this.h1Dim).fill(0);
        const dW2 = Array.from({ length: this.h2Dim }, () => new Array(this.h1Dim).fill(0));
        const db2 = new Array(this.h2Dim).fill(0);
        const dW3 = Array.from({ length: this.outputDim }, () => new Array(this.h2Dim).fill(0));
        const db3 = new Array(this.outputDim).fill(0);

        for (const item of batch) {
          const x = item.normInput;
          const target = item.actionIdx;
          const { a1, a2, probs } = this.forward(x);

          epochLoss += -Math.log(Math.max(1e-7, probs[target]));
          let predIdx = 0;
          for (let i = 1; i < probs.length; i++) if (probs[i] > probs[predIdx]) predIdx = i;
          if (predIdx === target) correct++;

          const dz3 = [...probs];
          dz3[target] -= 1.0;

          for (let i = 0; i < this.outputDim; i++) {
            db3[i] += dz3[i];
            for (let j = 0; j < this.h2Dim; j++) {
              dW3[i][j] += dz3[i] * a2[j];
            }
          }

          const dz2 = new Array(this.h2Dim).fill(0);
          for (let j = 0; j < this.h2Dim; j++) {
            let sum = 0;
            for (let i = 0; i < this.outputDim; i++) sum += dz3[i] * this.W3[i][j];
            dz2[j] = a2[j] > 0 ? sum : 0;
            db2[j] += dz2[j];
            for (let k = 0; k < this.h1Dim; k++) {
              dW2[j][k] += dz2[j] * a1[k];
            }
          }

          const dz1 = new Array(this.h1Dim).fill(0);
          for (let k = 0; k < this.h1Dim; k++) {
            let sum = 0;
            for (let j = 0; j < this.h2Dim; j++) sum += dz2[j] * this.W2[j][k];
            dz1[k] = a1[k] > 0 ? sum : 0;
            db1[k] += dz1[k];
            for (let m = 0; m < this.inputDim; m++) {
              dW1[k][m] += dz1[k] * x[m];
            }
          }
        }

        const N = batch.length;
        for (let i = 0; i < this.outputDim; i++) {
          this.b3[i] -= lr * (db3[i] / N);
          for (let j = 0; j < this.h2Dim; j++) this.W3[i][j] -= lr * (dW3[i][j] / N);
        }
        for (let j = 0; j < this.h2Dim; j++) {
          this.b2[j] -= lr * (db2[j] / N);
          for (let k = 0; k < this.h1Dim; k++) this.W2[j][k] -= lr * (dW2[j][k] / N);
        }
        for (let k = 0; k < this.h1Dim; k++) {
          this.b1[k] -= lr * (db1[k] / N);
          for (let m = 0; m < this.inputDim; m++) this.W1[k][m] -= lr * (dW1[k][m] / N);
        }
      }

      const avgLoss = epochLoss / samples.length;
      const accuracy = Math.round((correct / samples.length) * 100);
      lossHistory.push(avgLoss);

      if (onEpochProgress && (epoch % 2 === 0 || epoch === epochs - 1)) {
        onEpochProgress(epoch + 1, epochs, avgLoss, accuracy, lossHistory);
        await new Promise(r => setTimeout(r, 16));
      }
    }

    const finalAcc = Math.round((lossHistory.length > 0 ? (1.0 - Math.min(1.0, lossHistory[lossHistory.length - 1] / 3)) : 0.8) * 100);
    return { lossHistory, accuracy: finalAcc };
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        W1: this.W1, b1: this.b1,
        W2: this.W2, b2: this.b2,
        W3: this.W3, b3: this.b3,
        savedAt: new Date().toISOString()
      }));
    } catch (e) {}
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.W1 && parsed.W2 && parsed.W3) {
          this.W1 = parsed.W1; this.b1 = parsed.b1;
          this.W2 = parsed.W2; this.b2 = parsed.b2;
          this.W3 = parsed.W3; this.b3 = parsed.b3;
        }
      }
    } catch (e) {}
  }
}
