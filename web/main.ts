import { MusicMarkovChain } from "@src/music/MusicMarkovChain";
import type { MarkovConfig } from "@src/types";
import { AudioManager } from "./audioManager";
import { MIDIParser } from "@src/input/MIDIParser";
import { AutomataAnalysis } from "@src/analysis/AutomataAnalysis";
import { EntropyAnalysis } from "@src/analysis/EntropyAnalysis";
import { ComplexityAnalysis } from "@src/analysis/ComplexityAnalysis";

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
const instrumentEl = document.getElementById("instrument") as HTMLSelectElement;
const pianoStatusEl = document.getElementById("pianoStatus") as HTMLDivElement;
const preventRepetitionEl = document.getElementById("preventRepetition") as HTMLSelectElement;
const maxRepetitionEl = document.getElementById("maxRepetition") as HTMLInputElement;
const restartIntervalEl = document.getElementById("restartInterval") as HTMLInputElement;
const longTermPreventionEl = document.getElementById("longTermPrevention") as HTMLSelectElement;

// Markov chain instance
const config: MarkovConfig = { order: 4, smoothing: 0.1, temperature: 1.5 };
let musicChain = new MusicMarkovChain(config);

// Analysis instances
const automataAnalysis = new AutomataAnalysis();
const entropyAnalysis = new EntropyAnalysis();
const complexityAnalysis = new ComplexityAnalysis();
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
    // Clear analysis since we need to retrain
    if (analysisEl) {
      analysisEl.innerHTML =
        '<div style="color: #6c757d; text-align: center; padding: 20px;">Analysis will appear after retraining</div>';
    }
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
    musicChain.setTemperature(newTemperature);
    console.log("Applied temperature:", newTemperature, "to existing chain");
    // Update analysis since temperature affects generation behavior
    updateAnalysis();
  }
});

// Update tempo when tempo slider changes
const tempoEl = document.getElementById("tempo") as HTMLInputElement;
tempoEl.addEventListener("input", () => {
  const newTempo = parseInt(tempoEl.value);
  currentTempo = newTempo;

  // Update the display value
  const tempoValueEl = document.getElementById("tempoValue");
  if (tempoValueEl) {
    tempoValueEl.textContent = `${newTempo} BPM`;
  }

  // Update the audio manager's tempo
  if (audioManager) {
    audioManager.setTempo(newTempo);
  }

  console.log("Tempo changed to:", newTempo, "BPM");
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
      '<div style="color: #6c757d; text-align: center; padding: 20px; width: 100%;">Generated sequence will appear here after generation</div>';
    // Clear analysis since we need to retrain
    if (analysisEl) {
      analysisEl.innerHTML =
        '<div style="color: #6c757d; text-align: center; padding: 20px;">Analysis will appear after retraining</div>';
    }
  }
});

// Harmonic analysis display
const harmonicAnalysisEl = document.getElementById("harmonicAnalysis") as HTMLDivElement;

// Update instrument
instrumentEl.addEventListener("change", () => {
  const instrument = instrumentEl.value as "piano" | "synth";

  // Update the audio manager's instrument
  if (audioManager) {
    audioManager.setInstrument(instrument);
  }

  console.log(`Switched to ${instrument} instrument`);
});

// Update max repetition setting
maxRepetitionEl.addEventListener("input", () => {
  const maxRepetition = parseInt(maxRepetitionEl.value);

  // Update the display value
  const maxRepetitionValueEl = document.getElementById("maxRepetitionValue");
  if (maxRepetitionValueEl) {
    maxRepetitionValueEl.textContent = `${maxRepetition} consecutive note${
      maxRepetition > 1 ? "s" : ""
    }`;
  }

  console.log("Max repetition set to:", maxRepetition);
});

// Update restart interval setting
restartIntervalEl.addEventListener("input", () => {
  const restartInterval = parseInt(restartIntervalEl.value);

  // Update the display value
  const restartIntervalValueEl = document.getElementById("restartIntervalValue");
  if (restartIntervalValueEl) {
    restartIntervalValueEl.textContent = `Every ${restartInterval} notes`;
  }

  console.log("Restart interval set to:", restartInterval);
});

// State
let isTrained = false;
let currentSequence: string[] = [];
let currentRhythms: string[] = [];
let audioManager: AudioManager;
let currentTempo = 120;

// Initialize audio manager
audioManager = new AudioManager();

