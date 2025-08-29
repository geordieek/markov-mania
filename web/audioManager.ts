import * as Tone from "tone";

export interface NoteEvent {
  note: string;
  startTime: number;
  duration: number;
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

  async playSequence(notes: string[], tempo: number = 120): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Stop any currently playing sequence
    this.stop();

    this.currentTempo = tempo;
    const beatDuration = 60 / tempo; // seconds per beat

    // Set the transport tempo
    Tone.getTransport().bpm.value = tempo;

    // Schedule each note using the transport
    notes.forEach((note, index) => {
      const noteTime = index * beatDuration;
      Tone.getTransport().schedule((time) => {
        if (this.synth) {
          this.synth.triggerAttackRelease(note, beatDuration * 0.8, time);
        }
      }, noteTime);
    });

    this.isPlaying = true;

    // Start the transport
    Tone.getTransport().start();

    // Stop the transport after sequence completes
    const totalDuration = notes.length * beatDuration;
    Tone.getTransport().schedule(() => {
      Tone.getTransport().stop();
      this.isPlaying = false;
    }, totalDuration);
  }

  async playTrainingSequences(sequences: string[][], tempo: number = 120): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Stop any currently playing sequence
    this.stop();

    this.currentTempo = tempo;
    const beatDuration = 60 / tempo;
    const sequenceDelay = 1; // 1 second between sequences

    // Set the transport tempo
    Tone.getTransport().bpm.value = tempo;

    // Create a sequence that plays all sequences with delays
    let currentTime = 0;

    sequences.forEach((sequence, seqIndex) => {
      // Add delay between sequences (except the first one)
      if (seqIndex > 0) {
        currentTime += sequenceDelay;
      }

      // Schedule each note in the sequence
      sequence.forEach((note, noteIndex) => {
        const noteTime = currentTime + noteIndex * beatDuration;
        Tone.getTransport().schedule((time) => {
          if (this.synth) {
            this.synth.triggerAttackRelease(note, beatDuration * 0.8, time);
          }
        }, noteTime);
      });

      // Move to next sequence
      currentTime += sequence.length * beatDuration;
    });

    this.isPlaying = true;

    // Start the transport
    Tone.getTransport().start();

    // Stop the transport after all sequences complete
    Tone.getTransport().schedule(() => {
      Tone.getTransport().stop();
      this.isPlaying = false;
    }, currentTime);
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

  // Method to change tempo
  setTempo(tempo: number): void {
    Tone.getTransport().bpm.value = tempo;
  }

  // Cleanup method
  dispose(): void {
    this.stop();
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
  }

  // Get current tempo
  getCurrentTempo(): number {
    return this.currentTempo;
  }
}
