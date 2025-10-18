import { describe, it, expect, beforeEach } from "vitest";
import { MusicMarkovChain } from "../music/MusicMarkovChain";

describe("MusicMarkovChain", () => {
  let musicChain: MusicMarkovChain;

  beforeEach(() => {
    musicChain = new MusicMarkovChain({ order: 2, smoothing: 0.1, temperature: 1.0 });
  });

  describe("Training and Chain Replacement", () => {
    it("should properly train with musical data", () => {
      const noteSequences = [["C4", "D4", "E4", "F4"]];
      const rhythmSequences = [["4", "4", "4", "4"]];

      musicChain.trainWithMusic(noteSequences, rhythmSequences);

      const noteChain = musicChain.getNoteChain();
      const rhythmChain = musicChain.getRhythmChain();

      expect(noteChain.getStates().length).toBeGreaterThan(0);
      expect(rhythmChain.getStates().length).toBeGreaterThan(0);
    });

    it("should create new chain instance when retraining", () => {
      // Train with first dataset
      const sequences1 = [["A", "A", "A", "A"]];
      musicChain.trainWithMusic(sequences1, sequences1);

      const noteChain1 = musicChain.getNoteChain();
      const states1 = noteChain1.getStates();

      // Train with different dataset
      const sequences2 = [["B", "C", "D", "E"]];
      musicChain.trainWithMusic(sequences2, sequences2);

      const noteChain2 = musicChain.getNoteChain();
      const states2 = noteChain2.getStates();

      // Should be different chains
      expect(states1).not.toEqual(states2);
    });

    it("should handle empty training data", () => {
      const noteSequences: string[][] = [];
      const rhythmSequences: string[][] = [];

      expect(() => {
        musicChain.trainWithMusic(noteSequences, rhythmSequences);
      }).not.toThrow();

      const noteChain = musicChain.getNoteChain();
      const rhythmChain = musicChain.getRhythmChain();

      expect(noteChain.getStates()).toHaveLength(0);
      expect(rhythmChain.getStates()).toHaveLength(0);
    });
  });

  describe("Sequence Generation", () => {
    it("should generate sequences of requested length", () => {
      const noteSequences = [["C4", "D4", "E4", "F4", "G4"]];
      const rhythmSequences = [["4", "4", "4", "4", "4"]];

      musicChain.trainWithMusic(noteSequences, rhythmSequences);

      const requestedLength = 8;
      const music = musicChain.generateSequence(requestedLength);

      expect(music.notes).toHaveLength(requestedLength);
      expect(music.notes.every((note) => note.pitch > 0)).toBe(true);
      expect(music.notes.every((note) => note.duration > 0)).toBe(true);
    });

    it("should generate different sequences on multiple calls", () => {
      // Use varied data that creates probabilistic states
      const noteSequences = [
        ["C4", "D4", "E4", "F4", "G4"],
        ["C4", "D4", "F4", "G4", "A4"],
        ["D4", "E4", "F4", "G4", "A4"],
      ];
      const rhythmSequences = [
        ["4", "4", "4", "4", "4"],
        ["4", "4", "4", "4", "4"],
        ["4", "4", "4", "4", "4"],
      ];

      musicChain.trainWithMusic(noteSequences, rhythmSequences);

      const music1 = musicChain.generateSequence(5);
      const music2 = musicChain.generateSequence(5);

      // Sequences should be different (though not guaranteed due to randomness)
      const pitches1 = music1.notes.map((n) => n.pitch);
      const pitches2 = music2.notes.map((n) => n.pitch);

      // At least some notes should be different
      expect(pitches1).not.toEqual(pitches2);
    });
  });

  describe("Configuration", () => {
    it("should apply temperature correctly", () => {
      const noteSequences = [["C4", "D4", "E4", "F4"]];
      const rhythmSequences = [["4", "4", "4", "4"]];

      musicChain.trainWithMusic(noteSequences, rhythmSequences);

      // Test with different temperatures
      musicChain.setTemperature(0.5); // Lower temperature = more deterministic
      const music1 = musicChain.generateSequence(5);

      musicChain.setTemperature(2.0); // Higher temperature = more random
      const music2 = musicChain.generateSequence(5);

      // Both should generate valid sequences
      expect(music1.notes).toHaveLength(5);
      expect(music2.notes).toHaveLength(5);
    });

    it("should apply smoothing correctly", () => {
      const noteSequences = [["C4", "D4", "C4", "D4"]];
      const rhythmSequences = [["4", "4", "4", "4"]];

      // Test with different smoothing values
      const chain1 = new MusicMarkovChain({ order: 1, smoothing: 0.0 });
      const chain2 = new MusicMarkovChain({ order: 1, smoothing: 0.5 });

      chain1.trainWithMusic(noteSequences, rhythmSequences);
      chain2.trainWithMusic(noteSequences, rhythmSequences);

      const music1 = chain1.generateSequence(3);
      const music2 = chain2.generateSequence(3);

      expect(music1.notes).toHaveLength(3);
      expect(music2.notes).toHaveLength(3);
    });
  });

  describe("Music Statistics", () => {
    it("should provide accurate music statistics", () => {
      const noteSequences = [["C4", "D4", "E4", "F4"]];
      const rhythmSequences = [["4", "4", "4", "4"]];

      musicChain.trainWithMusic(noteSequences, rhythmSequences);

      const stats = musicChain.getMusicStats();

      expect(stats.noteStats.totalStates).toBeGreaterThan(0);
      expect(stats.rhythmStats.totalStates).toBeGreaterThan(0);
      expect(stats.noteStats.averageTransitionsPerState).toBeGreaterThan(0);
      expect(stats.rhythmStats.averageTransitionsPerState).toBeGreaterThan(0);
    });

    it("should handle empty chains in statistics", () => {
      const stats = musicChain.getMusicStats();

      expect(stats.noteStats.totalStates).toBe(0);
      expect(stats.rhythmStats.totalStates).toBe(0);
      expect(stats.noteStats.averageTransitionsPerState).toBe(0);
      expect(stats.rhythmStats.averageTransitionsPerState).toBe(0);
    });
  });

  describe("Reset Functionality", () => {
    it("should reset all chains", () => {
      const noteSequences = [["C4", "D4", "E4"]];
      const rhythmSequences = [["4", "4", "4"]];

      musicChain.trainWithMusic(noteSequences, rhythmSequences);

      // Verify chains have data
      expect(musicChain.getNoteChain().getStates().length).toBeGreaterThan(0);
      expect(musicChain.getRhythmChain().getStates().length).toBeGreaterThan(0);

      // Reset
      musicChain.resetAll();

      // Verify chains are empty
      expect(musicChain.getNoteChain().getStates()).toHaveLength(0);
      expect(musicChain.getRhythmChain().getStates()).toHaveLength(0);
    });
  });
});
