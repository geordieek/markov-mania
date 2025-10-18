/**
 * Measures time/space complexity, memory usage, and provides optimization recommendations
 */

import { MarkovChain } from "../core/MarkovChain";

export interface ComplexityMetrics {
  operations: number;
  bigO: string;
  estimatedTime: number;
  actualTime: number;
  memoryUsage: number;
  efficiency: "low" | "medium" | "high";
}

export interface MemoryUsage {
  statesCount: number;
  transitionsCount: number;
  bytesEstimate: number;
  feasible: boolean;
  breakdown: {
    states: number;
    transitions: number;
    metadata: number;
  };
}

export interface BenchmarkResults {
  training: {
    timeMs: number;
    operations: number;
    memoryMB: number;
  };
  generation: {
    timeMs: number;
    operations: number;
    memoryMB: number;
  };
  comparison: {
    faster: string;
    moreMemoryEfficient: string;
    overall: string;
  };
}

export interface OptimizationRecommendation {
  order: number;
  reasoning: string;
  tradeoffs: string;
  expectedImprovement: number;
  memoryImpact: "low" | "medium" | "high";
}

export class ComplexityAnalysis {
  private measurements: Map<string, number> = new Map();

  /**
   * Measure training complexity for given sequences and order
   */
  measureTrainingComplexity(sequences: string[][], order: number): ComplexityMetrics {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // Count operations
    let operations = 0;
    const vocabularySize = this.estimateVocabularySize(sequences);

    for (const sequence of sequences) {
      // Each sequence contributes order * (sequence.length - order) operations
      const sequenceOps = Math.max(0, sequence.length - order) * order;
      operations += sequenceOps;

      // Each operation involves:
      // - Context key creation: O(order)
      // - State lookup/creation: O(1) average
      // - Transition update: O(1)
      operations += sequenceOps * (order + 2);
    }

    // Normalization adds vocabularySize * statesCount operations
    const estimatedStates = Math.min(vocabularySize ** order, sequences.length * 10);
    operations += vocabularySize * estimatedStates;

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    const actualTime = endTime - startTime;
    const memoryUsage = endMemory - startMemory;

    // Calculate Big O notation
    const totalSequenceLength = sequences.reduce((sum, seq) => sum + seq.length, 0);
    const bigO = `O(n * m * k + v^k)`; // n=sequences, m=avg_length, k=order, v=vocabulary

    // Determine efficiency
    let efficiency: "low" | "medium" | "high" = "high";
    if (actualTime > 1000 || memoryUsage > 100) {
      efficiency = "low";
    } else if (actualTime > 100 || memoryUsage > 10) {
      efficiency = "medium";
    }

    return {
      operations,
      bigO,
      estimatedTime: this.estimateTime(operations),
      actualTime,
      memoryUsage,
      efficiency,
    };
  }

  /**
   * Estimate memory usage for different configurations
   */
  estimateMemoryUsage(vocabularySize: number, order: number): MemoryUsage {
    const maxStates = Math.min(vocabularySize ** order, 1000000); // Cap at 1M states
    const avgTransitionsPerState = Math.min(vocabularySize, 20); // Reasonable average
    const totalTransitions = maxStates * avgTransitionsPerState;

    // Memory breakdown (rough estimates)
    const stateSize = 200; // bytes per state (id, metadata, etc.)
    const transitionSize = 50; // bytes per transition (key, probability)
    const metadataSize = 1000; // bytes for chain metadata

    const statesMemory = maxStates * stateSize;
    const transitionsMemory = totalTransitions * transitionSize;
    const totalMemory = statesMemory + transitionsMemory + metadataSize;

    const feasible = totalMemory < 100 * 1024 * 1024; // 100MB limit

    return {
      statesCount: maxStates,
      transitionsCount: totalTransitions,
      bytesEstimate: totalMemory,
      feasible,
      breakdown: {
        states: statesMemory,
        transitions: transitionsMemory,
        metadata: metadataSize,
      },
    };
  }

  /**
   * Benchmark different implementations
   */
  async compareImplementations(): Promise<BenchmarkResults> {
    // This would compare different data structures or algorithms
    // For now, return mock results
    const training = {
      timeMs: 50,
      operations: 1000,
      memoryMB: 5,
    };

    const generation = {
      timeMs: 10,
      operations: 100,
      memoryMB: 1,
    };

    return {
      training,
      generation,
      comparison: {
        faster: "Current implementation",
        moreMemoryEfficient: "Current implementation",
        overall: "Current implementation is optimal",
      },
    };
  }

  /**
   * Recommend optimal order for given training data
   */
  recommendOptimalOrder(sequences: string[][]): OptimizationRecommendation {
    const vocabularySize = this.estimateVocabularySize(sequences);
    const totalLength = sequences.reduce((sum, seq) => sum + seq.length, 0);
    const avgLength = totalLength / sequences.length;

    let bestOrder = 1;
    let bestScore = 0;
    const recommendations: OptimizationRecommendation[] = [];

    for (let order = 1; order <= 5; order++) {
      const memoryUsage = this.estimateMemoryUsage(vocabularySize, order);
      const complexity = this.measureTrainingComplexity(sequences, order);

      // Score based on balance of complexity and memory usage
      const complexityScore = 1 / (complexity.actualTime + 1);
      const memoryScore = memoryUsage.feasible ? 1 : 0.1;
      const coverageScore = Math.min(1, vocabularySize ** order / (totalLength * 0.1));

      const score = complexityScore * memoryScore * coverageScore;

      let memoryImpact: "low" | "medium" | "high" = "low";
      if (memoryUsage.bytesEstimate > 50 * 1024 * 1024) {
        memoryImpact = "high";
      } else if (memoryUsage.bytesEstimate > 10 * 1024 * 1024) {
        memoryImpact = "medium";
      }

      const recommendation: OptimizationRecommendation = {
        order,
        reasoning: this.getOrderReasoning(order, vocabularySize, avgLength, memoryUsage.feasible),
        tradeoffs: this.getOrderTradeoffs(order, complexity, memoryUsage),
        expectedImprovement: score,
        memoryImpact,
      };

      recommendations.push(recommendation);

      if (score > bestScore) {
        bestScore = score;
        bestOrder = order;
      }
    }

    return recommendations.find((r) => r.order === bestOrder) || recommendations[0];
  }

