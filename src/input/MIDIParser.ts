/**
 * MIDI File Parser for extracting musical sequences from MIDI files
 * Uses @tonejs/midi for parsing and converts to Markov chain training format
 */

import { Midi } from "@tonejs/midi";
import { Note } from "../types";

export interface ParsedMIDI {
  tracks: MIDITrack[];
  duration: number;
  timeSignature: string;
  keySignature: string;
  tempo: number;
}

export interface MIDITrack {
  name: string;
  channel: number;
  notes: Note[];
  isDrumTrack: boolean;
}

export interface MIDISequence {
  noteSequence: string[];
  rhythmSequence: string[];
}

export class MIDIParser {
  private quantization: number = 16; // 16th note quantization by default

  constructor(quantization: number = 16) {
    this.quantization = quantization;
  }

  /**
   * Parse a MIDI file from ArrayBuffer
   */
  async parseMIDIFile(fileBuffer: ArrayBuffer): Promise<ParsedMIDI> {
    try {
      const midi = new Midi(fileBuffer);

      // Debug: Log MIDI file info
      console.log("MIDI file info:");
      console.log("- Duration:", midi.duration);
      console.log("- Tracks:", midi.tracks.length);
      console.log("- Tempo:", midi.header.tempos[0]?.bpm || 120);
      console.log("- Time signature:", midi.header.timeSignatures[0]?.timeSignature);

      const tracks: MIDITrack[] = midi.tracks.map((track, index) => {
        const notes: Note[] = track.notes.map((note, noteIndex) => {
          // Debug: Log raw note data for first few notes only
          if (noteIndex < 3) {
            console.log(`Raw note ${noteIndex} data:`, {
              pitch: note.pitch,
              velocity: note.velocity,
              duration: note.duration,
              time: note.time,
              midi: note.midi,
            });
          }

          // Try both pitch and midi properties
          const pitchValue = note.midi !== undefined ? note.midi : note.pitch;
          const pitch = parseInt(pitchValue.toString());
          const velocity = Math.round(note.velocity * 127);
          const duration = note.duration * 1000; // Convert to milliseconds
          const startTime = note.time * 1000; // Convert to milliseconds

          // Debug logging for problematic values
          if (isNaN(pitch) || pitch < 0 || pitch > 127) {
            console.warn(`Invalid pitch in track ${index}:`, note.pitch, "->", pitch);
          }
          if (isNaN(velocity) || velocity < 0 || velocity > 127) {
            console.warn(`Invalid velocity in track ${index}:`, note.velocity, "->", velocity);
          }
          if (isNaN(duration) || duration <= 0) {
            console.warn(`Invalid duration in track ${index}:`, note.duration, "->", duration);
          }
          if (isNaN(startTime) || startTime < 0) {
            console.warn(`Invalid startTime in track ${index}:`, note.time, "->", startTime);
          }

          return {
            pitch: pitch,
            velocity: velocity,
            duration: duration,
            startTime: startTime,
            channel: track.channel || 0,
          };
        });

        // Debug: Log track info
        console.log(`Track ${index + 1}:`);
        console.log("- Name:", track.name || `Track ${index + 1}`);
        console.log("- Channel:", track.channel || 0);
        console.log("- Notes count:", track.notes.length);
        console.log(
          "- First few notes:",
          track.notes.slice(0, 5).map((n) => ({
            pitch: n.pitch,
            velocity: n.velocity,
            duration: n.duration,
            time: n.time,
          }))
        );

        return {
          name: track.name || `Track ${index + 1}`,
          channel: track.channel || 0,
          notes: this.quantizeTimings(notes),
          isDrumTrack: track.channel === 9, // Channel 10 (0-indexed) is typically drums
        };
      });

      return {
        tracks,
        duration: midi.duration * 1000, // Convert to milliseconds
        timeSignature: this.extractTimeSignature(midi),
        keySignature: this.extractKeySignature(midi),
        tempo: midi.header.tempos[0]?.bpm || 120,
      };
    } catch (error) {
      throw new Error(`Failed to parse MIDI file: ${error}`);
    }
  }

  /**
   * Extract note sequences from parsed MIDI for Markov chain training
   */
  extractNoteSequences(midi: ParsedMIDI): string[][] {
    const sequences: string[][] = [];

    console.log("Extracting note sequences from", midi.tracks.length, "tracks");

    for (const track of midi.tracks) {
      if (track.isDrumTrack) {
        console.log(`Skipping drum track: ${track.name}`);
        continue; // Skip drum tracks for now
      }

      console.log(`Processing track: ${track.name} with ${track.notes.length} notes`);

      // Sort notes by start time
      const sortedNotes = [...track.notes].sort((a, b) => a.startTime - b.startTime);

      // Convert to note name strings
      const noteSequence = sortedNotes.map((note) => {
        const noteName = this.midiToNoteName(note.pitch);
        if (!noteName || noteName.includes("undefined")) {
          console.warn(`Failed to convert pitch ${note.pitch} to note name, got: ${noteName}`);
        }
        return noteName;
      });

      console.log(
        `Extracted ${noteSequence.length} notes:`,
        noteSequence.slice(0, 10),
        noteSequence.length > 10 ? "..." : ""
      );

      // Check for unique notes
      const uniqueNotes = [...new Set(noteSequence)];
      console.log(`Unique notes in track: ${uniqueNotes.length}`, uniqueNotes.slice(0, 10));

      if (noteSequence.length > 0) {
        sequences.push(noteSequence);
      }
    }

    console.log(`Total sequences extracted: ${sequences.length}`);
    return sequences;
  }

