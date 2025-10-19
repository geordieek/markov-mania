/**
 * This class extends the base MarkovChain to work specifically with musical elements:
 * - Note sequences (melodies)
 * - Rhythm patterns (groove)
 */

import { MarkovChain } from "../core/MarkovChain";
import { MarkovConfig, MusicSequence, Note, Chord, PolyphonicSequence } from "../types";
import { HarmonicAnalyzer, ChordProgression, Chord as HarmonicChord } from "./HarmonicAnalyzer";

export class MusicMarkovChain extends MarkovChain {
  private rhythmChain: MarkovChain;
  private harmonicAnalyzer: HarmonicAnalyzer;

  // Musical constraints and scales
  private musicalKey: string = "C";
  private scale: number[] = [0, 2, 4, 5, 7, 9, 11]; // C major scale (MIDI note numbers)
  private tempo: number = 120; // BPM
  private minPitch: number = 24; // C2 TODO: Allow this to be set, or use in the input value to help infer it
  private maxPitch: number = 84; // C6 TODO: Allow this to be set, or use in the input value to help infer it

  // Harmonic analysis
  private detectedKey: string = "C major";

  constructor(config: MarkovConfig) {
    super(config);

    // Create rhythm chain for timing
    this.rhythmChain = new MarkovChain(config);

    // Initialize analyzers
    this.harmonicAnalyzer = new HarmonicAnalyzer();
  }

  /**
   * Train the Markov chain with musical data (unified for notes and chords)
   */
  trainWithMusic(musicSequences: string[][], rhythmPatterns: string[][]): void {
    // Train the main chain with all musical tokens (notes and chords)
    this.train(musicSequences);
    this.rhythmChain.train(rhythmPatterns);

    // Analyze harmonic patterns from the training data
    this.analyzeHarmonicPatterns(musicSequences);
  }

  /**
   * Train the Markov chain with polyphonic data (chords)
   */
  trainWithPolyphonicMusic(chordSequences: string[][], rhythmPatterns: string[][]): void {
    // Train the main chain with chord sequences
    this.train(chordSequences);
    this.rhythmChain.train(rhythmPatterns);

    // Analyze harmonic patterns from chord sequences
    this.analyzeHarmonicPatternsFromChords(chordSequences);
  }

  /**
   * Append musical tokens to the main chain
   */
  appendMelodySequence(melody: string[]): void {
    this.trainAppend([melody]);
  }

  /**
   * Generate a complete musical sequence from the trained chains
   */
  generateSequence(sequenceLength: number = 16): MusicSequence {
    // Generate musical tokens (notes and chords) from the main chain
    // Use repetition prevention to avoid getting stuck in loops
    const musicTokens = this.generateWithRepetitionPrevention(sequenceLength, undefined, 2);
    const rhythm = this.generateRhythm(sequenceLength);

    // Convert tokens to musical sequence
    return this.convertTokensToMusicSequence(musicTokens, rhythm);
  }

  /**
   * Generate a polyphonic sequence (chords) from the trained chains
   */
  generatePolyphonicSequence(sequenceLength: number = 16): PolyphonicSequence {
    // Generate chord sequence from main chain
    const chordIds = this.generate(sequenceLength);
    const rhythm = this.generateRhythm(sequenceLength);

    // Convert chord IDs to actual chords
    const chords = this.convertChordIdsToChords(chordIds, rhythm);

    return {
      chords,
      duration:
        chords.length > 0
          ? chords[chords.length - 1].startTime + chords[chords.length - 1].duration
          : 0,
      key: this.musicalKey,
      timeSignature: "4/4",
    };
  }

