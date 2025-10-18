/**
 * Analyzes musical sequences for harmonic content in order to generate harmonically coherent output
 */

import { Note } from "../types";

export interface Chord {
  root: string;
  quality:
    | "major"
    | "minor"
    | "diminished"
    | "augmented"
    | "suspended"
    | "dominant7"
    | "major7"
    | "minor7";
  notes: string[];
  startTime: number;
  duration: number;
  confidence: number;
}

export interface ChordProgression {
  chords: Chord[];
  key: string;
  romanNumerals: string[];
  duration: number;
  tension: number;
}

export interface VoiceLeadingRule {
  maxInterval: number;
  avoidParallelFifths: boolean;
  avoidParallelOctaves: boolean;
  preferStepwiseMotion: boolean;
}

export class HarmonicAnalyzer {
  private chordTemplates: Map<string, number[]> = new Map();
  private keySignatures: Map<string, number[]> = new Map();
  private voiceLeadingRules: VoiceLeadingRule;

  constructor() {
    this.initializeChordTemplates();
    this.initializeKeySignatures();
    this.voiceLeadingRules = {
      maxInterval: 7, // Maximum interval in semitones
      avoidParallelFifths: true,
      avoidParallelOctaves: true,
      preferStepwiseMotion: true,
    };
  }

  /**
   * Detect chords from a sequence of notes
   */
  detectChords(notes: Note[], windowSize: number = 1000): Chord[] {
    const chords: Chord[] = [];

    // Group notes by time windows
    const timeWindows = this.groupNotesByTime(notes, windowSize);

    for (const window of timeWindows) {
      const chord = this.analyzeChord(window.notes, window.startTime, window.duration);
      if (chord && chord.confidence > 0.3) {
        chords.push(chord);
      }
    }

    return chords;
  }

  /**
   * Learn harmonic patterns from training sequences
   */
  learnHarmonicPatterns(sequences: string[][]): Map<string, number> {
    const progressionCounts = new Map<string, number>();

    for (const sequence of sequences) {
      // Convert string sequence to notes (simplified)
      const notes = this.stringSequenceToNotes(sequence);
      const chords = this.detectChords(notes);

      // Extract chord progression
      const progression = chords.map((chord) => chord.root + chord.quality).join(" -> ");
      if (progression) {
        progressionCounts.set(progression, (progressionCounts.get(progression) || 0) + 1);
      }
    }

    return progressionCounts;
  }

  /**
   * Apply voice leading rules to smooth chord transitions
   */
  applyVoiceLeading(notes: Note[], maxInterval: number = 7): Note[] {
    if (notes.length < 2) return notes;

    const smoothedNotes: Note[] = [notes[0]];

    for (let i = 1; i < notes.length; i++) {
      const currentNote = notes[i];
      const previousNote = smoothedNotes[smoothedNotes.length - 1];

      const interval = Math.abs(currentNote.pitch - previousNote.pitch);

      if (interval > maxInterval) {
        // Adjust note to be within max interval
        const direction = currentNote.pitch > previousNote.pitch ? 1 : -1;
        const adjustedPitch = previousNote.pitch + direction * maxInterval;

        smoothedNotes.push({
          ...currentNote,
          pitch: Math.max(0, Math.min(127, adjustedPitch)),
        });
      } else {
        smoothedNotes.push(currentNote);
      }
    }

    return smoothedNotes;
  }