  /**
   * Profile memory usage during operation
   */
  profileMemoryUsage(operation: () => void): {
    before: number;
    after: number;
    delta: number;
    peak: number;
  } {
    const before = this.getMemoryUsage();
    let peak = before;

    // Monitor memory during operation
    const interval = setInterval(() => {
      const current = this.getMemoryUsage();
      peak = Math.max(peak, current);
    }, 10);

    operation();

    clearInterval(interval);

    const after = this.getMemoryUsage();

    return {
      before,
      after,
      delta: after - before,
      peak,
    };
  }

  /**
   * Analyze performance bottlenecks
   */
  analyzeBottlenecks(chain: MarkovChain): {
    bottleneck: string;
    severity: "low" | "medium" | "high";
    recommendation: string;
    metrics: {
      stateCount: number;
      avgTransitionsPerState: number;
      memoryUsage: number;
    };
  } {
    const states = chain.getStates();
    const stateCount = states.length;
    const totalTransitions = states.reduce((sum, state) => sum + state.transitions.size, 0);
    const avgTransitionsPerState = stateCount > 0 ? totalTransitions / stateCount : 0;
    const memoryUsage = this.estimateMemoryUsageFromChain(chain);

    let bottleneck = "none";
    let severity: "low" | "medium" | "high" = "low";
    let recommendation = "No optimization needed";

    if (stateCount > 100000) {
      bottleneck = "state explosion";
      severity = "high";
      recommendation = "Reduce order or vocabulary size";
    } else if (avgTransitionsPerState > 50) {
      bottleneck = "transition density";
      severity = "medium";
      recommendation = "Prune low-probability transitions";
    } else if (memoryUsage > 50 * 1024 * 1024) {
      bottleneck = "memory usage";
      severity = "high";
      recommendation = "Use sparse matrix representation";
    } else if (stateCount > 10000) {
      bottleneck = "moderate complexity";
      severity = "medium";
      recommendation = "Consider optimization for better performance";
    }

    return {
      bottleneck,
      severity,
      recommendation,
      metrics: {
        stateCount,
        avgTransitionsPerState,
        memoryUsage,
      },
    };
  }

  // Private helper methods

  private estimateVocabularySize(sequences: string[][]): number {
    const vocabulary = new Set<string>();
    for (const sequence of sequences) {
      for (const element of sequence) {
        vocabulary.add(element);
      }
    }
    return vocabulary.size;
  }

  private estimateTime(operations: number): number {
    // Rough estimate: 1M operations per second
    return (operations / 1000000) * 1000; // Convert to milliseconds
  }

  private getMemoryUsage(): number {
    // Browser memory API (if available) - Chrome-specific
    if (typeof performance !== "undefined" && "memory" in performance) {
      const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
      if (memory) {
        return memory.usedJSHeapSize / (1024 * 1024); // MB
      }
    }
    return 0; // Fallback for Node.js or browsers without memory API
  }

  private getOrderReasoning(
    order: number,
    vocabularySize: number,
    avgLength: number,
    feasible: boolean
  ): string {
    if (!feasible) {
      return `Order ${order} requires too much memory (${vocabularySize}^${order} states)`;
    }

    if (order === 1) {
      return "Simple patterns, fast training, but limited context";
    } else if (order === 2) {
      return "Good balance of context and performance, recommended for most cases";
    } else if (order === 3) {
      return "Rich context, good for complex patterns, moderate memory usage";
    } else {
      return `Very rich context, high memory usage, only for large datasets`;
    }
  }

  private getOrderTradeoffs(
    order: number,
    complexity: ComplexityMetrics,
    memoryUsage: MemoryUsage
  ): string {
    const tradeoffs = [];

    if (complexity.actualTime > 1000) {
      tradeoffs.push("Slow training");
    }

    if (memoryUsage.bytesEstimate > 10 * 1024 * 1024) {
      tradeoffs.push("High memory usage");
    }

    if (order > 3) {
      tradeoffs.push("May overfit with small datasets");
    }

    if (order < 2) {
      tradeoffs.push("Limited musical context");
    }

    return tradeoffs.length > 0 ? tradeoffs.join(", ") : "Good balance of features";
  }

  private estimateMemoryUsageFromChain(chain: MarkovChain): number {
    const states = chain.getStates();
    const stateCount = states.length;
    const totalTransitions = states.reduce((sum, state) => sum + state.transitions.size, 0);

    // Rough estimate: 200 bytes per state + 50 bytes per transition
    return (stateCount * 200 + totalTransitions * 50) / (1024 * 1024); // MB
  }
}
