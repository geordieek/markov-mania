// Markov Chain State Types
export interface MarkovState {
  /** The current state identifier (e.g., current note, chord, or rhythm pattern) */
  id: string;
  /** Probability distribution of next states */
  transitions: Map<string, number>;
  /** Total count of times this state has been visited (for learning) */
  visitCount: number;
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
