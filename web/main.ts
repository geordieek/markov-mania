import { MarkovChain } from "../src/core/MarkovChain";
import type { MarkovConfig } from "../src/types";

// Get DOM elements
const trainingDataEl = document.getElementById("trainingData") as HTMLTextAreaElement;
const trainBtn = document.getElementById("train") as HTMLButtonElement;
const sequenceLengthEl = document.getElementById("sequenceLength") as HTMLInputElement;
const generateBtn = document.getElementById("generate") as HTMLButtonElement;
const outputEl = document.getElementById("output") as HTMLDivElement;

// Create Markov chain with simple configuration
const config: MarkovConfig = { 
  order: 2,        // Look at 2 previous notes to predict the next one
  smoothing: 0.1,  // Small smoothing to avoid zero probabilities
  maxLength: 20    // Maximum sequence length
};

const markovChain = new MarkovChain(config);
let isTrained = false;

// Log function for output
function log(message: string) {
  outputEl.textContent = message;
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
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(/\s+/));

  if (sequences.length === 0) {
    log("No valid sequences found. Please check your input format.");
    return;
  }

  // Reset and train the chain
  markovChain.reset();
  markovChain.train(sequences);
  
  isTrained = true;
  log(`✅ Trained on ${sequences.length} sequences!\n\nClick "Generate New Sequence" to create music.`);
  
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
    const sequence = generated.slice(0, length);
    
    // Format the output nicely
    const formattedSequence = sequence.join(' ');
    
    log(`🎵 Generated Sequence (${sequence.length} notes):\n\n${formattedSequence}`);
    
    // Also log to console for debugging
    console.log('Generated sequence:', sequence);
    
  } catch (error) {
    log(`Error generating sequence: ${error}`);
    console.error('Generation error:', error);
  }
}

// Event listeners
trainBtn.addEventListener('click', trainChain);
generateBtn.addEventListener('click', generateSequence);

// Initialize with some example data
trainingDataEl.value = `C4 D4 E4 F4 G4 A4 B4 C5
G3 A3 B3 C4 D4 E4 F#4 G4
F3 G3 A3 Bb3 C4 D4 E4 F4
C4 E4 G4 B4 C5 A4 F4 D4
D4 F#4 A4 C5 B4 G4 E4 C4`;

// Initial state
log("🎵 Markov Chain Music Generator Ready!\n\n1. Review the example training data above\n2. Click 'Train Markov Chain' to learn the patterns\n3. Click 'Generate New Sequence' to create new music\n\nTry adding your own sequences to the training data!");
