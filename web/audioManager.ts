import * as Tone from "tone";

export interface NoteEvent {
  note: string;
  startTime: number;
  duration: number;
  velocity?: number;
}

export interface RhythmNoteEvent {
  note: string;
  rhythm: string; // "4", "8", "16", etc.
  velocity?: number;
}

export class AudioManager {
  private synth: Tone.Synth | null = null;
  private isInitialized = false;
  private isPlaying = false;
  private currentTempo = 120;

  constructor() {
    // Don't create audio objects until we actually need them
    // This prevents the AudioContext warning
  }

  private async createSynth(): Promise<void> {
    if (this.synth) return;

    // Create a synth with better sound
    this.synth = new Tone.Synth({
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: 0.2,
      },
    });

    // Add some effects for better sound
    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.2 }).toDestination();
    // const delay = new Tone.FeedbackDelay("8n", 0.5).toDestination();

    // Connect synth to effects
    this.synth.chain(reverb);

    // // Connect synth directly to output (no effects)
    // this.synth.toDestination();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create the synth first
      await this.createSynth();

      // Start the audio context (required for user interaction)
      await Tone.start();
      this.isInitialized = true;
      console.log("Audio context started successfully");
    } catch (error) {
      console.error("Failed to start audio context:", error);
      throw error;
    }
  }

  async playSequence(notes: string[], tempo: number = 120, rhythms?: string[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Stop any currently playing sequence
    this.stop();

    this.currentTempo = tempo;
    const beatDuration = 60 / tempo; // seconds per beat

    // Set the transport tempo
    Tone.getTransport().bpm.value = tempo;

    // If rhythms are provided, use rhythm-aware playback
    if (rhythms && rhythms.length > 0) {
      let currentTime = 0;

      // Schedule each note using its specific rhythm
      notes.forEach((note, index) => {
        const rhythm = rhythms[index] || rhythms[0] || "4";
        const noteDuration = this.parseRhythmToDuration(rhythm, beatDuration);

        Tone.getTransport().schedule((time) => {
          if (this.synth) {
            this.synth.triggerAttackRelease(note, noteDuration * 0.8, time);
          }
        }, currentTime);

        // Advance time by the actual rhythm duration
        currentTime += noteDuration;
      });

      this.isPlaying = true;
      Tone.getTransport().start();

      // Stop after sequence completes
      Tone.getTransport().schedule(() => {
        Tone.getTransport().stop();
        this.isPlaying = false;
      }, currentTime);
    } else {
      // Fallback to fixed timing (original behavior)
      notes.forEach((note, index) => {
        const noteTime = index * beatDuration;
        Tone.getTransport().schedule((time) => {
          if (this.synth) {
            this.synth.triggerAttackRelease(note, beatDuration * 0.8, time);
          }
        }, noteTime);
      });

      this.isPlaying = true;
      Tone.getTransport().start();

      const totalDuration = notes.length * beatDuration;
      Tone.getTransport().schedule(() => {
        Tone.getTransport().stop();
        this.isPlaying = false;
      }, totalDuration);
    }
  }

  /**
   * Play multiple training sequences with delays between them
   * This reuses the main playSequence method for each sequence
   */
  async playTrainingSequences(sequences: string[][], tempo: number = 120): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Stop any currently playing sequence
    this.stop();

    this.currentTempo = tempo;
    const sequenceDelay = 1; // 1 second between sequences

    // Play each sequence one by one with delays
    for (let i = 0; i < sequences.length; i++) {
      const sequence = sequences[i];

      // Add delay between sequences (except the first one)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, sequenceDelay * 1000));
      }

      // Parse rhythm information from training data if available
      const notes: string[] = [];
      const rhythms: string[] = [];

      sequence.forEach((token) => {
        if (token.includes(":")) {
          const [note, rhythm] = token.split(":");
          notes.push(note);
          rhythms.push(rhythm);
        } else {
          // Fallback: treat as quarter note if no rhythm specified
          notes.push(token);
          rhythms.push("4");
        }
      });

      // Play this sequence using the main method with rhythm information
      await this.playSequence(notes, tempo, rhythms);
    }
  }

  /**
   * Parse rhythm string to duration in seconds
   * This matches the rhythm parsing in MusicMarkovChain
   */
  private parseRhythmToDuration(rhythmStr: string, beatDuration: number): number {
    switch (rhythmStr) {
      case "1":
        return beatDuration * 4;
      case "2":
        return beatDuration * 2;
      case "4":
        return beatDuration;
      case "8":
        return beatDuration / 2;
      case "16":
        return beatDuration / 4;
      case "32":
        return beatDuration * 1.5;
      case "64":
        return beatDuration * 0.75;
      case "128":
        return beatDuration / 3;
      case "256":
        return beatDuration / 1.5;
      default:
        return beatDuration; // Default to quarter note
    }
  }

  stop(): void {
    // Stop the transport and clear all scheduled events
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.isPlaying = false;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // Utility method to get frequency for a note name
  getNoteFrequency(noteName: string): number {
    return Tone.Frequency(noteName).toFrequency();
  }

  // Method to change synth settings
  setSynthSettings(settings: {
    oscillatorType?: OscillatorType;
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
  }): void {
    if (!this.synth) return;

    if (settings.oscillatorType) {
      this.synth.oscillator.type = settings.oscillatorType;
    }

    if (settings.attack !== undefined) {
      this.synth.envelope.attack = settings.attack;
    }

    if (settings.decay !== undefined) {
      this.synth.envelope.decay = settings.decay;
    }

    if (settings.sustain !== undefined) {
      this.synth.envelope.sustain = settings.sustain;
    }

    if (settings.release !== undefined) {
      this.synth.envelope.release = settings.release;
    }
  }

  // TODO: Implement into Web UI
  // Method to change tempo
  setTempo(tempo: number): void {
    Tone.getTransport().bpm.value = tempo;
  }

  // Get current tempo
  getCurrentTempo(): number {
    return this.currentTempo;
  }
}
