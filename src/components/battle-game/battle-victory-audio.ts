import { isShowdownMuted } from './showdown-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface Tone {
  note: string;
  step: number;
  length: number;
  volume?: number;
}

type BasicWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

const STEP_SECONDS = 0.17;
const VICTORY_CUE_DURATION_MS = 3900;

const NOTE_OFFSETS: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

// An original victory phrase shaped around the short, bright call-and-response,
// active bass, and decisive cadence of early handheld monster-battle soundtracks.
const LEAD: Tone[] = [
  { note: 'G5', step: 0, length: 0.7 },
  { note: 'B5', step: 1, length: 0.7 },
  { note: 'D6', step: 2, length: 1.55 },
  { note: 'C6', step: 4, length: 0.7 },
  { note: 'E6', step: 5, length: 0.7 },
  { note: 'G6', step: 6, length: 1.55 },
  { note: 'A5', step: 8, length: 0.7 },
  { note: 'C6', step: 9, length: 0.7 },
  { note: 'E6', step: 10, length: 0.7 },
  { note: 'A6', step: 11, length: 1.45 },
  { note: 'G6', step: 13, length: 0.7 },
  { note: 'E6', step: 14, length: 0.7 },
  { note: 'D6', step: 15, length: 0.7 },
  { note: 'C6', step: 16, length: 0.7 },
  { note: 'E6', step: 17, length: 0.7 },
  { note: 'G6', step: 18, length: 0.7 },
  { note: 'C7', step: 19, length: 3.1, volume: 0.12 },
];

const HARMONY: Tone[] = [
  { note: 'E5', step: 0, length: 0.7 },
  { note: 'G5', step: 1, length: 0.7 },
  { note: 'B5', step: 2, length: 1.55 },
  { note: 'A5', step: 4, length: 0.7 },
  { note: 'C6', step: 5, length: 0.7 },
  { note: 'E6', step: 6, length: 1.55 },
  { note: 'F5', step: 8, length: 0.7 },
  { note: 'A5', step: 9, length: 0.7 },
  { note: 'C6', step: 10, length: 0.7 },
  { note: 'F6', step: 11, length: 1.45 },
  { note: 'E6', step: 13, length: 0.7 },
  { note: 'C6', step: 14, length: 0.7 },
  { note: 'B5', step: 15, length: 0.7 },
  { note: 'G5', step: 16, length: 0.7 },
  { note: 'C6', step: 17, length: 0.7 },
  { note: 'E6', step: 18, length: 0.7 },
  { note: 'G6', step: 19, length: 3.1, volume: 0.075 },
];

const BASS: Tone[] = [
  { note: 'C3', step: 0, length: 1.5 },
  { note: 'G3', step: 2, length: 1.5 },
  { note: 'C4', step: 4, length: 1.5 },
  { note: 'G3', step: 6, length: 1.5 },
  { note: 'F3', step: 8, length: 1.5 },
  { note: 'C4', step: 10, length: 1.5 },
  { note: 'G3', step: 12, length: 1.5 },
  { note: 'D4', step: 14, length: 1.5 },
  { note: 'G3', step: 16, length: 1.5 },
  { note: 'C3', step: 18, length: 4.1, volume: 0.11 },
];

function frequencyForNote(note: string): number {
  const match = /^([A-G]#?)(\d)$/.exec(note);
  if (!match) return 440;
  const pitch = NOTE_OFFSETS[match[1]] ?? NOTE_OFFSETS.A;
  const midi = (Number(match[2]) + 1) * 12 + pitch;
  return 440 * 2 ** ((midi - 69) / 12);
}

function createPulseWave(context: AudioContext, duty: number): PeriodicWave {
  const harmonics = 32;
  const real = new Float32Array(harmonics);
  const imaginary = new Float32Array(harmonics);
  for (let harmonic = 1; harmonic < harmonics; harmonic += 1) {
    real[harmonic] = Math.sin(2 * Math.PI * harmonic * duty) / (Math.PI * harmonic);
    imaginary[harmonic] = (1 - Math.cos(2 * Math.PI * harmonic * duty)) / (Math.PI * harmonic);
  }
  return context.createPeriodicWave(real, imaginary, { disableNormalization: false });
}

function scheduleTone(
  context: AudioContext,
  output: AudioNode,
  wave: PeriodicWave | BasicWaveform,
  tone: Tone,
  startAt: number,
  defaultVolume: number,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const noteStart = startAt + tone.step * STEP_SECONDS;
  const noteEnd = noteStart + tone.length * STEP_SECONDS;
  if (typeof wave === 'string') oscillator.type = wave;
  else oscillator.setPeriodicWave(wave);
  oscillator.frequency.setValueAtTime(frequencyForNote(tone.note), noteStart);
  gain.gain.setValueAtTime(0.0001, noteStart);
  gain.gain.exponentialRampToValueAtTime(tone.volume ?? defaultVolume, noteStart + 0.008);
  gain.gain.setValueAtTime(tone.volume ?? defaultVolume, Math.max(noteStart + 0.01, noteEnd - 0.025));
  gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(noteStart);
  oscillator.stop(noteEnd + 0.02);
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.055), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    const decay = 1 - index / samples.length;
    samples[index] = (Math.random() * 2 - 1) * decay;
  }
  return buffer;
}

function schedulePercussion(
  context: AudioContext,
  output: AudioNode,
  buffer: AudioBuffer,
  startAt: number,
): void {
  for (let step = 0; step <= 20; step += 2) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const hitAt = startAt + step * STEP_SECONDS;
    source.buffer = buffer;
    filter.type = step % 4 === 0 ? 'lowpass' : 'highpass';
    filter.frequency.setValueAtTime(step % 4 === 0 ? 900 : 2800, hitAt);
    gain.gain.setValueAtTime(step % 4 === 0 ? 0.12 : 0.065, hitAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, hitAt + 0.05);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    source.start(hitAt);
  }
}

/** Plays an original Game Boy-era battle victory cue and respects battle mute. */
export function playBattleVictoryCue(): void {
  if (typeof window === 'undefined' || isShowdownMuted()) return;

  const AudioContextConstructor = window.AudioContext
    ?? ((window as Any).webkitAudioContext as typeof AudioContext | undefined);
  if (!AudioContextConstructor) return;

  try {
    (window as Any).BattleSound?.currentBgm?.()?.stop?.();
    const context = new AudioContextConstructor();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const startAt = context.currentTime + 0.045;
    master.gain.setValueAtTime(0.72, startAt);
    master.connect(compressor);
    compressor.connect(context.destination);

    const leadWave = createPulseWave(context, 0.25);
    const harmonyWave = createPulseWave(context, 0.125);
    LEAD.forEach(tone => scheduleTone(context, master, leadWave, tone, startAt, 0.105));
    HARMONY.forEach(tone => scheduleTone(context, master, harmonyWave, tone, startAt, 0.058));
    BASS.forEach(tone => scheduleTone(context, master, 'triangle', tone, startAt, 0.09));
    schedulePercussion(context, master, createNoiseBuffer(context), startAt);

    const resumed = context.resume();
    if (resumed && typeof resumed.catch === 'function') resumed.catch(() => undefined);
    window.setTimeout(() => {
      const closed = context.close();
      if (closed && typeof closed.catch === 'function') closed.catch(() => undefined);
    }, VICTORY_CUE_DURATION_MS);
  } catch {
    // Audio is best-effort; browser policy or missing Web Audio must not block navigation.
  }
}
