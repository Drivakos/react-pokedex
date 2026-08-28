import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VsFriendPicker } from '../VsFriendPicker';
import type { VsFriendPresence } from '../../../services/presence.service';

const friends: VsFriendPresence[] = [
  {
    friend_id: 'online-1',
    friend_name: 'Misty',
    last_seen_at: '2026-08-28T12:00:00Z',
    is_online: true,
  },
  {
    friend_id: 'offline-1',
    friend_name: 'Brock',
    last_seen_at: '2026-08-28T10:00:00Z',
    is_online: false,
  },
];

describe('VsFriendPicker', () => {
  it('allows an online friend to be selected and disables offline friends', () => {
    const onSelect = jest.fn();
    render(
      <VsFriendPicker
        friends={friends}
        selectedFriendId={null}
        loading={false}
        onSelect={onSelect}
        onRefresh={jest.fn()}
      />,
    );

    const onlineFriend = screen.getByRole('radio', { name: /Misty Online/i });
    const offlineFriend = screen.getByRole('radio', { name: /Brock Offline/i });
    expect(onlineFriend).toBeEnabled();
    expect(offlineFriend).toBeDisabled();

    fireEvent.click(onlineFriend);
    expect(onSelect).toHaveBeenCalledWith('online-1');
  });

  it('announces the online count and selected friend', () => {
    render(
      <VsFriendPicker
        friends={friends}
        selectedFriendId="online-1"
        loading={false}
        onSelect={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.getByText('1 friend online')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Misty Online/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('refreshes presence on demand', () => {
    const onRefresh = jest.fn();
    render(
      <VsFriendPicker
        friends={friends}
        selectedFriendId={null}
        loading={false}
        onSelect={jest.fn()}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