  /**
   * Detect the key of a musical sequence
   */
  detectKey(notes: Note[]): string {
    const noteCounts = new Map<string, number>();

    // Count occurrences of each note
    for (const note of notes) {
      const noteName = this.midiToNoteName(note.pitch);
      noteCounts.set(noteName, (noteCounts.get(noteName) || 0) + 1);
    }

    // Compare against known key signatures
    let bestKey = "C major";
    let bestScore = 0;

    for (const [key, scale] of this.keySignatures) {
      const score = this.calculateKeyScore(noteCounts, scale);
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    return bestKey;
  }

  // Private helper methods

  private initializeChordTemplates(): void {
    this.chordTemplates.set("major", [0, 4, 7]);
    this.chordTemplates.set("minor", [0, 3, 7]);
    this.chordTemplates.set("diminished", [0, 3, 6]);
    this.chordTemplates.set("augmented", [0, 4, 8]);
    this.chordTemplates.set("suspended", [0, 5, 7]);
    this.chordTemplates.set("dominant7", [0, 4, 7, 10]);
    this.chordTemplates.set("major7", [0, 4, 7, 11]);
    this.chordTemplates.set("minor7", [0, 3, 7, 10]);
  }

  private initializeKeySignatures(): void {
    this.keySignatures.set("C major", [0, 2, 4, 5, 7, 9, 11]);
    this.keySignatures.set("G major", [7, 9, 11, 0, 2, 4, 6]);
    this.keySignatures.set("D major", [2, 4, 6, 7, 9, 11, 1]);
    this.keySignatures.set("A major", [9, 11, 1, 2, 4, 6, 8]);
    this.keySignatures.set("E major", [4, 6, 8, 9, 11, 1, 3]);
    this.keySignatures.set("B major", [11, 1, 3, 4, 6, 8, 10]);
    this.keySignatures.set("F# major", [6, 8, 10, 11, 1, 3, 5]);
    this.keySignatures.set("F major", [5, 7, 9, 10, 0, 2, 4]);
    this.keySignatures.set("Bb major", [10, 0, 2, 3, 5, 7, 9]);
    this.keySignatures.set("Eb major", [3, 5, 7, 8, 10, 0, 2]);
    this.keySignatures.set("Ab major", [8, 10, 0, 1, 3, 5, 7]);
    this.keySignatures.set("Db major", [1, 3, 5, 6, 8, 10, 0]);
  }

  private groupNotesByTime(
    notes: Note[],
    windowSize: number
  ): Array<{ notes: Note[]; startTime: number; duration: number }> {
    const windows: Array<{ notes: Note[]; startTime: number; duration: number }> = [];

    if (notes.length === 0) return windows;

    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    const startTime = sortedNotes[0].startTime;
    const endTime =
      sortedNotes[sortedNotes.length - 1].startTime + sortedNotes[sortedNotes.length - 1].duration;

    for (let time = startTime; time < endTime; time += windowSize) {
      const windowNotes = sortedNotes.filter(
        (note) => note.startTime >= time && note.startTime < time + windowSize
      );

      if (windowNotes.length > 0) {
        windows.push({
          notes: windowNotes,
          startTime: time,
          duration: windowSize,
        });
      }
    }

    return windows;
  }

  private analyzeChord(notes: Note[], startTime: number, duration: number): Chord | null {
    if (notes.length < 2) return null;

    // Convert notes to pitch classes (0-11)
    const pitchClasses = notes.map((note) => note.pitch % 12);
    const uniquePitchClasses = [...new Set(pitchClasses)].sort((a, b) => a - b);

    // Find best matching chord
    let bestChord: Chord | null = null;
    let bestScore = 0;

    for (const [quality, template] of this.chordTemplates) {
      for (let root = 0; root < 12; root++) {
        const chordNotes = template.map((interval) => (root + interval) % 12);
        const score = this.calculateChordScore(uniquePitchClasses, chordNotes);

        if (score > bestScore) {
          bestScore = score;
          bestChord = {
            root: this.indexToNoteName(root),
            quality: quality as Chord["quality"],
            notes: chordNotes.map((pc) => this.indexToNoteName(pc)),
            startTime,
            duration,
            confidence: score,
          };
        }
      }
    }

    return bestChord;
  }

  private calculateChordScore(actualPitchClasses: number[], chordTemplate: number[]): number {
    let score = 0;
    let matches = 0;

    for (const pc of actualPitchClasses) {
      if (chordTemplate.includes(pc)) {
        matches++;
        score += 1;
      }
    }

    // Bonus for having the root note
    if (chordTemplate.length > 0 && actualPitchClasses.includes(chordTemplate[0])) {
      score += 0.5;
    }

    // Normalize by chord template size
    return score / chordTemplate.length;
  }

  private stringSequenceToNotes(sequence: string[]): Note[] {
    return sequence.map((noteStr, index) => {
      const midi = this.noteNameToMidi(noteStr);
      return {
        pitch: midi,
        velocity: 80,
        duration: 1000,
        startTime: index * 1000,
      };
    });
  }

  private calculateKeyScore(noteCounts: Map<string, number>, scale: number[]): number {
    let score = 0;
    let totalNotes = 0;

    for (const [noteName, count] of noteCounts) {
      const pitchClass = this.noteNameToMidi(noteName) % 12;
      if (scale.includes(pitchClass)) {
        score += count;
      }
      totalNotes += count;
    }

    return totalNotes > 0 ? score / totalNotes : 0;
  }

  private createChord(root: string, quality: string, startTime: number, duration: number): Chord {
    const template = this.chordTemplates.get(quality) || [0, 4, 7];
    const rootPitch = this.noteNameToMidi(root) % 12;

    // Create chord notes in a reasonable octave (octave 4)
    const baseOctave = 4;
    const chordNotes = template.map((interval) => {
      const noteIndex = (rootPitch + interval) % 12;
      const octave = baseOctave + Math.floor((rootPitch + interval) / 12);
      return this.indexToNoteName(noteIndex) + octave;
    });

    return {
      root,
      quality: quality as Chord["quality"],
      notes: chordNotes,
      startTime,
      duration,
      confidence: 1.0,
    };
  }

  private midiToNoteName(midi: number): string {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }

  private noteNameToMidi(noteName: string): number {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const match = noteName.match(/^([A-G]#?)(\d+)$/);
    if (!match) return 60; // Default to middle C

    const note = match[1];
    const octave = parseInt(match[2], 10);
    const noteIndex = noteNames.indexOf(note);

    return noteIndex + (octave + 1) * 12;
  }

  private indexToNoteName(index: number): string {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return noteNames[index % 12];
  }

  private indexToRomanNumeral(index: number): string {
    const numerals = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
    return numerals[index % 7];
  }

  /**
   * Calculate comprehensive harmonic statistics
   */
  calculateHarmonicStats(progressions: ChordProgression[]): any {
    if (progressions.length === 0) {
      return {
        chordComplexity: 0,
        progressionLength: 0,
        keyStability: 0,
        tensionVariation: 0,
        voiceLeadingSmoothness: 0,
      };
    }

    const chordComplexity = this.calculateAverageChordComplexity(progressions);
    const progressionLength = this.calculateAverageProgressionLength(progressions);
    const keyStability = this.calculateKeyStability(progressions);
    const tensionVariation = this.calculateTensionVariation(progressions);
    const voiceLeadingSmoothness = this.calculateVoiceLeadingSmoothness(progressions);

    return {
      chordComplexity,
      progressionLength,
      keyStability,
      tensionVariation,
      voiceLeadingSmoothness,
    };
  }

  private calculateAverageChordComplexity(progressions: ChordProgression[]): number {
    const complexities = progressions.flatMap((p) => p.chords.map((c) => c.notes.length));
    return complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  }

  private calculateAverageProgressionLength(progressions: ChordProgression[]): number {
    const lengths = progressions.map((p) => p.chords.length);
    return lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
  }

  private calculateKeyStability(progressions: ChordProgression[]): number {
    const keys = progressions.map((p) => p.key);
    const keyCounts = new Map<string, number>();

    for (const key of keys) {
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    }

    const maxCount = Math.max(...keyCounts.values());
    return maxCount / keys.length;
  }

  private calculateTensionVariation(progressions: ChordProgression[]): number {
    const tensions = progressions.map((p) => p.tension);
    const mean = tensions.reduce((sum, t) => sum + t, 0) / tensions.length;
    const variance = tensions.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / tensions.length;

    return Math.sqrt(variance);
  }

  private calculateVoiceLeadingSmoothness(progressions: ChordProgression[]): number {
    let totalSmoothness = 0;
    let count = 0;

    for (const progression of progressions) {
      for (let i = 0; i < progression.chords.length - 1; i++) {
        const fromChord = progression.chords[i];
        const toChord = progression.chords[i + 1];
        const smoothness = this.calculateChordTransitionSmoothness(fromChord, toChord);
        totalSmoothness += smoothness;
        count++;
      }
    }

    return count > 0 ? totalSmoothness / count : 0;
  }

  private calculateChordTransitionSmoothness(fromChord: Chord, toChord: Chord): number {
    // Simplified smoothness calculation
    const fromRoot = this.noteNameToMidi(fromChord.root);
    const toRoot = this.noteNameToMidi(toChord.root);

    if (fromRoot === undefined || toRoot === undefined) return 0;

    const interval = (toRoot - fromRoot + 12) % 12;

    // Prefer smaller intervals (more smooth)
    if (interval <= 2) return 1.0;
    if (interval <= 4) return 0.8;
    if (interval <= 6) return 0.6;
    return 0.4;
  }
}
