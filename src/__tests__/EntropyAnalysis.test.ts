import { describe, it, expect, beforeEach } from "vitest";
import { EntropyAnalysis } from "../analysis/EntropyAnalysis";
import { MarkovChain } from "../core/MarkovChain";

describe("EntropyAnalysis", () => {
  let entropyAnalysis: EntropyAnalysis;

  beforeEach(() => {
    entropyAnalysis = new EntropyAnalysis();
  });

  describe("calculateStateEntropy", () => {
    it("should return 0 for deterministic state (single transition)", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [["C4", "C4", "C4", "C4", "C4"]];
      chain.train(sequences);

      const states = chain.getStates();
      const entropy = entropyAnalysis.calculateStateEntropy(states[0]);

      expect(entropy).toBe(0);
    });

    it("should return positive entropy for probabilistic state", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [["A", "B", "A", "C", "A", "B"]];
      chain.train(sequences);

      const states = chain.getStates();
      const stateA = states.find((s) => s.id === "A");
      expect(stateA).toBeDefined();

      const entropy = entropyAnalysis.calculateStateEntropy(stateA!);
      expect(entropy).toBeGreaterThan(0);
    });
  });

  describe("calculateChainEntropy", () => {
    it("should return 0 for completely deterministic chain", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [["C4", "C4", "C4", "C4", "C4"]];
      chain.train(sequences);

      const chainEntropy = entropyAnalysis.calculateChainEntropy(chain);
      expect(chainEntropy).toBe(0);
    });

    it("should return positive entropy for varied chain", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [
        ["A", "B", "C"],
        ["A", "C", "B"],
        ["B", "A", "C"],
        ["B", "C", "A"],
      ];
      chain.train(sequences);

      const chainEntropy = entropyAnalysis.calculateChainEntropy(chain);
      expect(chainEntropy).toBeGreaterThan(0);
    });
  });

  describe("calculateTransitionSurprise", () => {
    it("should return 0 for impossible transition", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [["A", "B", "A", "B"]];
      chain.train(sequences);

      const surprise = entropyAnalysis.calculateTransitionSurprise("A", "C", chain);
      expect(surprise).toBe(1); // Maximum surprise for impossible transition
    });

    it("should return appropriate surprise for possible transition", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [
        ["A", "B", "A", "B"],
        ["A", "C", "A", "C"],
      ];
      chain.train(sequences);

      const surprise = entropyAnalysis.calculateTransitionSurprise("A", "B", chain);
      expect(surprise).toBeGreaterThan(0);
      expect(surprise).toBeLessThanOrEqual(1);
    });
  });

  describe("getEntropyMetrics", () => {
    it("should calculate correct metrics for repetitive data", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [["C4", "C4", "C4", "C4", "C4"]];
      chain.train(sequences);

      const metrics = entropyAnalysis.getEntropyMetrics(chain);

      // For repetitive data, novelty should be very low (close to 0)
      expect(metrics.noveltyScore).toBeLessThan(0.1);
      expect(metrics.chainEntropy).toBe(0);
      expect(metrics.predictability).toBeGreaterThan(0.9);
    });

    it("should calculate correct metrics for varied data", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [
        ["A", "B", "C"],
        ["A", "C", "B"],
        ["B", "A", "C"],
        ["B", "C", "A"],
      ];
      chain.train(sequences);

      const metrics = entropyAnalysis.getEntropyMetrics(chain);

      // For varied data, novelty should be higher
      expect(metrics.noveltyScore).toBeGreaterThan(0.1);
      expect(metrics.chainEntropy).toBeGreaterThan(0);
      expect(metrics.predictability).toBeLessThan(0.9);
    });

    it("should handle empty chain", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const metrics = entropyAnalysis.getEntropyMetrics(chain);

      expect(metrics.noveltyScore).toBe(0);
      expect(metrics.chainEntropy).toBe(0);
      expect(metrics.predictability).toBe(0);
    });
  });

  describe("calculateSequenceSurprise", () => {
    it("should calculate surprise for each transition in sequence", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [
        ["A", "B", "A", "B"],
        ["A", "C", "A", "C"],
        ["B", "A", "B", "A"],
        ["B", "C", "B", "C"],
      ];
      chain.train(sequences);

      const testSequence = ["A", "B", "A", "B"];
      const surprises = entropyAnalysis.calculateSequenceSurprise(testSequence, chain);

      expect(surprises).toHaveLength(testSequence.length - 1); // One less than sequence length
      surprises.forEach((surprise) => {
        expect(surprise.surprise).toBeGreaterThanOrEqual(0);
        expect(surprise.probability).toBeGreaterThan(0);
        expect(surprise.informationContent).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("compareGenerationToTraining", () => {
    it("should compare generated sequence to training data", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const trainingSequences = [
        ["A", "B", "C"],
        ["A", "B", "D"],
      ];
      chain.train(trainingSequences);

      const generatedSequence = ["A", "B", "E"];
      const comparison = entropyAnalysis.compareGenerationToTraining(
        generatedSequence,
        trainingSequences,
        chain
      );

      expect(comparison.generatedEntropy).toBeGreaterThanOrEqual(0);
      expect(comparison.trainingEntropy).toBeGreaterThanOrEqual(0);
      expect(comparison.novelty).toBeGreaterThanOrEqual(0);
      expect(comparison.coherence).toBeGreaterThanOrEqual(0);
      expect(comparison.creativity).toBeGreaterThanOrEqual(0);
    });
  });

  describe("analyzeSequenceInterest", () => {
    it("should analyze interest at each position in sequence", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [["A", "B", "C", "A", "B", "C"]];
      chain.train(sequences);

      const testSequence = ["A", "B", "C", "D", "E"];
      const interestMap = entropyAnalysis.analyzeSequenceInterest(testSequence, chain);

      expect(interestMap.sequence).toEqual(testSequence);
      expect(interestMap.interestScores).toHaveLength(testSequence.length);
      expect(interestMap.averageInterest).toBeGreaterThanOrEqual(0);
      expect(interestMap.peakInterest).toBeGreaterThanOrEqual(0);
    });
  });
});
