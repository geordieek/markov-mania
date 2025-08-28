/**
 * MIDI Generator for converting Markov chain music output to MIDI format
 * This class handles the conversion from abstract musical sequences to
 * concrete MIDI data that can be played or saved to files.
 */

import { MusicSequence, Note, MusicalPersonality } from "../types";

// MIDI-specific extensions of base types
export interface MIDINote extends Note {
  /** Note start time in MIDI ticks */
  startTime: number;
  /** Note duration in MIDI ticks */
  duration: number;
  /** MIDI channel (0-15) */
  channel: number;
}

export interface MIDISequence {
  /** Array of MIDI notes */
  notes: MIDINote[];
  /** Total duration in ticks */
  duration: number;
  /** Tempo in BPM */
  tempo: number;
  /** Time signature */
  timeSignature: string;
  /** Key signature */
  keySignature: string;
}

export class MIDIGenerator {
  private ticksPerBeat: number = 480; // Standard MIDI resolution
  private tempo: number = 120; // BPM
  private timeSignature: string = "4/4";
  private keySignature: string = "C";
  private personalities: Map<string, MusicalPersonality> = new Map();

  constructor() {
    this.initializePersonalities();
  }

  /**
   * Initialize predefined musical personalities
   */
  private initializePersonalities(): void {
    // Melodic personality - focused on melody with simple harmony
    this.personalities.set("melodic", {
      name: "Melodic",
      velocityRange: [60, 100],
      noteLengths: ["eighth", "quarter", "half"],
      articulation: "normal",
      rhythmComplexity: "simple",
      harmonicDensity: "sparse",
    });

    // Rhythmic personality - strong rhythmic focus
    this.personalities.set("rhythmic", {
      name: "Rhythmic",
      velocityRange: [80, 127],
      noteLengths: ["sixteenth", "eighth", "quarter"],
      articulation: "staccato",
      rhythmComplexity: "complex",
      harmonicDensity: "medium",
    });

    // Harmonic personality - rich chord progressions
    this.personalities.set("harmonic", {
      name: "Harmonic",
      velocityRange: [40, 80],
      noteLengths: ["half", "whole", "quarter"],
      articulation: "legato",
      rhythmComplexity: "simple",
      harmonicDensity: "dense",
    });

    // Jazz personality - complex rhythms and harmonies
    this.personalities.set("jazz", {
      name: "Jazz",
      velocityRange: [70, 110],
      noteLengths: ["sixteenth", "eighth", "quarter", "half"],
      articulation: "normal",
      rhythmComplexity: "complex",
      harmonicDensity: "dense",
    });

    // Ambient personality - long, flowing notes
    this.personalities.set("ambient", {
      name: "Ambient",
      velocityRange: [30, 70],
      noteLengths: ["half", "whole", "dotted-half"],
      articulation: "legato",
      rhythmComplexity: "simple",
      harmonicDensity: "sparse",
    });
  }

  /**
   * Convert a MusicSequence to MIDI format
   */
  generateMIDI(musicSequence: MusicSequence, personality: string = "melodic"): MIDISequence {
    const personalityConfig =
      this.personalities.get(personality) || this.personalities.get("melodic")!;

    // Convert notes to MIDI format
    const midiNotes: MIDINote[] = musicSequence.notes.map((note) => {
      const midiNote: MIDINote = {
        pitch: note.pitch,
        velocity: this.applyPersonalityVelocity(note.velocity, personalityConfig),
        startTime: this.convertTimeToTicks(note.startTime),
        duration: this.convertTimeToTicks(note.duration),
        channel: 0, // Default to channel 0
      };
      return midiNote;
    });

    // Apply personality-specific modifications
    const modifiedNotes = this.applyPersonalityModifications(midiNotes, personalityConfig);

    return {
      notes: modifiedNotes,
      duration: this.convertTimeToTicks(musicSequence.duration),
      tempo: this.tempo,
      timeSignature: this.timeSignature,
      keySignature: this.keySignature,
    };
  }

  /**
   * Apply personality-specific velocity modifications
   */
  private applyPersonalityVelocity(baseVelocity: number, personality: MusicalPersonality): number {
    const [minVel, maxVel] = personality.velocityRange;

    // Scale velocity to personality range
    let scaledVelocity = (baseVelocity / 127) * (maxVel - minVel) + minVel;

    // Add some randomness for natural variation
    const variation = (Math.random() - 0.5) * 10;
    scaledVelocity += variation;

    return Math.max(1, Math.min(127, Math.round(scaledVelocity)));
  }

  /**
   * Apply personality-specific modifications to notes
   */
  private applyPersonalityModifications(
    notes: MIDINote[],
    personality: MusicalPersonality
  ): MIDINote[] {
    let modifiedNotes = [...notes];

    // Apply articulation
    if (personality.articulation === "staccato") {
      modifiedNotes = modifiedNotes.map((note) => ({
        ...note,
        duration: Math.min(note.duration, this.ticksPerBeat / 4), // Short notes
      }));
    } else if (personality.articulation === "legato") {
      modifiedNotes = modifiedNotes.map((note) => ({
        ...note,
        duration: Math.max(note.duration, this.ticksPerBeat), // Longer notes
      }));
    }

    // Apply rhythm complexity
    if (personality.rhythmComplexity === "complex") {
      modifiedNotes = this.addRhythmicVariation(modifiedNotes);
    }

    return modifiedNotes;
  }

