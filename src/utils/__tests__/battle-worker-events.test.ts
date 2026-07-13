import type { BattleSnapshot, BattleVisualEvent } from '../../types/battle-run';
import type { BattleWorkerEvent } from '../../types/battle-worker';
import { compactBattleWorkerEvents } from '../battle-worker-events';

const snapshot: BattleSnapshot = {
  turn: 1,
  player: null,
  opponent: null,
  playerRemaining: 1,
  opponentRemaining: 1,
};

const visual = (event: Partial<BattleVisualEvent> & Pick<BattleVisualEvent, 'id' | 'kind'>): BattleWorkerEvent => ({
  type: 'visual',
  event: { snapshot, ...event },
});

describe('battle worker event compaction', () => {
  it('combines effectiveness labels with the following damage beat', () => {
    const events = compactBattleWorkerEvents([
      visual({ id: 1, kind: 'effectiveness', label: 'Super effective', tone: 'positive', target: 'opponent' }),
      { type: 'log', message: 'The attack was super effective.' },
      visual({ id: 2, kind: 'damage', target: 'opponent' }),
    ]);

    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      type: 'visual',
      event: { id: 2, kind: 'damage', label: 'Super effective', tone: 'positive' },
    });
  });

  it('combines critical and type labels into one impact', () => {
    const events = compactBattleWorkerEvents([
      visual({ id: 1, kind: 'effectiveness', label: 'Critical hit', tone: 'positive' }),
      visual({ id: 2, kind: 'effectiveness', label: 'Not very effective', tone: 'neutral' }),
      visual({ id: 3, kind: 'damage', target: 'player' }),
    ]);

    expect(events).toEqual([
      expect.objectContaining({
        type: 'visual',
        event: expect.objectContaining({
          id: 3,
          label: 'Critical hit · Not very effective',
          tone: 'positive',
        }),
      }),
    ]);
  });

  it('keeps immunity as its own visual event', () => {
    const immune = visual({ id: 1, kind: 'effectiveness', label: 'No effect', tone: 'neutral' });
    expect(compactBattleWorkerEvents([immune])).toEqual([immune]);
  });
});
