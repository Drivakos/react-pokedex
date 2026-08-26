import { render, waitFor } from '@testing-library/react';
import type { VsMatch, VsTeamSnapshotMember } from '../../../types/vs';

const mockStartBattle = jest.fn();
const mockResetBattle = jest.fn();
const mockLoadMatch = jest.fn();

const mockEngineState = {
  snapshot: null,
  decision: { kind: 'wait' as const, moves: [], switches: [], switchingBlocked: false },
  status: 'starting' as const,
  error: null,
  battleLog: [],
  chooseMove: jest.fn(),
  chooseSwitch: jest.fn(),
  startBattle: mockStartBattle,
  resetBattle: mockResetBattle,
};

jest.mock('../../../store/battleEngineStore', () => ({
  useBattleEngineStore: (selector: (state: typeof mockEngineState) => unknown) => selector(mockEngineState),
}));

jest.mock('../../../store/vsMatchStore', () => ({
  useVsMatchStore: (selector: (state: { loadMatch: typeof mockLoadMatch }) => unknown) => selector({ loadMatch: mockLoadMatch }),
}));

jest.mock('../../../services/vs-match.service', () => ({
  forfeitVsMatch: jest.fn(),
  reportVsResult: jest.fn(),
}));

jest.mock('../../../services/vs-battle-session', () => ({
  VsBattleSession: jest.fn(),
}));

jest.mock('../../battle-game/showdown-client', () => ({
  isShowdownMuted: () => true,
  setShowdownMuted: jest.fn(),
}));

jest.mock('../../battle-game/ShowdownStage', () => ({
  ShowdownStage: () => <div data-testid="showdown-stage" />,
}));

jest.mock('../../battle-game/BattlePokemonImage', () => ({
  BattlePokemonImage: () => null,
}));

import { VsBattle } from '../VsBattle';

const pokemon: VsTeamSnapshotMember = {
  pokemonId: 25,
  species: 'Pikachu',
  types: ['Electric'],
  position: 1,
  moves: ['Thunderbolt'],
  ability: 'Static',
  nature: 'Timid',
  evs: { hp: 4, attack: 0, defense: 0, 'special-attack': 252, 'special-defense': 0, speed: 252 },
  ivs: { hp: 31, attack: 0, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
  level: 50,
  isShiny: false,
};

const match: VsMatch = {
  id: 'match-1',
  host_user_id: 'host-1',
  guest_user_id: 'guest-1',
  status: 'active',
  invite_expires_at: '2026-08-26T13:00:00Z',
  host_team_snapshot: { teamId: 1, name: 'Host team', members: [pokemon] },
  guest_team_snapshot: { teamId: 2, name: 'Guest team', members: [{ ...pokemon, pokemonId: 1, species: 'Bulbasaur', types: ['Grass', 'Poison'] }] },
  host_ready: true,
  guest_ready: true,
  battle_seed: [1, 2, 3, 4],
  rules_version: 'gen9customgame-level50-v1',
  simulator_version: '@pkmn/sim-0.10.11',
  winner_user_id: null,
  finish_reason: null,
  created_at: '2026-08-26T12:00:00Z',
  started_at: '2026-08-26T12:05:00Z',
  finished_at: null,
  updated_at: '2026-08-26T12:05:00Z',
  hostName: 'Host',
  guestName: 'Guest',
};

describe('VsBattle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not restart the active simulation when Realtime updates match metadata', async () => {
    const { rerender, unmount } = render(<VsBattle match={match} userId="host-1" />);
    await waitFor(() => expect(mockStartBattle).toHaveBeenCalledTimes(1));

    rerender(<VsBattle match={{ ...match, host_result: 'host', updated_at: '2026-08-26T12:10:00Z' }} userId="host-1" />);
    expect(mockStartBattle).toHaveBeenCalledTimes(1);
    expect(mockResetBattle).not.toHaveBeenCalled();

    unmount();
    expect(mockResetBattle).toHaveBeenCalledTimes(1);
  });
});
