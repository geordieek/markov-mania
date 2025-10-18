import { describe, it, expect, beforeEach } from "vitest";
import { AutomataAnalysis } from "../analysis/AutomataAnalysis";
import { MarkovChain } from "../core/MarkovChain";

describe("AutomataAnalysis", () => {
  let automataAnalysis: AutomataAnalysis;

  beforeEach(() => {
    automataAnalysis = new AutomataAnalysis();
  });

  describe("getDeterminismMetrics", () => {
    it("should correctly identify deterministic states for repetitive data", () => {
      // Test with simple repetitive data: C4 C4 C4 C4 C4
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [["C4", "C4", "C4", "C4", "C4"]];
      chain.train(sequences);

      const metrics = automataAnalysis.getDeterminismMetrics(chain);

      // With order=2 and repetitive data, should have 1 state with 1 transition
      expect(metrics.deterministicStates).toBe(1);
      expect(metrics.probabilisticStates).toBe(0);
      expect(metrics.stateComplexity).toBe(1.0);
      expect(metrics.totalStates).toBe(1);
    });

    it("should correctly identify probabilistic states for varied data", () => {
      // Test with varied data that creates multiple transitions per state
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [
        ["C4", "D4", "E4", "F4"],
        ["C4", "D4", "G4", "A4"],
        ["C4", "D4", "B4", "C5"],
      ];
      chain.train(sequences);

      const metrics = automataAnalysis.getDeterminismMetrics(chain);

      // With multiple sequences, C4|D4 should have multiple transitions
      expect(metrics.deterministicStates).toBeLessThan(metrics.totalStates);
      expect(metrics.probabilisticStates).toBeGreaterThan(0);
      expect(metrics.stateComplexity).toBeGreaterThan(1.0);
    });

    it("should handle empty chain", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const metrics = automataAnalysis.getDeterminismMetrics(chain);

      expect(metrics.deterministicStates).toBe(0);
      expect(metrics.probabilisticStates).toBe(0);
      expect(metrics.stateComplexity).toBe(0);
      expect(metrics.totalStates).toBe(0);
    });

    it("should calculate determinism index correctly", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [["C4", "C4", "C4", "C4", "C4"]];
      chain.train(sequences);

      const metrics = automataAnalysis.getDeterminismMetrics(chain);

      // For deterministic chain, determinism index should be high (close to 1)
      expect(metrics.determinismIndex).toBeGreaterThan(0.8);
    });
  });

  describe("findNonDeterministicStates", () => {
    it("should return empty array for deterministic chain", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [["C4", "C4", "C4", "C4", "C4"]];
      chain.train(sequences);

      const nonDeterministicStates = automataAnalysis.findNonDeterministicStates(chain);

      expect(nonDeterministicStates).toHaveLength(0);
    });

    it("should return states for probabilistic chain", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [
        ["A", "B", "C"],
        ["A", "C", "B"],
        ["B", "A", "C"],
        ["B", "C", "A"],
      ];
      chain.train(sequences);

      const nonDeterministicStates = automataAnalysis.findNonDeterministicStates(chain);

      expect(nonDeterministicStates.length).toBeGreaterThan(0);
      nonDeterministicStates.forEach((state) => {
        expect(state.isDeterministic).toBe(false);
        expect(state.entropy).toBeGreaterThan(0.1);
      });
    });
  });

  describe("estimateTrainingDataRequirement", () => {
    it("should provide reasonable estimates for different target states", () => {
      const requirement = automataAnalysis.estimateTrainingDataRequirement(100, 2);

      expect(requirement.minimumSequences).toBeGreaterThan(0);
      expect(requirement.recommendedSequences).toBeGreaterThan(requirement.minimumSequences);
      expect(requirement.estimatedStates).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(requirement.feasibility);
    });
  });

  describe("exportStateDiagram", () => {
    it("should generate valid DOT graph structure", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [["C4", "D4", "E4"]];
      chain.train(sequences);

      const dotGraph = automataAnalysis.exportStateDiagram(chain);

      expect(dotGraph.nodes).toBeDefined();
      expect(dotGraph.edges).toBeDefined();
      expect(dotGraph.metadata).toBeDefined();
      expect(dotGraph.metadata.totalStates).toBeGreaterThan(0);
      expect(dotGraph.metadata.totalTransitions).toBeGreaterThan(0);
    });
  });

  describe("findCycles", () => {
    it("should detect cycles in chain", () => {
      const chain = new MarkovChain({ order: 1, smoothing: 0.1 });
      const sequences = [["A", "B", "C", "A", "B", "C"]]; // Creates a cycle
      chain.train(sequences);

      const cycles = automataAnalysis.findCycles(chain);

      expect(cycles.length).toBeGreaterThan(0);
      cycles.forEach((cycle) => {
        expect(cycle.states.length).toBeGreaterThan(1);
        expect(cycle.length).toBeGreaterThan(1);
        expect(cycle.probability).toBeGreaterThan(0);
      });
    });
  });
});