// Initialize audio when page loads
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Show piano loading status
    if (pianoStatusEl) {
      pianoStatusEl.style.display = "block";
    }

    await audioManager.initialize();
    console.log("Audio manager initialized on page load");

    // Hide loading status
    if (pianoStatusEl) {
      pianoStatusEl.style.display = "none";
    }
  } catch (error) {
    console.error("Failed to initialize audio manager:", error);
    if (pianoStatusEl) {
      pianoStatusEl.textContent = "❌ Piano loading failed - using synthesizer";
      pianoStatusEl.style.color = "#dc3545";
    }
  }
});

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

    // Parse all tokens uniformly - treat everything as musical tokens
    const musicSequences: string[][] = [];
    const rhythmSequences: string[][] = [];

    sequences.forEach((sequence) => {
      const musicTokens: string[] = [];
      const rhythms: string[] = [];

      sequence.forEach((token) => {
        if (token.includes(":")) {
          const [musicToken, rhythm] = token.split(":");
          musicTokens.push(musicToken); // This could be a single note or chord
          rhythms.push(rhythm);
        } else {
          // Fallback: treat as quarter note if no rhythm specified
          musicTokens.push(token);
          console.error("No rhythm specified, using quarter note as fallback");
          rhythms.push("4");
        }
      });

      musicSequences.push(musicTokens);
      rhythmSequences.push(rhythms);
    });

    console.log("Parsed music sequences:", musicSequences);
    console.log("Parsed rhythm sequences:", rhythmSequences);

    // Rather than just 'resetting' the markov chain
    // we'll create a completely new Markov chain instance with current config
    console.log("Training with config:", config);
    musicChain = new MusicMarkovChain(config);

    // Apply temperature to the chains
    musicChain.setTemperature(config.temperature || 1.0);

    // Train with unified music sequences (treats all tokens equally)
    console.log("Training with unified music sequences");
    musicChain.trainWithMusic(musicSequences, rhythmSequences);

    // Update harmonic analysis display
    const detectedKey = musicChain.getDetectedKey();
    harmonicAnalysisEl.innerHTML = `
      <strong>Detected Key:</strong> ${detectedKey}<br>
      <em>Analysis based on training data</em>
    `;

    isTrained = true;
    currentSequence = [];
    currentRhythms = [];
    updateUI();
    // Show the transitions that were actually used in generation
    showGeneratedTransitions(currentSequence);
    // Update analysis after training
    updateAnalysis();
    updateTransitions(sequences);

    // Show training quality analysis
    const qualityAnalysis = musicChain.analyzeTrainingQuality();
    const qualityMessage =
      `Trained with ${sequences.length} sequences!\n\nTraining Quality Analysis:\n` +
      `• Total States: ${qualityAnalysis.totalStates}\n` +
      `• Low Entropy States: ${qualityAnalysis.lowEntropyStates}\n` +
      `• High Repetition States: ${qualityAnalysis.highRepetitionStates}\n` +
      `• Avg Transitions/State: ${qualityAnalysis.averageTransitionsPerState.toFixed(2)}\n\n` +
      (qualityAnalysis.recommendations.length > 0
        ? `Recommendations:\n${qualityAnalysis.recommendations.map((r) => `• ${r}`).join("\n")}\n\n`
        : "") +
      `Click "Generate New Sequence" to create music.`;

    outputEl.textContent = qualityMessage;
    rhythmOutputEl.innerHTML =
      '<div style="color: #6c757d; text-align: center; padding: 20px; width: 100%;">Generated sequence will appear here after generation</div>';
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

    // Generate unified music sequence (treats all tokens equally)
    console.log("Generating unified music sequence");

    // Check if repetition prevention is enabled
    const preventRepetition = preventRepetitionEl.value === "true";
    const maxRepetition = parseInt(maxRepetitionEl.value);
    const restartInterval = parseInt(restartIntervalEl.value);
    const enableLongTermPrevention = longTermPreventionEl.value === "true";

    let music;
    if (preventRepetition) {
      // Use repetition prevention method
      const musicTokens = musicChain.generateWithRepetitionPrevention(
        requestedLength,
        undefined,
        maxRepetition,
        restartInterval,
        enableLongTermPrevention
      );
      const rhythm = musicChain.getRhythmChain().generate(requestedLength);
      music = musicChain.convertTokensToMusicSequence(musicTokens, rhythm);
    } else {
      // Use original method
      music = musicChain.generateSequence(requestedLength);
    }

    // Extract music tokens from the generated sequence
    // Group notes by startTime to handle chords properly
    const groupedNotes = new Map<number, any[]>();

    music.notes.forEach((note: any) => {
      const startTime = note.startTime;
      if (!groupedNotes.has(startTime)) {
        groupedNotes.set(startTime, []);
      }
      groupedNotes.get(startTime)!.push(note);
    });

    currentSequence = Array.from(groupedNotes.values()).map((notesAtTime: any[]) => {
      // Check if this is a chord (multiple notes at same time with chordId)
      if (notesAtTime.length > 1 && notesAtTime[0].chordId) {
        return notesAtTime[0].chordId; // Return the chord identifier
      } else {
        // Single note
        const note = notesAtTime[0];
        if (note.pitch && typeof note.pitch === "number") {
          return getNoteName(note.pitch);
        } else {
          return note.toString();
        }
      }
    });

    // Extract rhythm information from the generated sequence
    currentRhythms = Array.from(groupedNotes.values()).map((notesAtTime: any[]) => {
      // Use the first note's duration (all notes in a chord have same duration)
      const note = notesAtTime[0];
      const beatDuration = (60 / currentTempo) * 1000; // Current tempo in milliseconds
      const duration = note.duration;

      if (duration >= beatDuration * 4) return "1";
      if (duration >= beatDuration * 2) return "2";
      if (duration >= beatDuration) return "4";
      if (duration >= beatDuration / 2) return "8";
      if (duration >= beatDuration / 4) return "16";
      if (duration >= beatDuration / 8) return "32";
      return "4";
    });

    console.log("Generated sequence:", currentSequence);
    console.log("Generated rhythms:", currentRhythms);

    // Analyze harmonic content of generated sequence
    const harmonicAnalysis = musicChain.analyzeSequenceHarmony(music.notes);

    // Update harmonic analysis display with generated sequence info
    harmonicAnalysisEl.innerHTML = `
      <strong>Training Data Key:</strong> ${musicChain.getDetectedKey()}<br>
      <strong>Generated Key:</strong> ${harmonicAnalysis.detectedKey}<br>
      <strong>Chords Detected:</strong> ${harmonicAnalysis.chords.length}<br>
      <em>Analysis of generated sequence</em>
    `;

    updateUI();

    // Display unified sequence with notes inside colored rhythm boxes
    rhythmOutputEl.innerHTML = currentSequence
      .map((note, index) => {
        const rhythm = currentRhythms[index] || "4";
        const fraction = getRhythmFraction(rhythm);
        return `<div class="rhythm-item" data-rhythm="${rhythm}" data-rhythm-fraction="${fraction}">
          <div class="rhythm-note">${note}</div>
          <div class="rhythm-fraction">${fraction}</div>
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
    // Clear any existing highlighting
    clearAllHighlighting();

    // Use the enhanced playSequence method that handles rhythms with live highlighting
    await audioManager.playSequence(currentSequence, currentTempo, currentRhythms, (noteIndex) => {
      highlightNote(noteIndex);
    });
    updateUI();
  } catch (error) {
    outputEl.textContent = `Error playing: ${error}`;
  }
});

// Stop playing
stopBtn.addEventListener("click", () => {
  // Stop all audio playback
  audioManager.stop();
  // Clear all highlighting when stopping
  clearAllHighlighting();
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
    await audioManager.playTrainingSequences(sequences, currentTempo);
    updateUI();
  } catch (error) {
    outputEl.textContent = `Error playing training sequence: ${error}`;
  }
});

// MIDI import functionality
const importMIDIBtn = document.getElementById("importMIDI") as HTMLButtonElement;
const midiImportArea = document.getElementById("midiImportArea") as HTMLDivElement;
const midiFileInput = document.getElementById("midiFileInput") as HTMLInputElement;

importMIDIBtn.addEventListener("click", () => {
  midiImportArea.style.display = midiImportArea.style.display === "none" ? "block" : "none";
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

    // Check if MIDI contains chords
    const stats = midiParser.getMIDIStats(parsedMIDI);
    let trainingData: string[] = [];

    if (stats.hasChords) {
      console.log("MIDI file contains chords, using chord extraction");
      // Extract chord sequences for chord-based MIDI
      const chordSequences = midiParser.extractChordSequences(parsedMIDI);
      const rhythmSequences = midiParser.extractRhythmSequences(parsedMIDI);

      // Convert chord sequences to training data format
      for (let i = 0; i < chordSequences.length; i++) {
        const chordSequence = chordSequences[i];
        const rhythmSequence = rhythmSequences[i] || [];

        const combined = chordSequence
          .map((chord, j) => `${chord}:${rhythmSequence[j] || "4"}`)
          .join(" ");

        trainingData.push(combined);
      }
    } else {
      console.log("MIDI file contains single notes, using note extraction");
      // Extract note sequences for single-note MIDI
      const noteSequences = midiParser.extractNoteSequences(parsedMIDI);
      const rhythmSequences = midiParser.extractRhythmSequences(parsedMIDI);

      // Convert to training data format
      for (let i = 0; i < noteSequences.length; i++) {
        const noteSequence = noteSequences[i];
        const rhythmSequence = rhythmSequences[i] || [];

        const combined = noteSequence
          .map((note, j) => `${note}:${rhythmSequence[j] || "4"}`)
          .join(" ");

        trainingData.push(combined);
      }
    }

    // Append training data to existing content
    const existingData = trainingDataEl.value.trim();
    const newData = trainingData.join("\n");

    if (existingData) {
      // Add a newline separator if there's existing data
      trainingDataEl.value = existingData + "\n" + newData;
    } else {
      // If no existing data, just set the new data
      trainingDataEl.value = newData;
    }

    // Show MIDI stats
    const appendMessage = existingData ? " (appended to existing data)" : "";
    outputEl.textContent =
      `MIDI imported successfully${appendMessage}!\n\n` +
      `Tracks: ${stats.totalTracks}\n` +
      `Total Notes: ${stats.totalNotes}\n` +
      `Duration: ${(stats.duration / 1000).toFixed(1)}s\n` +
      `Tempo: ${stats.tempo} BPM\n` +
      `Key: ${stats.keySignature}\n` +
      `Contains Chords: ${stats.hasChords ? "Yes" : "No"}\n\n` +
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

    const noteChain = musicChain.getNoteChain();

    // Debug: Check if noteChain has states
    console.log("Note chain states:", noteChain.getStates().length);
    console.log("Note chain config:", noteChain.getConfig());

    const automataMetrics = automataAnalysis.getDeterminismMetrics(noteChain);
    const entropyMetrics = entropyAnalysis.getEntropyMetrics(noteChain);
    const complexityMetrics = complexityAnalysis.analyzeBottlenecks(noteChain);

    // Debug: Log the metrics and detailed state analysis
    console.log("Automata metrics:", automataMetrics);
    console.log("Entropy metrics:", entropyMetrics);
    console.log("Complexity metrics:", complexityMetrics);

    // Debug: Log the actual analysis results
    console.log("=== ANALYSIS RESULTS ===");
    console.log(`Total states: ${noteChain.getStates().length}`);
    console.log(`Determinism index: ${automataMetrics.determinismIndex}`);
    console.log(`Deterministic states: ${automataMetrics.deterministicStates}`);
    console.log(`Probabilistic states: ${automataMetrics.probabilisticStates}`);
    console.log(`Entropy threshold: 0.5 (from AutomataAnalysis class)`);
    console.log("=== END DETAILED ANALYSIS ===");

    // Display statistics
    statsEl.innerHTML = `
      <strong>Note States:</strong> ${musicStats.noteStats.totalStates}<br>
      <strong>Rhythm States:</strong> ${musicStats.rhythmStats.totalStates}<br>
      <strong>Avg Transitions:</strong> ${musicStats.noteStats.averageTransitionsPerState.toFixed(
        2
      )}<br>
      <strong>Determinism Index:</strong> ${automataMetrics.determinismIndex.toFixed(3)}<br>
      <strong>Chain Entropy:</strong> ${entropyMetrics.chainEntropy.toFixed(3)}<br>
      <strong>Predictability:</strong> ${(entropyMetrics.predictability * 100).toFixed(1)}%
    `;

    // Display transition analysis
    analysisEl.innerHTML = `
      <strong>Deterministic States:</strong> ${automataMetrics.deterministicStates}<br>
      <strong>Probabilistic States:</strong> ${automataMetrics.probabilisticStates}<br>
      <strong>State Complexity:</strong> ${automataMetrics.stateComplexity.toFixed(2)}<br>
      <strong>Novelty Score:</strong> ${(entropyMetrics.noveltyScore * 100).toFixed(1)}%<br>
      <strong>Bottleneck:</strong> ${complexityMetrics.bottleneck}<br>
      <strong>Recommendation:</strong> ${complexityMetrics.recommendation}
    `;
  } catch (error) {
    statsEl.innerHTML = "Error getting statistics";
    analysisEl.innerHTML = "Error getting analysis";
  }
}

// Highlighting functions for live playback
function highlightNote(noteIndex: number): void {
  // Clear any existing highlighting first
  clearAllHighlighting();

  // Add highlighting to the current note
  const rhythmItems = document.querySelectorAll(".rhythm-item");
  if (rhythmItems[noteIndex]) {
    rhythmItems[noteIndex].classList.add("playing");
  }
}

function clearAllHighlighting(): void {
  const rhythmItems = document.querySelectorAll(".rhythm-item");
  rhythmItems.forEach((item) => {
    item.classList.remove("playing");
  });
}

// Initialize
updateUI();
