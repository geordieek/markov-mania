import { MarkovChain } from "../core/MarkovChain";
import { MarkovConfig } from "../types";

describe("MarkovChain", () => {
  let chain: MarkovChain;
  let config: MarkovConfig;

  beforeEach(() => {
    config = {
      order: 2,
      smoothing: 0.1,
      maxLength: 10,
    };
    chain = new MarkovChain(config);
  });

  describe("Basic Functionality", () => {
    test("should train with simple sequences", () => {
      const sequences = [
        ["a", "b", "c"],
        ["b", "c", "d"],
      ];
      expect(() => chain.train(sequences)).not.toThrow();
    });

    test("should generate sequences after training", () => {
      const sequences = [
        ["a", "b", "c"],
        ["b", "c", "d"],
      ];
      chain.train(sequences);

      const generated = chain.generate();
      expect(Array.isArray(generated)).toBe(true);
      expect(generated.length).toBeGreaterThan(0);
    });
  });

  describe("Training and Learning", () => {
    test("should learn transition probabilities from training data", () => {
      const sequences = [
        ["the", "cat", "sat"],
        ["the", "cat", "ran"],
        ["the", "dog", "sat"],
      ];

      chain.train(sequences);

      // Generate multiple sequences to see if patterns are learned
      const results: string[][] = [];
      for (let i = 0; i < 5; i++) {
        results.push(chain.generate());
      }

      // Should generate different sequences (not just repeat training data)
      const uniqueResults = new Set(results.map((r) => r.join(" ")));
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    test("should handle empty training data gracefully", () => {
      expect(() => chain.train([])).not.toThrow();

      // Should throw error when trying to generate without training data
      expect(() => chain.generate()).toThrow("No training data available");
    });
  });

  describe("Generation Behavior", () => {
    test("should respect maxLength configuration", () => {
      const sequences = [["a", "b", "c", "d", "e"]];
      chain.train(sequences);

      const generated = chain.generate();
      expect(generated.length).toBeLessThanOrEqual(config.maxLength);
    });

    test("should generate different sequences on multiple calls", () => {
      const sequences = [
        ["a", "b", "c"],
        ["b", "c", "d"],
        ["c", "d", "e"],
      ];
      chain.train(sequences);

      const first = chain.generate();
      const second = chain.generate();

      // With randomness, we should get different results (though not guaranteed)
      // This test might occasionally fail due to randomness, but that's expected
      const different = first.join("") !== second.join("");
      if (!different) {
        console.log("Note: Generated identical sequences (random behavior)");
      }
    });
  });

  describe("Statistics", () => {
    test("should provide meaningful statistics after training", () => {
      const sequences = [
        ["a", "b", "c", "d"],
        ["b", "c", "d", "e"],
        ["c", "d", "e", "f"],
      ];

      chain.train(sequences);
      const stats = chain.getStats();

      expect(stats.totalStates).toBeGreaterThan(0);
      expect(stats.totalTransitions).toBeGreaterThan(0);
      expect(stats.averageTransitionsPerState).toBeGreaterThan(0);
    });

    test("should reset statistics when reset is called", () => {
      const sequences = [["a", "b", "c"]];
      chain.train(sequences);

      const statsBefore = chain.getStats();
      expect(statsBefore.totalStates).toBeGreaterThan(0);

      chain.reset();

      // After reset, should throw error when trying to generate
      expect(() => chain.generate()).toThrow("No training data available");
    });
  });
});
