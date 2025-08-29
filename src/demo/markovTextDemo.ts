import { MarkovChain } from "../core/MarkovChain";
import { MarkovConfig } from "../types";

// Demo 1: Basic Text Generation
function demonstrateTextGeneration(): void {
  console.log("=== Demo 1: Basic Text Generation ===");

  const config: MarkovConfig = {
    order: 2, // Consider 2 previous words
    smoothing: 0.1, // Small smoothing to avoid zero probabilities
    maxLength: 20, // Generate up to 20 words
  };

  const textChain = new MarkovChain(config);

  // Training data - simple sentences about music
  const trainingSentences = [
    "the music plays softly in the background",
    "music theory helps understand harmony",
    "the melody flows like a river",
    "rhythm and beat drive the song",
    "harmony creates beautiful chords",
    "the song tells a story through sound",
    "music connects people across cultures",
    "the piano keys make sweet sounds",
    "guitar strings vibrate with emotion",
    "drums keep the steady heartbeat",
  ];

  // Convert sentences to word arrays
  const wordSequences = trainingSentences.map((sentence) => sentence.toLowerCase().split(" "));

  console.log("Training the Markov chain with these sentences:");
  trainingSentences.forEach((sentence, i) => {
    console.log(`${i + 1}. "${sentence}"`);
  });

  // Train the chain
  textChain.train(wordSequences);

  console.log("\nGenerating new text sequences:");
  for (let i = 0; i < 3; i++) {
    const generated = textChain.generate(12);
    console.log(`${i + 1}. "${generated.join(" ")}"`);
  }

  // Show statistics
  const stats = textChain.getStats();
  console.log(`\nChain Statistics:`);
  console.log(`- Total states: ${stats.totalStates}`);
  console.log(`- Total transitions: ${stats.totalTransitions}`);
  console.log(`- Average transitions per state: ${stats.averageTransitionsPerState.toFixed(2)}`);
}

// Main demo function
function runDemo(): void {
  console.log("🎵 MARKOV MANIA - Text Generation Demo 🎵");
  console.log("==========================================\n");

  try {
    demonstrateTextGeneration();

    console.log("\n✅ Demo completed successfully!");
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

// Export for use in main application
export { runDemo };

// Run demo if this file is executed directly
if (require.main === module) {
  runDemo();
}