  /**
   * Extract rhythm sequences from parsed MIDI
   */
  extractRhythmSequences(midi: ParsedMIDI): string[][] {
    const sequences: string[][] = [];

    for (const track of midi.tracks) {
      if (track.isDrumTrack) continue; // Skip drum tracks for now

      // Sort notes by start time
      const sortedNotes = [...track.notes].sort((a, b) => a.startTime - b.startTime);

      // Convert durations to rhythm strings
      const rhythmSequence = sortedNotes.map((note) => {
        const rhythm = this.durationToRhythmString(note.duration, midi.tempo);
        if (!rhythm || rhythm.includes("NaN")) {
          console.warn(`Failed to convert duration ${note.duration} to rhythm, got: ${rhythm}`);
        }
        return rhythm;
      });

      if (rhythmSequence.length > 0) {
        sequences.push(rhythmSequence);
      }
    }

    return sequences;
  }

  /**
   * Extract combined note:rhythm sequences for joint training
   */
  extractCombinedSequences(midi: ParsedMIDI): string[][] {
    const sequences: string[][] = [];

    for (const track of midi.tracks) {
      if (track.isDrumTrack) continue; // Skip drum tracks for now

      // Sort notes by start time
      const sortedNotes = [...track.notes].sort((a, b) => a.startTime - b.startTime);

      // Create combined note:rhythm strings
      const combinedSequence = sortedNotes.map((note) => {
        const noteName = this.midiToNoteName(note.pitch);
        const rhythm = this.durationToRhythmString(note.duration, midi.tempo);
        return `${noteName}:${rhythm}`;
      });

      if (combinedSequence.length > 0) {
        sequences.push(combinedSequence);
      }
    }

    return sequences;
  }

  /**
   * Quantize note timings to reduce complexity
   */
  quantizeTimings(notes: Note[]): Note[] {
    const quantizedNotes: Note[] = [];
    const quantizationStep = 60000 / (120 * this.quantization); // 120 BPM as reference

    for (const note of notes) {
      const quantizedStart = Math.round(note.startTime / quantizationStep) * quantizationStep;
      const quantizedDuration = Math.round(note.duration / quantizationStep) * quantizationStep;

      quantizedNotes.push({
        ...note,
        startTime: quantizedStart,
        duration: Math.max(quantizedDuration, quantizationStep), // Minimum duration
      });
    }

    return quantizedNotes;
  }

  /**
   * Convert MIDI note number to note name string
   */
  private midiToNoteName(midi: number): string {
    // Validate input
    if (typeof midi !== "number" || isNaN(midi) || midi < 0 || midi > 127) {
      console.warn(`Invalid MIDI note number: ${midi}, using C4 as fallback`);
      return "C4";
    }

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }

  /**
   * Convert duration in milliseconds to rhythm string
   */
  private durationToRhythmString(durationMs: number, tempo: number): string {
    // Validate inputs
    if (typeof durationMs !== "number" || isNaN(durationMs) || durationMs <= 0) {
      console.warn(`Invalid duration: ${durationMs}, using quarter note as fallback`);
      return "4";
    }

    if (typeof tempo !== "number" || isNaN(tempo) || tempo <= 0) {
      console.warn(`Invalid tempo: ${tempo}, using 120 BPM as fallback`);
      tempo = 120;
    }

    const beatDuration = (60 / tempo) * 1000; // Beat duration in milliseconds

    // Calculate note value based on duration
    if (durationMs >= beatDuration * 4) return "1"; // Whole note
    if (durationMs >= beatDuration * 2) return "2"; // Half note
    if (durationMs >= beatDuration) return "4"; // Quarter note
    if (durationMs >= beatDuration / 2) return "8"; // Eighth note
    if (durationMs >= beatDuration / 4) return "16"; // Sixteenth note
    if (durationMs >= beatDuration / 8) return "32"; // Thirty-second note
    return "4"; // Default to quarter note
  }

  /**
   * Extract time signature from MIDI
   */
  private extractTimeSignature(midi: Midi): string {
    const timeSignature = midi.header.timeSignatures[0];
    if (timeSignature && timeSignature.timeSignature.length >= 2) {
      const numerator = timeSignature.timeSignature[0];
      const denominator = timeSignature.timeSignature[1];
      return `${numerator}/${denominator}`;
    }
    return "4/4"; // Default
  }

  /**
   * Extract key signature from MIDI
   */
  private extractKeySignature(midi: Midi): string {
    const keySignature = midi.header.keySignatures[0];
    if (keySignature) {
      return `${keySignature.key} ${keySignature.scale}`;
    }
    return "C major"; // Default
  }

  /**
   * Set quantization level
   */
  setQuantization(quantization: number): void {
    this.quantization = quantization;
  }

  /**
   * Get statistics about the parsed MIDI
   */
  getMIDIStats(midi: ParsedMIDI): {
    totalTracks: number;
    totalNotes: number;
    duration: number;
    tempo: number;
    timeSignature: string;
    keySignature: string;
    trackStats: Array<{
      name: string;
      noteCount: number;
      channel: number;
      isDrumTrack: boolean;
    }>;
  } {
    const totalNotes = midi.tracks.reduce((sum, track) => sum + track.notes.length, 0);

    const trackStats = midi.tracks.map((track) => ({
      name: track.name,
      noteCount: track.notes.length,
      channel: track.channel,
      isDrumTrack: track.isDrumTrack,
    }));

    return {
      totalTracks: midi.tracks.length,
      totalNotes,
      duration: midi.duration,
      tempo: midi.tempo,
      timeSignature: midi.timeSignature,
      keySignature: midi.keySignature,
      trackStats,
    };
  }
}
