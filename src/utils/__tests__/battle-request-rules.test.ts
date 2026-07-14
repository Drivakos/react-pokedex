import type { BattleDecision } from '../../types/battle-run';
import { canSubmitMove, canSubmitSwitch, isSwitchingBlocked } from '../battle-request-rules';

const moveDecision: BattleDecision = {
  kind: 'move',
  moves: [
    { slot: 1, name: 'Tackle', type: 'Normal', category: 'Physical', power: 40, accuracy: 100, pp: 35, maxpp: 35, disabled: false },
    { slot: 2, name: 'Recover', type: 'Normal', category: 'Status', power: 0, accuracy: true, pp: 0, maxpp: 10, disabled: true },
  ],
  switches: [
    { slot: 1, id: 1, species: 'Bulbasaur', condition: '20/20', active: true, fainted: false },
    { slot: 2, id: 4, species: 'Charmander', condition: '20/20', active: false, fainted: false },
    { slot: 3, id: 7, species: 'Squirtle', condition: '0 fnt', active: false, fainted: true },
  ],
  switchingBlocked: false,
};

describe('battle request rules', () => {
  it('blocks voluntary switches when Showdown confirms the active Pokémon is trapped', () => {
    expect(isSwitchingBlocked({ trapped: true })).toBe(true);
  });

  it('allows switching when trapping is absent or only uncertain', () => {
    expect(isSwitchingBlocked(undefined)).toBe(false);
    expect(isSwitchingBlocked({ trapped: false })).toBe(false);
    expect(isSwitchingBlocked({ maybeTrapped: true })).toBe(false);
  });

  it('accepts only enabled moves from the current move request', () => {
    expect(canSubmitMove(moveDecision, 1)).toBe(true);
    expect(canSubmitMove(moveDecision, 2)).toBe(false);
    expect(canSubmitMove(moveDecision, 99)).toBe(false);
    expect(canSubmitMove({ ...moveDecision, kind: 'wait' }, 1)).toBe(false);
  });

  it('accepts only healthy bench Pokémon when switching is allowed', () => {
    expect(canSubmitSwitch(moveDecision, 2)).toBe(true);
    expect(canSubmitSwitch(moveDecision, 1)).toBe(false);
    expect(canSubmitSwitch(moveDecision, 3)).toBe(false);
    expect(canSubmitSwitch({ ...moveDecision, switchingBlocked: true }, 2)).toBe(false);
    expect(canSubmitSwitch({ ...moveDecision, kind: 'wait' }, 2)).toBe(false);
  });
});
