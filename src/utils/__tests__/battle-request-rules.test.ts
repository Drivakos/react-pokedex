import { isSwitchingBlocked } from '../battle-request-rules';

describe('battle request rules', () => {
  it('blocks voluntary switches when Showdown confirms the active Pokémon is trapped', () => {
    expect(isSwitchingBlocked({ trapped: true })).toBe(true);
  });

  it('allows switching when trapping is absent or only uncertain', () => {
    expect(isSwitchingBlocked(undefined)).toBe(false);
    expect(isSwitchingBlocked({ trapped: false })).toBe(false);
    expect(isSwitchingBlocked({ maybeTrapped: true })).toBe(false);
  });
});
