// Markov Chain State Types
export interface MarkovState {
  /** The current state identifier (e.g., current note, chord, or rhythm pattern) */
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
}

export interface RhythmPattern {
  /** Pattern identifier */
  id: string;
  /** Array of beat positions (0.0 to 1.0 within a measure) */
  beats: number[];
  /** Pattern length in beats */
  length: number;
}

export interface Chord {
  /** Chord identifier */
  id: string;
  /** Array of MIDI note numbers */
  notes: number[];
  /** Chord type (major, minor, diminished, etc.) */
  type: string;
}

// Markov Chain Configuration
export interface MarkovConfig {
  /** Order of the Markov chain (how many previous states to consider) */
  order: number;
  /** Smoothing factor for probability calculations */
  smoothing: number;
  /** Maximum sequence length to generate */
  maxLength: number;
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
}
