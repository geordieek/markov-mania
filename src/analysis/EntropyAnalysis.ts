/**
 * Calculates entropy, surprise, novelty, and musical interest metrics
 */

import { MarkovChain } from "../core/MarkovChain";
import { MarkovState } from "../types";

export interface EntropyMetrics {
  stateEntropy: number;
  chainEntropy: number;
  averageSurprise: number;
  noveltyScore: number;
  predictability: number;
}

export interface TransitionSurprise {
  from: string;
  to: string;
  surprise: number;
  probability: number;
  informationContent: number;
}

export interface SequenceInterest {
  position: number;
  element: string;
  localEntropy: number;
  surprise: number;
  interest: "low" | "medium" | "high";
}

export interface InterestMap {
  sequence: string[];
  interestScores: SequenceInterest[];
  averageInterest: number;
  peakInterest: number;
  lowInterestRegions: number[];
  highInterestRegions: number[];
}

export interface GenerationComparison {
  generatedEntropy: number;
  trainingEntropy: number;
  novelty: number;
  coherence: number;
  creativity: number;
}

export class EntropyAnalysis {
  private surpriseThreshold = 0.3; // Below this, transition is not surprising
  private interestThresholds = {
    low: 0.2,
    high: 0.7,
  };

  /**
   * Calculate Shannon entropy of a single state
   */
  calculateStateEntropy(state: MarkovState): number {
    if (state.transitions.size === 0) return 0;

    let entropy = 0;
    for (const probability of state.transitions.values()) {
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Calculate average entropy across all states in the chain
   */
  calculateChainEntropy(chain: MarkovChain): number {
    const states = this.getChainStates(chain);
    if (states.length === 0) return 0;

    let totalEntropy = 0;
    for (const state of states) {
      totalEntropy += this.calculateStateEntropy(state);
    }

    return totalEntropy / states.length;
  }

  /**
   * Calculate surprise value for a specific transition
   */
  calculateTransitionSurprise(from: string, to: string, chain: MarkovChain): number {
    const states = this.getChainStates(chain);
    const fromState = states.find((s) => s.id === from);

    if (!fromState) return 0;

    const probability = fromState.transitions.get(to) || 0;
    if (probability === 0) return 1; // Maximum surprise for impossible transition

    // Surprise is inverse of probability (higher probability = lower surprise)
    return -Math.log2(probability);
  }

  /**
   * Calculate surprise for all transitions in a sequence
   */
  calculateSequenceSurprise(sequence: string[], chain: MarkovChain): TransitionSurprise[] {
    const surprises: TransitionSurprise[] = [];
    const order = this.getChainOrder(chain);

    for (let i = 0; i <= sequence.length - order - 1; i++) {
      const context = sequence.slice(i, i + order).join("|");
      const nextElement = sequence[i + order];

      const surprise = this.calculateTransitionSurprise(context, nextElement, chain);
      const probability = this.getTransitionProbability(context, nextElement, chain);
      const informationContent = -Math.log2(probability || 0.001); // Avoid log(0)

      surprises.push({
        from: context,
        to: nextElement,
        surprise,
        probability: probability || 0,
        informationContent,
      });
    }

    return surprises;
  }

  /**
   * Compare generated sequence entropy to training data
   */
  compareGenerationToTraining(
    generated: string[],
    training: string[][],
    chain: MarkovChain
  ): GenerationComparison {
    const generatedEntropy = this.calculateSequenceEntropy(generated, chain);
    const trainingEntropy = this.calculateTrainingEntropy(training, chain);
    const novelty = this.calculateNovelty(generated, training);
    const coherence = this.calculateCoherence(generated, chain);
    const creativity = this.calculateCreativity(generated, training, chain);

    return {
      generatedEntropy,
      trainingEntropy,
      novelty,
      coherence,
      creativity,
    };
  }

  /**
   * Analyze interest level throughout a sequence
   */
  analyzeSequenceInterest(sequence: string[], chain: MarkovChain): InterestMap {
    const interestScores: SequenceInterest[] = [];
    const order = this.getChainOrder(chain);

    for (let i = 0; i < sequence.length; i++) {
      const element = sequence[i];
      const localEntropy = this.calculateLocalEntropy(sequence, i, order, chain);
      const surprise = this.calculateLocalSurprise(sequence, i, order, chain);

      // Combine entropy and surprise for interest score
      const interest = (localEntropy + surprise) / 2;

      let interestLevel: "low" | "medium" | "high" = "medium";
      if (interest < this.interestThresholds.low) {
        interestLevel = "low";
      } else if (interest > this.interestThresholds.high) {
        interestLevel = "high";
      }

      interestScores.push({
        position: i,
        element,
        localEntropy,
        surprise,
        interest: interestLevel,
      });
    }

    const averageInterest =
      interestScores.reduce((sum, score) => sum + score.localEntropy, 0) / interestScores.length;
    const peakInterest = Math.max(...interestScores.map((score) => score.localEntropy));

    const lowInterestRegions = this.findInterestRegions(interestScores, "low");
    const highInterestRegions = this.findInterestRegions(interestScores, "high");

    return {
      sequence,
      interestScores,
      averageInterest,
      peakInterest,
      lowInterestRegions,
      highInterestRegions,
    };
  }

  /**
   * Get comprehensive entropy metrics for a chain
   */
  getEntropyMetrics(chain: MarkovChain): EntropyMetrics {
    const chainEntropy = this.calculateChainEntropy(chain);
    const states = this.getChainStates(chain);

    // Calculate average surprise across all possible transitions
    let totalSurprise = 0;
    let transitionCount = 0;

    for (const state of states) {
      for (const [nextState, probability] of state.transitions) {
        const surprise = -Math.log2(probability);
        totalSurprise += surprise;
        transitionCount++;
      }
    }

    const averageSurprise = transitionCount > 0 ? totalSurprise / transitionCount : 0;
    const noveltyScore = this.calculateNoveltyFromChain(chain);
    const predictability = 1 - chainEntropy / Math.log2(states.length || 1);

    return {
      stateEntropy: chainEntropy,
      chainEntropy,
      averageSurprise,
      noveltyScore,
      predictability,
    };
  }

  /**
   * Find the most surprising transitions in the chain
   */
  findMostSurprisingTransitions(chain: MarkovChain, limit: number = 10): TransitionSurprise[] {
    const states = this.getChainStates(chain);
    const surprises: TransitionSurprise[] = [];

    for (const state of states) {
      for (const [nextState, probability] of state.transitions) {
        const surprise = -Math.log2(probability);
        const informationContent = surprise;

        surprises.push({
          from: state.id,
          to: nextState,
          surprise,
          probability,
          informationContent,
        });
      }
    }

    // Sort by surprise (highest first) and return top N
    return surprises.sort((a, b) => b.surprise - a.surprise).slice(0, limit);
  }

  /**
   * Calculate entropy of a specific sequence
   */
  private calculateSequenceEntropy(sequence: string[], chain: MarkovChain): number {
    const surprises = this.calculateSequenceSurprise(sequence, chain);
    if (surprises.length === 0) return 0;

    return surprises.reduce((sum, s) => sum + s.surprise, 0) / surprises.length;
  }

  /**
   * Calculate average entropy of training sequences
   */
  private calculateTrainingEntropy(training: string[][], chain: MarkovChain): number {
    let totalEntropy = 0;
    let sequenceCount = 0;

    for (const sequence of training) {
      const entropy = this.calculateSequenceEntropy(sequence, chain);
      totalEntropy += entropy;
      sequenceCount++;
    }

    return sequenceCount > 0 ? totalEntropy / sequenceCount : 0;
  }

  /**
   * Calculate novelty (how different generated sequence is from training)
   */
  private calculateNovelty(generated: string[], training: string[][]): number {
    const generatedNgrams = this.extractNgrams(generated, 2);
    const trainingNgrams = new Set<string>();

    for (const sequence of training) {
      const ngrams = this.extractNgrams(sequence, 2);
      ngrams.forEach((ngram) => trainingNgrams.add(ngram));
    }

    const novelNgrams = generatedNgrams.filter((ngram) => !trainingNgrams.has(ngram));
    return novelNgrams.length / generatedNgrams.length;
  }

  /**
   * Calculate coherence (how well sequence follows learned patterns)
   */
  private calculateCoherence(sequence: string[], chain: MarkovChain): number {
    const surprises = this.calculateSequenceSurprise(sequence, chain);
    if (surprises.length === 0) return 0;

    // Lower average surprise = higher coherence
    const averageSurprise = surprises.reduce((sum, s) => sum + s.surprise, 0) / surprises.length;
    return Math.max(0, 1 - averageSurprise / 5); // Normalize to 0-1
  }

  /**
   * Calculate creativity (balance of novelty and coherence)
   */
  private calculateCreativity(
    generated: string[],
    training: string[][],
    chain: MarkovChain
  ): number {
    const novelty = this.calculateNovelty(generated, training);
    const coherence = this.calculateCoherence(generated, chain);

    // Creativity is high when both novelty and coherence are moderate
    const noveltyScore = 1 - Math.abs(novelty - 0.5) * 2;
    const coherenceScore = 1 - Math.abs(coherence - 0.5) * 2;

    return (noveltyScore + coherenceScore) / 2;
  }

  /**
   * Calculate local entropy around a position in the sequence
   */
  private calculateLocalEntropy(
    sequence: string[],
    position: number,
    order: number,
    chain: MarkovChain
  ): number {
    const context = sequence.slice(Math.max(0, position - order), position).join("|");
    const states = this.getChainStates(chain);
    const state = states.find((s) => s.id === context);

    if (!state) return 0;

    return this.calculateStateEntropy(state);
  }

  /**
   * Calculate local surprise at a position in the sequence
   */
  private calculateLocalSurprise(
    sequence: string[],
    position: number,
    order: number,
    chain: MarkovChain
  ): number {
    if (position < order) return 0;

    const context = sequence.slice(position - order, position).join("|");
    const nextElement = sequence[position];

    return this.calculateTransitionSurprise(context, nextElement, chain);
  }

  /**
   * Find regions of specific interest level
   */
  private findInterestRegions(
    interestScores: SequenceInterest[],
    level: "low" | "medium" | "high"
  ): number[] {
    const regions: number[] = [];
    let currentRegionStart = -1;

    for (let i = 0; i < interestScores.length; i++) {
      const score = interestScores[i];

      if (score.interest === level) {
        if (currentRegionStart === -1) {
          currentRegionStart = i;
        }
      } else {
        if (currentRegionStart !== -1) {
          regions.push(currentRegionStart);
          currentRegionStart = -1;
        }
      }
    }

    if (currentRegionStart !== -1) {
      regions.push(currentRegionStart);
    }

    return regions;
  }

  /**
   * Extract n-grams from a sequence
   */
  private extractNgrams(sequence: string[], n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= sequence.length - n; i++) {
      ngrams.push(sequence.slice(i, i + n).join(" "));
    }
    return ngrams;
  }

  /**
   * Calculate novelty from chain structure
   */
  private calculateNoveltyFromChain(chain: MarkovChain): number {
    const states = this.getChainStates(chain);
    if (states.length === 0) return 0;

    // Novelty based on state diversity and transition variety
    const totalTransitions = states.reduce((sum, state) => sum + state.transitions.size, 0);
    const averageTransitionsPerState = totalTransitions / states.length;

    // Higher average transitions = more variety = higher novelty potential
    return Math.min(1, averageTransitionsPerState / 5);
  }

  // Helper methods

  private getChainStates(chain: MarkovChain): MarkovState[] {
    const statesMap = (chain as any).states as Map<string, MarkovState>;
    return Array.from(statesMap.values());
  }

  private getChainOrder(chain: MarkovChain): number {
    return (chain as any).config.order || 1;
  }

  private getTransitionProbability(from: string, to: string, chain: MarkovChain): number {
    const states = this.getChainStates(chain);
    const fromState = states.find((s) => s.id === from);
    return fromState?.transitions.get(to) || 0;
  }
}
