import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Friend } from '../../../services/friends.service';
import { ProfileFriends } from './ProfileFriends';

jest.mock('../../../services/friends.service', () => ({
  friendsService: {
    generateFriendCode: (id: string) => `CODE${id}`,
  },
}));

const friends: Friend[] = Array.from({ length: 7 }, (_, index) => ({
  friend_id: String(index + 1),
  friend_name: index === 6 ? 'Brock' : `Trainer ${index + 1}`,
  friendship_created_at: '2026-08-01T00:00:00Z',
}));

describe('ProfileFriends search and pagination', () => {
  it('paginates the profile friend list and filters it', () => {
    render(
      <ProfileFriends
        friends={friends}
        loading={false}
        onManage={jest.fn()}
        onCopyCode={jest.fn()}
      />,
    );

    expect(screen.queryByText('Brock')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next friends page' }));
    expect(screen.getByText('Brock')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'friends per page' }), {
      target: { value: '12' },
    });
    expect(screen.getByText('Trainer 1')).toBeInTheDocument();
    expect(screen.getByText('Brock')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search friends' }), {
      target: { value: 'trainer 2' },
    });
    expect(screen.getByText('Trainer 2')).toBeInTheDocument();
    expect(screen.queryByText('Brock')).not.toBeInTheDocument();
  });
});
