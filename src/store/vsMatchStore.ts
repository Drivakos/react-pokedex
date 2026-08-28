import { create } from 'zustand';
import {
  acceptVsInvite,
  cancelVsInvite,
  createVsFriendInvite,
  createVsInvite,
  getVsMatch,
  inspectVsInvite,
  saveInviteToken,
  setVsReady,
  subscribeToVsMatch,
} from '../services/vs-match.service';
import type { VsInvitePreview, VsMatch } from '../types/vs';

interface VsMatchStore {
  match: VsMatch | null;
  invitePreview: VsInvitePreview | null;
  loading: boolean;
  error: string | null;
  createInvite: (teamId: number) => Promise<VsMatch>;
  createFriendInvite: (teamId: number, friendId: string) => Promise<VsMatch>;
  inspectInvite: (token: string) => Promise<VsInvitePreview>;
  acceptInvite: (token: string, teamId: number) => Promise<VsMatch>;
  loadMatch: (matchId: string) => Promise<VsMatch>;
  setReady: (ready: boolean) => Promise<VsMatch>;
  cancelInvite: () => Promise<VsMatch>;
  subscribe: (matchId: string) => () => void;
  clearError: () => void;
  reset: () => void;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'VS mode request failed.';
}

export const useVsMatchStore = create<VsMatchStore>((set, get) => ({
  match: null,
  invitePreview: null,
  loading: false,
  error: null,

  createInvite: async teamId => {
    set({ loading: true, error: null });
    try {
      const result = await createVsInvite(teamId);
      saveInviteToken(result.match.id, result.inviteToken);
      set({ match: result.match, loading: false });
      return result.match;
    } catch (error) {
      set({ loading: false, error: messageFrom(error) });
      throw error;
    }
  },

  createFriendInvite: async (teamId, friendId) => {
    set({ loading: true, error: null });
    try {
      const result = await createVsFriendInvite(teamId, friendId);
      saveInviteToken(result.match.id, result.inviteToken);
      set({ match: result.match, loading: false });
      return result.match;
    } catch (error) {
      set({ loading: false, error: messageFrom(error) });
      throw error;
    }
  },

  inspectInvite: async token => {
    set({ loading: true, error: null, invitePreview: null });
    try {
      const preview = await inspectVsInvite(token);
      set({ invitePreview: preview, loading: false });
      return preview;
    } catch (error) {
      set({ loading: false, error: messageFrom(error) });
      throw error;
    }
  },

  acceptInvite: async (token, teamId) => {
    set({ loading: true, error: null });
    try {
      const match = await acceptVsInvite(token, teamId);
      set({ match, loading: false });
      return match;
    } catch (error) {
      set({ loading: false, error: messageFrom(error) });
      throw error;
    }
  },

  loadMatch: async matchId => {
    set({ loading: true, error: null });
    try {
      const match = await getVsMatch(matchId);
      set({ match, loading: false });
      return match;
    } catch (error) {
      set({ loading: false, error: messageFrom(error) });
      throw error;
    }
  },

  setReady: async ready => {
    const matchId = get().match?.id;
    if (!matchId) throw new Error('No VS match is loaded.');
    set({ loading: true, error: null });
    try {
      const match = await setVsReady(matchId, ready);
      set({ match, loading: false });
      return match;
    } catch (error) {
      set({ loading: false, error: messageFrom(error) });
      throw error;
    }
  },

  cancelInvite: async () => {
    const matchId = get().match?.id;
    if (!matchId) throw new Error('No VS match is loaded.');
    set({ loading: true, error: null });
    try {
      const match = await cancelVsInvite(matchId);
      set({ match, loading: false });
      return match;
    } catch (error) {
      set({ loading: false, error: messageFrom(error) });
      throw error;
    }
  },

  subscribe: matchId => subscribeToVsMatch(matchId, () => {
    void get().loadMatch(matchId).catch(() => undefined);
  }),

  clearError: () => set({ error: null }),
  reset: () => set({ match: null, invitePreview: null, loading: false, error: null }),
}));
