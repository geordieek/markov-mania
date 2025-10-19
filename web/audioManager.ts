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
  private piano: Tone.Sampler | null = null;
  private isInitialized = false;
  private isPlaying = false;
  private currentTempo = 120;
  private currentInstrument: "synth" | "piano" = "piano";
  private pianoLoaded = false;

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

    // Connect synth to effects
    this.synth.chain(reverb);
  }

  private async createPiano(): Promise<void> {
    if (this.piano) return;

    // Create a piano sampler using Tone.js built-in Sampler
    // Using the same approach as Tone.js official examples
    this.piano = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3",
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      onload: () => {
        console.log("Piano samples loaded successfully");
        this.pianoLoaded = true;
      },
      onerror: (error) => {
        console.error("Error loading piano samples:", error);
        this.pianoLoaded = false;
      },
    });

    // Add reverb to piano for a more realistic sound
    const reverb = new Tone.Reverb({ decay: 2.0, wet: 0.3 }).toDestination();
    this.piano.chain(reverb);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create both instruments
      await this.createPiano();
      await this.createSynth();

      // Start the audio context (required for user interaction)
      await Tone.start();
      this.isInitialized = true;
      console.log("Audio context started successfully");

      // Wait for piano samples to load if piano is selected
      if (this.currentInstrument === "piano") {
        await this.waitForPianoLoad();
      }
    } catch (error) {
      console.error("Failed to start audio context:", error);
      throw error;
    }
  }

  async playSequence(
    notes: string[],
    tempo: number = 120,
    rhythms?: string[],
    onNoteStart?: (index: number) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if piano is selected but not loaded yet
    if (this.currentInstrument === "piano" && !this.pianoLoaded) {
      console.warn("Piano samples not loaded yet, falling back to synth");
      this.currentInstrument = "synth";
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
          // Notify that this note is starting
          if (onNoteStart) {
            onNoteStart(index);
          }

          // Check if this is a chord (contains +) or single note
          if (note.includes("+")) {
            // Parse chord and play all notes simultaneously
            const chordNotes = note.split("+");
            chordNotes.forEach((chordNote) => {
              if (this.currentInstrument === "piano" && this.piano) {
                this.piano.triggerAttackRelease(chordNote.trim(), noteDuration * 0.8, time);
              } else if (this.currentInstrument === "synth" && this.synth) {
                this.synth.triggerAttackRelease(chordNote.trim(), noteDuration * 0.8, time);
              }
            });
          } else {
            // Single note
            if (this.currentInstrument === "piano" && this.piano) {
              this.piano.triggerAttackRelease(note, noteDuration * 0.8, time);
            } else if (this.currentInstrument === "synth" && this.synth) {
              this.synth.triggerAttackRelease(note, noteDuration * 0.8, time);
            }
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
          // Notify that this note is starting
          if (onNoteStart) {
            onNoteStart(index);
          }

          // Check if this is a chord (contains +) or single note
          if (note.includes("+")) {
            // Parse chord and play all notes simultaneously
            const chordNotes = note.split("+");
            chordNotes.forEach((chordNote) => {
              if (this.currentInstrument === "piano" && this.piano) {
                this.piano.triggerAttackRelease(chordNote.trim(), beatDuration * 0.8, time);
              } else if (this.currentInstrument === "synth" && this.synth) {
                this.synth.triggerAttackRelease(chordNote.trim(), beatDuration * 0.8, time);
              }
            });
          } else {
            // Single note
            if (this.currentInstrument === "piano" && this.piano) {
              this.piano.triggerAttackRelease(note, beatDuration * 0.8, time);
            } else if (this.currentInstrument === "synth" && this.synth) {
              this.synth.triggerAttackRelease(note, beatDuration * 0.8, time);
            }
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
        return beatDuration / 8;
      case "64":
        return beatDuration / 16;
      case "128":
        return beatDuration / 32;
      case "256":
        return beatDuration / 64;
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

  // Switch between instruments
  setInstrument(instrument: "piano" | "synth"): void {
    this.currentInstrument = instrument;
    console.log(`Switched to ${instrument} instrument`);
  }

  // Get current instrument
  getCurrentInstrument(): "piano" | "synth" {
    return this.currentInstrument;
  }

  // Check if piano samples are loaded
  isPianoReady(): boolean {
    return this.piano !== null && this.pianoLoaded;
  }

  // Wait for piano samples to load
  async waitForPianoLoad(): Promise<void> {
    if (this.pianoLoaded) return;

    return new Promise((resolve, reject) => {
      const checkLoaded = () => {
        if (this.pianoLoaded) {
          resolve();
        } else if (this.piano === null) {
          reject(new Error("Piano not initialized"));
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
  }
}
