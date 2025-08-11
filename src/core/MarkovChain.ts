/**
 * This class implements the core Markov behaviour:
 * - States represent some element
 * - Transitions represent probability distributions between states
 * - The chain "remembers" previous states to create context-aware sequences
 */

import { MarkovState, MarkovConfig } from "../types";

export class MarkovChain {
  private states: Map<string, MarkovState> = new Map();
  private config: MarkovConfig;
  private trainingData: string[][] = [];

  constructor(config: MarkovConfig) {
    this.config = config;
  }

  /**
   * Train the Markov chain with a given sequences
   * This builds the state transition probability matrix
   *
   * @param sequences Array of input sequences
   */
  train(sequences: string[][]): void {
    this.trainingData = sequences;

    // Process each sequence to build state transitions
    for (const sequence of sequences) {
      this.processSequence(sequence);
    }

    // Normalize probabilities
    this.normalizeProbabilities();
  }

  /**
   * Process a single sequence to update state transition probabilities
   */
  private processSequence(sequence: string[]): void {
    for (let i = 0; i <= sequence.length - this.config.order; i++) {
      // Create state key from current context (order number of previous elements)
      const currentContext = this.getContextKey(sequence, i);
      const nextElement = sequence[i + this.config.order];

      if (nextElement) {
        this.updateTransition(currentContext, nextElement);
      }
    }
  }

  /**
   * Create a context key from the current position in the sequence
   * This is essentially the "memory" of the Markov chain
   */
  private getContextKey(sequence: string[], position: number): string {
    const context = sequence.slice(position, position + this.config.order);
    return context.join("|");
  }

  /**
   * Update the transition probability from current context to next element
   * building the probability distribution for each state
   */
  private updateTransition(context: string, nextElement: string): void {
    // Get or create the current state
    let currentState = this.states.get(context);
    if (!currentState) {
      currentState = {
        id: context,
        transitions: new Map(),
        visitCount: 0,
      };
      this.states.set(context, currentState);
    }

    // Update transition count
    const currentCount = currentState.transitions.get(nextElement) || 0;
    currentState.transitions.set(nextElement, currentCount + 1);
    currentState.visitCount++;
  }

  /**
   * Normalize transition probabilities to sum to 1.0
   * ensuring we have a proper probability distribution
   */
  private normalizeProbabilities(): void {
    for (const state of this.states.values()) {
      const totalTransitions = Array.from(state.transitions.values()).reduce(
        (sum, count) => sum + count,
        0
      );

      // Apply smoothing to avoid zero probabilities
      const smoothing = this.config.smoothing;
      const numPossibleTransitions = state.transitions.size;

      for (const [nextElement, count] of state.transitions) {
        const smoothedCount = count + smoothing;
        const smoothedTotal = totalTransitions + smoothing * numPossibleTransitions;
        const probability = smoothedCount / smoothedTotal;
        state.transitions.set(nextElement, probability);
      }
    }
  }

  /**
   * Generate a new sequence using the trained Markov chain
   *
   * @param startContext Optional starting context
   * @returns Generated sequence
   */
  generate(startContext?: string[]): string[] {
    const sequence: string[] = [];

    // Initialize with start context or random state
    let currentContext = startContext || this.getRandomStartContext();

    // Generate sequence up to max length
    for (let i = 0; i < this.config.maxLength; i++) {
      const contextKey = currentContext.join("|");
      const nextElement = this.selectNextElement(contextKey);

      if (!nextElement) {
        break; // No valid transition found
      }

      sequence.push(nextElement);

      // Update context for next iteration
      currentContext = [...currentContext.slice(1), nextElement];
    }

    return sequence;
  }

  /**
   * Select the next element based on current context and transition probabilities
   */
  private selectNextElement(contextKey: string): string | null {
    const state = this.states.get(contextKey);
    if (!state || state.transitions.size === 0) {
      return null;
    }

    // Use weighted random selection based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const [nextElement, probability] of state.transitions) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        return nextElement;
      }
    }

    // Fallback to first element (shouldn't happen with normalized probabilities)
    return Array.from(state.transitions.keys())[0] || null;
  }

  /**
   * Get a random starting context from training data
   */
  private getRandomStartContext(): string[] {
    if (this.trainingData.length === 0) {
      throw new Error("No training data available");
    }

    const randomSequence = this.trainingData[Math.floor(Math.random() * this.trainingData.length)];
    const startIndex = Math.floor(
      Math.random() * Math.max(1, randomSequence.length - this.config.order)
    );
    return randomSequence.slice(startIndex, startIndex + this.config.order);
  }

  /**
   * Get statistics about the trained Markov chain
   */
  getStats(): {
    totalStates: number;
    totalTransitions: number;
    averageTransitionsPerState: number;
  } {
    let totalTransitions = 0;

    for (const state of this.states.values()) {
      totalTransitions += state.transitions.size;
    }

    return {
      totalStates: this.states.size,
      totalTransitions,
      averageTransitionsPerState: totalTransitions / this.states.size,
    };
  }

  /**
   * Clear all training data and reset the chain
   */
  reset(): void {
    this.states.clear();
    this.trainingData = [];
  }
}
