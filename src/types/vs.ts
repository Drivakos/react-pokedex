export type VsMatchStatus =
  | 'invited'
  | 'lobby'
  | 'active'
  | 'finished'
  | 'cancelled'
  | 'expired'
  | 'desynced';

export interface VsTeamSnapshotMember {
  pokemonId: number;
  species: string;
  types: string[];
  position: number;
  moves: string[];
  item?: string;
  ability: string;
  nature: string;
  evs: Record<string, number>;
  ivs: Record<string, number>;
  level: number;
  nickname?: string;
  isShiny: boolean;
  gender?: string;
  teraType?: string;
}

export interface VsTeamSnapshot {
  teamId: number;
  name: string;
  members: VsTeamSnapshotMember[];
}

export interface VsMatch {
  id: string;
  host_user_id: string;
  guest_user_id: string | null;
  invited_user_id?: string | null;
  status: VsMatchStatus;
  invite_expires_at: string;
  host_team_snapshot: VsTeamSnapshot;
  guest_team_snapshot: VsTeamSnapshot | null;
  host_ready: boolean;
  guest_ready: boolean;
  battle_seed: [number, number, number, number] | null;
  rules_version: string;
  simulator_version: string;
  winner_user_id: string | null;
  finish_reason: string | null;
  host_result?: VsCanonicalResult | null;
  guest_result?: VsCanonicalResult | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  hostName?: string;
  guestName?: string;
  invitedName?: string;
}

export type VsCanonicalResult = 'host' | 'guest' | 'tie';

export interface VsChoicePair {
  requestIndex: number;
  hostChoice: string;
  guestChoice: string;
}

export interface VsChoiceSubmission {
  requestIndex: number;
  complete: boolean;
  hostChoice: string | null;
  guestChoice: string | null;
}

export interface CreateVsInviteResult {
  match: VsMatch;
  inviteToken: string;
}

export interface VsInvitePreview {
  matchId: string;
  status: VsMatchStatus;
  expiresAt: string;
  hostName: string;
  isHost: boolean;
  rulesVersion: string;
}
