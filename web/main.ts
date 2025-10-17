import { MusicMarkovChain } from "@src/music/MusicMarkovChain";
import type { MarkovConfig } from "@src/types";
import { AudioManager } from "./audioManager";
import { MIDIParser } from "@src/input/MIDIParser";
import { AutomataAnalysis } from "@src/analysis/AutomataAnalysis";

// DOM elements
const trainingDataEl = document.getElementById("trainingData") as HTMLTextAreaElement;
const trainBtn = document.getElementById("train") as HTMLButtonElement;
const generateBtn = document.getElementById("generate") as HTMLButtonElement;
const playBtn = document.getElementById("play") as HTMLButtonElement;
const stopBtn = document.getElementById("stop") as HTMLButtonElement;
const sequenceLengthEl = document.getElementById("sequenceLength") as HTMLInputElement;
const outputEl = document.getElementById("output") as HTMLDivElement;
const rhythmOutputEl = document.getElementById("rhythmOutput") as HTMLDivElement;
const transitionsEl = document.getElementById("transitions") as HTMLDivElement;
const statsEl = document.getElementById("stats") as HTMLDivElement;
const analysisEl = document.getElementById("analysis") as HTMLDivElement;
const orderEl = document.getElementById("order") as HTMLSelectElement;

// Markov chain instance
const config: MarkovConfig = { order: 2, smoothing: 0.1, temperature: 1.0 };
const musicChain = new MusicMarkovChain(config);

// Analysis instances
const automataAnalysis = new AutomataAnalysis();
const midiParser = new MIDIParser();

// Note: Sequence length is now passed directly to generateSequence()
// No need to store it in config

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
    currentRhythms = [];
    updateUI();
    updateTransitions([]);
    outputEl.textContent = "Order changed. Please retrain the Markov chain.";
    rhythmOutputEl.innerHTML =
      '<div style="color: #6c757d; text-align: center; padding: 20px; width: 100%;">Rhythm pattern will appear here after generation</div>';
  }
});

// State
let isTrained = false;
let currentSequence: string[] = [];
let currentRhythms: string[] = [];
let audioManager: AudioManager;

// Initialize audio manager
audioManager = new AudioManager();

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
    // Parse training data with rhythm information
    const sequences = trainingText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(/\s+/));

    // Separate notes and rhythms
    const noteSequences: string[][] = [];
    const rhythmSequences: string[][] = [];

    sequences.forEach((sequence) => {
      const notes: string[] = [];
      const rhythms: string[] = [];

      sequence.forEach((token) => {
        if (token.includes(":")) {
          const [note, rhythm] = token.split(":");
          notes.push(note);
          rhythms.push(rhythm);
        } else {
          // Fallback: treat as quarter note if no rhythm specified
          notes.push(token);
          console.error("No rhythm specified, using quarter note as fallback");
          rhythms.push("4");
        }
      });

      noteSequences.push(notes);
      rhythmSequences.push(rhythms);
    });

    console.log("Parsed note sequences:", noteSequences);
    console.log("Parsed rhythm sequences:", rhythmSequences);

    // Reset and train with current config
    musicChain.resetAll?.();
    console.log("Training with config:", config);

    // Create a new Markov chain instance with current config
    const newChain = new MusicMarkovChain(config);
    Object.assign(musicChain, newChain);

    // Apply temperature and smoothing to the new chain
    (musicChain as any).noteChain.setTemperature?.(config.temperature || 1.0);
    (musicChain as any).rhythmChain.setTemperature?.(config.temperature || 1.0);

    // Train with separate note and rhythm sequences
    musicChain.trainWithMusic(noteSequences, rhythmSequences);

    isTrained = true;
    currentSequence = [];
    currentRhythms = [];
    updateUI();
    // Show the transitions that were actually used in generation
    showGeneratedTransitions(currentSequence);
    // Update analysis after training
    updateAnalysis();
    updateTransitions(sequences);
    outputEl.textContent = `Trained with ${sequences.length} sequences! Click "Generate New Sequence" to create music.`;
    rhythmOutputEl.innerHTML =
      '<div style="color: #6c757d; text-align: center; padding: 20px; width: 100%;">Rhythm pattern will appear here after generation</div>';
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

    // Extract rhythm information from the generated sequence
    currentRhythms = music.notes.map((note) => {
      // Convert duration back to rhythm string for display
      const beatDuration = (60 / 120) * 1000; // 120 BPM in milliseconds
      const duration = note.duration;

      if (duration >= beatDuration * 4) return "1";
      if (duration >= beatDuration * 2) return "2";
      if (duration >= beatDuration) return "4";
      if (duration >= beatDuration / 2) return "8";
      if (duration >= beatDuration / 4) return "16";
      if (duration >= beatDuration / 8) return "32";
      return "4";
    });

    console.log("Generated rhythms:", currentRhythms);
    console.log(
      "Generated note durations:",
      music.notes.map((n) => n.duration)
    );

    updateUI();
    outputEl.textContent = currentSequence.join(" ");

    // Display rhythm pattern visually
    rhythmOutputEl.innerHTML = currentRhythms
      .map((rhythm) => {
        const fraction = getRhythmFraction(rhythm);
        return `<div class="rhythm-item" data-rhythm="${rhythm}">
        <span class="rhythm-fraction">${fraction}</span>
      </div>`;
      })
      .join("");

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
    // Use the enhanced playSequence method that handles rhythms
    await audioManager.playSequence(currentSequence, 120, currentRhythms);
    updateUI();
  } catch (error) {
    outputEl.textContent = `Error playing: ${error}`;
  }
});

