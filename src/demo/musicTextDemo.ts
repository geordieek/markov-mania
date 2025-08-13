import { MusicMarkovChain } from "../music/MusicMarkovChain";
import { MarkovConfig } from "../types";

// Demo 2: Simple Music Generation
function demonstrateMusicGeneration(): void {
  console.log("\n=== Demo 2: Simple Music Generation ===");

  const config: MarkovConfig = {
    order: 1, // Consider 1 previous note/chord/rhythm
    smoothing: 0.1,
    maxLength: 16, // Generate 16 musical elements
  };

  const musicChain = new MusicMarkovChain(config);

  // Training data for different musical aspects
  const noteSequences = [
    ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
    ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
    ["C4", "E4", "G4", "C5", "E5", "G5", "C6", "E6"],
  ];

  const chordProgressions = [
    ["C", "F", "G", "C"],
    ["Am", "F", "C", "G"],
    ["C", "G", "Am", "F"],
    ["F", "C", "G", "Am"],
  ];

  const rhythmPatterns = [
    ["quarter", "quarter", "half", "whole"],
    ["eighth", "eighth", "quarter", "quarter", "half"],
    ["sixteenth", "sixteenth", "eighth", "quarter", "half"],
    ["whole", "half", "quarter", "quarter"],
  ];

  console.log("Training with musical patterns:");
  console.log("Notes:", noteSequences.map((seq) => seq.join(" - ")).join(" | "));
  console.log("Chords:", chordProgressions.map((seq) => seq.join(" - ")).join(" | "));
  console.log("Rhythms:", rhythmPatterns.map((seq) => seq.join(" - ")).join(" | "));

  // Train the music chain
  musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns);

  console.log("\nGenerating musical sequences:");
  for (let i = 0; i < 2; i++) {
    const music = musicChain.generateMusic(8); // Generate 8-note sequence

    console.log(`\nSequence ${i + 1}:`);
    console.log(`- Key: ${music.key}`);
    console.log(`- Time Signature: ${music.timeSignature}`);
    console.log(`- Duration: ${music.duration.toFixed(0)}ms`);
    console.log(`- Notes:`);

    music.notes.forEach((note, index) => {
      const noteName = getNoteName(note.pitch);
      console.log(
        `  ${index + 1}. ${noteName} (pitch: ${note.pitch}, velocity: ${
          note.velocity
        }, duration: ${note.duration.toFixed(0)}ms)`
      );
    });
  }

  // Show music statistics
  const musicStats = musicChain.getMusicStats();
  console.log(`\nMusic Chain Statistics:`);
  console.log(`- Note states: ${musicStats.noteStats.totalStates}`);
  console.log(`- Chord states: ${musicStats.chordStats.totalStates}`);
  console.log(`- Rhythm states: ${musicStats.rhythmStats.totalStates}`);
}

// Helper function to convert MIDI pitch to note name
function getNoteName(pitch: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(pitch / 12) - 1;
  const noteIndex = pitch % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

// Main demo function
function runDemo(): void {
  console.log("🎵 MARKOV MANIA - Music Generation Demo 🎵");
  console.log("==========================================\n");

  try {
    demonstrateMusicGeneration();

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