  /**
   * Convert musical tokens to a MusicSequence
   */
  public convertTokensToMusicSequence(tokens: string[], rhythm: string[]): MusicSequence {
    const notes: Note[] = [];
    let currentTime = 0;
    let lastPitch: number | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const rhythmStr = rhythm[i] || rhythm[0]; // Fallback to first rhythm

      // Check if token is a chord (contains +)
      if (token.includes("+")) {
        // Parse chord
        const chordNotes = this.parseChordId(token);
        if (chordNotes.length > 0) {
          const duration = this.parseRhythm(rhythmStr);

          // Add all notes in the chord at the same time
          for (const note of chordNotes) {
            const clampedPitch = this.constrainPitch(note.pitch, lastPitch);
            notes.push({
              pitch: clampedPitch,
              velocity: note.velocity,
              duration: duration,
              startTime: currentTime,
              // Add chord identifier for display purposes
              chordId: token,
            });
          }

          currentTime += duration;
          lastPitch = chordNotes[0].pitch; // Use first note as reference
        }
      } else {
        // Parse single note
        const note = this.parseNote(token);
        if (note) {
          const duration = this.parseRhythm(rhythmStr);
          const velocity = this.calculateVelocity(token, rhythmStr);
          const clampedPitch = this.constrainPitch(note.pitch, lastPitch);

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
    }

    return {
      notes,
      duration: currentTime,
      key: this.musicalKey,
      timeSignature: "4/4",
    };
  }

  /**
   * Generate a rhythm pattern using the rhythm Markov chain
   */
  private generateRhythm(length: number): string[] {
    // Generate a sequence with the exact length requested
    return this.rhythmChain.generate(length);
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

    const pitch = index + (octave + 1) * 12;
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
   * Constrains pitch to valid range and applies mean-reversion bias to prevent register drift
   */
  private constrainPitch(pitch: number, lastPitch: number | null): number {
    // Constrain pitch to range to avoid register drift and apply small mean-reversion bias
    let clampedPitch = Math.max(this.minPitch, Math.min(this.maxPitch, pitch));

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

    return clampedPitch;
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
    super.setTemperature(temperature);
    this.rhythmChain.setTemperature(temperature);
  }

  /**
   * Reset all internal chains and base chain
   */
  resetAll(): void {
    super.reset();
    this.rhythmChain.reset();
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
      noteStats: this.getStats(),
      rhythmStats: this.rhythmChain.getStats(),
    };
  }

  /**
   * Analyze harmonic patterns from training sequences
   */
  private analyzeHarmonicPatterns(noteSequences: string[][]): void {
    // Convert string sequences to Note objects for harmonic analysis
    const noteSequencesAsNotes = noteSequences.map((sequence) =>
      sequence.map((noteStr, index) => {
        const parsed = this.parseNote(noteStr);
        const pitch = parsed ? parsed.pitch : 60; // Default to middle C
        return {
          pitch: pitch,
          startTime: index * 500,
          duration: 500,
          velocity: 80,
        };
      })
    );

    // Detect key from training data
    const allNotes = noteSequencesAsNotes.flat();
    this.detectedKey = this.harmonicAnalyzer.detectKey(allNotes);
    this.musicalKey = this.detectedKey.split(" ")[0]; // Extract just the key name
    this.updateScale(this.musicalKey);
  }

  /**
   * Get detected key from training data
   */
  getDetectedKey(): string {
    return this.detectedKey;
  }

  /**
   * Analyze harmonic content of a sequence
   */
  analyzeSequenceHarmony(notes: Note[]): {
    detectedKey: string;
    chords: HarmonicChord[];
    harmonicStats: any;
  } {
    const detectedKey = this.harmonicAnalyzer.detectKey(notes);
    const chords = this.harmonicAnalyzer.detectChords(notes);
    const harmonicStats = this.harmonicAnalyzer.calculateHarmonicStats([
      {
        chords,
        key: detectedKey,
        romanNumerals: [],
        duration:
          notes.length > 0
            ? notes[notes.length - 1].startTime + notes[notes.length - 1].duration
            : 0,
        tension: 0.5,
      },
    ]);

    return {
      detectedKey,
      chords,
      harmonicStats,
    };
  }

  /**
   * Get the main music chain for analysis purposes
   */
  public getNoteChain(): MarkovChain {
    return this;
  }

  /**
   * Get the rhythm chain for analysis purposes
   */
  public getRhythmChain(): MarkovChain {
    return this.rhythmChain;
  }

  /**
   * Get the chord chain for analysis purposes (now same as main chain)
   */
  public getChordChain(): MarkovChain {
    return this;
  }

  /**
   * Convert chord IDs to actual Chord objects
   */
  private convertChordIdsToChords(chordIds: string[], rhythm: string[]): Chord[] {
    const chords: Chord[] = [];
    let currentTime = 0;

    for (let i = 0; i < chordIds.length; i++) {
      const chordId = chordIds[i];
      const rhythmStr = rhythm[i] || rhythm[0]; // Fallback to first rhythm

      // Parse chord ID (e.g., "C4+E4+G4")
      const notes = this.parseChordId(chordId);
      if (notes.length > 0) {
        const duration = this.parseRhythm(rhythmStr);

        chords.push({
          notes,
          startTime: currentTime,
          duration,
          id: chordId,
        });

        currentTime += duration;
      }
    }

    return chords;
  }

  /**
   * Parse a chord ID string into an array of Note objects
   */
  private parseChordId(chordId: string): Note[] {
    const noteStrings = chordId.split("+");
    const notes: Note[] = [];

    for (const noteStr of noteStrings) {
      const parsed = this.parseNote(noteStr);
      if (parsed) {
        notes.push({
          pitch: parsed.pitch,
          velocity: 80, // Default velocity
          duration: 0, // Will be set by the chord duration
          startTime: 0, // Will be set by the chord start time
        });
      }
    }

    return notes;
  }

  /**
   * Analyze harmonic patterns from chord sequences
   */
  private analyzeHarmonicPatternsFromChords(chordSequences: string[][]): void {
    // Convert chord sequences to Note objects for harmonic analysis
    const noteSequencesAsNotes = chordSequences.map((sequence) => {
      const notes: Note[] = [];
      let time = 0;

      for (const chordId of sequence) {
        const chordNotes = this.parseChordId(chordId);
        for (const note of chordNotes) {
          notes.push({
            ...note,
            startTime: time,
            duration: 500, // Default duration for analysis
          });
        }
        time += 500; // Default chord duration
      }

      return notes;
    });

    // Detect key from training data
    const allNotes = noteSequencesAsNotes.flat();
    this.detectedKey = this.harmonicAnalyzer.detectKey(allNotes);
    this.musicalKey = this.detectedKey.split(" ")[0]; // Extract just the key name
    this.updateScale(this.musicalKey);
  }
}
