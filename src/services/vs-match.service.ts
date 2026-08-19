import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  CreateVsInviteResult,
  VsCanonicalResult,
  VsChoicePair,
  VsChoiceSubmission,
  VsInvitePreview,
  VsMatch,
} from '../types/vs';

function throwRpcError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function addParticipantNames(match: VsMatch): Promise<VsMatch> {
  const ids = [match.host_user_id, match.guest_user_id].filter((id): id is string => Boolean(id));
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', ids);

  if (error) return match;
  const names = new Map((data ?? []).map(profile => [profile.id, profile.username]));
  return {
    ...match,
    hostName: names.get(match.host_user_id) ?? 'Host',
    guestName: match.guest_user_id ? names.get(match.guest_user_id) ?? 'Challenger' : undefined,
  };
}

export async function createVsInvite(teamId: number): Promise<CreateVsInviteResult> {
  const { data, error } = await supabase.rpc('create_vs_invite', { p_team_id: teamId });
  throwRpcError(error);
  const result = data as CreateVsInviteResult;
  return { ...result, match: await addParticipantNames(result.match) };
}

export async function inspectVsInvite(inviteToken: string): Promise<VsInvitePreview> {
  const { data, error } = await supabase.rpc('inspect_vs_invite', { p_invite_token: inviteToken });
  throwRpcError(error);
  return data as VsInvitePreview;
}

export async function acceptVsInvite(inviteToken: string, teamId: number): Promise<VsMatch> {
  const { data, error } = await supabase.rpc('accept_vs_invite', {
    p_invite_token: inviteToken,
    p_team_id: teamId,
  });
  throwRpcError(error);
  return addParticipantNames(data as VsMatch);
}

export async function getVsMatch(matchId: string): Promise<VsMatch> {
  const { data, error } = await supabase
    .from('vs_matches')
    .select('*')
    .eq('id', matchId)
    .single();
  if (error) throw new Error(error.message);
  return addParticipantNames(data as VsMatch);
}

export async function setVsReady(matchId: string, ready: boolean): Promise<VsMatch> {
  const { data, error } = await supabase.rpc('set_vs_ready', {
    p_match_id: matchId,
    p_ready: ready,
  });
  throwRpcError(error);
  return addParticipantNames(data as VsMatch);
}

export async function cancelVsInvite(matchId: string): Promise<VsMatch> {
  const { data, error } = await supabase.rpc('cancel_vs_invite', { p_match_id: matchId });
  throwRpcError(error);
  return addParticipantNames(data as VsMatch);
}

export async function submitVsChoice(
  matchId: string,
  requestIndex: number,
  choice: string,
): Promise<VsChoiceSubmission> {
  const { data, error } = await supabase.rpc('submit_vs_choice', {
    p_match_id: matchId,
    p_request_index: requestIndex,
    p_choice: choice,
  });
  throwRpcError(error);
  return data as VsChoiceSubmission;
}

export async function getVsChoicePairs(matchId: string): Promise<VsChoicePair[]> {
  const { data, error } = await supabase.rpc('get_vs_choice_pairs', { p_match_id: matchId });
  throwRpcError(error);
  return (data ?? []) as VsChoicePair[];
}

export async function reportVsResult(matchId: string, result: VsCanonicalResult): Promise<VsMatch> {
  const { data, error } = await supabase.rpc('report_vs_result', {
    p_match_id: matchId,
    p_result: result,
  });
  throwRpcError(error);
  return addParticipantNames(data as VsMatch);
}

export async function forfeitVsMatch(matchId: string): Promise<VsMatch> {
  const { data, error } = await supabase.rpc('forfeit_vs_match', { p_match_id: matchId });
  throwRpcError(error);
  return addParticipantNames(data as VsMatch);
}

export function subscribeToVsMatch(matchId: string, onChange: () => void): () => void {
  let channel: RealtimeChannel | null = supabase
    .channel(`vs-lobby:${matchId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'vs_matches',
      filter: `id=eq.${matchId}`,
    }, onChange)
    .subscribe();

  return () => {
    if (!channel) return;
    void supabase.removeChannel(channel);
    channel = null;
  };
}

export function saveInviteToken(matchId: string, inviteToken: string): void {
  sessionStorage.setItem(`vs_invite_token:${matchId}`, inviteToken);
}

export function getSavedInviteToken(matchId: string): string | null {
  return sessionStorage.getItem(`vs_invite_token:${matchId}`);
}

export function clearSavedInviteToken(matchId: string): void {
  sessionStorage.removeItem(`vs_invite_token:${matchId}`);
}
