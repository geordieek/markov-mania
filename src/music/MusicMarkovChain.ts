/**
 * This class extends the base MarkovChain to work specifically with musical elements:
 * - Note sequences (melodies)
 * - Rhythm patterns (groove)
 */

import { MarkovChain } from "../core/MarkovChain";
import { MarkovConfig, MusicSequence, Note } from "../types";

export class MusicMarkovChain extends MarkovChain {
  private noteChain: MarkovChain;
  private rhythmChain: MarkovChain;

  // Musical constraints and scales
  private musicalKey: string = "C";
  private scale: number[] = [0, 2, 4, 5, 7, 9, 11]; // C major scale (MIDI note numbers)
  private tempo: number = 120; // BPM
  private minPitch: number = 24; // C2 TODO: Allow this to be set, or use in the input value to help infer it
  private maxPitch: number = 84; // C6 TODO: Allow this to be set, or use in the input value to help infer it

  constructor(config: MarkovConfig) {
    super(config);

    // Create specialized chains for different musical aspects
    this.noteChain = new MarkovChain(config);
    this.rhythmChain = new MarkovChain(config);
  }

  /**
   * Train the Markov chain with musical data
   */
  trainWithMusic(noteSequences: string[][], rhythmPatterns: string[][]): void {
    this.noteChain.train(noteSequences);
    this.rhythmChain.train(rhythmPatterns);
  }

  /**
   * Append only melody tokens to the melodic chain
   */
  appendMelodySequence(melody: string[]): void {
    (this.noteChain as any).trainAppend?.([melody]);
  }

  /**
   * Generate a complete musical sequence from the trained chains
   */
  generateSequence(sequenceLength: number = 16): MusicSequence {
    console.log(`MusicMarkovChain.generateSequence() called with length: ${sequenceLength}`);

    // Generate different musical layers
    const melody = this.generateMelody(sequenceLength);
    const rhythm = this.generateRhythm(sequenceLength);

    console.log(`Generated melody length: ${melody.length}, rhythm: ${rhythm.length}`);

    // Combine them into a coherent musical sequence
    return this.combineMusicalLayers(melody, rhythm);
  }

  /**
   * Generate a melodic sequence using the note Markov chain
   */
  private generateMelody(length: number): string[] {
    console.log(`generateMelody() called with length: ${length}`);
    // Generate a sequence with the exact length requested
    const result = this.noteChain.generate(length);
    console.log(`generateMelody() returned: ${result.length} notes`);
    return result;
  }

  /**
   * Generate a rhythm pattern using the rhythm Markov chain
   */
  private generateRhythm(length: number): string[] {
    // Generate a sequence with the exact length requested
    return this.rhythmChain.generate(length);
  }

  /**
   * Combine different musical layers into a coherent sequence
   */
  private combineMusicalLayers(melody: string[], rhythm: string[]): MusicSequence {
    const notes: Note[] = [];
    let currentTime = 0;
    // Track last MIDI pitch to discourage large unidirectional drifts
    let lastPitch: number | null = null;

    // Convert string representations to actual musical elements
    for (let i = 0; i < melody.length; i++) {
      const noteStr = melody[i];
      const rhythmStr = rhythm[i] || rhythm[0]; // Fallback to first rhythm

      // Parse note string (e.g., "C4", "F#5")
      const note = this.parseNote(noteStr);
      if (note) {
        // Apply rhythm timing
        const duration = this.parseRhythm(rhythmStr);
        const velocity = this.calculateVelocity(noteStr, rhythmStr);

        // Constrain pitch to range to avoid register drift and apply small mean-reversion bias
        let clampedPitch = Math.max(this.minPitch, Math.min(this.maxPitch, note.pitch));
        if (lastPitch !== null) {
          const center = (this.minPitch + this.maxPitch) / 2;
          const isExtremeLow = clampedPitch <= this.minPitch + 2;
          const isExtremeHigh = clampedPitch >= this.maxPitch - 2;
          // If we are at extremes repeatedly, bias one semitone toward center
          if (isExtremeLow) clampedPitch = Math.min(this.maxPitch, clampedPitch + 1);
          if (isExtremeHigh) clampedPitch = Math.max(this.minPitch, clampedPitch - 1);
          // Gentle pull toward center to avoid long drifts
          const towardCenter = clampedPitch < center ? 1 : -1;
          clampedPitch += Math.abs(clampedPitch - center) > 6 ? towardCenter : 0;
        }

        notes.push({
          pitch: clampedPitch,
          velocity: velocity,
          duration: duration,
          startTime: currentTime,
        });

        currentTime += duration;
        lastPitch = clampedPitch;
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
    // Support sharps and flats (e.g., C4, F#4, Bb3)
    const match = noteStr.match(/^([A-G](?:#|b)?)(\d+)$/);
    if (!match) return null;

    let name = match[1];
    const octave = parseInt(match[2], 10);

    // Normalize flats to enharmonic sharps
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

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const index = noteNames.indexOf(name);
    if (index === -1) return null;

    const pitch = index + octave * 12;
    return { pitch, octave };
  }

  /**
   * Parse rhythm string into duration in milliseconds
   * Supports both number format (4, 8, 16) and legacy word format
   */
  private parseRhythm(rhythmStr: string): number {
    // Simple rhythm parsing (can be extended for more complex notation)
    const beatDuration = (60 / this.tempo) * 1000; // Convert BPM to milliseconds

    // Parse number format
    if (/^\d+$/.test(rhythmStr)) {
      const rhythmNumber = parseInt(rhythmStr, 10);
      switch (rhythmNumber) {
        case 1:
          return beatDuration * 4; // whole note
        case 2:
          return beatDuration * 2; // half note
        case 4:
          return beatDuration; // quarter note
        case 8:
          return beatDuration / 2; // eighth note
        case 16:
          return beatDuration / 4; // sixteenth note
        case 32:
          return beatDuration / 8; // thirty-second note
        default:
          return beatDuration; // Default to quarter note
      }
    }

    return beatDuration;
  }

  /**
   * Calculate note velocity based on note and rhythm
   */
  // TODO: Make this more complex or implement markov chain for velocity
  private calculateVelocity(noteStr: string, rhythmStr: string): number {
    let velocity = 80;
    switch (rhythmStr) {
      case "whole":
        velocity -= 20;
        break;
      case "half":
        velocity -= 10;
        break;
      case "eighth":
        velocity += 10;
        break;
      case "sixteenth":
        velocity += 15;
        break;
      default:
        break;
    }
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
   * Set temperature on internal chains to control randomness/diversity
   */
  setTemperature(temperature: number): void {
    // Forward to internal chains
    (this.noteChain as any).setTemperature?.(temperature);
    (this.rhythmChain as any).setTemperature?.(temperature);
  }

  /**
   * Reset all internal chains and base chain
   */
  resetAll(): void {
    (this.noteChain as any).reset?.();
    (this.rhythmChain as any).reset?.();
    super.reset();
  }

  /**
   * Configure allowable MIDI pitch range for generated notes
   */
  setPitchRange(minPitch: number, maxPitch: number): void {
    this.minPitch = Math.max(0, Math.min(127, Math.floor(minPitch)));
    this.maxPitch = Math.max(this.minPitch, Math.min(127, Math.floor(maxPitch)));
  }

  /**
   * Get musical statistics from all chains
   */
  getMusicStats(): {
    noteStats: any;
    rhythmStats: any;
  } {
    return {
      noteStats: this.noteChain.getStats(),
      rhythmStats: this.rhythmChain.getStats(),
    };
  }
}
