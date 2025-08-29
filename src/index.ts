/**
 * Markov Mania - Main Entry Point
 */

// Core Libraries
export { MarkovChain } from "./core/MarkovChain";
export { MusicMarkovChain } from "./music/MusicMarkovChain";
// TODO: Below not currently integrated, will be for future M4L integration
export { MIDIGenerator } from "./music/MIDIGenerator";

// Types
export * from "./types";

// Export demo
export { runDemo } from "./demo/markovTextDemo";

// Main function to run the application
function main(): void {
  console.log("🎵 Welcome to Markov Mania! 🎵");
  console.log("A Markov Chain-based Music Generation System\n");

  // Import and run the demo
  import("./demo/markovTextDemo")
    .then(({ runDemo }) => {
      runDemo();
    })
    .catch((error) => {
      console.error("Failed to load demo:", error);
    });
}

// Run main function if this file is executed directly
if (require.main === module) {
  main();
}
