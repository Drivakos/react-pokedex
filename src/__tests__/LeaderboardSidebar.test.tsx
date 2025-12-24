import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LeaderboardSidebar } from '../components/pokegrid/LeaderboardSidebar';

// Mock the auth context
jest.mock('../contexts/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' }
  })
}));

// Mock the pokegrid service
jest.mock('../services/pokegrid.service', () => ({
  pokegridService: {
    getLeaderboard: jest.fn(),
    getFriendsLeaderboard: jest.fn()
  }
}));

// Mock the services
jest.mock('../services/pokegrid.service', () => ({
  pokegridService: {
    getLeaderboard: jest.fn(),
    getFriendsLeaderboard: jest.fn()
  }
}));

jest.mock('../services/friends.service', () => ({
  friendsService: {
    getFriendsCount: jest.fn()
  }
}));

import { pokegridService } from '../services/pokegrid.service';
import { friendsService } from '../services/friends.service';

const mockGetLeaderboard = pokegridService.getLeaderboard as jest.Mock;
const mockGetFriendsLeaderboard = pokegridService.getFriendsLeaderboard as jest.Mock;
const mockGetFriendsCount = friendsService.getFriendsCount as jest.Mock;

describe('LeaderboardSidebar', () => {
  const mockProps = {
    gridDate: '2024-12-25',
    onFriendsClick: jest.fn()
  };

  const getTestProps = (overrides = {}) => ({
    ...mockProps,
    testMode: true,
    testData: mockLeaderboardData,
    testFriendsCount: 0,
    ...overrides
  });

  const mockLeaderboardData = [
    {
      user_id: 'user-1',
      username: 'Alice',
      score: 2000,
      completed_at: '2024-12-25T14:30:00Z',
      perfect_game: true,
      total_guesses: 9,
      rank: 1
    },
    {
      user_id: 'user-2',
      username: 'Bob',
      score: 1800,
      completed_at: '2024-12-25T15:45:00Z',
      perfect_game: false,
      total_guesses: 12,
      rank: 2
    },
    {
      user_id: 'test-user-id',
      username: 'Current User',
      score: 1600,
      completed_at: '2024-12-25T16:20:00Z',
      perfect_game: false,
      total_guesses: 15,
      rank: 3,
      is_current_user: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFriendsCount.mockReturnValue(Promise.resolve(0));
    // Default to synchronous return for leaderboard data
    mockGetLeaderboard.mockReturnValue(Promise.resolve(mockLeaderboardData));
    mockGetFriendsLeaderboard.mockReturnValue(Promise.resolve([]));
  });

  // Helper to setup friends mocks
  const setupFriendsMocks = () => {
    mockGetFriendsCount.mockReturnValue(Promise.resolve(2));
    mockGetFriendsLeaderboard.mockReturnValue(Promise.resolve(mockLeaderboardData));
  };

  it('renders leaderboard title', () => {
    render(<LeaderboardSidebar {...mockProps} />);
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('renders tab selectors', () => {
    render(<LeaderboardSidebar {...mockProps} />);
    expect(screen.getByText('Worldwide')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  it('renders timeframe selectors', () => {
    render(<LeaderboardSidebar {...mockProps} />);
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('shows worldwide tab as active by default when user has no friends', async () => {
    mockGetFriendsCount.mockReturnValue(Promise.resolve(0));
    render(<LeaderboardSidebar {...mockProps} />);

    await waitFor(() => {
      const worldwideButton = screen.getByText('Worldwide');
      expect(worldwideButton).toHaveClass('bg-blue-600', 'text-white');
    });
  });

  it('shows friends tab as active by default when user has friends', async () => {
    mockGetFriendsCount.mockReturnValue(Promise.resolve(2));
    render(<LeaderboardSidebar {...mockProps} />);

    await waitFor(() => {
      const friendsButton = screen.getByText('Friends');
      expect(friendsButton).toHaveClass('bg-blue-600', 'text-white');
    });
  });

  it('loads worldwide leaderboard data on mount', async () => {
    render(<LeaderboardSidebar {...mockProps} />);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('daily', '2024-12-25');
    });
  });

  it('loads friends leaderboard data when friends tab is active', async () => {
    mockGetFriendsCount.mockReturnValue(Promise.resolve(2));
    mockGetFriendsLeaderboard.mockReturnValue(Promise.resolve(mockLeaderboardData));

    render(<LeaderboardSidebar {...mockProps} />);

    await waitFor(() => {
      expect(mockGetFriendsLeaderboard).toHaveBeenCalledWith(
        'test-user-id',
        'daily',
        '2024-12-25'
      );
    });
  });

  it('switches to friends leaderboard when friends tab is clicked', async () => {
    mockGetFriendsCount.mockReturnValue(Promise.resolve(0));
    render(<LeaderboardSidebar {...mockProps} />);

    // Wait for initial load to finish
    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('daily', '2024-12-25');
    });

    const friendsButton = screen.getByText('Friends');
    fireEvent.click(friendsButton);

    await waitFor(() => {
      expect(mockGetFriendsLeaderboard).toHaveBeenCalledWith(
        'test-user-id',
        'daily',
        '2024-12-25'
      );
    });
  });

  it('changes timeframe when timeframe button is clicked', async () => {
    render(<LeaderboardSidebar {...mockProps} />);

    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('weekly', undefined);
    });
  });

  it('displays leaderboard entries correctly', () => {
    render(<LeaderboardSidebar {...getTestProps()} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Current User')).toBeInTheDocument();
  });

  it('highlights current user entry', () => {
    render(<LeaderboardSidebar {...getTestProps({ testFriendsCount: 2 })} />);

    expect(screen.getByText('Current User')).toBeInTheDocument();

    const currentUserText = screen.getByText('Current User');
    const currentUserEntry = currentUserText.parentElement?.parentElement;
    expect(currentUserEntry).toHaveClass('bg-blue-50', 'border-2', 'border-blue-200');
  });

  it('shows loading state while fetching data', () => {
    mockGetLeaderboard.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LeaderboardSidebar {...mockProps} />);

    expect(screen.getByText('Loading rankings...')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<LeaderboardSidebar {...getTestProps({ testData: [] })} />);

    expect(screen.getByText('No entries yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to complete!')).toBeInTheDocument();
  });

  it('shows friends empty state when friends tab has no entries', () => {
    render(<LeaderboardSidebar {...getTestProps({ testData: [], testFriendsCount: 2 })} />);

    expect(screen.getByText('No friends yet')).toBeInTheDocument();
    expect(screen.getByText('Add friends to compete!')).toBeInTheDocument();
  });

  it('shows add friends button when onFriendsClick prop is provided', () => {
    render(<LeaderboardSidebar {...getTestProps({ testData: [], testFriendsCount: 2 })} />);

    const addFriendsButton = screen.getByText('Add Friends');
    expect(addFriendsButton).toBeInTheDocument();

    fireEvent.click(addFriendsButton);
    expect(mockProps.onFriendsClick).toHaveBeenCalled();
  });

  it('shows + Friends button in header when onFriendsClick prop is provided', () => {
    render(<LeaderboardSidebar {...mockProps} />);

    const addFriendsButton = screen.getByTitle('Quick access to add friends');
    expect(addFriendsButton).toBeInTheDocument();
    expect(addFriendsButton).toHaveTextContent('+ Friends');
  });

  it('displays perfect game indicator', () => {
    render(<LeaderboardSidebar {...getTestProps()} />);

    expect(screen.getByText('Perfect!')).toBeInTheDocument();
  });

  it('displays completion time', () => {
    render(<LeaderboardSidebar {...getTestProps()} />);

    // Should show time in format like "2:30 PM" or similar
    expect(screen.getAllByText(/PM|AM|\d+:\d+/)).toBeDefined();
  });

  it('shows correct footer text for worldwide leaderboard', () => {
    render(<LeaderboardSidebar {...getTestProps()} />);

    expect(screen.getByText('Showing top 3 players')).toBeInTheDocument();
  });

  it('shows correct footer text for friends leaderboard', async () => {
    mockGetFriendsCount.mockImplementation(() => Promise.resolve(2));
    mockGetFriendsLeaderboard.mockImplementation(() => Promise.resolve(mockLeaderboardData));

    render(<LeaderboardSidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Showing all friends')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', () => {
    render(<LeaderboardSidebar {...getTestProps({ testData: [] })} />);

    expect(screen.getByText('No entries yet')).toBeInTheDocument();
  });

  it('updates leaderboard when timeframe changes', async () => {
    render(<LeaderboardSidebar {...mockProps} />);

    // Initially loads daily
    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('daily', '2024-12-25');
    });

    // Click weekly
    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('weekly', undefined);
    });

    // Click all-time
    const allTimeButton = screen.getByText('All Time');
    fireEvent.click(allTimeButton);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('all-time', undefined);
    });
  });

  it('maintains tab selection when switching timeframes', async () => {
    mockGetFriendsCount.mockReturnValue(Promise.resolve(0));
    render(<LeaderboardSidebar {...mockProps} />);

    // Wait for initial load to finish
    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('daily', '2024-12-25');
    });

    // Switch to friends tab
    const friendsButton = screen.getByText('Friends');
    fireEvent.click(friendsButton);

    await waitFor(() => {
      expect(mockGetFriendsLeaderboard).toHaveBeenCalledWith(
        'test-user-id',
        'daily',
        '2024-12-25'
      );
    });

    // Change timeframe
    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);

    await waitFor(() => {
      expect(mockGetFriendsLeaderboard).toHaveBeenCalledWith(
        'test-user-id',
        'weekly',
        undefined
      );
    });
  });
});
