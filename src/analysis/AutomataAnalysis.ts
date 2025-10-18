/**
 * Measures determinism, state complexity, and provides state machine visualizations
 */

import { MarkovChain } from "../core/MarkovChain";
import { MarkovState } from "../types";

export interface StateInfo {
  id: string;
  isDeterministic: boolean;
  entropy: number;
  transitionCount: number;
  mostLikelyTransition: string;
  probability: number;
}

export interface DeterminismMetrics {
  determinismIndex: number; // 0 = fully probabilistic, 1 = fully deterministic
  deterministicStates: number;
  probabilisticStates: number;
  totalStates: number;
  averageEntropy: number;
  stateComplexity: number;
}

export interface TrainingDataRequirement {
  minimumSequences: number;
  recommendedSequences: number;
  estimatedStates: number;
  feasibility: "low" | "medium" | "high";
  reasoning: string;
}

export interface DOTGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: "deterministic" | "probabilistic" | "start" | "end";
  }>;
  edges: Array<{
    from: string;
    to: string;
    label: string;
    probability: number;
    weight: number;
  }>;
  metadata: {
    totalStates: number;
    totalTransitions: number;
    determinismIndex: number;
  };
}

export class AutomataAnalysis {
  private entropyThreshold = 0.1; // TODO: Tweak this possibly? It's not a bad value, but it's not a good threshold to consider something deterministic..

  /**
   * Calculate the determinism index of a Markov chain (0-1)
   * 0 = fully probabilistic, 1 = fully deterministic
   */
  calculateDeterminismIndex(chain: MarkovChain): number {
    const states = this.getChainStates(chain);
    if (states.length === 0) return 0;

    let deterministicCount = 0;
    let totalEntropy = 0;

    for (const state of states) {
      const entropy = this.calculateStateEntropy(state);
      totalEntropy += entropy;

      if (entropy < this.entropyThreshold) {
        deterministicCount++;
      }
    }

    const averageEntropy = totalEntropy / states.length;
    const determinismRatio = deterministicCount / states.length;

    // Combine entropy and determinism ratio
    return (determinismRatio + (1 - averageEntropy)) / 2;
  }

  /**
   * Find states with high entropy (many possible transitions)
   */
  findNonDeterministicStates(chain: MarkovChain): StateInfo[] {
    const states = this.getChainStates(chain);
    const stateInfos: StateInfo[] = [];

    for (const state of states) {
      const entropy = this.calculateStateEntropy(state);
      const transitionCount = state.transitions.size;

      // Find most likely transition
      let mostLikelyTransition = "";
      let maxProbability = 0;

      for (const [nextState, probability] of state.transitions) {
        if (probability > maxProbability) {
          maxProbability = probability;
          mostLikelyTransition = nextState;
        }
      }

      const isDeterministic = maxProbability === 1.0 || entropy < this.entropyThreshold;

      // Only add non-deterministic states to the result
      if (!isDeterministic) {
        stateInfos.push({
          id: state.id,
          isDeterministic,
          entropy,
          transitionCount,
          mostLikelyTransition,
          probability: maxProbability,
        });
      }
    }

    // Sort by entropy (highest first)
    return stateInfos.sort((a, b) => b.entropy - a.entropy);
  }

  /**
   * Calculate minimum training data needed for target complexity
   */
  estimateTrainingDataRequirement(targetStates: number, order: number): TrainingDataRequirement {
    // Estimate based on order and vocabulary size
    const vocabularySize = this.estimateVocabularySize(targetStates, order);
    const minimumSequences = Math.max(10, Math.ceil(targetStates / 2));
    const recommendedSequences = Math.max(50, targetStates * 2);

    // Estimate actual states that will be created
    const estimatedStates = Math.min(targetStates, vocabularySize ** order);

    let feasibility: "low" | "medium" | "high" = "high";
    let reasoning = "";

    if (estimatedStates > vocabularySize ** order) {
      feasibility = "low";
      reasoning = `Target states (${targetStates}) exceeds maximum possible (${vocabularySize}^${order} = ${
        vocabularySize ** order
      })`;
    } else if (recommendedSequences > 1000) {
      feasibility = "medium";
      reasoning = `Requires ${recommendedSequences} sequences, which may be difficult to obtain`;
    } else {
      reasoning = `Feasible with ${recommendedSequences} sequences`;
    }

    return {
      minimumSequences,
      recommendedSequences,
      estimatedStates,
      feasibility,
      reasoning,
    };
  }

