import { useAuth } from './useAuth';

export function useBattleTrainerName(fallback = 'Player'): string {
  const { profile, user } = useAuth();
  const metadataName = typeof user?.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name.trim()
    : '';

  return profile?.username?.trim()
    || metadataName
    || user?.email?.split('@')[0]?.trim()
    || fallback;
}
