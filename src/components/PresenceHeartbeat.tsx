import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { startPresenceHeartbeat } from '../services/presence.service';

export function PresenceHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    return startPresenceHeartbeat();
  }, [user]);

  return null;
}
