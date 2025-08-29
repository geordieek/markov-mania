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
const statsEl = document.getElementById("stats") as HTMLDivElement;
const analysisEl = document.getElementById("analysis") as HTMLDivElement;
const orderEl = document.getElementById("order") as HTMLSelectElement;

// Markov chain instance
const config: MarkovConfig = { order: 2, smoothing: 0.1, maxLength: 64, temperature: 1.0 };
const musicChain = new MusicMarkovChain(config);

// Update config when sequence length changes
sequenceLengthEl.addEventListener("change", () => {
  const newLength = parseInt(sequenceLengthEl.value);
  if (newLength && newLength > 0) {
    config.maxLength = newLength;
    console.log("Updated maxLength to:", config.maxLength);
  }
});

// Update config when smoothing changes
const smoothingEl = document.getElementById("smoothing") as HTMLInputElement;
smoothingEl.addEventListener("input", () => {
  const newSmoothing = parseFloat(smoothingEl.value);
  config.smoothing = newSmoothing;

  // Update the display value
  const smoothingValueEl = document.getElementById("smoothingValue");
  if (smoothingValueEl) {
    smoothingValueEl.textContent = newSmoothing.toString();
  }

  // Retrain if already trained
  if (isTrained) {
    outputEl.textContent = "Smoothing changed. Please retrain the Markov chain.";
    isTrained = false;
    currentSequence = [];
    updateUI();
  }
});

// Update config when temperature changes
const temperatureEl = document.getElementById("temperature") as HTMLInputElement;
temperatureEl.addEventListener("input", () => {
  const newTemperature = parseFloat(temperatureEl.value);
  config.temperature = newTemperature;

  // Update the display value
  const temperatureValueEl = document.getElementById("temperatureValue");
  if (temperatureValueEl) {
    let displayText = newTemperature.toString();
    if (newTemperature < 0.5) displayText += " (Low)";
    else if (newTemperature > 1.5) displayText += " (High)";
    else displayText += " (Normal)";

    temperatureValueEl.textContent = displayText;
  }

  // Apply temperature to existing chain if trained
  if (isTrained) {
    (musicChain as any).noteChain.setTemperature?.(newTemperature);
    (musicChain as any).chordChain.setTemperature?.(newTemperature);
    (musicChain as any).rhythmChain.setTemperature?.(newTemperature);
    console.log("Applied temperature:", newTemperature, "to existing chain");
  }
});

// Update config when order changes
orderEl.addEventListener("change", () => {
  const newOrder = parseInt(orderEl.value);
  if (newOrder !== config.order) {
    config.order = newOrder;
    // Reset training state since order affects the model
    isTrained = false;
    currentSequence = [];
    updateUI();
    updateTransitions([]);
    outputEl.textContent = "Order changed. Please retrain the Markov chain.";
  }
});

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

  // If still no input, alert the user
  if (!trainingText) {
    outputEl.textContent = "Please enter some training sequences first.";
    return;
  }
  console.log("Training with config:", config);

  try {
    const sequences = trainingText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(/\s+/));

    // Reset and train with current config
    musicChain.resetAll?.();
    console.log("Training with config:", config);

    // Create a new Markov chain instance with current config
    const newChain = new MusicMarkovChain(config);
    Object.assign(musicChain, newChain);

    // Apply temperature and smoothing to the new chain
    (musicChain as any).noteChain.setTemperature?.(config.temperature || 1.0);
    (musicChain as any).chordChain.setTemperature?.(config.temperature || 1.0);
    (musicChain as any).rhythmChain.setTemperature?.(config.temperature || 1.0);

    musicChain.trainWithMusic(sequences, sequences, sequences);

    isTrained = true;
    updateUI();
    // Show the transitions that were actually used in generation
    showGeneratedTransitions(currentSequence);
    // Update analysis after training
    updateAnalysis();
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
    const requestedLength = parseInt(sequenceLengthEl.value) || 8;
    console.log("Requesting sequence of exact length:", requestedLength);
    console.log("Config:", config);

    // Generate sequence with exact length requested
    const music = musicChain.generateSequence(requestedLength);

    // Extract note names from the generated sequence
    currentSequence = music.notes.map((note) => getNoteName(note.pitch));

    updateUI();
    outputEl.textContent = currentSequence.join(" ");

    // Highlight which transitions were used in generation
    showGeneratedTransitions(currentSequence);

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

// Play training sequence
const playTrainingBtn = document.getElementById("playTraining") as HTMLButtonElement;
playTrainingBtn.addEventListener("click", async () => {
  let trainingText = trainingDataEl.value.trim();

  // If no input, use the placeholder text as fallback
  if (!trainingText) {
    trainingText = trainingDataEl.placeholder;
  }

  if (!trainingText) {
    outputEl.textContent = "No training sequences available.";
    return;
  }

  try {
    // Ensure audio context is initialized
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const sequences = trainingText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(/\s+/));

    if (sequences.length === 0) {
      outputEl.textContent = "No valid sequences found.";
      return;
    }

    // Play all sequences one by one
    playAllTrainingSequences(sequences);
  } catch (error) {
    outputEl.textContent = `Error playing training sequence: ${error}`;
  }
});

// Play all training sequences with visual feedback
async function playAllTrainingSequences(sequences: string[][]) {
  const initialOutputTextContent = outputEl.textContent;
  const tempo = 120; // BPM
  const beatDuration = 60 / tempo; // seconds per beat
  const sequenceDelay = 1000; // 1 second between sequences

  for (let i = 0; i < sequences.length; i++) {
    const sequence = sequences[i];

    // Show which sequence is currently playing
    outputEl.textContent = `Playing sequence ${i + 1}/${sequences.length}: ${sequence.join(" ")}`;

    // Play the current sequence
    await playSequenceWithDelay(sequence, beatDuration);

    // Wait before playing the next sequence (unless it's the last one)
    if (i < sequences.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, sequenceDelay));
    }
  }

  // Restore output text content
  outputEl.textContent = initialOutputTextContent;
}

