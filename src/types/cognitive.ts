export type CognitiveState = 'IDLE' | 'TRIGGER' | 'INFERENCE' | 'STREAMING' | 'FEEDBACK';

export interface StreamItem {
  id: string;
  type: 'word' | 'symbol' | 'icon';
  text: string;
  iconName?: 'brain' | 'heart' | 'lightbulb' | 'infinity' | 'cube' | 'sigma' | 'sparkles';
  progress: number; // 0 (leaving cube) to 1 (re-entering feedback loop)
  offsetY: number;
  offsetX: number;
  speed: number;
  scale: number;
  opacity: number;
  color: string;
  fontSize: number;
}

export interface PromptTopic {
  prompt: string;
  summary: string;
  tokens: string[];
  symbols: string[];
  icons: ('brain' | 'heart' | 'lightbulb' | 'infinity' | 'cube' | 'sigma')[];
  nextPromptInFeedback: string;
}
