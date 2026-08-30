import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { friendsService, type Friend } from '../../../services/friends.service';
import { PaginationControls } from '../../PaginationControls';

const DEFAULT_PAGE_SIZE = 6;
const PAGE_SIZE_OPTIONS = [6, 12, 24];

interface ProfileFriendsProps {
  friends: Friend[];
  loading: boolean;
  onManage: () => void;
  onCopyCode: (text: string, label: string) => void;
}

export const ProfileFriends: React.FC<ProfileFriendsProps> = ({
  friends,
  loading,
  onManage,
  onCopyCode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filteredFriends = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return friends;

    return friends.filter(friend => {
      const code = friendsService.generateFriendCode(friend.friend_id);
      return friend.friend_name.toLocaleLowerCase().includes(query)
        || code.toLocaleLowerCase().includes(query.replace(/^#/, ''));
    });
  }, [friends, searchQuery]);

  const paginatedFriends = filteredFriends.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filteredFriends.length / pageSize));
    setCurrentPage(page => Math.min(page, lastPage));
  }, [filteredFriends.length, pageSize]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Friends {friends.length > 0 && <span className="text-sm font-normal text-gray-500">({friends.length})</span>}
        </h2>
        <button
          onClick={onManage}
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          Manage
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : friends.length === 0 ? (
        <p className="text-gray-500 text-sm">No friends yet. <button onClick={onManage} className="text-blue-500 hover:underline">Add friends</button></p>
      ) : (
        <div>
          <label className="relative mb-4 block">
            <span className="sr-only">Search friends</span>
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={event => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search friends by name or code…"
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {filteredFriends.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm font-medium text-gray-500">
              No friends match “{searchQuery.trim()}”.
            </p>
          ) : (
            <div className="space-y-2">
              {paginatedFriends.map((friend) => {
                const code = friendsService.generateFriendCode(friend.friend_id);
                return (
                  <div key={friend.friend_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        {friend.friend_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{friend.friend_name}</span>
                    </div>
                    <button
                      onClick={() => onCopyCode(`${friend.friend_name} #${code}`, friend.friend_name)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-mono"
                    >
                      #{code}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <PaginationControls
            currentPage={currentPage}
            itemLabel="friends"
            onPageChange={setCurrentPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            totalItems={filteredFriends.length}
          />
        </div>
      )}
    </div>
  );
};
