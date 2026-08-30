import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Friend } from '../../../services/friends.service';
import { FriendsList } from '../FriendsList';

jest.mock('../../../services/friends.service', () => ({
  friendsService: {
    generateFriendCode: (id: string) => `CODE${id}`,
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
}));

const friends: Friend[] = Array.from({ length: 8 }, (_, index) => ({
  friend_id: String(index + 1),
  friend_name: index === 7 ? 'Misty' : `Trainer ${index + 1}`,
  friendship_created_at: '2026-08-01T00:00:00Z',
}));

describe('FriendsList search and pagination', () => {
  it('shows six friends per page and navigates to the rest', () => {
    render(<FriendsList friends={friends} onRemoveFriend={jest.fn()} />);

    expect(screen.getByText('Trainer 1')).toBeInTheDocument();
    expect(screen.getByText('Trainer 6')).toBeInTheDocument();
    expect(screen.queryByText('Trainer 7')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next friends page' }));

    expect(screen.getByText('Trainer 7')).toBeInTheDocument();
    expect(screen.getByText('Misty')).toBeInTheDocument();
    expect(screen.getByText('Showing 7–8 of 8')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'friends per page' }), {
      target: { value: '12' },
    });

    expect(screen.getByText('Trainer 1')).toBeInTheDocument();
    expect(screen.getByText('Misty')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–8 of 8')).toBeInTheDocument();
  });

  it('filters by name or friend code and resets pagination', () => {
    render(<FriendsList friends={friends} onRemoveFriend={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next friends page' }));

    const search = screen.getByRole('searchbox', { name: 'Search friends' });
    fireEvent.change(search, { target: { value: 'trainer 1' } });
    expect(screen.getByText('Trainer 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next friends page' })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '#CODE8' } });
    expect(screen.getByText('Misty')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'Brock' } });
    expect(screen.getByText('No friends match “Brock”.')).toBeInTheDocument();
  });
});