// Stop playing
stopBtn.addEventListener("click", () => {
  // Stop all audio playback
  audioManager.stop();
  updateUI();
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
    const sequences = trainingText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(/\s+/));

    if (sequences.length === 0) {
      outputEl.textContent = "No valid sequences found.";
      return;
    }

    // Play all sequences using AudioManager
    await audioManager.playTrainingSequences(sequences);
    updateUI();
  } catch (error) {
    outputEl.textContent = `Error playing training sequence: ${error}`;
  }
});

// MIDI import functionality
const importMIDIBtn = document.getElementById("importMIDI") as HTMLButtonElement;
const midiImportArea = document.getElementById("midiImportArea") as HTMLDivElement;
const midiFileInput = document.getElementById("midiFileInput") as HTMLInputElement;
const openPianoRollBtn = document.getElementById("openPianoRoll") as HTMLButtonElement;

importMIDIBtn.addEventListener("click", () => {
  midiImportArea.style.display = midiImportArea.style.display === "none" ? "block" : "none";
});

openPianoRollBtn.addEventListener("click", () => {
  window.open("piano-roll.html", "_blank");
});

// MIDI file input handler
midiFileInput.addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    await handleMIDIImport(file);
  }
});

// Drag and drop for MIDI files
midiImportArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  midiImportArea.style.backgroundColor = "#e3f2fd";
});

midiImportArea.addEventListener("dragleave", () => {
  midiImportArea.style.backgroundColor = "";
});

midiImportArea.addEventListener("drop", async (event) => {
  event.preventDefault();
  midiImportArea.style.backgroundColor = "";

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.name.toLowerCase().endsWith(".mid") || file.name.toLowerCase().endsWith(".midi")) {
      await handleMIDIImport(file);
    } else {
      outputEl.textContent = "Please select a MIDI file (.mid or .midi)";
    }
  }
});

// Click to select file
midiImportArea.addEventListener("click", () => {
  midiFileInput.click();
});

async function handleMIDIImport(file: File): Promise<void> {
  try {
    outputEl.textContent = `Importing MIDI file: ${file.name}...`;

    const arrayBuffer = await file.arrayBuffer();
    const parsedMIDI = await midiParser.parseMIDIFile(arrayBuffer);

    // Extract sequences
    const noteSequences = midiParser.extractNoteSequences(parsedMIDI);
    const rhythmSequences = midiParser.extractRhythmSequences(parsedMIDI);

    // Convert to training data format
    const trainingData = [];
    for (let i = 0; i < noteSequences.length; i++) {
      const noteSequence = noteSequences[i];
      const rhythmSequence = rhythmSequences[i] || [];

      const combined = noteSequence
        .map((note, j) => `${note}:${rhythmSequence[j] || "4"}`)
        .join(" ");

      trainingData.push(combined);
    }

    // Update training data textarea
    trainingDataEl.value = trainingData.join("\n");

    // Show MIDI stats
    const stats = midiParser.getMIDIStats(parsedMIDI);
    outputEl.textContent =
      `MIDI imported successfully!\n\n` +
      `Tracks: ${stats.totalTracks}\n` +
      `Total Notes: ${stats.totalNotes}\n` +
      `Duration: ${(stats.duration / 1000).toFixed(1)}s\n` +
      `Tempo: ${stats.tempo} BPM\n` +
      `Key: ${stats.keySignature}\n\n` +
      `Click "Train Markov Chain" to learn from this data.`;

    // Hide import area
    midiImportArea.style.display = "none";
  } catch (error) {
    outputEl.textContent = `Error importing MIDI file: ${error}`;
  }
}

// Get note name from pitch
function getNoteName(pitch: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(pitch / 12) - 1;
  const idx = pitch % 12;
  return `${noteNames[idx]}${octave}`;
}

// Get rhythm fraction for display
function getRhythmFraction(rhythm: string): string {
  // Handle number format (4 = quarter, 8 = eighth, 16 = sixteenth, etc.)
  if (/^\d+$/.test(rhythm)) {
    const rhythmNumber = parseInt(rhythm, 10);
    switch (rhythmNumber) {
      case 1:
        return "1";
      case 2:
        return "1/2";
      case 4:
        return "1/4";
      case 8:
        return "1/8";
      case 16:
        return "1/16";
      case 32:
        return "1/32";
      default:
        return `1/${rhythmNumber}`;
    }
  }

  // Fallback to quarter note
  console.error("Rhythm information couldn't be parsed");
  return `1/4`;
}

// Update UI state
function updateUI() {
  generateBtn.disabled = !isTrained;
  playBtn.disabled = !isTrained || !currentSequence.length;
  stopBtn.disabled = !audioManager.isCurrentlyPlaying();
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

    // Analysis
    const automataMetrics = automataAnalysis.getDeterminismMetrics(musicChain as any);

    // Display statistics
    statsEl.innerHTML = `
      <strong>Note States:</strong> ${musicStats.noteStats.totalStates}<br>
      <strong>Rhythm States:</strong> ${musicStats.rhythmStats.totalStates}<br>
      <strong>Avg Transitions:</strong> ${musicStats.noteStats.averageTransitionsPerState.toFixed(
        2
      )}<br>
      <strong>Determinism Index:</strong> ${automataMetrics.determinismIndex.toFixed(3)}<br>
    `;

    // Display transition analysis
    analysisEl.innerHTML = `
      <strong>Deterministic States:</strong> ${automataMetrics.deterministicStates}<br>
      <strong>Probabilistic States:</strong> ${automataMetrics.probabilisticStates}<br>
      <strong>State Complexity:</strong> ${automataMetrics.stateComplexity.toFixed(2)}<br>
    `;
  } catch (error) {
    statsEl.innerHTML = "Error getting statistics";
    analysisEl.innerHTML = "Error getting analysis";
  }
}

// Initialize
updateUI();
