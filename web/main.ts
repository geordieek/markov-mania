import { MusicMarkovChain } from "@src/music/MusicMarkovChain";
import type { MarkovConfig } from "@src/types";

// DOM elements
const trainingDataEl = document.getElementById("trainingData") as HTMLTextAreaElement;
const trainBtn = document.getElementById("train") as HTMLButtonElement;
const generateBtn = document.getElementById("generate") as HTMLButtonElement;
const playBtn = document.getElementById("play") as HTMLButtonElement;
const stopBtn = document.getElementById("stop") as HTMLButtonElement;
const sequenceLengthEl = document.getElementById("sequenceLength") as HTMLInputElement;
const outputEl = document.getElementById("output") as HTMLDivElement;
const transitionsEl = document.getElementById("transitions") as HTMLDivElement;

// Markov chain instance
const config: MarkovConfig = { order: 2, smoothing: 0.1, maxLength: 64 };
const musicChain = new MusicMarkovChain(config);

// State
let isTrained = false;
let currentSequence: string[] = [];
let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

// Train the Markov chain
trainBtn.addEventListener("click", () => {
  let trainingText = trainingDataEl.value.trim();

  // If no input, use the placeholder text as default training data
  if (!trainingText) {
    trainingText = trainingDataEl.placeholder;
    trainingDataEl.value = trainingText; // Show the user what's being used
  }

  if (!trainingText) {
    outputEl.textContent = "Please enter some training sequences first.";
    return;
  }

  try {
    const sequences = trainingText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(/\s+/));

    // Reset and train
    musicChain.resetAll?.();
    musicChain.trainWithMusic(sequences, sequences, sequences);

    isTrained = true;
    updateUI();
    updateTransitions(sequences);
    outputEl.textContent = `Trained with ${sequences.length} sequences! Click "Generate New Sequence" to create music.`;
  } catch (error) {
    outputEl.textContent = `Error training: ${error}`;
  }
});

// Generate new sequence
generateBtn.addEventListener("click", () => {
  if (!isTrained) {
    outputEl.textContent = "Please train the Markov chain first!";
    return;
  }

  try {
    const length = parseInt(sequenceLengthEl.value) || 8;
    const music = musicChain.generateSequence(length);

    // Extract note names from the generated sequence
    currentSequence = music.notes.map((note) => getNoteName(note.pitch));

    updateUI();
    outputEl.textContent = currentSequence.join(" ");

    // Enable play button
    playBtn.disabled = false;
  } catch (error) {
    outputEl.textContent = `Error generating: ${error}`;
  }
});

// Play sequence
playBtn.addEventListener("click", async () => {
  if (!currentSequence.length) return;

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    playSequence(currentSequence);
    playBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (error) {
    outputEl.textContent = `Error playing: ${error}`;
  }
});

// Stop playing
stopBtn.addEventListener("click", () => {
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
  }
  if (gainNode) {
    gainNode.gain.setValueAtTime(0, audioContext?.currentTime || 0);
  }
  playBtn.disabled = false;
  stopBtn.disabled = true;
});

// Play a sequence of notes
function playSequence(notes: string[]) {
  if (!audioContext) return;

  const tempo = 120; // BPM
  const beatDuration = 60 / tempo; // seconds per beat

  notes.forEach((note, index) => {
    const startTime = audioContext!.currentTime + index * beatDuration;
    const duration = beatDuration * 0.8; // 80% of beat duration

    playNote(note, startTime, duration);
  });
}

// Play a single note
function playNote(noteName: string, startTime: number, duration: number) {
  if (!audioContext) return;

  const frequency = getNoteFrequency(noteName);

  oscillator = audioContext.createOscillator();
  gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

// Get frequency for a note name
function getNoteFrequency(noteName: string): number {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const note = noteName.replace(/\d/g, "");
  const octave = parseInt(noteName.replace(/\D/g, "")) || 4;

  const noteIndex = noteNames.indexOf(note);
  if (noteIndex === -1) return 440;

  // A4 = 440Hz, calculate relative frequency
  const semitonesFromA4 = noteIndex - 9 + (octave - 4) * 12;
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

// Get note name from pitch
function getNoteName(pitch: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(pitch / 12) - 1;
  const idx = pitch % 12;
  return `${noteNames[idx]}${octave}`;
}

// Update UI state
function updateUI() {
  generateBtn.disabled = !isTrained;
  playBtn.disabled = !isTrained || !currentSequence.length;
  stopBtn.disabled = true;
}

// Update transitions display
function updateTransitions(sequences: string[][]) {
  if (!transitionsEl) return;

  try {
    // Create a simple transition map from the training sequences
    const transitions = new Map<string, Map<string, number>>();

    // For order 2, we look at pairs of notes
    const order = 2;

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - order; i++) {
        const context = sequence.slice(i, i + order).join(" ");
        const nextNote = sequence[i + order];

        if (nextNote) {
          if (!transitions.has(context)) {
            transitions.set(context, new Map());
          }

          const contextTransitions = transitions.get(context)!;
          contextTransitions.set(nextNote, (contextTransitions.get(nextNote) || 0) + 1);
        }
      }
    }

    // Display the transitions
    if (transitions.size === 0) {
      transitionsEl.innerHTML =
        '<div style="color: #6c757d; text-align: center; padding: 20px">No transitions found</div>';
      return;
    }

    const transitionItems = Array.from(transitions.entries())
      .slice(0, 15) // Limit to first 15 for display
      .map(([context, nextNotes]) => {
        const total = Array.from(nextNotes.values()).reduce((sum, count) => sum + count, 0);
        const topNext = Array.from(nextNotes.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([note, count]) => `${note} (${Math.round((count / total) * 100)}%)`)
          .join(", ");

        return `
          <div class="transition-item">
            <div class="transition-from">${context}</div>
            <div class="transition-arrow">→</div>
            <div class="transition-to">${topNext}</div>
          </div>
        `;
      });

    transitionsEl.innerHTML = transitionItems.join("");
  } catch (error) {
    transitionsEl.innerHTML =
      '<div style="color: #6c757d; text-align: center; padding: 20px">Error displaying transitions</div>';
  }
}

// Initialize
updateUI();
