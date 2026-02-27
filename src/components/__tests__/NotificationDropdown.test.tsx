import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationDropdown } from '../NotificationDropdown';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock supabase config
jest.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn()
  }
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 minutes ago')
}));

import { formatDistanceToNow } from 'date-fns';
import { notificationsService, type Notification } from '../../services/notifications.service';

const mockFormatDistanceToNow = formatDistanceToNow as jest.Mock;

describe('NotificationDropdown Component', () => {
  const mockNotifications: Notification[] = [
    {
      id: 1,
      type: 'friend_request',
      title: 'New Friend Request',
      message: 'John sent you a friend request',
      url: undefined, // Friend requests are handled specially, no URL navigation
      data: { sender_id: 'john-id', sender_name: 'John', request_id: 42 },
      read: false,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      type: 'friend_accepted',
      title: 'Friend Request Accepted!',
      message: 'Jane accepted your friend request',
      url: undefined, // Friend accepted notifications are handled specially, no URL navigation
      data: { acceptor_id: 'jane-id', acceptor_name: 'Jane' },
      read: true,
      created_at: '2024-01-01T01:00:00Z'
    },
    {
      id: 3,
      type: 'achievement',
      title: 'New Achievement!',
      message: 'You caught your first legendary Pokemon!',
      url: '/profile',
      data: {},
      read: false,
      created_at: '2024-01-01T02:00:00Z'
    }
  ];

  const mockProps = {
    notifications: mockNotifications,
    loading: false,
    onMarkAsRead: jest.fn(),
    onMarkAllAsRead: jest.fn(),
    onClose: jest.fn(),
    onOpenFriendsModal: jest.fn(),
    onAcceptFriendRequest: jest.fn().mockResolvedValue(undefined),
    onDeclineFriendRequest: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDistanceToNow.mockReturnValue('2 minutes ago');
  });

  describe('Rendering', () => {
    it('should render notification dropdown with header', () => {
      render(<NotificationDropdown {...mockProps} />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('should apply correct z-index and positioning', () => {
      render(<NotificationDropdown {...mockProps} />);

      const dropdown = screen.getByText('Notifications').closest('[data-notification-dropdown]');
      expect(dropdown).toHaveClass('absolute', 'top-full', 'right-0', 'mt-2');
      expect(dropdown).toHaveClass('z-[65]');
    });

    it('should show "Mark all read" button when there are unread notifications', () => {
      render(<NotificationDropdown {...mockProps} />);

      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('should hide "Mark all read" button when all notifications are read', () => {
      const allReadNotifications = mockNotifications.map(n => ({ ...n, read: true }));
      render(<NotificationDropdown {...mockProps} notifications={allReadNotifications} />);

      expect(screen.queryByText(/Mark all read/)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(<NotificationDropdown {...mockProps} loading={true} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show loading spinner with correct styling', () => {
      render(<NotificationDropdown {...mockProps} loading={true} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-6', 'w-6', 'border-b-2', 'border-blue-600');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no notifications', () => {
      render(<NotificationDropdown {...mockProps} notifications={[]} />);

      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(screen.getByText('Friend requests and updates will appear here')).toBeInTheDocument();
    });
  });

  describe('Notification List', () => {
    it('should render all notifications', () => {
      render(<NotificationDropdown {...mockProps} />);

      mockNotifications.forEach(notification => {
        expect(screen.getByText(notification.title)).toBeInTheDocument();
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });
    });

    it('should show correct timestamp for each notification', () => {
      render(<NotificationDropdown {...mockProps} />);

      expect(formatDistanceToNow).toHaveBeenCalledTimes(mockNotifications.length);
      expect(screen.getAllByText('2 minutes ago')).toHaveLength(mockNotifications.length);
    });

    it('should show unread indicator for unread notifications', () => {
      render(<NotificationDropdown {...mockProps} />);

      const unreadNotifications = mockNotifications.filter(n => !n.read);
      const unreadIndicators = document.querySelectorAll('.bg-blue-500.rounded-full.h-2.w-2');
      expect(unreadIndicators).toHaveLength(unreadNotifications.length);
    });

    it('should apply different background for unread notifications', () => {
      render(<NotificationDropdown {...mockProps} />);

      const notificationItems = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('New Friend Request') ||
        btn.textContent?.includes('Friend Request Accepted!') ||
        btn.textContent?.includes('New Achievement!')
      );

      const unreadItem = notificationItems.find(item =>
        item.textContent?.includes('New Friend Request') ||
        item.textContent?.includes('New Achievement!')
      );

      expect(unreadItem).toHaveClass('bg-blue-50');
    });

    it('should show external link icon for notifications with URL', () => {
      render(<NotificationDropdown {...mockProps} />);

      const externalLinks = document.querySelectorAll('.h-3.w-3.text-gray-400');
      expect(externalLinks).toHaveLength(mockNotifications.filter(n => n.url).length);
    });
  });

  describe('Notification Icons', () => {
    it('should show correct icon for friend_request type', () => {
      render(<NotificationDropdown {...mockProps} />);

      const friendRequestIcon = screen.getByText('New Friend Request').closest('button')?.querySelector('svg');
      expect(friendRequestIcon).toBeInTheDocument();
      expect(friendRequestIcon).toHaveClass('text-blue-500');
    });

    it('should show correct icon for friend_accepted type', () => {
      render(<NotificationDropdown {...mockProps} />);

      const friendAcceptedIcon = screen.getByText('Friend Request Accepted!').closest('button')?.querySelector('svg');
      expect(friendAcceptedIcon).toBeInTheDocument();
      expect(friendAcceptedIcon).toHaveClass('text-green-500');
    });

    it('should show default icon for unknown types', () => {
      render(<NotificationDropdown {...mockProps} />);

      const achievementIcon = screen.getByText('New Achievement!').closest('button')?.querySelector('.bg-gray-400.rounded-full');
      expect(achievementIcon).toBeInTheDocument();
    });
  });

  describe('Notification Click Handling', () => {
    it('should call onMarkAsRead when notification is clicked', async () => {
      render(<NotificationDropdown {...mockProps} />);

      const notificationButton = screen.getByText('New Friend Request').closest('button');
      fireEvent.click(notificationButton!);

      expect(mockProps.onMarkAsRead).toHaveBeenCalledWith(1);
    });

    it('should handle notification clicks', () => {
      render(<NotificationDropdown {...mockProps} />);

      const notificationButton = screen.getByText('New Friend Request').closest('button');
      fireEvent.click(notificationButton!);

      // Should mark as read
      expect(mockProps.onMarkAsRead).toHaveBeenCalledWith(1);
    });
  });

  describe('Mark All Read', () => {
    it('should call onMarkAllAsRead when button is clicked', () => {
      render(<NotificationDropdown {...mockProps} />);

      const markAllButton = screen.getByText(/Mark all read/);
      fireEvent.click(markAllButton);

      expect(mockProps.onMarkAllAsRead).toHaveBeenCalled();
    });
  });

  describe('Inline friend request actions', () => {
    it('shows Accept and Decline buttons for an unread friend_request with request_id', () => {
      render(<NotificationDropdown {...mockProps} />);

      // Use exact string match to avoid matching "Friend Request Accepted!" row button
      expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
    });

    it('calls onAcceptFriendRequest(42) when Accept is clicked', async () => {
      render(<NotificationDropdown {...mockProps} />);

      // Use exact match to avoid matching "Friend Request Accepted!" row button
      const acceptButton = screen.getByRole('button', { name: 'Accept' });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockProps.onAcceptFriendRequest).toHaveBeenCalledWith(42);
      });
    });

    it('calls onDeclineFriendRequest(42) when Decline is clicked', async () => {
      render(<NotificationDropdown {...mockProps} />);

      const declineButton = screen.getByRole('button', { name: 'Decline' });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(mockProps.onDeclineFriendRequest).toHaveBeenCalledWith(42);
      });
    });

    it('does NOT show Accept/Decline for a read friend_request (already processed)', () => {
      const readFriendRequest: Notification = {
        id: 5,
        type: 'friend_request',
        title: 'Old Friend Request',
        message: 'Bob sent you a friend request',
        data: { sender_id: 'bob-id', sender_name: 'Bob', request_id: 77 },
        read: true,
        created_at: '2024-01-01T00:00:00Z'
      };

      render(
        <NotificationDropdown
          {...mockProps}
          notifications={[readFriendRequest]}
        />
      );

      // Exact match: no "Accept" or "Decline" standalone buttons
      expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    });

    it('falls back to redirect behaviour for a friend_request without request_id', async () => {
      const noRequestIdNotification: Notification = {
        id: 6,
        type: 'friend_request',
        title: 'Friend Request (legacy)',
        message: 'Carol sent you a friend request',
        data: { sender_id: 'carol-id' },
        read: false,
        created_at: '2024-01-01T00:00:00Z'
      };

      render(
        <NotificationDropdown
          {...mockProps}
          notifications={[noRequestIdNotification]}
        />
      );

      // No inline Accept/Decline buttons
      expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();

      // Clicking the row should call onOpenFriendsModal('requests')
      const notificationButton = screen.getByText('Friend Request (legacy)').closest('button');
      fireEvent.click(notificationButton!);

      // Handler is async so use waitFor
      await waitFor(() => {
        expect(mockProps.onOpenFriendsModal).toHaveBeenCalledWith('requests');
      });
    });

    it('does NOT show inline buttons when onAcceptFriendRequest is not provided', () => {
      render(
        <NotificationDropdown
          {...mockProps}
          onAcceptFriendRequest={undefined}
          onDeclineFriendRequest={undefined}
        />
      );

      // Exact name match so we don't accidentally match "Friend Request Accepted!" row button
      expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    });
  });
});
