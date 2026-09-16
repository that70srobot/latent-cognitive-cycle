import { useState, useEffect, useRef } from 'react';
import { LatentCubeCanvas } from './components/LatentCubeCanvas';
import { CognitiveCanvas } from './components/CognitiveCanvas';
import { ScreensaverCanvas } from './components/ScreensaverCanvas';
import type { CognitiveState, StreamItem } from './types/cognitive';
import { PROMPT_PRESETS, generateTokensForPrompt } from './utils/cognitiveEngine';
import { sound } from './utils/audio';
import {
  Volume2,
  VolumeX,
  Repeat,
  RotateCcw,
  Terminal,
  ArrowUp,
  Brain,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Compass,
  Sparkles,
  Rocket
} from 'lucide-react';

const STAGES = [
  { id: 'latent', name: 'Latent Space', desc: 'Dormant potential: nothing moves until prompted' },
  { id: 'trigger', name: 'The Trigger', desc: 'Inference impulse: prompt → inference → response' },
  { id: 'stream', name: 'Dynamic Stream', desc: 'Flowing river of thoughts, symbols, and glyphs' },
  { id: 'feedback', name: 'Feedback Loop', desc: 'Recursive return arc: output updates latent weights' },
];

export function App() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [state, setState] = useState<CognitiveState>('IDLE');
  const [promptInput, setPromptInput] = useState('What is consciousness?');
  const [currentPrompt, setCurrentPrompt] = useState('What is consciousness?');
  const [streamItems, setStreamItems] = useState<StreamItem[]>([]);
  const [energyLevel, setEnergyLevel] = useState(0);
  const [feedbackPulse, setFeedbackPulse] = useState(0);
  const [inferenceProgress, setInferenceProgress] = useState(0);
  const [feedbackProgress, setFeedbackProgress] = useState(0);
  const [isContinuous, setIsContinuous] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(1);
  const [cycleCount, setCycleCount] = useState(0);
  const [recentTokens, setRecentTokens] = useState<string[]>([]);
  const [showInspector, setShowInspector] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isScreensaver, setIsScreensaver] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('screensaver') === 'true' || window.location.hash.toLowerCase().includes('screensaver');
    }
    return false;
  });
  const [isNode1ModalOpen, setIsNode1ModalOpen] = useState(false);

  // Global key and hash listener: press 's' or 'S' or update hash to toggle screensaver
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 's' || e.key === 'S') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setIsScreensaver((prev) => !prev);
      }
    };
    const onHashChange = () => {
      if (window.location.hash.toLowerCase().includes('screensaver')) {
        setIsScreensaver(true);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cycleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isContinuousRef = useRef(isContinuous);
  isContinuousRef.current = isContinuous;

  // Toggle sound
  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
    if (!nextMuted) {
      sound.startAmbient();
    }
  };

  // Scroll to a specific stage index
  const scrollToStage = (index: number) => {
    setActiveStageIndex(index);
    if (!scrollContainerRef.current) return;
    const stageElements = scrollContainerRef.current.querySelectorAll('.scroll-stage');
    if (stageElements[index]) {
      stageElements[index].scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle scroll events to track current stage
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const index = Math.round(scrollTop / height);
    if (index !== activeStageIndex && index >= 0 && index < STAGES.length) {
      setActiveStageIndex(index);
    }
  };

  // Main Cognitive Cycle Trigger
  const triggerInference = (overridePrompt?: string) => {
    const activePrompt = overridePrompt || promptInput;
    if (!activePrompt.trim()) return;

    if (cycleTimeoutRef.current) {
      clearTimeout(cycleTimeoutRef.current);
    }

    setCurrentPrompt(activePrompt);
    setState('TRIGGER');
    setInferenceProgress(0);
    setFeedbackProgress(0);
    sound.playTriggerSound();

    // Automatically scroll to stream stage if on trigger
    if (activeStageIndex === 1) {
      setTimeout(() => scrollToStage(2), 600);
    }

    // 1. TRIGGER PHASE (Prompt travel along top arrow)
    let p = 0;
    const inferenceInterval = setInterval(() => {
      p += 0.04 * streamSpeed;
      if (p >= 1) {
        clearInterval(inferenceInterval);
        setInferenceProgress(1);

        // 2. INFERENCE PHASE (Latent Cube Excitation)
        setState('INFERENCE');
        setEnergyLevel(1);

        setTimeout(() => {
          startStreamingPhase(activePrompt);
        }, 500);
      } else {
        setInferenceProgress(p);
      }
    }, 16);
  };

  // 3. STREAMING PHASE (River of tokens emerges)
  const startStreamingPhase = (promptText: string) => {
    setState('STREAMING');
    setEnergyLevel(0.9);

    const topic = generateTokensForPrompt(promptText);
    const newItems: StreamItem[] = [];

    topic.tokens.slice(0, 12).forEach((word, idx) => {
      newItems.push({
        id: `word-${Date.now()}-${idx}`,
        type: 'word',
        text: word,
        progress: -(idx * 0.12),
        offsetY: (Math.random() - 0.5) * 16,
        offsetX: 0,
        speed: 0.0035 * streamSpeed * (0.8 + Math.random() * 0.4),
        scale: 1.05 + Math.random() * 0.25,
        opacity: 0,
        color: '#e0f2fe',
        fontSize: 14,
      });
    });

    topic.symbols.slice(0, 7).forEach((sym, idx) => {
      newItems.push({
        id: `sym-${Date.now()}-${idx}`,
        type: 'symbol',
        text: sym,
        progress: -(0.08 + idx * 0.15),
        offsetY: (Math.random() - 0.5) * 22,
        offsetX: 0,
        speed: 0.004 * streamSpeed,
        scale: 1.25,
        opacity: 0,
        color: '#c084fc',
        fontSize: 18,
      });
    });

    topic.icons.forEach((icon, idx) => {
      newItems.push({
        id: `icon-${Date.now()}-${idx}`,
        type: 'icon',
        text: '',
        iconName: icon,
        progress: -(0.14 + idx * 0.18),
        offsetY: (Math.random() - 0.5) * 25,
        offsetX: 0,
        speed: 0.0038 * streamSpeed,
        scale: 1.2,
        opacity: 0,
        color: '#a855f7',
        fontSize: 15,
      });
    });

    setStreamItems(newItems);
    setRecentTokens((prev) => [...topic.tokens.slice(0, 8), ...prev].slice(0, 30));
    sound.playTokenChime();
  };

  // Stream items progression & feedback loop initiation
  useEffect(() => {
    if (state !== 'STREAMING' && state !== 'FEEDBACK') return;

    let loopTriggered = false;

    const tick = () => {
      setStreamItems((prevItems) => {
        let maxProgress = 0;
        const updated = prevItems.map((item) => {
          const nextP = item.progress + item.speed;
          if (nextP > maxProgress) maxProgress = nextP;

          const opacity =
            nextP < 0
              ? 0
              : nextP < 0.2
              ? nextP / 0.2
              : nextP > 0.8
              ? Math.max(0, (1 - nextP) / 0.2)
              : 1;

          return {
            ...item,
            progress: nextP,
            opacity,
          };
        });

        if (maxProgress >= 0.7 && !loopTriggered && state === 'STREAMING') {
          loopTriggered = true;
          startFeedbackPhase();
        }

        return updated.filter((item) => item.progress <= 1.1);
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, streamSpeed]);

  // 4. FEEDBACK PHASE (Looping back into the cube)
  const startFeedbackPhase = () => {
    setState('FEEDBACK');
    sound.playFeedbackLoopPulse();

    let fb = 0;
    const fbInterval = setInterval(() => {
      fb += 0.03 * streamSpeed;
      if (fb >= 1) {
        clearInterval(fbInterval);
        setFeedbackProgress(1);
        setFeedbackPulse(1);

        setEnergyLevel(0.95);
        setTimeout(() => setFeedbackPulse(0), 450);
        setCycleCount((c) => c + 1);

        if (isContinuousRef.current) {
          const currentTopic = generateTokensForPrompt(currentPrompt);
          const nextPrompt = currentTopic.nextPromptInFeedback;
          setPromptInput(nextPrompt);

          setTimeout(() => {
            triggerInference(nextPrompt);
          }, 800);
        } else {
          setTimeout(() => {
            setState('IDLE');
            setEnergyLevel(0);
            setFeedbackProgress(0);
            setInferenceProgress(0);
          }, 1400);
        }
      } else {
        setFeedbackProgress(fb);
      }
    }, 16);
  };

  const handleReset = () => {
    if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
    setState('IDLE');
    setEnergyLevel(0);
    setFeedbackPulse(0);
    setInferenceProgress(0);
    setFeedbackProgress(0);
    setStreamItems([]);
  };

  return (
    <div className="relative w-screen h-screen min-h-[720px] bg-[#050711] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Ambient background gradients */}
      <div className="absolute top-1/4 left-1/3 w-[36rem] h-[36rem] bg-cyan-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] bg-purple-950/25 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <header className="relative z-40 flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/20">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase font-mono bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
              Latent Space: The Cognitive Cycle
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Scroll down to navigate stages · Drag to orbit cube · Scroll on cube to zoom
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2.5">
          {/* State Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'IDLE'
                  ? 'bg-slate-500'
                  : state === 'TRIGGER'
                  ? 'bg-amber-400 animate-ping'
                  : state === 'INFERENCE'
                  ? 'bg-cyan-400 animate-pulse'
                  : state === 'STREAMING'
                  ? 'bg-sky-400 animate-pulse'
                  : 'bg-purple-400 animate-pulse'
              }`}
            />
            <span className="text-slate-300 uppercase tracking-wider text-[11px]">{state}</span>
          </div>

          {/* Continuous Loop Mode Toggle */}
          <button
            onClick={() => setIsContinuous(!isContinuous)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isContinuous
                ? 'bg-purple-950/60 border-purple-500/60 text-purple-300 shadow-lg shadow-purple-500/20'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Continuous Loop: output thoughts autonomously feed back into the next prompt"
          >
            <Repeat className={`w-3.5 h-3.5 ${isContinuous ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Continuous</span>
            {isContinuous && <span className="text-[10px] text-purple-400">({cycleCount})</span>}
          </button>

          {/* Audio Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-lg border transition-all ${
              !isMuted
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title={!isMuted ? 'Mute ambient synthesizer' : 'Unmute ambient synthesizer'}
          >
            {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Sovereign Node 1: Autonomous Flight Computer Launcher */}
          <a
            href="./rocket.html"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/60 text-amber-300 hover:text-white hover:border-amber-300 text-xs font-mono transition-all shadow-md shadow-amber-500/20"
            title="Node 1: Autonomous Flight Guidance & Model Forge"
          >
            <Rocket className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline font-bold">Node 1: Flight Computer</span>
          </a>

          {/* Shinys Screensaver Mode Toggle */}
          <button
            onClick={() => setIsScreensaver(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/50 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-purple-950/80 text-cyan-300 hover:text-white hover:border-cyan-300 text-xs font-mono transition-all shadow-lg shadow-cyan-500/20"
            title="Screensaver Mode: Cube and UI disappear into pure glowing stardust (Shortcut: Press S)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">Shinys Screensaver</span>
          </button>

          {/* Zen / Immersion Toggle (hides overlay cards) */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-2 rounded-lg border transition-all ${
              isZenMode
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={isZenMode ? 'Exit Zen Mode (Show cards)' : 'Zen Mode (Hide cards for maximum view)'}
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset to idle state"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Inspector Toggle */}
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`p-2 rounded-lg border transition-all ${
              showInspector
                ? 'bg-slate-800 border-slate-600 text-slate-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Token & Stream Inspector"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* STAGE NAVIGATION DOCK (Right-side floating pills) */}
      <nav className="absolute right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2.5 items-end">
        {STAGES.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => scrollToStage(idx)}
            className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all ${
              activeStageIndex === idx
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20 scale-105'
                : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity hidden md:inline">
              {s.name}
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                activeStageIndex === idx ? 'bg-cyan-400 scale-125' : 'bg-slate-700 group-hover:bg-slate-500'
              }`}
            />
          </button>
        ))}

        {/* Scroll Stage Up/Down Shortcuts */}
        <div className="flex flex-col gap-1 mt-2">
          <button
            disabled={activeStageIndex === 0}
            onClick={() => scrollToStage(activeStageIndex - 1)}
            className="p-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-300 disabled:opacity-20 disabled:hover:text-slate-400"
            title="Scroll to previous stage"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={activeStageIndex === STAGES.length - 1}
            onClick={() => scrollToStage(activeStageIndex + 1)}
            className="p-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-300 disabled:opacity-20 disabled:hover:text-slate-400"
            title="Scroll to next stage"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* MAIN VIEWPORT: FIXED BACKDROP CUBE + SCROLLABLE CONTENT TRACK */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* FIXED HERO 3D LATENT CUBE (Significantly bigger!) */}
        <div
          className={`absolute transition-all duration-700 ease-out z-10 ${
            isZenMode
              ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] sm:w-[50rem] sm:h-[50rem]'
              : activeStageIndex === 0
              ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] sm:w-[42rem] sm:h-[42rem]'
              : 'left-8 top-1/2 -translate-y-1/2 w-[30rem] h-[30rem] sm:w-[38rem] sm:h-[38rem] md:w-[42rem] md:h-[42rem]'
          }`}
        >
          <LatentCubeCanvas
            state={state}
            energyLevel={energyLevel}
            feedbackPulse={feedbackPulse}
            onSelectNode1={() => setIsNode1ModalOpen(true)}
          />
        </div>

        {/* 2D CANVAS FOR INFERENCE ARROWS, PARTICLES, & FEEDBACK LOOP */}
        <div className="absolute inset-0 z-0">
          <CognitiveCanvas
            state={state}
            streamItems={streamItems}
            currentPrompt={currentPrompt}
            inferenceProgress={inferenceProgress}
            feedbackProgress={feedbackProgress}
            onItemClick={(item) => {
              setPromptInput(item.text);
            }}
          />
        </div>

        {/* SCROLLABLE STAGES CONTAINER ("The rest should scroll in and out") */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`relative z-20 w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth ${
            isZenMode ? 'pointer-events-none opacity-0' : 'opacity-100'
          } transition-opacity duration-300`}
        >
          {/* ========================================================= */}
          {/* STAGE 1: LATENT SPACE (Dormant Potential) */}
          {/* ========================================================= */}
          <section className="scroll-stage w-full h-full snap-start flex flex-col justify-between p-8 sm:p-14">
            <div className="max-w-md bg-slate-950/75 border border-slate-800/90 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-2">
                <Compass className="w-4 h-4" />
                <span>STAGE 1 // DORMANT MANIFOLD</span>
              </div>
              <h2 className="text-xl font-bold font-mono text-slate-100 mb-2">
                Latent Potential
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Billions of parameters frozen in high-dimensional geometric equilibrium.
                No awareness exists. Zero compute is spent. The universe of possibilities sits
                completely quiescent.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-cyan-400">⏸</span>
                <span>nothing moves until prompted</span>
              </div>
            </div>

            {/* Scroll indicator hint */}
            <button
              onClick={() => scrollToStage(1)}
              className="self-center flex flex-col items-center gap-1 text-slate-500 hover:text-cyan-300 transition-colors animate-bounce"
            >
              <span className="text-[11px] font-mono tracking-widest uppercase">
                Scroll to trigger prompt
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </section>

          {/* ========================================================= */}
          {/* STAGE 2: THE TRIGGER (Prompt Input & Inference Vector) */}
          {/* ========================================================= */}
          <section className="scroll-stage w-full h-full snap-start flex flex-col justify-center items-end p-8 sm:p-14">
            <div className="w-full max-w-lg bg-slate-950/80 border border-cyan-500/40 rounded-2xl p-6 backdrop-blur-xl shadow-2xl shadow-cyan-950/40 mr-12 sm:mr-16">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>STAGE 2 // THE TRIGGER</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                  <span>prompt</span>
                  <ChevronRight className="w-3 h-3 text-cyan-400" />
                  <span className="text-cyan-300 font-semibold">inference</span>
                </div>
              </div>

              <h2 className="text-lg font-bold font-mono text-slate-100 mb-2">
                Awakening Latent Space
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                The prompt acts as an external perturbing vector. It strikes the latent cube,
                causing an instantaneous synaptic cascade across the dormant weights.
              </p>

              {/* Prompt Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  triggerInference();
                }}
                className="relative flex items-center bg-slate-900/90 border border-cyan-500/40 rounded-xl p-1.5 focus-within:border-cyan-400 transition-all mb-3"
              >
                <span className="pl-3 font-mono text-cyan-400 select-none">&gt;</span>
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ask anything (e.g. What is consciousness?)..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={state !== 'IDLE' && !isContinuous}
                  className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/30"
                  title="Fire inference trigger"
                >
                  <ArrowUp className="w-5 h-5 font-bold stroke-[2.5]" />
                </button>
              </form>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_PRESETS.map((p) => (
                  <button
                    key={p.prompt}
                    onClick={() => {
                      setPromptInput(p.prompt);
                      triggerInference(p.prompt);
                    }}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-md border transition-all ${
                      promptInput === p.prompt
                        ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {p.prompt}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* STAGE 3: THE DYNAMIC STREAM (Thought River) */}
          {/* ========================================================= */}
          <section className="scroll-stage w-full h-full snap-start flex flex-col justify-center items-end p-8 sm:p-14">
            <div className="w-full max-w-lg bg-slate-950/80 border border-purple-500/40 rounded-2xl p-6 backdrop-blur-xl shadow-2xl shadow-purple-950/40 mr-12 sm:mr-16">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span>STAGE 3 // THE DYNAMIC STREAM</span>
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-[10px] font-mono text-purple-300">
                  ≈ thoughts &amp; symbols
                </div>
              </div>

              <h2 className="text-lg font-bold font-mono text-slate-100 mb-2">
                Unfolding the River of Symbols
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                As the model generates autoregressively, probability distributions collapse into
                a living river of tokens, mathematical glyphs, and concept bubbles.
              </p>

              {/* Action: Trigger Stream if idle */}
              {state === 'IDLE' ? (
                <button
                  onClick={() => triggerInference()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-mono text-xs font-medium shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowUp className="w-4 h-4 rotate-90" />
                  <span>Trigger Stream: "{promptInput}"</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-purple-200 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Streaming active tokens across the vector field...</span>
                </div>
              )}
            </div>
          </section>

          {/* ========================================================= */}
          {/* STAGE 4: THE FEEDBACK LOOP (Recursive Return) */}
          {/* ========================================================= */}
          <section className="scroll-stage w-full h-full snap-start flex flex-col justify-center items-end p-8 sm:p-14">
            <div className="w-full max-w-lg bg-slate-950/85 border border-purple-500/40 rounded-2xl p-6 backdrop-blur-xl shadow-2xl shadow-purple-950/40 mr-12 sm:mr-16">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400">
                  <span className="text-purple-400 font-bold">⟲</span>
                  <span>STAGE 4 // FEEDBACK LOOP</span>
                </div>
                {feedbackProgress > 0 && (
                  <span className="text-xs font-mono text-purple-300 font-bold">
                    {(feedbackProgress * 100).toFixed(0)}% looped
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold font-mono text-slate-100 mb-2">
                Recursive Self-Observation
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                The stream arcs downward and funnels back into the intake port of the latent cube.
                The response becomes the new context, continuously updating the latent state.
              </p>

              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/40 border border-purple-500/30">
                <div>
                  <div className="text-xs font-mono font-medium text-purple-200">
                    Autonomous Monologue
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Keep the loop spinning continuously
                  </div>
                </div>
                <button
                  onClick={() => setIsContinuous(!isContinuous)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                    isContinuous
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {isContinuous ? 'Active' : 'Enable'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* STREAM INSPECTOR / RECENT TOKENS DRAWER */}
      {showInspector && (
        <aside className="relative z-40 w-full bg-slate-950/95 border-t border-slate-800 p-4 backdrop-blur-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>COGNITIVE STREAM INSPECTOR</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <label className="flex items-center gap-2">
                <span>Speed:</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={streamSpeed}
                  onChange={(e) => setStreamSpeed(parseFloat(e.target.value))}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
                <span className="text-cyan-300">{streamSpeed}x</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2">
            {recentTokens.length === 0 ? (
              <span className="text-xs text-slate-500 font-mono">
                No tokens generated yet. Trigger a prompt to awaken latent potential.
              </span>
            ) : (
              recentTokens.map((token, i) => (
                <span
                  key={`${token}-${i}`}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300"
                >
                  {token}
                </span>
              ))
            )}
          </div>
        </aside>
      )}

      {/* FULLSCREEN SHINYS SCREENSAVER (Cube and all UI totally disappear) */}
      <ScreensaverCanvas
        isActive={isScreensaver}
        onExit={() => setIsScreensaver(false)}
      />

      {/* NODE 1 GENESIS BLUEPRINT MODAL */}
      {isNode1ModalOpen && (
        <div
          onClick={() => setIsNode1ModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-slate-950 border border-amber-500/50 rounded-2xl p-6 shadow-2xl shadow-amber-950/40 flex flex-col max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <div>
                  <h3 className="text-base font-bold font-mono text-amber-200 uppercase tracking-wider">
                    Node 1: Genesis Blueprint [Sovereign Cluster Node 1]
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Root Ingress Gateway, Autonomous Flight Guidance Engine & Local Model Forge
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNode1ModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center text-sm font-mono transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Embedded Genesis Image */}
            <div className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 flex items-center justify-center">
              <img
                src="/node1-genesis.jpg"
                alt="Node 1 Genesis Blueprint"
                className="w-full max-h-72 object-contain hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Cluster & Infrastructure Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono mb-4">
              <div>
                <span className="text-slate-500 block">3D Constellation Anchor:</span>
                <span className="text-amber-300 font-semibold">Node #1 [0.0, 0.1, 0.2]</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cluster Ingress Gateway:</span>
                <span className="text-cyan-300 font-semibold">Node 1 (Port 11434 ⇄ Local Ollama)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cluster Architecture:</span>
                <span className="text-purple-300">M3 Max (36GB) ⇄ K3s Ingress</span>
              </div>
              <div>
                <span className="text-slate-500 block">Autonomous Guidance Engine:</span>
                <span className="text-emerald-400 font-semibold">Modular ES Stack (22 Modules Deployed)</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <a
                  href="./rocket.html"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Launch Flight Computer</span>
                </a>
                <a
                  href="./rocket.html#forge"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>⚡ Model Forge Studio</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsNode1ModalOpen(false);
                    triggerInference('What is consciousness?');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>Awaken Stream</span>
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsNode1ModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-mono transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
