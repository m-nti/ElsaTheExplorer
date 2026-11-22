/**
 * Audio store — typed control surface for the sound layer. WebAudio synthesis
 * arrives with the sound pass; this store owns only mute state and the single
 * port through which cues are dispatched. No component may construct an
 * `AudioContext`.
 */

export const AUDIO_CUES = ["tick", "rustle", "rip", "settle", "chime", "glint"] as const;

export type AudioCue = (typeof AUDIO_CUES)[number];

export interface AudioPort {
  /** Fire-and-forget. Must never queue behind a visual beat (motion-sheet §7). */
  play(cue: AudioCue): void;
}

export class AudioStore {
  /**
   * Browsers require a gesture before audio; the archive starts silent until
   * the reader opts in. This is not a preference default — it is the policy.
   */
  #muted = $state(true);
  #port: AudioPort | null = null;

  get muted(): boolean {
    return this.#muted;
  }

  get ready(): boolean {
    return this.#port !== null;
  }

  attach(port: AudioPort): void {
    this.#port = port;
  }

  detach(): void {
    this.#port = null;
  }

  setMuted(muted: boolean): void {
    this.#muted = muted;
  }

  toggle(): boolean {
    this.#muted = !this.#muted;
    return this.#muted;
  }

  /** Returns whether a cue was actually dispatched. */
  play(cue: AudioCue): boolean {
    if (this.#muted || this.#port === null) return false;
    this.#port.play(cue);
    return true;
  }
}

export const audio = new AudioStore();
