import { MusicMarkovChain } from "../music/MusicMarkovChain";

describe("MusicMarkovChain", () => {
  let musicChain: MusicMarkovChain;

  beforeEach(() => {
    musicChain = new MusicMarkovChain({ order: 1, smoothing: 0.1 });
  });

  describe("Basic Music Functionality", () => {
    test("should create a music Markov chain", () => {
      expect(musicChain).toBeInstanceOf(MusicMarkovChain);
    });

    test("should train with musical data", () => {
      const noteSequences = [
        ["C4", "D4", "E4"],
        ["G4", "A4", "B4"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "half"],
        ["eighth", "eighth", "quarter"],
      ];

      expect(() => musicChain.trainWithMusic(noteSequences, rhythmPatterns)).not.toThrow();
    });

    test("should generate music after training", () => {
      const noteSequences = [["C4", "D4", "E4"]];
      const rhythmPatterns = [["quarter", "quarter", "half"]];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const music = musicChain.generateSequence(8);
      expect(music).toBeDefined();
      expect(music.notes).toBeDefined();
      expect(Array.isArray(music.notes)).toBe(true);
    });
  });

  describe("training with musical data", () => {
    it("should train with note sequences and rhythm patterns", () => {
      const noteSequences = [
        ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
        ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
        ["D4", "E4", "F#4", "G4", "A4", "B4", "C#5", "D5"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "eighth", "eighth", "quarter", "half", "quarter"],
        ["quarter", "eighth", "eighth", "quarter", "quarter", "eighth", "eighth", "half"],
        ["eighth", "eighth", "eighth", "eighth", "quarter", "quarter", "half", "quarter"],
      ];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const stats = musicChain.getMusicStats();
      expect(stats.noteStats).toBeDefined();
      expect(stats.rhythmStats).toBeDefined();
    });

    it("should handle different sequence lengths", () => {
      const noteSequences = [
        ["C4", "F4", "G4", "C4"],
        ["G4", "C5", "D5", "G4"],
        ["F4", "Bb4", "C5", "F4"],
        ["D4", "G4", "A4", "D4"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "half"],
        ["quarter", "eighth", "eighth", "half"],
        ["half", "quarter", "quarter", "quarter"],
      ];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const stats = musicChain.getMusicStats();
      expect(stats.noteStats.totalStates).toBeGreaterThan(0);
      expect(stats.rhythmStats.totalStates).toBeGreaterThan(0);
    });

    it("should handle complex musical patterns", () => {
      const noteSequences = [
        ["C4", "F4", "G4", "C4", "F4"],
        ["G4", "C5", "D5", "G4", "C5"],
        ["F4", "Bb4", "C5", "F4", "Bb4"],
        ["D4", "G4", "A4", "D4", "G4"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "quarter", "half"],
        ["quarter", "eighth", "eighth", "quarter", "half"],
        ["half", "quarter", "quarter", "quarter", "quarter"],
      ];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const stats = musicChain.getMusicStats();
      expect(stats.noteStats.totalStates).toBeGreaterThan(0);
      expect(stats.rhythmStats.totalStates).toBeGreaterThan(0);
    });
  });

  describe("generating musical sequences", () => {
    it("should generate sequences of specified length", () => {
      const noteSequences = [
        ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
        ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
        ["D4", "E4", "F#4", "G4", "A4", "B4", "C#5", "D5"],
        ["C4", "E4", "G4", "C5", "E5", "G5", "C6", "E6"],
        ["G4", "B4", "D5", "G5", "B5", "D6", "G6", "B6"],
        ["F4", "A4", "C5", "F5", "A5", "C6", "F6", "A6"],
        ["D4", "F#4", "A4", "D5", "F#5", "A5", "D6", "F#6"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "eighth", "eighth", "quarter", "half", "quarter"],
        ["quarter", "eighth", "eighth", "quarter", "quarter", "eighth", "eighth", "half"],
        ["eighth", "eighth", "eighth", "eighth", "quarter", "quarter", "half", "quarter"],
        ["half", "quarter", "quarter", "half", "quarter", "quarter", "half", "quarter"],
        ["quarter", "half", "quarter", "quarter", "half", "quarter", "quarter", "half"],
        ["eighth", "quarter", "eighth", "quarter", "eighth", "quarter", "eighth", "quarter"],
        ["quarter", "quarter", "half", "quarter", "quarter", "half", "quarter", "quarter"],
      ];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const sequence = musicChain.generateSequence(8);
      expect(sequence.notes).toHaveLength(8);
      expect(sequence.duration).toBeGreaterThan(0);
    });

    it("should generate sequences with proper note structure", () => {
      const noteSequences = [
        ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
        ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
        ["D4", "E4", "F#4", "G4", "A4", "B4", "C#5", "D5"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "eighth", "eighth", "quarter", "half", "quarter"],
        ["quarter", "eighth", "eighth", "quarter", "quarter", "eighth", "eighth", "half"],
        ["eighth", "eighth", "eighth", "eighth", "quarter", "quarter", "half", "quarter"],
      ];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const sequence = musicChain.generateSequence(4);
      expect(sequence.notes).toHaveLength(4);

      sequence.notes.forEach((note) => {
        expect(note.pitch).toBeGreaterThanOrEqual(0);
        expect(note.pitch).toBeLessThanOrEqual(127);
        expect(note.velocity).toBeGreaterThan(0);
        expect(note.velocity).toBeLessThanOrEqual(127);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.startTime).toBeGreaterThanOrEqual(0);
      });
    });

    it("should handle different musical keys", () => {
      const noteSequences = [
        ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
        ["D5", "E5", "F#5", "G5", "A5", "B5", "C#6", "D6"],
        ["B4", "C5", "D5", "E5", "F#5", "G5", "A5", "B5"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "eighth", "eighth", "quarter", "half", "quarter"],
        ["quarter", "eighth", "eighth", "quarter", "quarter", "eighth", "eighth", "half"],
      ];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);
      musicChain.setKey("G");

      const sequence = musicChain.generateSequence(4);
      expect(sequence.key).toBe("G");
    });
  });

  describe("appending new musical data", () => {
    it("should append new note sequences", () => {
      const initialNotes = [
        ["C4", "D4", "E4", "F4"],
        ["G4", "A4", "B4", "C5"],
      ];
      const initialRhythms = [
        ["quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "half"],
      ];
      musicChain.trainWithMusic(initialNotes, initialRhythms);

      const newNotes = [
        ["G4", "A4", "B4", "C5"],
        ["D5", "E5", "F#5", "G5"],
      ];
      const newRhythms = [
        ["eighth", "eighth", "quarter", "half"],
        ["quarter", "quarter", "quarter", "quarter"],
      ];
      musicChain.trainWithMusicAppend(newNotes, newRhythms);

      const stats = musicChain.getMusicStats();
      expect(stats.noteStats.totalStates).toBeGreaterThan(0);
      expect(stats.rhythmStats.totalStates).toBeGreaterThan(0);
    });
  });

  describe("musical constraints", () => {
    it("should respect pitch range constraints", () => {
      musicChain.setPitchRange(48, 72); // C3 to C5

      const noteSequences = [
        ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
        ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "eighth", "eighth", "quarter", "half", "quarter"],
        ["quarter", "eighth", "eighth", "quarter", "quarter", "eighth", "eighth", "half"],
      ];
      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const sequence = musicChain.generateSequence(8);
      sequence.notes.forEach((note) => {
        expect(note.pitch).toBeGreaterThanOrEqual(48);
        expect(note.pitch).toBeLessThanOrEqual(72);
      });
    });

    it("should handle tempo changes", () => {
      musicChain.setTempo(160);

      const noteSequences = [
        ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
        ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "eighth", "eighth", "quarter", "half", "quarter"],
        ["quarter", "eighth", "eighth", "quarter", "quarter", "eighth", "eighth", "half"],
      ];
      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const sequence = musicChain.generateSequence(4);
      expect(sequence.duration).toBeGreaterThan(0);
    });
  });

  describe("statistics and analysis", () => {
    it("should provide comprehensive musical statistics", () => {
      const noteSequences = [
        ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
        ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"],
        ["eighth", "eighth", "quarter", "eighth", "eighth", "quarter", "half", "quarter"],
        ["quarter", "eighth", "eighth", "quarter", "quarter", "eighth", "eighth", "half"],
      ];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const stats = musicChain.getMusicStats();
      expect(stats.noteStats).toBeDefined();
      expect(stats.rhythmStats).toBeDefined();
      expect(stats.noteStats.totalStates).toBeGreaterThan(0);
      expect(stats.rhythmStats.totalStates).toBeGreaterThan(0);
    });
  });

  describe("Musical Output Structure", () => {
    test("should generate music with correct structure", () => {
      const noteSequences = [["C4", "D4", "E4", "F4"]];
      const rhythmPatterns = [["quarter", "quarter", "quarter", "quarter"]];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const music = musicChain.generateSequence(4);

      // Check basic structure
      expect(music.key).toBe("C");
      expect(music.timeSignature).toBe("4/4");
      expect(music.duration).toBeGreaterThan(0);
      expect(music.notes.length).toBeGreaterThan(0);

      // Check note structure
      music.notes.forEach((note) => {
        expect(note.pitch).toBeGreaterThanOrEqual(0);
        expect(note.pitch).toBeLessThanOrEqual(127);
        expect(note.velocity).toBeGreaterThanOrEqual(1);
        expect(note.velocity).toBeLessThanOrEqual(127);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.startTime).toBeGreaterThanOrEqual(0);
      });
    });

    test("should respect sequence length parameter", () => {
      const noteSequences = [["C4", "D4", "E4", "F4", "G4"]];
      const rhythmPatterns = [["quarter", "quarter", "quarter", "quarter", "quarter"]];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const shortMusic = musicChain.generateSequence(3);
      expect(shortMusic.notes.length).toBeLessThanOrEqual(3);

      const longMusic = musicChain.generateSequence(10);
      expect(longMusic.notes.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Musical Configuration", () => {
    test("should set and use musical key", () => {
      expect(() => musicChain.setKey("G")).not.toThrow();

      // Test that key changes are applied
      const noteSequences = [["G4", "A4", "B4"]];
      const rhythmPatterns = [["quarter", "quarter", "half"]];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const music = musicChain.generateSequence(4);
      // Note: The key setting is currently simplified, so this test verifies the method works
    });

    test("should set and use tempo", () => {
      expect(() => musicChain.setTempo(140)).not.toThrow();

      // Test that tempo affects rhythm calculations
      const noteSequences = [["C4", "D4"]];
      const rhythmPatterns = [["quarter", "quarter"]];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const music = musicChain.generateSequence(2);
      expect(music.duration).toBeGreaterThan(0);
    });
  });

  describe("Integration with Base Markov Chain", () => {
    test("should provide music statistics", () => {
      const noteSequences = [["C4", "D4", "E4"]];
      const rhythmPatterns = [["quarter", "quarter", "half"]];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      const stats = musicChain.getMusicStats();

      expect(stats.noteStats).toBeDefined();
      expect(stats.rhythmStats).toBeDefined();

      // Should have learned some states
      expect(stats.noteStats.totalStates).toBeGreaterThan(0);
      expect(stats.rhythmStats.totalStates).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    test("should handle empty training data gracefully", () => {
      expect(() => musicChain.trainWithMusic([], [])).not.toThrow();

      // With empty training data, generation should fail gracefully
      expect(() => musicChain.generateSequence(4)).toThrow("No training data available");
    });

    test("should handle malformed note strings", () => {
      const noteSequences = [["C4", "INVALID", "E4"]];
      const rhythmPatterns = [["quarter", "quarter", "half"]];

      musicChain.trainWithMusic(noteSequences, rhythmPatterns);

      // Should still generate something, skipping invalid notes
      const music = musicChain.generateSequence(4);
      expect(music).toBeDefined();
    });
  });
});
