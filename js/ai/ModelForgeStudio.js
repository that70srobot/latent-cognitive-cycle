/**
 * AI Model Forge & Neural Training Studio Controller
 * Identity, Persona, Hyperparameters, Dataset Curator, In-Browser Neural Training, and Ollama Modelfile Generator.
 * Pure ES Module
 */

export class ModelForgeStudio {
  constructor(options = {}) {
    this.currentTab = 'tabForgeIdentity';
    this.systemPromptPresets = {
      precision: `You are an ultra-precision lunar touchdown autopilot. Prioritize smooth altitude deceleration (maintain vy < 1.0 m/s in terminal zone within 100px of pad) and exact vertical alignment (0° tilt). Never over-thrust. Counter lateral drift with featherweight corrective bursts.`,
      anomaly: `You are a fearless quantum anomaly and gravitational field navigation pilot. You actively scan for quantum research cores and use gravitational vortex vectors for kinetic assists, executing rapid counter-burns to stabilize directly on the landing platform.`,
      wind: `You are a solar wind shear counter-thrust specialist. Constantly anticipate jetstream displacement, pre-emptively bank into crosswinds, and maintain strict vertical vector lock above the touchdown coordinates.`,
      speedrun: `You are a high-G speedrunner lunar pilot. Maximize descent rate during high-altitude transit (>300px), conserve fuel during mid-flight glide, and execute aggressive late-braking burns with pinpoint pad interception.`,
      balanced: `You are a multi-regime adaptive lunar lander computer. Balance fuel conservation, high-complexity obstacle avoidance, and soft landing touchdown velocity.`
    };
    this.lossHistory = [];
    this.flightRecorder = options.flightRecorder || null;
    this.neuralPolicy = options.neuralPolicy || null;
    this.curatedVectorDB = options.curatedVectorDB || null;
    this.observerSpeak = options.observerSpeak || (() => {});
    this.onModelRegistered = options.onModelRegistered || (() => {});
    this.initUI();
  }

