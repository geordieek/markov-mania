import { describe, it, expect, beforeEach } from "vitest";
import { MIDIParser } from "../input/MIDIParser";
import { Note, ParsedMIDI, MIDITrack } from "../types";

describe("MIDI Parser Polyphonic Functionality", () => {
  let midiParser: MIDIParser;

  beforeEach(() => {
    midiParser = new MIDIParser();
  });

  describe("Chord Grouping", () => {
    it("should group simultaneous notes into chords", () => {
      const notes: Note[] = [
        { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
        { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4 (simultaneous)
        { pitch: 67, startTime: 0, duration: 1000, velocity: 80 }, // G4 (simultaneous)
        { pitch: 65, startTime: 1000, duration: 1000, velocity: 80 }, // F4
        { pitch: 69, startTime: 1000, duration: 1000, velocity: 80 }, // A4 (simultaneous)
        { pitch: 72, startTime: 1000, duration: 1000, velocity: 80 }, // C5 (simultaneous)
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords).toHaveLength(2);
      expect(chords[0].notes).toHaveLength(3);
      expect(chords[1].notes).toHaveLength(3);
      expect(chords[0].id).toBe("C4+E4+G4");
      expect(chords[1].id).toBe("A4+C5+F4");
    });

    it("should handle time tolerance for chord grouping", () => {
      const notes: Note[] = [
        { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
        { pitch: 64, startTime: 25, duration: 1000, velocity: 80 }, // E4 (within 50ms tolerance)
        { pitch: 67, startTime: 45, duration: 1000, velocity: 80 }, // G4 (within 50ms tolerance)
        { pitch: 65, startTime: 100, duration: 1000, velocity: 80 }, // F4 (outside tolerance)
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords).toHaveLength(2);
      expect(chords[0].notes).toHaveLength(3); // C4, E4, G4 grouped together
      expect(chords[1].notes).toHaveLength(1); // F4 alone
    });

    it("should sort chord notes by pitch in chord ID", () => {
      const notes: Note[] = [
        { pitch: 67, startTime: 0, duration: 1000, velocity: 80 }, // G4
        { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
        { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords[0].id).toBe("C4+E4+G4"); // Should be sorted by pitch
    });

    it("should calculate chord duration as longest note duration", () => {
      const notes: Note[] = [
        { pitch: 60, startTime: 0, duration: 500, velocity: 80 }, // C4
        { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4 (longer)
        { pitch: 67, startTime: 0, duration: 750, velocity: 80 }, // G4
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords[0].duration).toBe(1000); // Longest duration
    });

    it("should handle single notes as chords", () => {
      const notes: Note[] = [
        { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
        { pitch: 65, startTime: 1000, duration: 1000, velocity: 80 }, // F4
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords).toHaveLength(2);
      expect(chords[0].notes).toHaveLength(1);
      expect(chords[1].notes).toHaveLength(1);
      expect(chords[0].id).toBe("C4");
      expect(chords[1].id).toBe("F4");
    });

    it("should handle empty note array", () => {
      const chords = midiParser["groupNotesIntoChords"]([], 120);
      expect(chords).toHaveLength(0);
    });
  });

  describe("Polyphonic Sequence Extraction", () => {
    it("should extract polyphonic sequences from parsed MIDI", () => {
      const mockMIDI: ParsedMIDI = {
        tracks: [
          {
            name: "Test Track",
            channel: 0,
            notes: [
              { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
              { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4 (simultaneous)
              { pitch: 67, startTime: 0, duration: 1000, velocity: 80 }, // G4 (simultaneous)
              { pitch: 65, startTime: 1000, duration: 1000, velocity: 80 }, // F4
              { pitch: 69, startTime: 1000, duration: 1000, velocity: 80 }, // A4 (simultaneous)
            ],
            isDrumTrack: false,
          },
        ],
        duration: 2000,
        timeSignature: "4/4",
        keySignature: "C major",
        tempo: 120,
      };

      const sequences = midiParser.extractPolyphonicSequences(mockMIDI);
      
      expect(sequences).toHaveLength(1);
      expect(sequences[0].chords).toHaveLength(2);
      expect(sequences[0].chords[0].id).toBe("C4+E4+G4");
      expect(sequences[0].chords[1].id).toBe("A4+F4");
      expect(sequences[0].duration).toBe(2000);
      expect(sequences[0].key).toBe("C major");
      expect(sequences[0].timeSignature).toBe("4/4");
    });

    it("should skip drum tracks", () => {
      const mockMIDI: ParsedMIDI = {
        tracks: [
          {
            name: "Drum Track",
            channel: 9, // Drum channel
            notes: [
              { pitch: 36, startTime: 0, duration: 1000, velocity: 80 }, // Kick
              { pitch: 38, startTime: 0, duration: 1000, velocity: 80 }, // Snare
            ],
            isDrumTrack: true,
          },
          {
            name: "Melody Track",
            channel: 0,
            notes: [
              { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
              { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4
            ],
            isDrumTrack: false,
          },
        ],
        duration: 1000,
        timeSignature: "4/4",
        keySignature: "C major",
        tempo: 120,
      };

      const sequences = midiParser.extractPolyphonicSequences(mockMIDI);
      
      expect(sequences).toHaveLength(1); // Only melody track
      expect(sequences[0].chords).toHaveLength(1);
      expect(sequences[0].chords[0].id).toBe("C4+E4");
    });

    it("should handle empty tracks", () => {
      const mockMIDI: ParsedMIDI = {
        tracks: [
          {
            name: "Empty Track",
            channel: 0,
            notes: [],
            isDrumTrack: false,
          },
        ],
        duration: 0,
        timeSignature: "4/4",
        keySignature: "C major",
        tempo: 120,
      };

      const sequences = midiParser.extractPolyphonicSequences(mockMIDI);
      
      expect(sequences).toHaveLength(0);
    });
  });

  describe("Chord Sequence Extraction", () => {
    it("should extract chord sequences for Markov training", () => {
      const mockMIDI: ParsedMIDI = {
        tracks: [
          {
            name: "Test Track",
            channel: 0,
            notes: [
              { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
              { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4
              { pitch: 67, startTime: 0, duration: 1000, velocity: 80 }, // G4
              { pitch: 65, startTime: 1000, duration: 1000, velocity: 80 }, // F4
              { pitch: 69, startTime: 1000, duration: 1000, velocity: 80 }, // A4
            ],
            isDrumTrack: false,
          },
        ],
        duration: 2000,
        timeSignature: "4/4",
        keySignature: "C major",
        tempo: 120,
      };

      const chordSequences = midiParser.extractChordSequences(mockMIDI);
      
      expect(chordSequences).toHaveLength(1);
      expect(chordSequences[0]).toEqual(["C4+E4+G4", "A4+F4"]);
    });

    it("should handle multiple tracks", () => {
      const mockMIDI: ParsedMIDI = {
        tracks: [
          {
            name: "Track 1",
            channel: 0,
            notes: [
              { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
              { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4
            ],
            isDrumTrack: false,
          },
          {
            name: "Track 2",
            channel: 1,
            notes: [
              { pitch: 65, startTime: 0, duration: 1000, velocity: 80 }, // F4
              { pitch: 69, startTime: 0, duration: 1000, velocity: 80 }, // A4
            ],
            isDrumTrack: false,
          },
        ],
        duration: 1000,
        timeSignature: "4/4",
        keySignature: "C major",
        tempo: 120,
      };

      const chordSequences = midiParser.extractChordSequences(mockMIDI);
      
      expect(chordSequences).toHaveLength(2);
      expect(chordSequences[0]).toEqual(["C4+E4"]);
      expect(chordSequences[1]).toEqual(["A4+F4"]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle notes with very close but different start times", () => {
      const notes: Note[] = [
        { pitch: 60, startTime: 0, duration: 1000, velocity: 80 }, // C4
        { pitch: 64, startTime: 49, duration: 1000, velocity: 80 }, // E4 (within 50ms tolerance)
        { pitch: 67, startTime: 51, duration: 1000, velocity: 80 }, // G4 (outside 50ms tolerance)
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords).toHaveLength(2);
      expect(chords[0].notes).toHaveLength(2); // C4, E4 grouped together
      expect(chords[1].notes).toHaveLength(1); // G4 alone
    });

    it("should handle notes with zero duration", () => {
      const notes: Note[] = [
        { pitch: 60, startTime: 0, duration: 0, velocity: 80 }, // C4
        { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords).toHaveLength(1);
      expect(chords[0].notes).toHaveLength(2);
      expect(chords[0].duration).toBe(1000); // Should use the non-zero duration
    });

    it("should handle negative start times", () => {
      const notes: Note[] = [
        { pitch: 60, startTime: -100, duration: 1000, velocity: 80 }, // C4
        { pitch: 64, startTime: -100, duration: 1000, velocity: 80 }, // E4
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords).toHaveLength(1);
      expect(chords[0].notes).toHaveLength(2);
      expect(chords[0].startTime).toBe(-100);
    });
  });
});

