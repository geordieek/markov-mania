import { describe, it, expect, beforeEach } from "vitest";
import { MusicMarkovChain } from "../music/MusicMarkovChain";
import { AutomataAnalysis } from "../analysis/AutomataAnalysis";
import { EntropyAnalysis } from "../analysis/EntropyAnalysis";
import { ComplexityAnalysis } from "../analysis/ComplexityAnalysis";

describe("Metrics Integration Tests", () => {
  let musicChain: MusicMarkovChain;
  let automataAnalysis: AutomataAnalysis;
  let entropyAnalysis: EntropyAnalysis;
  let complexityAnalysis: ComplexityAnalysis;

  beforeEach(() => {
    musicChain = new MusicMarkovChain({ order: 2, smoothing: 0.1 });
    automataAnalysis = new AutomataAnalysis();
    entropyAnalysis = new EntropyAnalysis();
    complexityAnalysis = new ComplexityAnalysis();
  });

  describe("Repetitive Data Analysis (C4:4 C4:4 C4:4 C4:4 C4:4)", () => {
    it("should correctly analyze completely repetitive data", () => {
      // Test the specific case that was failing
      const sequences = [["C4", "C4", "C4", "C4", "C4"]];
      musicChain.trainWithMusic(sequences, sequences);

      const noteChain = musicChain.getNoteChain();
      const states = noteChain.getStates();

      // Should have 1 state with 1 transition (deterministic)
      expect(states).toHaveLength(1);
      expect(states[0].transitions.size).toBe(1);

      // Test automata metrics
      const automataMetrics = automataAnalysis.getDeterminismMetrics(noteChain);
      expect(automataMetrics.deterministicStates).toBe(1);
      expect(automataMetrics.probabilisticStates).toBe(0);
      expect(automataMetrics.stateComplexity).toBe(1.0);
      expect(automataMetrics.totalStates).toBe(1);

      // Test entropy metrics
      const entropyMetrics = entropyAnalysis.getEntropyMetrics(noteChain);
      expect(entropyMetrics.noveltyScore).toBeLessThan(0.1); // Should be very low
      expect(entropyMetrics.chainEntropy).toBe(0); // No entropy for deterministic chain
      expect(entropyMetrics.predictability).toBeGreaterThan(0.9); // Very predictable

      // Test complexity metrics
      const complexityMetrics = complexityAnalysis.analyzeBottlenecks(noteChain);
      expect(complexityMetrics.bottleneck).toBe("none");
      expect(complexityMetrics.severity).toBe("low");
    });
  });

  describe("Varied Data Analysis", () => {
    it("should correctly analyze varied data", () => {
      const sequences = [
        ["A", "B", "C", "A", "B", "D"],
        ["A", "B", "C", "A", "B", "E"],
        ["A", "C", "B", "A", "C", "D"],
        ["A", "C", "B", "A", "C", "E"],
        ["B", "A", "C", "B", "A", "D"],
        ["B", "A", "C", "B", "A", "E"],
        ["B", "C", "A", "B", "C", "D"],
        ["B", "C", "A", "B", "C", "E"],
      ];
      musicChain.trainWithMusic(sequences, sequences);

      const noteChain = musicChain.getNoteChain();
      const states = noteChain.getStates();

      // Should have multiple states with multiple transitions
      expect(states.length).toBeGreaterThan(1);

      // Test automata metrics
      const automataMetrics = automataAnalysis.getDeterminismMetrics(noteChain);
      expect(automataMetrics.deterministicStates).toBeGreaterThanOrEqual(0);
      expect(automataMetrics.probabilisticStates).toBeGreaterThan(0);
      expect(automataMetrics.stateComplexity).toBeGreaterThan(1.0);

      // Test entropy metrics
      const entropyMetrics = entropyAnalysis.getEntropyMetrics(noteChain);
      expect(entropyMetrics.noveltyScore).toBeGreaterThan(0.1); // Should be higher
      expect(entropyMetrics.chainEntropy).toBeGreaterThan(0); // Should have entropy
      expect(entropyMetrics.predictability).toBeLessThan(0.9); // Less predictable
    });
  });

  describe("Training Chain Replacement", () => {
    it("should properly replace chain when training with new data", () => {
      // Train with first dataset
      const sequences1 = [["A", "A", "A", "A"]];
      musicChain.trainWithMusic(sequences1, sequences1);

      const noteChain1 = musicChain.getNoteChain();
      const states1 = noteChain1.getStates();
      const metrics1 = automataAnalysis.getDeterminismMetrics(noteChain1);

      // Train with completely different dataset
      const sequences2 = [["B", "C", "D", "E"]];
      musicChain.trainWithMusic(sequences2, sequences2);

      const noteChain2 = musicChain.getNoteChain();
      const states2 = noteChain2.getStates();
      const metrics2 = automataAnalysis.getDeterminismMetrics(noteChain2);

      // The chains should be different
      expect(states1).not.toEqual(states2);
      expect(metrics1).not.toEqual(metrics2);
    });
  });

  describe("Novelty Score Calculation", () => {
    it("should calculate novelty score based on entropy, not transition count", () => {
      // Test with deterministic data (should have low novelty)
      const deterministicSequences = [["X", "X", "X", "X"]];
      musicChain.trainWithMusic(deterministicSequences, deterministicSequences);

      const noteChain1 = musicChain.getNoteChain();
      const entropyMetrics1 = entropyAnalysis.getEntropyMetrics(noteChain1);

      // Novelty should be very low for deterministic data
      expect(entropyMetrics1.noveltyScore).toBeLessThan(0.1);

      // Test with varied data (should have higher novelty)
      // Create data that results in states with multiple transitions
      const variedSequences = [
        ["A", "B", "C", "A", "B", "D"],
        ["A", "B", "C", "A", "B", "E"],
        ["A", "C", "B", "A", "C", "D"],
        ["A", "C", "B", "A", "C", "E"],
        ["B", "A", "C", "B", "A", "D"],
        ["B", "A", "C", "B", "A", "E"],
        ["B", "C", "A", "B", "C", "D"],
        ["B", "C", "A", "B", "C", "E"],
      ];
      musicChain.trainWithMusic(variedSequences, variedSequences);

      const noteChain2 = musicChain.getNoteChain();
      const entropyMetrics2 = entropyAnalysis.getEntropyMetrics(noteChain2);

      // Novelty should be higher for varied data
      expect(entropyMetrics2.noveltyScore).toBeGreaterThan(entropyMetrics1.noveltyScore);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty training data", () => {
      const sequences: string[][] = [];
      musicChain.trainWithMusic(sequences, sequences);

      const noteChain = musicChain.getNoteChain();
      const automataMetrics = automataAnalysis.getDeterminismMetrics(noteChain);
      const entropyMetrics = entropyAnalysis.getEntropyMetrics(noteChain);
      const complexityMetrics = complexityAnalysis.analyzeBottlenecks(noteChain);

      expect(automataMetrics.totalStates).toBe(0);
      expect(entropyMetrics.noveltyScore).toBe(0);
      expect(complexityMetrics.bottleneck).toBe("none");
    });

    it("should handle single element sequences", () => {
      const sequences = [["A"]];
      musicChain.trainWithMusic(sequences, sequences);

      const noteChain = musicChain.getNoteChain();
      const states = noteChain.getStates();

      // With order=2 and single element, should have no states
      expect(states).toHaveLength(0);
    });

    it("should handle sequences shorter than order", () => {
      const sequences = [["A", "B"]]; // Length 2, order 2
      musicChain.trainWithMusic(sequences, sequences);

      const noteChain = musicChain.getNoteChain();
      const states = noteChain.getStates();

      // Should have no states since sequence length equals order
      expect(states).toHaveLength(0);
    });
  });

  describe("Consistency Tests", () => {
    it("should produce consistent results for same input", () => {
      const sequences = [["C4", "D4", "E4", "F4"]];

      // Train multiple times with same data
      musicChain.trainWithMusic(sequences, sequences);
      const noteChain1 = musicChain.getNoteChain();
      const metrics1 = {
        automata: automataAnalysis.getDeterminismMetrics(noteChain1),
        entropy: entropyAnalysis.getEntropyMetrics(noteChain1),
        complexity: complexityAnalysis.analyzeBottlenecks(noteChain1),
      };

      // Create new chain and train again
      const newChain = new MusicMarkovChain({ order: 2, smoothing: 0.1 });
      newChain.trainWithMusic(sequences, sequences);
      const noteChain2 = newChain.getNoteChain();
      const metrics2 = {
        automata: automataAnalysis.getDeterminismMetrics(noteChain2),
        entropy: entropyAnalysis.getEntropyMetrics(noteChain2),
        complexity: complexityAnalysis.analyzeBottlenecks(noteChain2),
      };

      // Results should be identical
      expect(metrics1.automata).toEqual(metrics2.automata);
      expect(metrics1.entropy).toEqual(metrics2.entropy);
      expect(metrics1.complexity).toEqual(metrics2.complexity);
    });
  });
});