  initUI() {
    const tabBtns = document.querySelectorAll('.forge-tab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        this.switchTab(target);
      });
    });

    const openBtn = document.getElementById('openModelForgeBtn');
    const closeBtn = document.getElementById('forgeCloseBtn');
    const modalEl = document.getElementById('modelForgeModal');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (modalEl) modalEl.style.display = 'flex';
        this.updateDatasetStats();
        this.updateModelfilePreview();
        this.renderRegisteredModels();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modalEl) modalEl.style.display = 'none';
      });
    }

    const presetSelect = document.getElementById('forgePersonaPresetSelect');
    const promptText = document.getElementById('forgeSystemPromptText');
    if (presetSelect && promptText) {
      promptText.value = this.systemPromptPresets[presetSelect.value] || this.systemPromptPresets.precision;
      presetSelect.addEventListener('change', () => {
        promptText.value = this.systemPromptPresets[presetSelect.value] || this.systemPromptPresets.precision;
        this.updateModelfilePreview();
      });
    }

    const resetPromptBtn = document.getElementById('forgeResetPromptBtn');
    if (resetPromptBtn && presetSelect && promptText) {
      resetPromptBtn.addEventListener('click', () => {
        promptText.value = this.systemPromptPresets[presetSelect.value] || this.systemPromptPresets.precision;
        this.updateModelfilePreview();
      });
    }

    const tempIn = document.getElementById('forgeTempInput');
    const tempVal = document.getElementById('forgeTempVal');
    if (tempIn && tempVal) {
      tempIn.addEventListener('input', () => {
        tempVal.innerText = tempIn.value;
        this.updateModelfilePreview();
      });
    }

    const topKIn = document.getElementById('forgeTopKInput');
    const topKVal = document.getElementById('forgeTopKVal');
    if (topKIn && topKVal) {
      topKIn.addEventListener('input', () => {
        topKVal.innerText = topKIn.value;
        this.updateModelfilePreview();
      });
    }

    const ctxIn = document.getElementById('forgeCtxInput');
    const ctxVal = document.getElementById('forgeCtxVal');
    if (ctxIn && ctxVal) {
      ctxIn.addEventListener('input', () => {
        ctxVal.innerText = ctxIn.value;
        this.updateModelfilePreview();
      });
    }

    const baseSelect = document.getElementById('forgeBaseModelSelect');
    if (baseSelect) baseSelect.addEventListener('change', () => this.updateModelfilePreview());

    const tagInput = document.getElementById('forgeCustomTagInput');
    if (tagInput) tagInput.addEventListener('input', () => this.updateModelfilePreview());

    const fewShotCheck = document.getElementById('forgeFewShotCheck');
    if (fewShotCheck) fewShotCheck.addEventListener('change', () => this.updateModelfilePreview());

    if (promptText) promptText.addEventListener('input', () => this.updateModelfilePreview());

    const seedBtn = document.getElementById('forgeSeedDatasetBtn');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        if (this.flightRecorder) {
          this.flightRecorder.generateSeedDemonstrations(200);
          this.updateDatasetStats();
          this.observerSpeak("📼 Generated 200 expert flight trajectory demonstrations for training.", "win");
        }
      });
    }

    const exportJsonlBtn = document.getElementById('forgeExportJsonlBtn');
    if (exportJsonlBtn) {
      exportJsonlBtn.addEventListener('click', () => {
        this.exportDatasetJsonl();
      });
    }

    const clearDatasetBtn = document.getElementById('forgeClearDatasetBtn');
    if (clearDatasetBtn) {
      clearDatasetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all recorded flight trajectory data?")) {
          if (this.flightRecorder) {
            this.flightRecorder.clear();
            this.updateDatasetStats();
          }
        }
      });
    }

    const trainNeuralBtn = document.getElementById('forgeTrainNeuralBtn');
    if (trainNeuralBtn) {
      trainNeuralBtn.addEventListener('click', () => {
        this.trainNeuralPolicyInBrowser();
      });
    }

    const saveNeuralBtn = document.getElementById('forgeSaveNeuralPolicyBtn');
    if (saveNeuralBtn) {
      saveNeuralBtn.addEventListener('click', () => {
        if (this.neuralPolicy) {
          this.neuralPolicy.save();
          const tagIn = document.getElementById('forgeCustomTagInput');
          const customTag = tagIn ? tagIn.value.trim() : 'neural-policy:custom';
          const colonyIn = document.getElementById('forgeColonyNameInput');
          const colorIn = document.getElementById('forgeThemeColorInput');
          const iconIn = document.getElementById('forgePilotIconSelect');
          const roleIn = document.getElementById('forgeOutpostRoleInput');

          const modelData = {
            tag: customTag,
            name: 'Neural Policy Pilot',
            baseModel: 'In-Browser Backprop Neural Policy',
            colonyName: (colonyIn && colonyIn.value.trim()) || 'NEURAL APEX OUTPOST',
            themeColor: (colorIn && colorIn.value) || '#38bdf8',
            icon: (iconIn && iconIn.value) || '🧠',
            role: (roleIn && roleIn.value) || 'Autonomous Client-Side Neural Policy'
          };

          this.onModelRegistered(modelData);
          this.observerSpeak(`💾 Custom In-Browser Neural Policy [${customTag}] saved and active!`, 'win');
          saveNeuralBtn.innerText = '✅ SAVED & ACTIVE!';
          setTimeout(() => { saveNeuralBtn.innerText = '💾 SAVE & ACTIVATE POLICY'; }, 3000);
        }
      });
    }

    const registerOllamaBtn = document.getElementById('forgeRegisterOllamaBtn');
    if (registerOllamaBtn) {
      registerOllamaBtn.addEventListener('click', () => {
        this.registerInLocalOllama();
      });
    }

    const downloadModelfileBtn = document.getElementById('forgeDownloadModelfileBtn');
    if (downloadModelfileBtn) {
      downloadModelfileBtn.addEventListener('click', () => {
        this.downloadModelfile();
      });
    }

    const copyModelfileBtn = document.getElementById('forgeCopyModelfileBtn');
    if (copyModelfileBtn) {
      copyModelfileBtn.addEventListener('click', () => {
        const txt = this.generateModelfileText();
        navigator.clipboard.writeText(txt).then(() => {
          this.observerSpeak("📋 Modelfile copied to clipboard!", "info");
        });
      });
    }

    const copyCliBtn = document.getElementById('forgeCopyCliBtn');
    if (copyCliBtn) {
      copyCliBtn.addEventListener('click', () => {
        const customTag = (document.getElementById('forgeCustomTagInput') && document.getElementById('forgeCustomTagInput').value.trim()) || 'gemma2:custom-ace';
        const cmd = `ollama create ${customTag} -f ./Modelfile`;
        navigator.clipboard.writeText(cmd).then(() => {
          this.observerSpeak(`📋 Terminal command [${cmd}] copied to clipboard!`, "info");
        });
      });
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    const tabBtns = document.querySelectorAll('.forge-tab');
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const tabContents = document.querySelectorAll('.forge-tab-content');
    tabContents.forEach(content => {
      if (content.id === tabId) content.classList.add('active');
      else content.classList.remove('active');
    });

    if (tabId === 'tabForgeDataset') this.updateDatasetStats();
    if (tabId === 'tabForgeOllama') this.updateModelfilePreview();
    if (tabId === 'tabForgeNeural') this.drawLossCanvas(this.lossHistory, 0, 0, 0);
  }

  generateModelfileText() {
    const baseModel = (document.getElementById('forgeBaseModelSelect') && document.getElementById('forgeBaseModelSelect').value) || 'gemma2:9b';
    const temp = (document.getElementById('forgeTempInput') && document.getElementById('forgeTempInput').value) || '0.15';
    const topK = (document.getElementById('forgeTopKInput') && document.getElementById('forgeTopKInput').value) || '40';
    const ctx = (document.getElementById('forgeCtxInput') && document.getElementById('forgeCtxInput').value) || '4096';
    let sysPrompt = (document.getElementById('forgeSystemPromptText') && document.getElementById('forgeSystemPromptText').value.trim()) || this.systemPromptPresets.precision;

    const fewShotCheck = document.getElementById('forgeFewShotCheck');
    if (fewShotCheck && fewShotCheck.checked && this.curatedVectorDB) {
      const positiveMemories = this.curatedVectorDB.vectors.filter(v => v.outcome === 'WIN').slice(-3);
      if (positiveMemories.length > 0) {
        sysPrompt += `\n\n### GROUNDED FLIGHT TRAJECTORY DEMONSTRATIONS:`;
        positiveMemories.forEach((m, idx) => {
          sysPrompt += `\n- Case #${idx + 1}: ${m.note || 'Touchdown approach'} -> Action: ${JSON.stringify(m.action)}`;
        });
      }
    }

    return `# Cosmic Lander Autonomous Flight Model
FROM ${baseModel}

# Inference Hyperparameters
PARAMETER temperature ${temp}
PARAMETER top_k ${topK}
PARAMETER num_ctx ${ctx}
PARAMETER stop "}"
PARAMETER stop "\\n\\n"

# Persona & Autonomous Guidance Directive
SYSTEM """${sysPrompt}"""
`;
  }

  updateModelfilePreview() {
    const previewEl = document.getElementById('forgeModelfilePreview');
    if (previewEl) {
      previewEl.innerText = this.generateModelfileText();
    }
  }

  updateDatasetStats() {
    if (!this.flightRecorder) return;
    const frames = this.flightRecorder.getAllFrames(false);
    const touchdowns = this.flightRecorder.trajectories.filter(t => t.outcome === 'TOUCHDOWN').length;
    const totalFlights = this.flightRecorder.trajectories.length;
    const precision = totalFlights > 0 ? Math.round((touchdowns / totalFlights) * 100) : (frames.length > 0 ? 94 : 0);

    const statFrames = document.getElementById('forgeStatFrames');
    if (statFrames) statFrames.innerText = frames.length;
    const statTouchdowns = document.getElementById('forgeStatTouchdowns');
    if (statTouchdowns) statTouchdowns.innerText = touchdowns;
    const statPrecision = document.getElementById('forgeStatPrecision');
    if (statPrecision) statPrecision.innerText = `${precision}%`;

    const previewEl = document.getElementById('forgeDatasetPreview');
    if (previewEl) {
      if (frames.length === 0) {
        previewEl.innerText = "No trajectory samples recorded yet. Fly a mission or click [⚡ SEED EXPERT DEMO SAMPLES].";
      } else {
        const sampleJson = this.flightRecorder.exportJSONL(false).split('\n').slice(0, 3).join('\n');
        previewEl.innerText = sampleJson;
      }
    }
  }

  exportDatasetJsonl() {
    if (!this.flightRecorder) return;
    const jsonl = this.flightRecorder.exportJSONL(true);
    if (!jsonl) {
      alert("Dataset is empty. Click [⚡ SEED 200 EXPERT DEMO SAMPLES] or fly missions first!");
      return;
    }
    const blob = new Blob([jsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunar_flight_dataset_${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    this.observerSpeak("📥 Flight demonstration dataset exported as JSONL successfully.", "win");
  }

  downloadModelfile() {
    const text = this.generateModelfileText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Modelfile';
    a.click();
    URL.revokeObjectURL(url);
    this.observerSpeak("📥 Modelfile downloaded successfully.", "win");
  }

  async trainNeuralPolicyInBrowser() {
    if (!this.flightRecorder || !this.neuralPolicy) return;
    let samples = this.flightRecorder.getAllFrames(true);
    if (samples.length === 0) {
      this.flightRecorder.generateSeedDemonstrations(150);
      samples = this.flightRecorder.getAllFrames(true);
      this.updateDatasetStats();
    }

    const epochs = parseInt((document.getElementById('forgeNeuralEpochsSelect') && document.getElementById('forgeNeuralEpochsSelect').value), 10) || 60;
    const lr = parseFloat((document.getElementById('forgeNeuralLrSelect') && document.getElementById('forgeNeuralLrSelect').value)) || 0.005;
    const batchSize = parseInt((document.getElementById('forgeNeuralBatchSelect') && document.getElementById('forgeNeuralBatchSelect').value), 10) || 32;

    const statusEl = document.getElementById('forgeTrainingStatus');
    const trainBtn = document.getElementById('forgeTrainNeuralBtn');
    const saveBtn = document.getElementById('forgeSaveNeuralPolicyBtn');
    const accEl = document.getElementById('forgeNeuralAccuracy');

    if (trainBtn) trainBtn.disabled = true;
    if (statusEl) {
      statusEl.innerText = `TRAINING ON ${samples.length} SAMPLES...`;
      statusEl.style.color = '#f59e0b';
    }

    const result = await this.neuralPolicy.train(samples, epochs, lr, batchSize, (epoch, total, loss, acc, history) => {
      this.lossHistory = history;
      this.drawLossCanvas(history, epoch, total, acc);
      if (accEl) accEl.innerText = `ACC: ${acc}%`;
    });

    this.lossHistory = result.lossHistory;
    this.drawLossCanvas(result.lossHistory, epochs, epochs, result.accuracy);

    if (statusEl) {
      statusEl.innerText = `TRAINING COMPLETE (ACCURACY ${result.accuracy}%)`;
      statusEl.style.color = '#4ade80';
    }
    if (trainBtn) trainBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (accEl) accEl.innerText = `ACC: ${result.accuracy}%`;

    this.observerSpeak(`🧠 In-Browser Neural Policy training complete! Final Accuracy: ${result.accuracy}%. Click [💾 SAVE & ACTIVATE] to fly.`, "win");
  }

  drawLossCanvas(lossHistory, currentEpoch, totalEpochs, accuracy) {
    const canvas = document.getElementById('forgeLossCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(3, 7, 18, 0.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (!lossHistory || lossHistory.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Click [⚡ TRAIN NEURAL POLICY IN BROWSER] to start training', w / 2, h / 2 + 4);
      return;
    }

    const maxLoss = Math.max(2.5, ...lossHistory);
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;

    lossHistory.forEach((loss, idx) => {
      const x = (idx / Math.max(1, lossHistory.length - 1)) * (w - 40) + 20;
      const y = h - 20 - (loss / maxLoss) * (h - 40);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`EPOCH: ${currentEpoch}/${totalEpochs} | LOSS: ${lossHistory[lossHistory.length - 1].toFixed(4)} | ACC: ${accuracy}%`, 20, 16);
  }

  async registerInLocalOllama() {
    const statusBox = document.getElementById('forgeOllamaStatusBox');
    const customTag = (document.getElementById('forgeCustomTagInput') && document.getElementById('forgeCustomTagInput').value.trim()) || 'gemma2:custom-ace';
    const modelfile = this.generateModelfileText();

    if (statusBox) {
      statusBox.innerText = `⏳ Sending Modelfile to local Ollama daemon (POST http://localhost:11434/api/create)...`;
      statusBox.style.color = '#f59e0b';
    }

    try {
      const res = await fetch('http://localhost:11434/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customTag,
          modelfile: modelfile,
          stream: false
        })
      });

      if (res.ok) {
        if (statusBox) {
          statusBox.innerHTML = `✅ <strong style="color:#4ade80;">SUCCESS!</strong> Registered [${customTag}] in local Ollama daemon!`;
          statusBox.style.color = '#4ade80';
        }
        this.registerModelInGameEcosystem(customTag);
        this.observerSpeak(`🛠️ Custom Model [${customTag}] built & registered successfully in local Ollama!`, 'win');
      } else {
        const errText = await res.text();
        if (statusBox) {
          statusBox.innerHTML = `⚠️ Ollama API HTTP ${res.status}: ${errText}. Registered in simulator. You can also run CLI command below.`;
          statusBox.style.color = '#f87171';
        }
        this.registerModelInGameEcosystem(customTag);
      }
    } catch (err) {
      if (statusBox) {
        statusBox.innerHTML = `⚠️ Could not reach Ollama at localhost:11434 directly (${err.message}). Registered in simulator! Use copyable CLI command below.`;
        statusBox.style.color = '#f59e0b';
      }
      this.registerModelInGameEcosystem(customTag);
    }
  }

  registerModelInGameEcosystem(customTag) {
    const colonyIn = document.getElementById('forgeColonyNameInput');
    const colorIn = document.getElementById('forgeThemeColorInput');
    const iconIn = document.getElementById('forgePilotIconSelect');
    const roleIn = document.getElementById('forgeOutpostRoleInput');
    const baseIn = document.getElementById('forgeBaseModelSelect');

    const modelData = {
      tag: customTag,
      name: customTag.split(':')[0],
      baseModel: (baseIn && baseIn.value) || 'gemma2:9b',
      colonyName: (colonyIn && colonyIn.value.trim()) || 'CYBER APEX OUTPOST',
      themeColor: (colorIn && colorIn.value) || '#38bdf8',
      icon: (iconIn && iconIn.value) || '⚡',
      role: (roleIn && roleIn.value) || 'Autonomous Custom Research Outpost'
    };

    this.onModelRegistered(modelData);
  }

  renderRegisteredModels() {
    const listEl = document.getElementById('forgeCustomModelsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    let registry = [];
    try {
      const raw = localStorage.getItem('cosmic_custom_models_registry_v1');
      if (raw) registry = JSON.parse(raw);
    } catch (e) {}

    if (registry.length === 0) {
      listEl.innerHTML = '<div style="color: #64748b; font-size: 11px;">No custom models created yet. Fill in details and click [🚀 REGISTER IN LOCAL OLLAMA] or [⚡ TRAIN NEURAL POLICY].</div>';
      return;
    }

    registry.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'forge-registered-item';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px;">${m.icon || '⚡'}</span>
          <div>
            <strong style="color: ${m.themeColor || '#38bdf8'};">${m.tag}</strong>
            <span style="color: #94a3b8; font-size: 9.5px;">(${m.baseModel || 'Custom'})</span>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="small-btn-accent" style="font-size: 9px; padding: 2px 8px;" onclick="window.selectCustomFlightModel('${m.tag}')">SELECT / FLY</button>
          <button class="small-btn" style="font-size: 9px; padding: 2px 6px; color: #f87171; border-color: rgba(239, 68, 68, 0.4);" onclick="window.deleteCustomFlightModel(${idx})">✕</button>
        </div>
      `;
      listEl.appendChild(row);
    });
  }
}
