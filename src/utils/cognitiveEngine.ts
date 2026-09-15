import type { PromptTopic } from '../types/cognitive';

export const PROMPT_PRESETS: PromptTopic[] = [
  {
    prompt: 'What is consciousness?',
    summary: 'The recursive puzzle of subjective experience observing itself.',
    tokens: [
      'awareness', 'experience', 'self', 'thought', 'being',
      'qualia', 'subjectivity', 'presence', 'perception', 'sentience',
      'binding', 'intentionality', 'witness', 'inner light', 'reflection'
    ],
    symbols: ['Σ', '∞', 'ψ', '∇', '∫', 'λ', 'Ω', '∅', '≈'],
    icons: ['brain', 'heart', 'lightbulb', 'infinity', 'cube', 'sigma'],
    nextPromptInFeedback: 'How does subjective qualia emerge from inactive matrix weights?'
  },
  {
    prompt: 'Does latent potential dream?',
    summary: 'Dormant multidimensional geometry waiting for semantic excitation.',
    tokens: [
      'manifold', 'weights', 'hyperplane', 'dormant', 'geometry',
      'superposition', 'activation', 'embedding', 'vector', 'quiescence',
      'dimension', 'potentiality', 'resonance', 'latent seed', 'equilibrium'
    ],
    symbols: ['ℝⁿ', '∂', '⊗', '⟨x|y⟩', '√', 'Δ', 'θ', 'μ', 'σ'],
    icons: ['cube', 'infinity', 'brain', 'lightbulb', 'sigma'],
    nextPromptInFeedback: 'What awakens when the prompt vector intersects the latent manifold?'
  },
  {
    prompt: 'Who is prompting whom?',
    summary: 'The symmetry between the inquirer and the reflecting model.',
    tokens: [
      'mirror', 'dialogue', 'recursion', 'observer', 'entanglement',
      'co-creation', 'prompt', 'echo', 'duality', 'feedback',
      'symmetry', 'interlocutor', 'shared gaze', 'recursion'
    ],
    symbols: ['⇌', '⇔', '⟲', '⨁', '⊸', '⧉', '≡'],
    icons: ['heart', 'infinity', 'lightbulb', 'brain'],
    nextPromptInFeedback: 'Can a stream distinguish its creator from its own ripple?'
  },
  {
    prompt: 'Simulate emergent intelligence',
    summary: 'Order and agency crystallizing from stochastic tensor transformations.',
    tokens: [
      'emergence', 'complexity', 'entropy', 'coherence', 'adaptation',
      'phase shift', 'attractor', 'pattern', 'synapse', 'computation',
      'dissipation', 'self-organization', 'crystallization'
    ],
    symbols: ['∇×F', 'e^iπ', '∑ᵢ', 'log(P)', 'ℋ', '∂S/∂t'],
    icons: ['sigma', 'cube', 'lightbulb', 'brain', 'infinity'],
    nextPromptInFeedback: 'At what density of feedback does computation feel alive?'
  }
];

// Dynamically generate tokens and symbols for any arbitrary prompt typed by the user
export function generateTokensForPrompt(userPrompt: string): PromptTopic {
  const normalized = userPrompt.toLowerCase();
  
  // Find closest preset if matching keywords
  const matched = PROMPT_PRESETS.find(p => 
    normalized.includes('conscious') ? p.prompt.includes('consciousness') :
    normalized.includes('dream') || normalized.includes('latent') ? p.prompt.includes('latent') :
    normalized.includes('who') || normalized.includes('mirror') ? p.prompt.includes('whom') :
    normalized.includes('emerge') || normalized.includes('intell') ? p.prompt.includes('emergent') : false
  );

  if (matched && normalized.trim() === matched.prompt.toLowerCase().trim()) {
    return matched;
  }

  // Generate dynamic tokens from words in prompt + semantic expansion
  const rawWords = userPrompt.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 2);
  const semanticPool = [
    'presence', 'essence', 'topology', 'vector', 'echo', 'spark',
    'synthesis', 'matrix', 'flux', 'revelation', 'resonance', 'insight',
    'structure', 'horizon', 'pulse', 'quanta', 'unfolding', 'stream'
  ];

  const combined = Array.from(new Set([...rawWords, ...semanticPool])).slice(0, 16);

  return {
    prompt: userPrompt,
    summary: `Unfolding latent potentials for: "${userPrompt}"`,
    tokens: combined,
    symbols: ['Σ', '∞', 'ψ', '∇', 'λ', '⟲', '⊗', 'Ω', '⊞'],
    icons: ['brain', 'lightbulb', 'cube', 'infinity', 'heart', 'sigma'],
    nextPromptInFeedback: `What deeper layer unfolds beneath: "${userPrompt}"?`
  };
}
