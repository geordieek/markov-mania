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
};
```

## API Reference

### Core Classes

#### `MarkovChain`

- `train(sequences: string[][]): void` - Train with data
- `generate(startContext?: string[]): string[]` - Generate sequences
- `getStats(): Stats` - Get chain statistics

#### `MusicMarkovChain`

- `trainWithMusic(notes, rhythms): void` - Train with musical data
- `generateSequence(length: number): MusicSequence` - Generate musical sequence
- `setKey(key: string): void` - Set musical key
- `setTempo(tempo: number): void` - Set tempo

#### `MIDIGenerator`

- `generateMIDI(musicSequence: MusicSequence, personality: string = "melodic"): MIDISequence` - Generate MIDI sequence
- `generateMIDIFile(midiSequence: MIDISequence): Uint8Array` - Generate MIDI file
- `setTempo(tempo: number): void` - Set tempo
- `setTimeSignature(timeSignature: string): void` - Set time signature
- `setKeySignature(keySignature: string): void` - Set key signature

## 🤝 Acknowledgments

The following projects were used as learning material or references:

[Markov Chain Implementation in JavaScript](https://medium.com/@alexkrameris/markov-chain-implementation-in-javascript-a698f371d66f) by @alexkrameris
[markov-chains](https://github.com/bdchauvette/markov-chains) by @bdchauvette
[markovify](https://github.com/jsvine/markovify) by @jsvine
