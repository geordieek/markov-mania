import { describe, it, expect, beforeEach } from "vitest";
import { MusicMarkovChain } from "../music/MusicMarkovChain";
import { MIDIParser } from "../input/MIDIParser";
import { MIDIGenerator } from "../music/MIDIGenerator";
import { Note, Chord, PolyphonicSequence } from "../types";

describe("Polyphonic Functionality", () => {
  let musicChain: MusicMarkovChain;
  let midiParser: MIDIParser;
  let midiGenerator: MIDIGenerator;

  beforeEach(() => {
    musicChain = new MusicMarkovChain({
      order: 1,
      smoothing: 0.1,
      maxLength: 16,
    });
    midiParser = new MIDIParser();
    midiGenerator = new MIDIGenerator();
  });

  describe("Chord Parsing", () => {
    it("should parse chord identifiers correctly", () => {
      const chordId = "C4+E4+G4";
      const notes = musicChain["parseChordId"](chordId);
      
      expect(notes).toHaveLength(3);
      expect(notes[0].pitch).toBe(60); // C4
      expect(notes[1].pitch).toBe(64); // E4
      expect(notes[2].pitch).toBe(67); // G4
    });

    it("should handle single notes as chords", () => {
      const chordId = "C4";
      const notes = musicChain["parseChordId"](chordId);
      
      expect(notes).toHaveLength(1);
      expect(notes[0].pitch).toBe(60); // C4
    });

    it("should handle complex chord identifiers", () => {
      const chordId = "C4+E4+G4+B4";
      const notes = musicChain["parseChordId"](chordId);
      
      expect(notes).toHaveLength(4);
      expect(notes.map(n => n.pitch)).toEqual([60, 64, 67, 71]); // C4, E4, G4, B4
    });

    it("should handle sharp and flat notes", () => {
      const chordId = "F#4+Ab4";
      const notes = musicChain["parseChordId"](chordId);
      
      expect(notes).toHaveLength(2);
      expect(notes[0].pitch).toBe(66); // F#4
      expect(notes[1].pitch).toBe(68); // Ab4 (G#4)
    });
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

    it("should handle notes with time tolerance", () => {
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

    it("should calculate chord duration as longest note duration", () => {
      const notes: Note[] = [
        { pitch: 60, startTime: 0, duration: 500, velocity: 80 }, // C4
        { pitch: 64, startTime: 0, duration: 1000, velocity: 80 }, // E4 (longer)
        { pitch: 67, startTime: 0, duration: 750, velocity: 80 }, // G4
      ];

      const chords = midiParser["groupNotesIntoChords"](notes, 120);
      
      expect(chords[0].duration).toBe(1000); // Longest duration
    });
  });

  describe("Polyphonic Training", () => {
    it("should train with chord sequences", () => {
      const chordSequences = [
        ["C4+E4+G4", "F4+A4+C5", "G4+B4+D5", "C4+E4+G4"],
        ["D4+F#4+A4", "G4+B4+D5", "A4+C#5+E5", "D4+F#4+A4"],
      ];
      const rhythmPatterns = [
        ["4", "4", "4", "4"],
        ["2", "4", "4", "2"],
      ];

      expect(() => {
        musicChain.trainWithPolyphonicMusic(chordSequences, rhythmPatterns);
      }).not.toThrow();

      // Verify chord chain was trained
      const chordStats = musicChain.getChordChain().getStats();
      expect(chordStats.totalStates).toBeGreaterThan(0);
    });

    it("should generate polyphonic sequences", () => {
      const chordSequences = [
        ["C4+E4+G4", "F4+A4+C5", "G4+B4+D5", "C4+E4+G4"],
      ];
      const rhythmPatterns = [
        ["4", "4", "4", "4"],
      ];

      musicChain.trainWithPolyphonicMusic(chordSequences, rhythmPatterns);
      const sequence = musicChain.generatePolyphonicSequence(4);

      expect(sequence).toBeDefined();
      expect(sequence.chords).toBeDefined();
      expect(sequence.chords.length).toBeGreaterThan(0);
      expect(sequence.key).toBeDefined();
      expect(sequence.timeSignature).toBeDefined();
    });

    it("should generate chords with correct structure", () => {
      const chordSequences = [
        ["C4+E4+G4", "F4+A4+C5"],
      ];
      const rhythmPatterns = [
        ["4", "4"],
      ];

      musicChain.trainWithPolyphonicMusic(chordSequences, rhythmPatterns);
      const sequence = musicChain.generatePolyphonicSequence(2);

      expect(sequence.chords).toHaveLength(2);
      sequence.chords.forEach(chord => {
        expect(chord.notes).toBeDefined();
        expect(chord.notes.length).toBeGreaterThan(0);
        expect(chord.startTime).toBeGreaterThanOrEqual(0);
        expect(chord.duration).toBeGreaterThan(0);
        expect(chord.id).toBeDefined();
      });
    });
  });

  describe("MIDI Generation", () => {
    it("should convert polyphonic sequences to MIDI", () => {
      const polyphonicSequence: PolyphonicSequence = {
        chords: [
          {
            notes: [
              { pitch: 60, velocity: 80, duration: 1000, startTime: 0 },
              { pitch: 64, velocity: 80, duration: 1000, startTime: 0 },
              { pitch: 67, velocity: 80, duration: 1000, startTime: 0 },
            ],
            startTime: 0,
            duration: 1000,
            id: "C4+E4+G4",
          },
          {
            notes: [
              { pitch: 65, velocity: 80, duration: 1000, startTime: 1000 },
              { pitch: 69, velocity: 80, duration: 1000, startTime: 1000 },
              { pitch: 72, velocity: 80, duration: 1000, startTime: 1000 },
            ],
            startTime: 1000,
            duration: 1000,
            id: "A4+C5+F4",
          },
        ],
        duration: 2000,
        key: "C",
        timeSignature: "4/4",
      };

      const midiSequence = midiGenerator.generatePolyphonicMIDI(polyphonicSequence);

      expect(midiSequence.notes).toHaveLength(6); // 3 notes per chord × 2 chords
      expect(midiSequence.duration).toBeGreaterThan(0);
      expect(midiSequence.tempo).toBeDefined();
      expect(midiSequence.timeSignature).toBeDefined();
    });

    it("should preserve chord timing in MIDI output", () => {
      const polyphonicSequence: PolyphonicSequence = {
        chords: [
          {
            notes: [
              { pitch: 60, velocity: 80, duration: 1000, startTime: 0 },
              { pitch: 64, velocity: 80, duration: 1000, startTime: 0 },
            ],
            startTime: 0,
            duration: 1000,
            id: "C4+E4",
          },
        ],
        duration: 1000,
        key: "C",
        timeSignature: "4/4",
      };

      const midiSequence = midiGenerator.generatePolyphonicMIDI(polyphonicSequence);

      // Both notes should have the same start time
      const firstChordNotes = midiSequence.notes.filter(note => note.startTime === 0);
      expect(firstChordNotes).toHaveLength(2);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete polyphonic workflow", () => {
      // 1. Train with chord sequences
      const chordSequences = [
        ["C4+E4+G4", "F4+A4+C5", "G4+B4+D5", "C4+E4+G4"],
        ["D4+F#4+A4", "G4+B4+D5", "A4+C#5+E5", "D4+F#4+A4"],
      ];
      const rhythmPatterns = [
        ["4", "4", "4", "4"],
        ["4", "4", "4", "4"],
      ];

      musicChain.trainWithPolyphonicMusic(chordSequences, rhythmPatterns);

      // 2. Generate polyphonic sequence
      const sequence = musicChain.generatePolyphonicSequence(4);
      expect(sequence.chords).toHaveLength(4);

      // 3. Convert to MIDI
      const midiSequence = midiGenerator.generatePolyphonicMIDI(sequence);
      expect(midiSequence.notes.length).toBeGreaterThan(0);

      // 4. Verify all notes have valid properties
      midiSequence.notes.forEach(note => {
        expect(note.pitch).toBeGreaterThanOrEqual(0);
        expect(note.pitch).toBeLessThanOrEqual(127);
        expect(note.velocity).toBeGreaterThan(0);
        expect(note.velocity).toBeLessThanOrEqual(127);
        expect(note.startTime).toBeGreaterThanOrEqual(0);
        expect(note.duration).toBeGreaterThan(0);
      });
    });

    it("should maintain chord structure through generation", () => {
      const chordSequences = [
        ["C4+E4+G4", "F4+A4+C5"],
      ];
      const rhythmPatterns = [
        ["4", "4"],
      ];

      musicChain.trainWithPolyphonicMusic(chordSequences, rhythmPatterns);
      const sequence = musicChain.generatePolyphonicSequence(2);

      // Each chord should have multiple notes
      sequence.chords.forEach(chord => {
        expect(chord.notes.length).toBeGreaterThan(1);
      });

      // Convert to MIDI and verify chord structure is preserved
      const midiSequence = midiGenerator.generatePolyphonicMIDI(sequence);
      
      // Group notes by start time to verify chords
      const notesByTime = new Map<number, typeof midiSequence.notes>();
      for (const note of midiSequence.notes) {
        if (!notesByTime.has(note.startTime)) {
          notesByTime.set(note.startTime, []);
        }
        notesByTime.get(note.startTime)!.push(note);
      }

      // Each time slot should have multiple notes (chord)
      for (const [time, notes] of notesByTime) {
        expect(notes.length).toBeGreaterThan(1);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle empty chord sequences gracefully", () => {
      expect(() => {
        musicChain.trainWithPolyphonicMusic([], []);
      }).not.toThrow();

      // Should not throw when generating with no training data
      expect(() => {
        const sequence = musicChain.generatePolyphonicSequence(4);
        expect(sequence.chords).toHaveLength(0);
      }).toThrow("No training data available");
    });

    it("should handle invalid chord identifiers", () => {
      const chordSequences = [
        ["C4+E4+G4", "INVALID+CHORD", "F4+A4+C5"],
      ];
      const rhythmPatterns = [
        ["4", "4", "4"],
      ];

      expect(() => {
        musicChain.trainWithPolyphonicMusic(chordSequences, rhythmPatterns);
      }).not.toThrow();
    });

    it("should handle single note chords", () => {
      const chordSequences = [
        ["C4", "D4", "E4"],
      ];
      const rhythmPatterns = [
        ["4", "4", "4"],
      ];

      musicChain.trainWithPolyphonicMusic(chordSequences, rhythmPatterns);
      const sequence = musicChain.generatePolyphonicSequence(3);

      expect(sequence.chords).toHaveLength(3);
      sequence.chords.forEach(chord => {
        expect(chord.notes).toHaveLength(1);
      });
    });
  });
});
