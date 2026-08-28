import { RefreshCw, UserRound, Wifi, WifiOff } from 'lucide-react';
import type { VsFriendPresence } from '../../services/presence.service';

interface VsFriendPickerProps {
  friends: VsFriendPresence[];
  selectedFriendId: string | null;
  loading: boolean;
  disabled?: boolean;
  onSelect: (friendId: string) => void;
  onRefresh: () => void;
}

export function VsFriendPicker({
  friends,
  selectedFriendId,
  loading,
  disabled = false,
  onSelect,
  onRefresh,
}: VsFriendPickerProps) {
  const onlineCount = friends.filter(friend => friend.is_online).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {onlineCount} {onlineCount === 1 ? 'friend' : 'friends'} online
        </p>
        <button
          type="button"
          disabled={loading || disabled}
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {loading && friends.length === 0 ? (
        <div className="rounded-xl border border-slate-200 py-8 text-center text-sm text-slate-500">
          Checking who is online…
        </div>
      ) : friends.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center">
          <UserRound className="mx-auto mb-2 text-slate-400" aria-hidden="true" />
          <p className="font-semibold text-slate-700">No friends yet</p>
          <p className="mt-1 text-sm text-slate-500">Add friends from the Friends menu, then return here.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Friends to challenge">
          {friends.map(friend => {
            const selected = friend.friend_id === selectedFriendId;
            return (
              <button
                key={friend.friend_id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled || !friend.is_online}
                onClick={() => onSelect(friend.friend_id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  selected
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                    : friend.is_online
                      ? 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                      : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${friend.is_online ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                  <UserRound size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-900">{friend.friend_name}</span>
                  <span className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${friend.is_online ? 'text-green-700' : 'text-slate-500'}`}>
                    {friend.is_online ? <Wifi size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}
                    {friend.is_online ? 'Online' : 'Offline'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
