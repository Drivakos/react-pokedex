import { isShowdownMuted } from '../showdown-client';
import { playBattleVictoryCue } from '../battle-victory-audio';

jest.mock('../showdown-client', () => ({
  isShowdownMuted: jest.fn(),
}));

const mockIsShowdownMuted = isShowdownMuted as jest.Mock;

describe('battle victory audio', () => {
  const instances: Array<{
    src: string;
    preload: string;
    volume: number;
    play: jest.Mock;
  }> = [];
  const stopBattleMusic = jest.fn();

  beforeEach(() => {
    instances.length = 0;
    stopBattleMusic.mockClear();
    mockIsShowdownMuted.mockReset();

    class AudioDouble {
      src: string;
      preload = '';
      volume = 1;
      pause = jest.fn();
      play = jest.fn().mockResolvedValue(undefined);
      addEventListener = jest.fn();

      constructor(src: string) {
        this.src = src;
        instances.push(this);
      }
    }

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: AudioDouble,
    });
    Object.defineProperty(window, 'BattleSound', {
      configurable: true,
      value: { currentBgm: () => ({ stop: stopBattleMusic }) },
    });
  });

  it('plays the feature-scoped victory recording and stops the battle music', () => {
    mockIsShowdownMuted.mockReturnValue(false);

    playBattleVictoryCue();

    expect(stopBattleMusic).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(1);
    expect(instances[0]).toMatchObject({
      src: '/audio/battle-run/victory.mp3',
      preload: 'auto',
      volume: 0.8,
    });
    expect(instances[0].play).toHaveBeenCalledTimes(1);
  });

  it('does not create audio while battle sound is muted', () => {
    mockIsShowdownMuted.mockReturnValue(true);

    playBattleVictoryCue();

    expect(instances).toHaveLength(0);
    expect(stopBattleMusic).not.toHaveBeenCalled();
  });
});
