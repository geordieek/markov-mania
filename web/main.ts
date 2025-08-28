import { MarkovChain } from "../src/core/MarkovChain";
import type { MarkovConfig } from "../src/types";
import * as Tone from "tone";

// Get DOM elements
const trainingDataEl = document.getElementById("trainingData") as HTMLTextAreaElement;
const trainBtn = document.getElementById("train") as HTMLButtonElement;
const sequenceLengthEl = document.getElementById("sequenceLength") as HTMLInputElement;
const generateBtn = document.getElementById("generate") as HTMLButtonElement;
const outputEl = document.getElementById("output") as HTMLDivElement;
const playBtn = document.getElementById("play") as HTMLButtonElement;
const stopBtn = document.getElementById("stop") as HTMLButtonElement;

// Create Markov chain with simple configuration
const config: MarkovConfig = {
  order: 2, // Look at 2 previous notes to predict the next one
  smoothing: 0.1, // Small smoothing to avoid zero probabilities
  maxLength: 20, // Maximum sequence length
};

const markovChain = new MarkovChain(config);
let isTrained = false;
let currentSequence: string[] = [];
let synth: Tone.PolySynth<Tone.Synth<Tone.SynthOptions>> | null = null;
let part: Tone.Part | null = null;

// Log function for output
function log(message: string) {
  outputEl.textContent = message;
}

// Initialize audio context
async function initAudio() {
  if (Tone.getContext().state !== "running") {
    await Tone.start();
  }
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
  }
}

// Convert note name to frequency
function noteToFrequency(noteName: string): number {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const match = noteName.match(/^([A-G](?:#|b)?)(\d+)$/);
  if (!match) return 440; // Default to A4 if parsing fails

  let name = match[1];
  const octave = parseInt(match[2], 10);

  // Handle flats
  const flatToSharp: Record<string, string> = {
    Ab: "G#",
    Bb: "A#",
    Cb: "B",
    Db: "C#",
    Eb: "D#",
    Fb: "E",
    Gb: "F#",
  };
  if (name.endsWith("b") && flatToSharp[name]) {
    name = flatToSharp[name];
  }

  const noteIndex = noteNames.indexOf(name);
  if (noteIndex === -1) return 440;

  // Calculate frequency: A4 = 440Hz, each semitone is 2^(1/12)
  const semitonesFromA4 = (octave - 4) * 12 + noteIndex - 9; // 9 is A's index
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

// Play the current sequence
async function playSequence() {
  if (!currentSequence.length) {
    log("No sequence to play! Generate one first.");
    return;
  }

  await initAudio();

  if (part) {
    part.stop();
    part.dispose();
  }

  // Create a sequence of notes with timing
  const events: Array<{ time: number; note: string; duration: number }> = [];
  currentSequence.forEach((note, index) => {
    events.push({
      time: index * 0.5, // Each note gets 0.5 seconds
      note: note,
      duration: 0.4, // Slight gap between notes
    });
  });

  part = new Tone.Part(
    (time, event) => {
      const freq = noteToFrequency(event.note);
      synth!.triggerAttackRelease(freq, event.duration, time);
    },
    events.map((e) => [e.time, e] as [number, typeof e])
  );

  part.start(0);
  Tone.Transport.start();
  log(`🎵 Playing sequence: ${currentSequence.join(" ")}`);
}

// Stop playback
function stopSequence() {
  if (part) {
    part.stop();
    part.dispose();
    part = null;
  }
  Tone.Transport.stop();
  log("⏹️ Stopped playback");
}

// Train the Markov chain with the input data
function trainChain() {
  const trainingText = trainingDataEl.value.trim();

  if (!trainingText) {
    log("Please enter some training sequences first!");
    return;
  }

  // Parse training data - each line is a sequence, notes separated by spaces
  const sequences = trainingText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/\s+/));

  if (sequences.length === 0) {
    log("No valid sequences found. Please check your input format.");
    return;
  }

  // Reset and train the chain
  markovChain.reset();
  markovChain.train(sequences);

  isTrained = true;
  log(
    `✅ Trained on ${sequences.length} sequences!\n\nClick "Generate New Sequence" to create music.`
  );

  // Show some info about what was learned
  const totalTokens = sequences.reduce((sum, seq) => sum + seq.length, 0);
  console.log(`Trained on ${totalTokens} total tokens across ${sequences.length} sequences`);
}

// Generate a new sequence
function generateSequence() {
  if (!isTrained) {
    log("Please train the Markov chain first!");
    return;
  }

  const length = parseInt(sequenceLengthEl.value);

  try {
    // Generate the sequence
    const generated = markovChain.generate();

    // Limit to requested length
    currentSequence = generated.slice(0, length);

    // Format the output nicely
    const formattedSequence = currentSequence.join(" ");

    log(
      `🎵 Generated Sequence (${currentSequence.length} notes):\n\n${formattedSequence}\n\nClick "Play Sequence" to hear it!`
    );

    // Enable play button
    playBtn.disabled = false;

    // Also log to console for debugging
    console.log("Generated sequence:", currentSequence);
  } catch (error) {
    log(`Error generating sequence: ${error}`);
    console.error("Generation error:", error);
  }
}

// Event listeners
trainBtn.addEventListener("click", trainChain);
generateBtn.addEventListener("click", generateSequence);
playBtn.addEventListener("click", playSequence);
stopBtn.addEventListener("click", stopSequence);

// Initialize with some example data
trainingDataEl.value = `C4 D4 E4 F4 G4 A4 B4 C5
G3 A3 B3 C4 D4 E4 F#4 G4
F3 G3 A3 Bb3 C4 D4 E4 F4
C4 E4 G4 B4 C5 A4 F4 D4
D4 F#4 A4 C5 B4 G4 E4 C4`;

// Initial state
log(
  "🎵 Markov Chain Music Generator Ready!\n\n1. Review the example training data above\n2. Click 'Train Markov Chain' to learn the patterns\n3. Click 'Generate New Sequence' to create new music\n4. Click 'Play Sequence' to hear your creation!\n\nTry adding your own sequences to the training data!"
);
