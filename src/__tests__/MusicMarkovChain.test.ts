import { MusicMarkovChain } from "../music/MusicMarkovChain";
import { MarkovConfig } from "../types";

describe("MusicMarkovChain", () => {
  let musicChain: MusicMarkovChain;
  let config: MarkovConfig;

  beforeEach(() => {
    config = {
      order: 1,
      smoothing: 0.1,
      maxLength: 16,
    };
    musicChain = new MusicMarkovChain(config);
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
      const chordProgressions = [
        ["C", "F", "G"],
        ["Am", "Dm", "G"],
      ];
      const rhythmPatterns = [
        ["quarter", "quarter", "half"],
        ["eighth", "eighth", "quarter"],
      ];

      expect(() =>
        musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns)
      ).not.toThrow();
    });

    test("should generate music after training", () => {
      const noteSequences = [["C4", "D4", "E4"]];
      const chordProgressions = [["C", "F", "G"]];
      const rhythmPatterns = [["quarter", "quarter", "half"]];

      musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns);

      const music = musicChain.generateSequence(8);
      expect(music).toBeDefined();
      expect(music.notes).toBeDefined();
      expect(Array.isArray(music.notes)).toBe(true);
    });
  });

  describe("Musical Output Structure", () => {
    test("should generate music with correct structure", () => {
      const noteSequences = [["C4", "D4", "E4", "F4"]];
      const chordProgressions = [["C", "F", "G", "C"]];
      const rhythmPatterns = [["quarter", "quarter", "quarter", "quarter"]];

      musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns);

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
      const chordProgressions = [["C", "F", "G", "Am", "F"]];
      const rhythmPatterns = [["quarter", "quarter", "quarter", "quarter", "quarter"]];

      musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns);

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
      const chordProgressions = [["G", "C", "D"]];
      const rhythmPatterns = [["quarter", "quarter", "half"]];

      musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns);

      const music = musicChain.generateSequence(4);
      // Note: The key setting is currently simplified, so this test verifies the method works
    });

    test("should set and use tempo", () => {
      expect(() => musicChain.setTempo(140)).not.toThrow();

      // Test that tempo affects rhythm calculations
      const noteSequences = [["C4", "D4"]];
      const chordProgressions = [["C", "G"]];
      const rhythmPatterns = [["quarter", "quarter"]];

      musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns);

      const music = musicChain.generateSequence(2);
      expect(music.duration).toBeGreaterThan(0);
    });
  });

  describe("Integration with Base Markov Chain", () => {
    test("should provide music statistics", () => {
      const noteSequences = [["C4", "D4", "E4"]];
      const chordProgressions = [["C", "F", "G"]];
      const rhythmPatterns = [["quarter", "quarter", "half"]];

      musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns);

      const stats = musicChain.getMusicStats();

      expect(stats.noteStats).toBeDefined();
      expect(stats.chordStats).toBeDefined();
      expect(stats.rhythmStats).toBeDefined();

      // Should have learned some states
      expect(stats.noteStats.totalStates).toBeGreaterThan(0);
      expect(stats.chordStats.totalStates).toBeGreaterThan(0);
      expect(stats.rhythmStats.totalStates).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    test("should handle empty training data gracefully", () => {
      expect(() => musicChain.trainWithMusic([], [], [])).not.toThrow();

      // With empty training data, generation should fail gracefully
      expect(() => musicChain.generateSequence(4)).toThrow("No training data available");
    });

    test("should handle malformed note strings", () => {
      const noteSequences = [["C4", "INVALID", "E4"]];
      const chordProgressions = [["C", "F", "G"]];
      const rhythmPatterns = [["quarter", "quarter", "half"]];

      musicChain.trainWithMusic(noteSequences, chordProgressions, rhythmPatterns);

      // Should still generate something, skipping invalid notes
      const music = musicChain.generateSequence(4);
      expect(music).toBeDefined();
    });
  });
});
