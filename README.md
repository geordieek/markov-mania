# 🎵 Markov Mania

**A Markov Chain-based Music Generation System using TypeScript and Max for Live**

## Overview

Markov Mania intends to demonstrate the power of **probabilistic finite state machines** (Markov chains) for algorithmic music composition.

## Technical Architecture

```
TypeScript Markov Chain → MIDI Generation → Max for Live Device → Ableton Live
```

### Core Components

- **`MarkovChain`**: Base probabilistic finite state machine
- **`MusicMarkovChain`**: Music-specific markov chain
- **`MIDIGenerator`**: Converts Markov output to MIDI format

## Getting Started

## How It Works

### 1. **Training Phase**

The Markov chain learns musical patterns by analyzing training data:

```typescript
const musicChain = new MusicMarkovChain(config);

// Train with musical sequences
musicChain.trainWithMusic(
  noteSequences, // Melodic patterns
  rhythmPatterns // Rhythmic patterns
);
```

### 2. **Generation Phase**

The trained chain generates new musical sequences:

```typescript
// Generate a complete musical sequence
const music = musicChain.generateSequence(16); // 16-note sequence

// Access the generated music
console.log(`Key: ${music.key}`);
console.log(`Duration: ${music.duration}ms`);
music.notes.forEach((note) => {
  console.log(`Note: ${note.pitch}, Velocity: ${note.velocity}`);
});
```

### 3. **Musical Output**

The system produces structured musical data:

```typescript
interface MusicSequence {
  notes: Note[]; // Array of MIDI notes
  duration: number; // Total duration in milliseconds
  key: string; // Musical key
  timeSignature: string; // Time signature
}
```

## Configuration

The Markov chain can be configured:

```typescript
const config: MarkovConfig = {
  order: 2, // Consider 2 previous musical elements
  smoothing: 0.1, // Probability smoothing factor
  maxLength: 32, // Maximum sequence length
  temperature: 1.0, // Generation randomness (0.1-2.0)
};
```

## API Reference

### Core Classes

#### `MarkovChain`

- `train(sequences: string[][]): void` - Train with data
- `generate(length: number, startContext?: string[]): string[]` - Generate sequences
- `getStats(): Stats` - Get chain statistics
- `getTransitionAnalysis(): TransitionAnalysis` - Get detailed transition analysis
- `setTemperature(temperature: number): void` - Set generation randomness
- `reset(): void` - Clear training data and reset chain

#### `MusicMarkovChain`

- `trainWithMusic(notes, rhythms): void` - Train with musical data
- `appendMelodySequence(melody): void` - Append only melody tokens
- `generateSequence(length: number): MusicSequence` - Generate musical sequence
- `setKey(key: string): void` - Set musical key
- `setTempo(tempo: number): void` - Set tempo
- `setTemperature(temperature: number): void` - Set generation randomness
- `resetAll(): void` - Reset all internal chains
- `setPitchRange(minPitch: number, maxPitch: number): void` - Set MIDI pitch range
- `getMusicStats(): MusicStats` - Get statistics from all chains

#### `MIDIGenerator`

_(WIP) For future M4L integration_

- `generateMIDI(musicSequence: MusicSequence): MIDISequence` - Generate MIDI sequence
- `generateMIDIFile(midiSequence: MIDISequence): Uint8Array` - Generate MIDI file
- `setTempo(tempo: number): void` - Set tempo
- `setTimeSignature(timeSignature: string): void` - Set time signature
- `setKeySignature(keySignature: string): void` - Set key signature

## Types

### Core Types

```typescript
interface MarkovConfig {
  order: number; // Markov chain order
  smoothing: number; // Probability smoothing
  maxLength?: number; // Maximum sequence length
  temperature?: number; // Generation randomness (0.1-2.0)
}

interface Note {
  pitch: number; // MIDI note number (0-127)
  velocity: number; // Note velocity (0-127)
  duration: number; // Duration in milliseconds
  startTime: number; // Start time in milliseconds
  channel?: number; // MIDI channel (0-15)
}

interface MusicSequence {
  notes: Note[]; // Array of notes
  duration: number; // Total duration
  key?: string; // Musical key
  timeSignature?: string; // Time signature
}

interface RhythmPattern {
  id: string; // Pattern identifier
  beats: number[]; // Beat positions (0.0-1.0)
  length: number; // Pattern length in beats
}
```

## Acknowledgments

The following projects were used as learning material or references:

[Markov Chain Implementation in JavaScript](https://medium.com/@alexkrameris/markov-chain-implementation-in-javascript-a698f371d66f) by @alexkrameris
[markov-chains](https://github.com/bdchauvette/markov-chains) by @bdchauvette
[markovify](https://github.com/jsvine/markovify) by @jsvine
