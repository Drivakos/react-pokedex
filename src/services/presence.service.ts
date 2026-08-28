import { supabase } from '../lib/supabase';

export interface VsFriendPresence {
  friend_id: string;
  friend_name: string;
  last_seen_at: string | null;
  is_online: boolean;
}

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function touchPresence(): Promise<void> {
  const { error } = await supabase.rpc('touch_user_presence');
  if (error) throw new Error(error.message);
}

export async function getVsFriendsPresence(): Promise<VsFriendPresence[]> {
  const { data, error } = await supabase.rpc('get_vs_friends_presence');
  if (error) throw new Error(error.message);
  return (data ?? []) as VsFriendPresence[];
}

export function startPresenceHeartbeat(): () => void {
  const heartbeat = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void touchPresence().catch(() => undefined);
    }
  };

  heartbeat();
  const intervalId = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  const handleVisibility = () => heartbeat();
  window.addEventListener('focus', heartbeat);
  window.addEventListener('online', heartbeat);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('focus', heartbeat);
    window.removeEventListener('online', heartbeat);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
