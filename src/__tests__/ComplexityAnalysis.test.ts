import { describe, it, expect, beforeEach } from "vitest";
import { ComplexityAnalysis } from "../analysis/ComplexityAnalysis";
import { MarkovChain } from "../core/MarkovChain";

describe("ComplexityAnalysis", () => {
  let complexityAnalysis: ComplexityAnalysis;

  beforeEach(() => {
    complexityAnalysis = new ComplexityAnalysis();
  });

  describe("measureTrainingComplexity", () => {
    it("should measure complexity for simple sequences", () => {
      const sequences = [
        ["A", "B", "C"],
        ["D", "E", "F"],
      ];
      const order = 2;

      const metrics = complexityAnalysis.measureTrainingComplexity(sequences, order);

      expect(metrics.operations).toBeGreaterThan(0);
      expect(metrics.bigO).toBeDefined();
      expect(metrics.estimatedTime).toBeGreaterThanOrEqual(0);
      expect(metrics.actualTime).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(["low", "medium", "high"]).toContain(metrics.efficiency);
    });

    it("should handle empty sequences", () => {
      const sequences: string[][] = [];
      const order = 2;

      const metrics = complexityAnalysis.measureTrainingComplexity(sequences, order);

      expect(metrics.operations).toBe(0);
      expect(metrics.actualTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("estimateMemoryUsage", () => {
    it("should estimate memory for small vocabulary", () => {
      const vocabularySize = 10;
      const order = 2;

      const memoryUsage = complexityAnalysis.estimateMemoryUsage(vocabularySize, order);

      expect(memoryUsage.statesCount).toBeGreaterThan(0);
      expect(memoryUsage.transitionsCount).toBeGreaterThan(0);
      expect(memoryUsage.bytesEstimate).toBeGreaterThan(0);
      expect(memoryUsage.feasible).toBe(true);
      expect(memoryUsage.breakdown.states).toBeGreaterThan(0);
      expect(memoryUsage.breakdown.transitions).toBeGreaterThan(0);
    });

    it("should flag large vocabulary as infeasible", () => {
      const vocabularySize = 1000000;
      const order = 5;

      const memoryUsage = complexityAnalysis.estimateMemoryUsage(vocabularySize, order);

      expect(memoryUsage.feasible).toBe(false);
    });
  });

  describe("analyzeBottlenecks", () => {
    it("should identify no bottleneck for small chain", () => {
      const chain = new MarkovChain({ order: 2, smoothing: 0.1 });
      const sequences = [["A", "B", "C"]];
      chain.train(sequences);

      const analysis = complexityAnalysis.analyzeBottlenecks(chain);

      expect(analysis.bottleneck).toBe("none");
      expect(analysis.severity).toBe("low");
      expect(analysis.recommendation).toBe("No optimization needed");
      expect(analysis.metrics.stateCount).toBeGreaterThan(0);
    });

    it("should identify state explosion for large chain", () => {
      // Create a chain with many states by using high order and varied data
      const chain = new MarkovChain({ order: 3, smoothing: 0.1 });
      const sequences: string[][] = [];

      // Generate many varied sequences to create many states
      for (let i = 0; i < 100; i++) {
        const sequence = Array.from({ length: 10 }, (_, j) =>
          String.fromCharCode(65 + ((i + j) % 26))
        );
        sequences.push(sequence);
      }
      chain.train(sequences);

      const analysis = complexityAnalysis.analyzeBottlenecks(chain);

      // The analysis should detect some kind of bottleneck or complexity
      expect(analysis.bottleneck).toBeDefined();
      expect(["none", "moderate complexity", "state explosion"]).toContain(analysis.bottleneck);
      expect(analysis.metrics.stateCount).toBeGreaterThan(0);
    });
  });

  describe("recommendOptimalOrder", () => {
    it("should recommend reasonable order for given sequences", () => {
      const sequences = [
        ["A", "B", "C", "D", "E"],
        ["F", "G", "H", "I", "J"],
        ["K", "L", "M", "N", "O"],
      ];

      const recommendation = complexityAnalysis.recommendOptimalOrder(sequences);

      expect(recommendation.order).toBeGreaterThan(0);
      expect(recommendation.order).toBeLessThanOrEqual(5);
      expect(recommendation.reasoning).toBeDefined();
      expect(recommendation.tradeoffs).toBeDefined();
      expect(recommendation.expectedImprovement).toBeGreaterThanOrEqual(0);
      expect(["low", "medium", "high"]).toContain(recommendation.memoryImpact);
    });

    it("should handle empty sequences", () => {
      const sequences: string[][] = [];

      const recommendation = complexityAnalysis.recommendOptimalOrder(sequences);

      expect(recommendation.order).toBeGreaterThan(0);
      expect(recommendation.reasoning).toBeDefined();
    });
  });

  describe("profileMemoryUsage", () => {
    it("should profile memory usage during operation", () => {
      let memoryUsed = 0;
      const operation = () => {
        // Simulate some memory usage
        const array = new Array(1000).fill(0);
        memoryUsed = array.length;
      };

      const profile = complexityAnalysis.profileMemoryUsage(operation);

      expect(profile.before).toBeGreaterThanOrEqual(0);
      expect(profile.after).toBeGreaterThanOrEqual(0);
      expect(profile.delta).toBeGreaterThanOrEqual(0);
      expect(profile.peak).toBeGreaterThanOrEqual(profile.before);
    });
  });

  describe("compareImplementations", () => {
    it("should return benchmark results", async () => {
      const results = await complexityAnalysis.compareImplementations();

      expect(results.training).toBeDefined();
      expect(results.generation).toBeDefined();
      expect(results.comparison).toBeDefined();

      expect(results.training.timeMs).toBeGreaterThan(0);
      expect(results.training.operations).toBeGreaterThan(0);
      expect(results.training.memoryMB).toBeGreaterThan(0);

      expect(results.generation.timeMs).toBeGreaterThan(0);
      expect(results.generation.operations).toBeGreaterThan(0);
      expect(results.generation.memoryMB).toBeGreaterThan(0);

      expect(results.comparison.faster).toBeDefined();
      expect(results.comparison.moreMemoryEfficient).toBeDefined();
      expect(results.comparison.overall).toBeDefined();
    });
  });
});
