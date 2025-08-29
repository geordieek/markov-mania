import { MusicMarkovChain } from "../music/MusicMarkovChain";

// Demo of using the MusicMarkovChain for generating musical sequences
console.log("🎵 Music Markov Chain Demo");
console.log("==========================");

// Create a music Markov chain
const musicChain = new MusicMarkovChain({
  order: 1, // Consider 1 previous note/rhythm
  smoothing: 0.1,
  maxLength: 16,
});

// Training data - musical sequences
const noteSequences = [
  ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
  ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
  ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
  ["D4", "E4", "F#4", "G4", "A4", "B4", "C#5", "D5"],
];

const rhythmPatterns = [
  ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"],
  ["eighth", "eighth", "quarter", "eighth", "eighth", "quarter", "half", "quarter"],
  ["quarter", "eighth", "eighth", "quarter", "quarter", "eighth", "eighth", "half"],
  ["eighth", "eighth", "eighth", "eighth", "quarter", "quarter", "half", "quarter"],
];

console.log("Training with musical data...");
console.log("Notes:", noteSequences.map((seq) => seq.join(" - ")).join(" | "));
console.log("Rhythms:", rhythmPatterns.map((seq) => seq.join(" - ")).join(" | "));

// Train the chain
musicChain.trainWithMusic(noteSequences, rhythmPatterns);

console.log("\n🎼 Generating musical sequences...");
console.log("==================================");

// Generate several sequences
for (let i = 1; i <= 3; i++) {
  console.log(`\n--- Sequence ${i} ---`);
  const sequence = musicChain.generateSequence(8);

  console.log(`Key: ${sequence.key}`);
  console.log(`Time Signature: ${sequence.timeSignature}`);
  console.log(`Duration: ${sequence.duration}ms`);
  console.log("Notes:");

  sequence.notes.forEach((note, index) => {
    const noteName = getNoteName(note.pitch);
    console.log(
      `  ${index + 1}. ${noteName} (pitch: ${note.pitch}, velocity: ${note.velocity}, duration: ${
        note.duration
      }ms, start: ${note.startTime}ms)`
    );
  });
}

// Get statistics
const musicStats = musicChain.getMusicStats();
console.log("\n📊 Music Statistics");
console.log("===================");
console.log(`- Note states: ${musicStats.noteStats.totalStates}`);
console.log(`- Rhythm states: ${musicStats.rhythmStats.totalStates}`);
console.log(
  `- Total transitions: ${
    musicStats.noteStats.totalTransitions + musicStats.rhythmStats.totalTransitions
  }`
);

// Helper function to convert MIDI pitch to note name
function getNoteName(pitch: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(pitch / 12) - 1;
  const noteName = noteNames[pitch % 12];
  return `${noteName}${octave}`;
}
