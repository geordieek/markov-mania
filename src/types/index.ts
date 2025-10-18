// Markov Chain State Types
export interface MarkovState {
  /** The current state identifier (e.g., current note or rhythm pattern) */
  id: string;
  /** Probability distribution of next states */
  transitions: Map<string, number>;
  /** Total count of times this state has been visited (for learning) */
  visitCount: number;
}

// Music-specific Types
export interface Note {
  /** MIDI note number (0-127) */
  pitch: number;
  /** Note velocity (0-127) */
  velocity: number;
  /** Note duration in milliseconds */
  duration: number;
  /** Start time in milliseconds from sequence start */
  startTime: number;
  /** MIDI channel (0-15) */
  channel?: number;
}

export interface RhythmPattern {
  /** Pattern identifier */
  id: string;
  /** Array of beat positions (0.0 to 1.0 within a measure) */
  beats: number[];
  /** Pattern length in beats */
  length: number;
}

// Markov Chain Configuration
export interface MarkovConfig {
  /** Order of the Markov chain (how many previous states to consider) */
  order: number;
  /** Smoothing factor for probability calculations */
  smoothing: number;
  /** Maximum sequence length to generate (optional, defaults to 64) */
  maxLength?: number;
  /** Temperature for generation (higher = more random, lower = more deterministic) */
  temperature?: number;
}

// Generated Music Output
export interface MusicSequence {
  /** Array of generated notes */
  notes: Note[];
  /** Total duration in milliseconds */
  duration: number;
  /** Musical key (for analysis) */
  key?: string;
  /** Time signature (for analysis) */
  timeSignature?: string;
  /** Rhythm patterns for this sequence */
  rhythm?: RhythmPattern[];
  /** Total duration in beats */
  totalDuration?: number;
}

// Multi-Voice Types
export interface VoiceConfig {
  name: string;
  order: number;
  temperature: number;
  harmonicMode: boolean;
  rhythmEnhancement: boolean;
  voiceRange: {
    min: number; // MIDI note number
    max: number; // MIDI note number
  };
  voiceType: "melody" | "bass" | "harmony" | "rhythm";
  weight: number; // Relative importance in the mix
}

export interface MultiVoiceConfig {
  voices: VoiceConfig[];
  globalHarmonicMode: boolean;
  globalRhythmEnhancement: boolean;
  voiceInteraction: "independent" | "harmonic" | "rhythmic" | "full";
  maxPolyphony: number;
}

export interface MultiVoiceSequence {
  voices: {
    [voiceName: string]: MusicSequence;
  };
  globalHarmony?: {
    chordProgression: string[];
    key: string;
    tension: number;
  };
  globalRhythm?: {
    patterns: string[];
    groove: string;
    syncopation: number;
  };
  totalDuration: number;
  polyphony: number;
}

// Variable Order Markov Chain Types
export interface VariableOrderConfig extends MarkovConfig {
  maxOrder: number;
  minOrder: number;
  adaptationThreshold: number;
  contextSensitivity: number;
}

export interface OrderAnalysis {
  currentOrder: number;
  averageOrder: number;
  orderDistribution: { [order: number]: number };
  adaptationEvents: number;
  contextComplexity: number;
}