  /**
   * Add rhythmic variation for complex personalities
   */
  private addRhythmicVariation(notes: MIDINote[]): MIDINote[] {
    return notes.map((note, index) => {
      // Add slight timing variations
      const timingVariation = (Math.random() - 0.5) * (this.ticksPerBeat / 8);
      const durationVariation = (Math.random() - 0.5) * (this.ticksPerBeat / 16);

      return {
        ...note,
        startTime: Math.max(0, note.startTime + timingVariation),
        duration: Math.max(this.ticksPerBeat / 16, note.duration + durationVariation),
      };
    });
  }

  /**
   * Convert time in milliseconds to MIDI ticks
   */
  private convertTimeToTicks(timeMs: number): number {
    const beatsPerSecond = this.tempo / 60;
    const msPerBeat = 1000 / beatsPerSecond;
    const beats = timeMs / msPerBeat;
    return Math.round(beats * this.ticksPerBeat);
  }

  /**
   * Generate MIDI file data (binary format)
   */
  generateMIDIFile(midiSequence: MIDISequence): Uint8Array {
    // This is a simplified MIDI file generation
    // In a full implementation, you'd want to use a proper MIDI library

    const header = this.createMIDIHeader();
    const trackData = this.createMIDITrack(midiSequence);

    // Combine header and track data
    const midiData = new Uint8Array(header.length + trackData.length);
    midiData.set(header, 0);
    midiData.set(trackData, header.length);

    return midiData;
  }

  /**
   * Create MIDI file header
   */
  private createMIDIHeader(): Uint8Array {
    // MIDI file header (simplified)
    const header = new Uint8Array(14);

    // "MThd" identifier
    header[0] = 0x4d; // M
    header[1] = 0x54; // T
    header[2] = 0x68; // h
    header[3] = 0x64; // d

    // Header length (6 bytes)
    header[4] = 0x00;
    header[5] = 0x00;
    header[6] = 0x00;
    header[7] = 0x06;

    // Format (1 = multiple tracks)
    header[8] = 0x00;
    header[9] = 0x01;

    // Number of tracks
    header[10] = 0x00;
    header[11] = 0x01;

    // Ticks per quarter note
    header[12] = (this.ticksPerBeat >> 8) & 0xff;
    header[13] = this.ticksPerBeat & 0xff;

    return header;
  }

  /**
   * Create MIDI track data
   */
  private createMIDITrack(midiSequence: MIDISequence): Uint8Array {
    // This is a simplified track creation
    // In practice, you'd want to use a proper MIDI library

    const trackData: number[] = [];

    // Track header
    trackData.push(0x4d, 0x54, 0x72, 0x6b); // "MTrk"

    // Track length placeholder (will be filled later)
    trackData.push(0x00, 0x00, 0x00, 0x00);

    // Tempo meta event
    const tempo = Math.round(60000000 / midiSequence.tempo); // microseconds per quarter note
    trackData.push(0x00, 0xff, 0x51, 0x03);
    trackData.push((tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff);

    // Time signature meta event
    trackData.push(0x00, 0xff, 0x58, 0x04);
    trackData.push(0x04, 0x02, 0x18, 0x08); // 4/4 time

    // Key signature meta event
    trackData.push(0x00, 0xff, 0x59, 0x02);
    trackData.push(0x00, 0x00); // C major

    // Add notes
    for (const note of midiSequence.notes) {
      // Note on
      trackData.push(0x00, 0x90 | note.channel, note.pitch, note.velocity);

      // Note off (after duration)
      trackData.push(0x00, 0x80 | note.channel, note.pitch, 0x00);
    }

    // End of track
    trackData.push(0x00, 0xff, 0x2f, 0x00);

    // Update track length
    const trackLength = trackData.length - 8; // Subtract header
    trackData[4] = (trackLength >> 24) & 0xff;
    trackData[5] = (trackLength >> 16) & 0xff;
    trackData[6] = (trackLength >> 8) & 0xff;
    trackData[7] = trackLength & 0xff;

    return new Uint8Array(trackData);
  }

  /**
   * Set tempo for MIDI generation
   */
  setTempo(tempo: number): void {
    this.tempo = tempo;
  }

  /**
   * Set time signature
   */
  setTimeSignature(timeSignature: string): void {
    this.timeSignature = timeSignature;
  }

  /**
   * Set key signature
   */
  setKeySignature(keySignature: string): void {
    this.keySignature = keySignature;
  }

  /**
   * Get available musical personalities
   */
  getPersonalities(): string[] {
    return Array.from(this.personalities.keys());
  }

  /**
   * Get personality configuration
   */
  getPersonality(name: string): MusicalPersonality | undefined {
    return this.personalities.get(name);
  }

  /**
   * Add a custom musical personality
   */
  addPersonality(name: string, personality: MusicalPersonality): void {
    this.personalities.set(name, personality);
  }
}