  /**
   * Export state transition graph in DOT format for visualization
   */
  exportStateDiagram(chain: MarkovChain): DOTGraph {
    const states = this.getChainStates(chain);
    const determinismIndex = this.calculateDeterminismIndex(chain);

    const nodes = states.map((state) => {
      const entropy = this.calculateStateEntropy(state);
      const isDeterministic = entropy < this.entropyThreshold;

      return {
        id: state.id,
        label: `${state.id}\nH=${entropy.toFixed(2)}`,
        type: isDeterministic
          ? "deterministic"
          : ("probabilistic" as "deterministic" | "probabilistic"),
      };
    });

    const edges: Array<{
      from: string;
      to: string;
      label: string;
      probability: number;
      weight: number;
    }> = [];

    for (const state of states) {
      for (const [nextState, probability] of state.transitions) {
        edges.push({
          from: state.id,
          to: nextState,
          label: `${(probability * 100).toFixed(1)}%`,
          probability,
          weight: Math.max(1, Math.round(probability * 10)),
        });
      }
    }

    return {
      nodes,
      edges,
      metadata: {
        totalStates: states.length,
        totalTransitions: edges.length,
        determinismIndex,
      },
    };
  }

  /**
   * Get comprehensive determinism metrics
   */
  getDeterminismMetrics(chain: MarkovChain): DeterminismMetrics {
    const states = this.getChainStates(chain);
    const determinismIndex = this.calculateDeterminismIndex(chain);

    let deterministicStates = 0;
    let totalEntropy = 0;
    let totalTransitions = 0;

    for (const state of states) {
      const entropy = this.calculateStateEntropy(state);
      totalEntropy += entropy;
      totalTransitions += state.transitions.size;

      if (entropy < this.entropyThreshold) {
        deterministicStates++;
      }
    }

    const probabilisticStates = states.length - deterministicStates;
    const averageEntropy = states.length > 0 ? totalEntropy / states.length : 0;
    const stateComplexity = states.length > 0 ? totalTransitions / states.length : 0;

    return {
      determinismIndex,
      deterministicStates,
      probabilisticStates,
      totalStates: states.length,
      averageEntropy,
      stateComplexity,
    };
  }

  /**
   * Analyze state explosion with different orders
   */
  analyzeStateExplosion(
    vocabularySize: number,
    maxOrder: number = 5
  ): Array<{
    order: number;
    maxStates: number;
    memoryEstimate: number;
    feasibility: "low" | "medium" | "high";
  }> {
    const results = [];

    for (let order = 1; order <= maxOrder; order++) {
      const maxStates = vocabularySize ** order;
      const memoryEstimate = maxStates * 100; // Rough estimate in bytes

      let feasibility: "low" | "medium" | "high" = "high";
      if (maxStates > 1000000) {
        feasibility = "low";
      } else if (maxStates > 100000) {
        feasibility = "medium";
      }

      results.push({
        order,
        maxStates,
        memoryEstimate,
        feasibility,
      });
    }

    return results;
  }

  /**
   * Find cycles in the state machine
   */
  findCycles(chain: MarkovChain): Array<{
    states: string[];
    length: number;
    probability: number;
  }> {
    const states = this.getChainStates(chain);
    const visited = new Set<string>();
    const cycles: Array<{ states: string[]; length: number; probability: number }> = [];

    for (const state of states) {
      if (!visited.has(state.id)) {
        const cycle = this.detectCycleFromState(state, states, visited);
        if (cycle && cycle.length > 1) {
          cycles.push(cycle);
        }
      }
    }

    return cycles;
  }

  // Private helper methods

  private getChainStates(chain: MarkovChain): MarkovState[] {
    const states = chain.getStates();
    console.log("AutomataAnalysis: Chain type:", chain.constructor.name);
    console.log("AutomataAnalysis: States array length:", states.length);
    if (states.length > 0) {
      console.log("AutomataAnalysis: First state:", states[0]);
      console.log("AutomataAnalysis: First state transitions:", states[0].transitions.size);
    }
    return states;
  }

  private calculateStateEntropy(state: MarkovState): number {
    if (state.transitions.size === 0) return 0;

    let entropy = 0;
    for (const probability of state.transitions.values()) {
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  private estimateVocabularySize(targetStates: number, order: number): number {
    // Rough estimation based on target states and order
    return Math.ceil(Math.pow(targetStates, 1 / order));
  }

  private detectCycleFromState(
    startState: MarkovState,
    allStates: MarkovState[],
    visited: Set<string>
  ): { states: string[]; length: number; probability: number } | null {
    const path: string[] = [];
    const pathSet = new Set<string>();
    let currentState = startState;
    let totalProbability = 1;

    while (currentState && !pathSet.has(currentState.id)) {
      if (visited.has(currentState.id)) {
        break; // Already processed this state
      }

      path.push(currentState.id);
      pathSet.add(currentState.id);
      visited.add(currentState.id);

      // Find most likely next state
      let nextStateId = "";
      let maxProbability = 0;

      for (const [nextId, probability] of currentState.transitions) {
        if (probability > maxProbability) {
          maxProbability = probability;
          nextStateId = nextId;
        }
      }

      if (nextStateId) {
        totalProbability *= maxProbability;
        const nextState = allStates.find((s) => s.id === nextStateId);
        if (nextState) {
          currentState = nextState;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Check if we found a cycle
    if (currentState && pathSet.has(currentState.id)) {
      const cycleStart = path.indexOf(currentState.id);
      const cycleStates = path.slice(cycleStart);
      return {
        states: cycleStates,
        length: cycleStates.length,
        probability: totalProbability,
      };
    }

    return null;
  }
}
