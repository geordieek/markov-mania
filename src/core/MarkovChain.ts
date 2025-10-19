/**
 * This class implements the core Markov behaviour:
 * - States represent some element
 * - Transitions represent probability distributions between states
 * - The chain "remembers" previous states to create context-aware sequences
 */

import { MarkovState, MarkovConfig } from "../types";

export class MarkovChain {
  protected states: Map<string, MarkovState> = new Map();
  protected config: MarkovConfig;
  protected trainingData: string[][] = [];

  constructor(config: MarkovConfig) {
    this.config = config;
  }

  getConfig(): MarkovConfig {
    return this.config;
  }

  /**
   * Train the Markov chain with musical sequences
   * This builds the state transition probability matrix
   *
   * @param sequences Array of musical sequences (e.g., note sequences, rhythm patterns)
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
   * Append additional training data to an already trained chain
   * This allows for incremental learning without retraining from scratch
   *
   * @param sequences Array of additional musical sequences to append
   */
  trainAppend(sequences: string[][]): void {
    // Add new sequences to existing training data
    this.trainingData.push(...sequences);

    // Process each new sequence to update state transitions
    for (const sequence of sequences) {
      this.processSequence(sequence);
    }

    // Renormalize probabilities to account for new data
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
   * This represents the "memory" of the Markov chain
   */
  private getContextKey(sequence: string[], position: number): string {
    const context = sequence.slice(position, position + this.config.order);
    return context.join("|");
  }

  /**
   * Update the transition probability from current context to next element
   * This builds the probability distribution for each state
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
    const newCount = currentCount + 1;
    currentState.transitions.set(nextElement, newCount);
    currentState.visitCount++;
  }

  /**
   * Normalize transition probabilities to sum to 1.0
   * This ensures we have a proper probability distribution
   */
  private normalizeProbabilities(): void {
    for (const state of this.states.values()) {
      const totalTransitions = Array.from(state.transitions.values()).reduce(
        (sum, count) => sum + count,
        0
      );

      // Apply smoothing
      const smoothing = this.config.smoothing;
      const numElements = state.transitions.size;

      // Add smoothing only to elements that already exist in this state
      for (const [element, count] of state.transitions) {
        const smoothedCount = count + smoothing;
        state.transitions.set(element, smoothedCount);
      }

      // Now normalize to sum to 1.0
      const smoothedTotal = totalTransitions + smoothing * numElements;
      for (const [nextElement, count] of state.transitions) {
        const probability = count / smoothedTotal;
        state.transitions.set(nextElement, probability);
      }
    }
  }

  /**
   * Generate a new sequence using the trained Markov chain
   *
   * @param length Desired sequence length (defaults to maxLength)
   * @param startContext Optional starting context
   * @returns Generated sequence
   */
  generate(length: number, startContext?: string[]): string[] {
    const result = this.generateWithSteps(length, startContext);
    return result.sequence;
  }

  /**
   * Generate a sequence with repetition prevention
   * This method actively prevents repetitive patterns by tracking recent elements
   */
  generateWithRepetitionPrevention(
    length: number,
    startContext?: string[],
    maxRepetition: number = 3,
    restartInterval?: number,
    enableLongTermPrevention: boolean = true
  ): string[] {
    const sequence: string[] = [];
    let currentContext = startContext || this.getRandomStartContext();
    const recentElements: string[] = [];
    const actualRestartInterval = restartInterval || Math.min(32, Math.floor(length / 4)); // Restart every 1/4 of sequence length

    for (let i = 0; i < length; i++) {
      // Periodic restart to prevent long-term repetition
      if (i > 0 && i % actualRestartInterval === 0 && i < length - 4) {
        // Restart with a new random context to break repetitive patterns
        currentContext = this.getRandomStartContext();
        console.log(`Restarting context at position ${i} to prevent repetition`);
      }

      const contextKey = currentContext.join("|");
      const state = this.states.get(contextKey);

      let selectedElement = "";
      let attempts = 0;
      const maxAttempts = 15; // Increased attempts for longer sequences

      while (attempts < maxAttempts) {
        let candidateElement = "";

        if (!state || state.transitions.size === 0) {
          // Use fallback state
          const fallbackState = this.findFallbackState(currentContext);
          if (!fallbackState) break;

          const transitions = this.applyTemperature(fallbackState.transitions);
          candidateElement = this.selectFromTransitions(transitions);
        } else {
          // Use normal state
          const transitions = this.applyTemperature(state.transitions);
          candidateElement = this.selectFromTransitions(transitions);
        }

        // Check if this element would create too much repetition
        if (this.wouldCreateExcessiveRepetition(candidateElement, recentElements, maxRepetition)) {
          attempts++;
          continue;
        }

        // Additional check for longer-term patterns
        if (
          enableLongTermPrevention &&
          this.wouldCreateLongTermRepetition(candidateElement, sequence, i)
        ) {
          attempts++;
          continue;
        }

        selectedElement = candidateElement;
        break;
      }

      // If we couldn't find a non-repetitive element, use the best available
      if (!selectedElement) {
        const fallbackState = this.findFallbackState(currentContext);
        if (fallbackState) {
          const transitions = this.applyTemperature(fallbackState.transitions);
          selectedElement = this.selectFromTransitions(transitions);
        } else {
          break;
        }
      }

      sequence.push(selectedElement);

      // Update recent elements tracking
      recentElements.push(selectedElement);
      if (recentElements.length > maxRepetition * 2) {
        recentElements.shift();
      }

      // Update context for next iteration
      currentContext = [...currentContext.slice(1), selectedElement];
    }

    return sequence;
  }

  /**
   * Check if adding an element would create excessive repetition
   */
  private wouldCreateExcessiveRepetition(
    element: string,
    recentElements: string[],
    maxRepetition: number
  ): boolean {
    if (recentElements.length < maxRepetition) return false;

    // Check if the last maxRepetition elements are all the same as the candidate
    const lastElements = recentElements.slice(-maxRepetition);
    return lastElements.every((e) => e === element);
  }

  /**
   * Check if adding an element would create long-term repetitive patterns
   * This detects patterns that repeat over longer spans of the sequence
   */
  private wouldCreateLongTermRepetition(
    element: string,
    sequence: string[],
    currentIndex: number
  ): boolean {
    if (sequence.length < 8) return false; // Need enough history

    // Check for patterns of length 2-4 that might be repeating
    for (let patternLength = 2; patternLength <= 4; patternLength++) {
      if (currentIndex < patternLength * 2) continue;

      // Look for the pattern ending with the candidate element
      const candidatePattern = [...sequence.slice(-patternLength + 1), element];

      // Check if this pattern has appeared recently
      for (let i = 0; i <= sequence.length - patternLength; i++) {
        const existingPattern = sequence.slice(i, i + patternLength);
        if (this.arraysEqual(candidatePattern, existingPattern)) {
          // Pattern found - check if it's too recent
          const distance = currentIndex - i;
          if (distance < patternLength * 2) {
            return true; // Pattern too recent, would create repetition
          }
        }
      }
    }

    return false;
  }

  /**
   * Helper method to compare arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  /**
   * Select an element from transitions using weighted random selection
   */
  private selectFromTransitions(transitions: Map<string, number>): string {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const [element, probability] of transitions) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        return element;
      }
    }

    // Fallback to first element
    return Array.from(transitions.keys())[0] || "";
  }

  /**
   * Generate a sequence with detailed step-by-step information
   */
  generateWithSteps(
    length: number,
    startContext?: string[]
  ): {
    sequence: string[];
    steps: Array<{
      step: number;
      context: string;
      availableTransitions: Array<{ element: string; probability: number }>;
      selectedElement: string;
      randomValue: number;
    }>;
  } {
    const sequence: string[] = [];
    const steps: Array<{
      step: number;
      context: string;
      availableTransitions: Array<{ element: string; probability: number }>;
      selectedElement: string;
      randomValue: number;
    }> = [];

    if (!length || length <= 0) {
      throw new Error("Length must be a positive number");
    }

    // Initialize with start context or random state
    let currentContext = startContext || this.getRandomStartContext();

    // Generate sequence up to requested length
    for (let i = 0; i < length; i++) {
      const contextKey = currentContext.join("|");
      const state = this.states.get(contextKey);

      if (!state || state.transitions.size === 0) {
        // Try to find a fallback state or use a random element from all possible elements
        const fallbackState = this.findFallbackState(currentContext);
        if (!fallbackState) {
          break;
        }
        // Use the fallback state for this iteration
        const transitions = this.applyTemperature(fallbackState.transitions);

        // Get available transitions for display
        const availableTransitions = Array.from(transitions.entries()).map(
          ([element, probability]) => ({
            element,
            probability,
          })
        );

        // Use weighted random selection
        const random = Math.random();
        let cumulativeProbability = 0;
        let selectedElement = "";

        for (const [nextElement, probability] of transitions) {
          cumulativeProbability += probability;
          if (random <= cumulativeProbability) {
            selectedElement = nextElement;
            break;
          }
        }

        if (selectedElement) {
          sequence.push(selectedElement);
          steps.push({
            step: i,
            context: contextKey,
            availableTransitions,
            selectedElement,
            randomValue: random,
          });

          // Update context for next iteration
          currentContext = [...currentContext.slice(1), selectedElement];
        } else {
          break;
        }
        continue;
      }

      // Apply temperature if set
      const transitions = this.applyTemperature(state.transitions);

      // Get available transitions for display
      const availableTransitions = Array.from(transitions.entries()).map(
        ([element, probability]) => ({
          element,
          probability,
        })
      );

      // Use weighted random selection
      const random = Math.random();
      let cumulativeProbability = 0;
      let selectedElement = "";

      for (const [nextElement, probability] of transitions) {
        cumulativeProbability += probability;
        if (random <= cumulativeProbability) {
          selectedElement = nextElement;
          break;
        }
      }

      // Fallback to first element
      if (!selectedElement) {
        selectedElement = Array.from(transitions.keys())[0] || "";
      }

      steps.push({
        step: i + 1,
        context: contextKey,
        availableTransitions,
        selectedElement,
        randomValue: random,
      });

      sequence.push(selectedElement);

      // Update context for next iteration
      currentContext = [...currentContext.slice(1), selectedElement];
    }

    return { sequence, steps };
  }

  /**
   * Get statistics about the trained Markov chain
   * Useful for understanding the learned patterns
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
      averageTransitionsPerState: this.states.size > 0 ? totalTransitions / this.states.size : 0,
    };
  }

  /**
   * Get all states for analysis purposes
   */
  getStates(): MarkovState[] {
    return Array.from(this.states.values());
  }

  /**
   * Find a fallback state when the current context doesn't exist
   * prefers states with higher entropy (more diverse transitions)
   */
  private findFallbackState(context: string[]): MarkovState | null {
    // Try to find a state with a similar context (shorter context)
    for (let i = context.length - 1; i > 0; i--) {
      const shorterContext = context.slice(-i);
      const contextKey = shorterContext.join("|");
      const state = this.states.get(contextKey);
      if (state && state.transitions.size > 0) {
        // Prefer states with more diverse transitions
        if (this.calculateStateEntropy(state) > 0.5) {
          return state;
        }
      }
    }

    // If no shorter context works, find the state with highest entropy
    let bestState: MarkovState | null = null;
    let bestEntropy = 0;

    for (const state of this.states.values()) {
      if (state.transitions.size > 0) {
        const entropy = this.calculateStateEntropy(state);
        if (entropy > bestEntropy) {
          bestEntropy = entropy;
          bestState = state;
        }
      }
    }

    return bestState;
  }

  /**
   * Calculate entropy of a state to measure transition diversity
   */
  private calculateStateEntropy(state: MarkovState): number {
    let entropy = 0;
    for (const probability of state.transitions.values()) {
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }
    return entropy;
  }

  /**
   * Get detailed transition analysis for debugging and understanding
   */
  getTransitionAnalysis(): {
    deterministicStates: number;
    probabilisticStates: number;
    transitionDistribution: { [key: string]: number };
    sampleTransitions: Array<{
      context: string;
      transitions: Array<{ element: string; probability: number }>;
    }>;
  } {
    let deterministicStates = 0;
    let probabilisticStates = 0;
    const transitionDistribution: { [key: string]: number } = {};
    const sampleTransitions: Array<{
      context: string;
      transitions: Array<{ element: string; probability: number }>;
    }> = [];

    for (const [context, state] of this.states.entries()) {
      const transitions = Array.from(state.transitions.entries()).map(([element, prob]) => ({
        element,
        probability: prob,
      }));

      // Count deterministic vs probabilistic states
      if (transitions.length === 1 || transitions.every((t) => t.probability > 0.95)) {
        deterministicStates++;
      } else {
        probabilisticStates++;
      }

      // Track transition distribution
      const numTransitions = transitions.length;
      transitionDistribution[numTransitions] = (transitionDistribution[numTransitions] || 0) + 1;

      // Sample some transitions for analysis
      if (sampleTransitions.length < 5) {
        sampleTransitions.push({ context, transitions });
      }
    }

    return {
      deterministicStates,
      probabilisticStates,
      transitionDistribution,
      sampleTransitions,
    };
  }

  /**
   * Set temperature for generation (higher = more random, lower = more deterministic)
   */
  setTemperature(temperature: number): void {
    this.config.temperature = Math.max(0.1, Math.min(2.0, temperature));
  }

  /**
   * Apply temperature to transition probabilities during generation
   */
  private applyTemperature(transitions: Map<string, number>): Map<string, number> {
    if (!this.config.temperature || this.config.temperature === 1.0) {
      return transitions;
    }

    const temp = this.config.temperature;
    const adjustedTransitions = new Map<string, number>();

    // Apply temperature: higher temp = more uniform, lower temp = more peaked
    for (const [element, probability] of transitions.entries()) {
      const adjustedProb = Math.pow(probability, 1 / temp);
      adjustedTransitions.set(element, adjustedProb);
    }

    // Renormalize
    const total = Array.from(adjustedTransitions.values()).reduce((sum, prob) => sum + prob, 0);
    for (const [element, probability] of adjustedTransitions.entries()) {
      adjustedTransitions.set(element, probability / total);
    }

    return adjustedTransitions;
  }

  /**
   * Select the next element based on current context and transition probabilities
   * This implements the probabilistic nature of the Markov chain
   */
  protected selectNextElement(contextKey: string): string | null {
    const state = this.states.get(contextKey);
    if (!state || state.transitions.size === 0) {
      console.log(`selectNextElement: No state found for context "${contextKey}"`);
      console.log(`Available states: ${Array.from(this.states.keys()).join(", ")}`);
      return null;
    }

    console.log(
      `selectNextElement: Found state for "${contextKey}" with ${state.transitions.size} transitions`
    );
    console.log(
      `Transitions: ${Array.from(state.transitions.entries())
        .map(([k, v]) => `${k}:${v.toFixed(3)}`)
        .join(", ")}`
    );

    // Apply temperature if set
    const transitions = this.applyTemperature(state.transitions);
    console.log(
      `After temperature (${this.config.temperature}): ${Array.from(transitions.entries())
        .map(([k, v]) => `${k}:${v.toFixed(3)}`)
        .join(", ")}`
    );

    // Use weighted random selection based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;
    console.log(`Random value: ${random.toFixed(3)}`);

    for (const [nextElement, probability] of transitions) {
      cumulativeProbability += probability;
      console.log(
        `  ${nextElement}: prob=${probability.toFixed(
          3
        )}, cumulative=${cumulativeProbability.toFixed(3)}`
      );
      if (random <= cumulativeProbability) {
        console.log(`  Selected: ${nextElement}`);
        return nextElement;
      }
    }

    // Fallback to first element (shouldn't happen with normalized probabilities)
    return Array.from(transitions.keys())[0] || null;
  }

  /**
   * Get a step-by-step breakdown of the learning process
   */
  getLearningBreakdown(): {
    totalSequences: number;
    totalTransitions: number;
    learningSteps: Array<{
      step: number;
      description: string;
      context: string;
      nextElement: string;
      currentCount: number;
      newCount: number;
    }>;
    finalStates: Array<{
      context: string;
      transitions: Array<{ element: string; count: number; probability: number }>;
    }>;
  } {
    const learningSteps: Array<{
      step: number;
      description: string;
      context: string;
      nextElement: string;
      currentCount: number;
      newCount: number;
    }> = [];

    let stepCount = 0;
    let totalTransitions = 0;

    // Replay the learning process
    for (const sequence of this.trainingData) {
      for (let i = 0; i <= sequence.length - this.config.order; i++) {
        const currentContext = this.getContextKey(sequence, i);
        const nextElement = sequence[i + this.config.order];

        if (nextElement) {
          stepCount++;
          totalTransitions++;

          // Get current state to show counts
          const state = this.states.get(currentContext);
          const currentCount = state?.transitions.get(nextElement) || 0;

          learningSteps.push({
            step: stepCount,
            description: `Learning transition from context "${currentContext}" to "${nextElement}"`,
            context: currentContext,
            nextElement: nextElement,
            currentCount: currentCount,
            newCount: currentCount + 1,
          });
        }
      }
    }

    // Get final states
    const finalStates = Array.from(this.states.entries()).map(([context, state]) => ({
      context,
      transitions: Array.from(state.transitions.entries()).map(([element, probability]) => ({
        element,
        count: Math.round(probability * state.visitCount),
        probability: probability,
      })),
    }));

    return {
      totalSequences: this.trainingData.length,
      totalTransitions,
      learningSteps,
      finalStates,
    };
  }

  /**
   * Get a random starting context from training data
   */
  getRandomStartContext(): string[] {
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
   * Clear all training data and reset the chain
   */
  reset(): void {
    this.states.clear();
    this.trainingData = [];
  }

  /**
   * Analyze the quality of training data and suggest improvements
   */
  analyzeTrainingQuality(): {
    totalStates: number;
    lowEntropyStates: number;
    highRepetitionStates: number;
    averageTransitionsPerState: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let lowEntropyStates = 0;
    let highRepetitionStates = 0;
    let totalTransitions = 0;

    for (const state of this.states.values()) {
      totalTransitions += state.transitions.size;
      const entropy = this.calculateStateEntropy(state);

      if (entropy < 0.5) {
        lowEntropyStates++;
      }

      // Check for states with very high probability for one transition
      const maxProbability = Math.max(...state.transitions.values());
      if (maxProbability > 0.8) {
        highRepetitionStates++;
      }
    }

    const averageTransitionsPerState =
      this.states.size > 0 ? totalTransitions / this.states.size : 0;

    // Generate recommendations
    if (lowEntropyStates > this.states.size * 0.3) {
      recommendations.push(
        "Many states have low entropy. Consider adding more diverse training data."
      );
    }

    if (highRepetitionStates > this.states.size * 0.2) {
      recommendations.push(
        "Many states have highly repetitive patterns. Consider reducing order or adding more varied sequences."
      );
    }

    if (averageTransitionsPerState < 2) {
      recommendations.push(
        "States have very few transitions. Consider reducing the order parameter or adding more training data."
      );
    }

    if (this.states.size < 10) {
      recommendations.push(
        "Very few states learned. Consider adding more training sequences or reducing the order parameter."
      );
    }

    return {
      totalStates: this.states.size,
      lowEntropyStates,
      highRepetitionStates,
      averageTransitionsPerState,
      recommendations,
    };
  }
}
