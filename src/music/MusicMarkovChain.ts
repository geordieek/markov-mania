/**
 * This class extends the base MarkovChain to work specifically with musical elements:
 * - Note sequences (melodies)
 * - Chord progressions (harmony)
 * - Rhythm patterns (groove)
 */

import { MarkovChain } from "../core/MarkovChain";
import { MarkovConfig, MusicSequence, Note } from "../types";

export class MusicMarkovChain extends MarkovChain {
  private noteChain: MarkovChain;
  private chordChain: MarkovChain;
  private rhythmChain: MarkovChain;

  // Musical constraints and scales
  private musicalKey: string = "C";
  private scale: number[] = [0, 2, 4, 5, 7, 9, 11]; // C major scale (MIDI note numbers)
  private tempo: number = 120; // BPM

  constructor(config: MarkovConfig) {
    super(config);

    // Create specialized chains for different musical aspects
    this.noteChain = new MarkovChain(config);
    this.chordChain = new MarkovChain(config);
    this.rhythmChain = new MarkovChain(config);
  }

  /**
   * Train the Markov chain with musical data
   */
  trainWithMusic(
    noteSequences: string[][],
    chordProgressions: string[][],
    rhythmPatterns: string[][]
  ): void {
    this.noteChain.train(noteSequences);
    this.chordChain.train(chordProgressions);
    this.rhythmChain.train(rhythmPatterns);
  }

  /**
   * Generate a complete musical sequence from the trained chains
   */
  generateMusic(sequenceLength: number = 16): MusicSequence {
    // Generate different musical layers
    const melody = this.generateMelody(sequenceLength);
    const harmony = this.generateHarmony(sequenceLength);
    const rhythm = this.generateRhythm(sequenceLength);

    // Combine them into a coherent musical sequence
    return this.combineMusicalLayers(melody, harmony, rhythm);
  }

  /**
   * Generate a melodic sequence using the note Markov chain
   */
  private generateMelody(length: number): string[] {
    // Generate a sequence and limit it to the desired length
    const generated = this.noteChain.generate();
    return generated.slice(0, length);
  }

  /**
   * Generate a harmonic progression using the chord Markov chain
   */
  private generateHarmony(length: number): string[] {
    // Generate a sequence and limit it to the desired length
    const generated = this.chordChain.generate();
    return generated.slice(0, length);
  }

  /**
   * Generate a rhythm pattern using the rhythm Markov chain
   */
  private generateRhythm(length: number): string[] {
    // Generate a sequence and limit it to the desired length
    const generated = this.rhythmChain.generate();
    return generated.slice(0, length);
  }

  /**
   * Combine different musical layers into a coherent sequence
   */
  private combineMusicalLayers(
    melody: string[],
    harmony: string[],
    rhythm: string[]
  ): MusicSequence {
    const notes: Note[] = [];
    let currentTime = 0;

    // Convert string representations to actual musical elements
    for (let i = 0; i < melody.length; i++) {
      const noteStr = melody[i];
      const chordStr = harmony[i] || harmony[0]; // Fallback to first chord
      const rhythmStr = rhythm[i] || rhythm[0]; // Fallback to first rhythm

      // Parse note string (e.g., "C4", "F#5")
      const note = this.parseNote(noteStr);
      if (note) {
        // Apply rhythm timing
        const duration = this.parseRhythm(rhythmStr);
        const velocity = this.calculateVelocity(noteStr, rhythmStr);

        notes.push({
          pitch: note.pitch,
          velocity: velocity,
          duration: duration,
          startTime: currentTime,
        });

        currentTime += duration;
      }
    }

    return {
      notes,
      duration: currentTime,
      key: this.musicalKey,
      timeSignature: "4/4",
    };
  }

  /**
   * Parse a note string into a Note object
   */
  private parseNote(noteStr: string): { pitch: number; octave: number } | null {
    // Simple note parsing (can be extended for more complex notation)
    const noteMatch = noteStr.match(/^([A-G]#?)(\d+)$/);
    if (!noteMatch) return null;

    const noteName = noteMatch[1];
    const octave = parseInt(noteMatch[2]);

    // Convert note name to MIDI pitch
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteIndex = noteNames.indexOf(noteName);

    if (noteIndex === -1) return null;

    const pitch = noteIndex + octave * 12;
    return { pitch, octave };
  }

  /**
   * Parse rhythm string into duration in milliseconds
   */
  private parseRhythm(rhythmStr: string): number {
    // Simple rhythm parsing (can be extended for more complex notation)
    const beatDuration = (60 / this.tempo) * 1000; // Convert BPM to milliseconds

    switch (rhythmStr) {
      case "whole":
        return beatDuration * 4;
      case "half":
        return beatDuration * 2;
      case "quarter":
        return beatDuration;
      case "eighth":
        return beatDuration / 2;
      case "sixteenth":
        return beatDuration / 4;
      default:
        return beatDuration; // Default to quarter note
    }
  }

  /**
   * Calculate note velocity based on note and rhythm
   */
  // TODO: Make this more complex or implement markov chain for velocity
  private calculateVelocity(noteStr: string, rhythmStr: string): number {
    let velocity = 80; // Base velocity

    // Adjust velocity based on rhythm (longer notes = softer)
    switch (rhythmStr) {
      case "whole":
        velocity -= 20;
      case "half":
        velocity -= 10;
      case "eighth":
        velocity += 10;
      case "sixteenth":
        velocity += 15;
    }

    // Ensure velocity stays within MIDI range (1-127)
    return Math.max(1, Math.min(127, velocity));
  }

  /**
   * Set the musical key and update the scale
   */
  setKey(key: string): void {
    this.musicalKey = key;
    // Update scale based on key (simplified - can be extended)
    this.updateScale(key);
  }

  /**
   * Update the musical scale based on the key
   */
  private updateScale(key: string): void {
    // Simplified scale generation (can be extended for all keys)
    const keyNotes: { [key: string]: number[] } = {
      C: [0, 2, 4, 5, 7, 9, 11],
      G: [7, 9, 11, 0, 2, 4, 6],
      F: [5, 7, 9, 10, 0, 2, 4],
      Dm: [2, 4, 5, 7, 9, 10, 0],
      Am: [9, 11, 0, 2, 4, 5, 7],
      D: [2, 4, 5, 7, 9, 11, 0],
      Em: [4, 6, 7, 9, 11, 0, 2],
      Bm: [11, 0, 2, 4, 6, 7, 9],
      "F#m": [8, 10, 0, 2, 4, 5, 7],
      "C#m": [1, 3, 4, 6, 8, 10, 0],
      "G#m": [6, 8, 10, 0, 2, 4, 6],
      "D#m": [3, 5, 6, 8, 10, 0, 2],
      "A#m": [10, 0, 2, 4, 6, 8, 10],
      "E#m": [1, 3, 4, 6, 8, 10, 0],
      "B#m": [8, 10, 0, 2, 4, 5, 7],
    };

    this.scale = keyNotes[key] || keyNotes["C"];
  }

  /**
   * Set the tempo for rhythm calculations
   */
  setTempo(tempo: number): void {
    this.tempo = tempo;
  }

  /**
   * Get musical statistics from all chains
   */
  getMusicStats(): {
    noteStats: any;
    chordStats: any;
    rhythmStats: any;
  } {
    return {
      noteStats: this.noteChain.getStats(),
      chordStats: this.chordChain.getStats(),
      rhythmStats: this.rhythmChain.getStats(),
    };
  }
}
