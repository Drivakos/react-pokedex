import { isShowdownMuted } from './showdown-client';

const BATTLE_VICTORY_AUDIO_PATH = '/audio/battle-run/victory.mp3';

interface BattleSoundWindow extends Window {
  BattleSound?: {
    currentBgm?: () => { stop?: () => void } | null;
  };
}

let activeVictoryAudio: HTMLAudioElement | null = null;

/** Plays the Battle Run victory recording and respects the persisted battle mute. */
export function playBattleVictoryCue(): void {
  if (typeof window === 'undefined' || isShowdownMuted()) return;

  try {
    (window as BattleSoundWindow).BattleSound?.currentBgm?.()?.stop?.();
    activeVictoryAudio?.pause();

    const audio = new Audio(BATTLE_VICTORY_AUDIO_PATH);
    activeVictoryAudio = audio;
    audio.preload = 'auto';
    audio.volume = 0.8;
    audio.addEventListener('ended', () => {
      if (activeVictoryAudio === audio) activeVictoryAudio = null;
    }, { once: true });

    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        if (activeVictoryAudio === audio) activeVictoryAudio = null;
      });
    }
  } catch {
    // Audio is best-effort; browser policy or unavailable media must not block navigation.
  }
}