// Play a sequence with a delay between notes
async function playSequenceWithDelay(notes: string[], beatDuration: number): Promise<void> {
  return new Promise((resolve) => {
    let notesPlayed = 0;

    notes.forEach((note, index) => {
      const startTime = audioContext!.currentTime + index * beatDuration;
      const duration = beatDuration * 0.8; // 80% of beat duration

      playNote(note, startTime, duration);
      notesPlayed++;

      // Resolve when all notes have been scheduled
      if (notesPlayed === notes.length) {
        setTimeout(resolve, notes.length * beatDuration * 1000);
      }
    });
  });
}

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

    // Use the actual config order, not hardcoded 2
    const order = config.order;

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

// Show transitions from the generated sequence (not retraining!)
function showGeneratedTransitions(sequence: string[]) {
  if (!transitionsEl) return;

  const order = config.order;
  const usedTransitions = new Set<string>();

  // Extract transitions from the generated sequence
  for (let i = 0; i <= sequence.length - order; i++) {
    const context = sequence.slice(i, i + order).join(" ");
    const nextNote = sequence[i + order];

    if (nextNote) {
      const transitionKey = `${context} → ${nextNote}`;
      usedTransitions.add(transitionKey);
    }
  }

  // Debug: log what transitions we're looking for
  console.log("Generated sequence:", sequence);
  console.log("Used transitions:", Array.from(usedTransitions));

  // Highlight used transitions in the existing display
  const transitionItems = transitionsEl.querySelectorAll(".transition-item");

  transitionItems.forEach((item) => {
    const fromEl = item.querySelector(".transition-from");
    const toEl = item.querySelector(".transition-to");

    if (fromEl && toEl) {
      const fromText = fromEl.textContent || "";
      const toText = toEl.textContent || "";

      // Check if this transition was used in generation
      // We need to match the exact context and check if any of the possible next notes were used
      const wasUsed = Array.from(usedTransitions).some((used) => {
        // used format: "C4 D4 → E4"
        // fromText format: "C4 D4"
        // toText format: "E4 (100%)" or "F4 (75%), F#4 (25%)"

        if (!used.startsWith(fromText + " → ")) return false;

        // Extract the actual note from the used transition
        const usedNote = used.split(" → ")[1];

        // Extract all possible notes from toText (before the percentages)
        const possibleNotes = toText.split(",").map((note) => note.split("(")[0].trim());

        // Check if the used note matches any of the possible notes
        return possibleNotes.includes(usedNote);
      });

      if (wasUsed) {
        item.classList.add("used-transition");
      } else {
        item.classList.remove("used-transition");
      }
    }
  });

  // Add a small indicator showing which transitions were used
  const existingHeader = transitionsEl.querySelector(".transitions-header");
  if (!existingHeader) {
    const header = document.createElement("div");
    header.className = "transitions-header";
    header.style.cssText = "margin-bottom: 12px; color: #6c757d; font-size: 12px;";
    header.innerHTML = `
      <div>Training Data Transitions</div>
      <div style="font-size: 10px; margin-top: 4px;">
        <span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">Used</span>
        <span style="background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px;">Unused</span>
      </div>
    `;
    transitionsEl.insertBefore(header, transitionsEl.firstChild);
  }

  // Also show which transitions were actually used in generation
  const usedHeader = document.createElement("div");
  usedHeader.style.cssText =
    "margin-top: 16px; padding: 8px; background: #f8f9fa; border-radius: 6px; font-size: 12px;";
  usedHeader.innerHTML = `
    <strong>Generated Sequence Transitions:</strong><br>
    ${Array.from(usedTransitions).join(", ")}
  `;

  // Remove any existing used transitions header
  const existingUsedHeader = transitionsEl.querySelector(".generated-transitions-header");
  if (existingUsedHeader) {
    existingUsedHeader.remove();
  }

  usedHeader.className = "generated-transitions-header";
  transitionsEl.appendChild(usedHeader);
}

// Update analysis display
function updateAnalysis() {
  if (!statsEl || !analysisEl || !musicChain) return;

  try {
    const musicStats = musicChain.getMusicStats();
    const noteAnalysis = (musicChain as any).noteChain.getTransitionAnalysis();

    // Display statistics
    statsEl.innerHTML = `
      <strong>Note States:</strong> ${musicStats.noteStats.totalStates}<br>
      <strong>Chord States:</strong> ${musicStats.chordStats.totalStates}<br>
      <strong>Rhythm States:</strong> ${musicStats.rhythmStats.totalStates}<br>
      <strong>Avg Transitions:</strong> ${musicStats.noteStats.averageTransitionsPerState.toFixed(
        2
      )}
    `;

    // Display transition analysis
    analysisEl.innerHTML = `
      <strong>Deterministic:</strong> ${noteAnalysis.deterministicStates}<br>
      <strong>Probabilistic:</strong> ${noteAnalysis.probabilisticStates}<br>
      <strong>Variation:</strong> ${noteAnalysis.probabilisticStates > 0 ? "Good" : "Limited"}
    `;
  } catch (error) {
    statsEl.innerHTML = "Error getting statistics";
    analysisEl.innerHTML = "Error getting analysis";
  }
}

// Initialize
updateUI();
