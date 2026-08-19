import type { VsMatch } from '../../types/vs';

const mockCreateVsInvite = jest.fn();
const mockInspectVsInvite = jest.fn();
const mockAcceptVsInvite = jest.fn();
const mockGetVsMatch = jest.fn();
const mockSetVsReady = jest.fn();
const mockCancelVsInvite = jest.fn();
const mockSaveInviteToken = jest.fn();
const mockUnsubscribe = jest.fn();
let mockRealtimeCallback: (() => void) | null = null;

jest.mock('../../services/vs-match.service', () => ({
  createVsInvite: (...args: unknown[]) => mockCreateVsInvite(...args),
  inspectVsInvite: (...args: unknown[]) => mockInspectVsInvite(...args),
  acceptVsInvite: (...args: unknown[]) => mockAcceptVsInvite(...args),
  getVsMatch: (...args: unknown[]) => mockGetVsMatch(...args),
  setVsReady: (...args: unknown[]) => mockSetVsReady(...args),
  cancelVsInvite: (...args: unknown[]) => mockCancelVsInvite(...args),
  saveInviteToken: (...args: unknown[]) => mockSaveInviteToken(...args),
  subscribeToVsMatch: (_matchId: string, callback: () => void) => {
    mockRealtimeCallback = callback;
    return mockUnsubscribe;
  },
}));

import { useVsMatchStore } from '../vsMatchStore';

const match: VsMatch = {
  id: 'match-1',
  host_user_id: 'host-1',
  guest_user_id: null,
  status: 'invited',
  invite_expires_at: '2026-08-19T12:30:00Z',
  host_team_snapshot: { teamId: 1, name: 'Team One', members: [] },
  guest_team_snapshot: null,
  host_ready: false,
  guest_ready: false,
  battle_seed: null,
  rules_version: 'gen9customgame-level50-v1',
  simulator_version: '@pkmn/sim-0.10.11',
  winner_user_id: null,
  finish_reason: null,
  created_at: '2026-08-19T12:00:00Z',
  started_at: null,
  finished_at: null,
  updated_at: '2026-08-19T12:00:00Z',
};

describe('VS match store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRealtimeCallback = null;
    useVsMatchStore.getState().reset();
  });

  it('stores a created match and preserves its one-time invite token', async () => {
    mockCreateVsInvite.mockResolvedValue({ match, inviteToken: 'secret-token' });

    await expect(useVsMatchStore.getState().createInvite(1)).resolves.toEqual(match);
    expect(mockSaveInviteToken).toHaveBeenCalledWith('match-1', 'secret-token');
    expect(useVsMatchStore.getState()).toMatchObject({ match, loading: false, error: null });
  });

  it('updates readiness for the loaded match', async () => {
    useVsMatchStore.setState({ match });
    const readyMatch = { ...match, status: 'lobby' as const, host_ready: true };
    mockSetVsReady.mockResolvedValue(readyMatch);

    await useVsMatchStore.getState().setReady(true);
    expect(mockSetVsReady).toHaveBeenCalledWith('match-1', true);
    expect(useVsMatchStore.getState().match).toEqual(readyMatch);
  });

  it('reloads durable state when a Realtime hint arrives', async () => {
    const updated = { ...match, guest_user_id: 'guest-1', status: 'lobby' as const };
    mockGetVsMatch.mockResolvedValue(updated);
    const unsubscribe = useVsMatchStore.getState().subscribe('match-1');

    mockRealtimeCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetVsMatch).toHaveBeenCalledWith('match-1');
    expect(useVsMatchStore.getState().match).toEqual(updated);
    unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('surfaces RPC failures without losing the current match', async () => {
    useVsMatchStore.setState({ match });
    mockCancelVsInvite.mockRejectedValue(new Error('Invite cannot be cancelled'));

    await expect(useVsMatchStore.getState().cancelInvite()).rejects.toThrow('Invite cannot be cancelled');
    expect(useVsMatchStore.getState()).toMatchObject({
      match,
      loading: false,
      error: 'Invite cannot be cancelled',
    });
  });
});
