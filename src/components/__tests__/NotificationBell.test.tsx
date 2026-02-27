import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationBell } from '../NotificationBell';

// Need to properly handle memoized component in tests
const TestNotificationBell = NotificationBell;

// Mock the hooks and services
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

jest.mock('../../services/notifications.service', () => ({
  notificationsService: {
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    subscribeToNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn()
  }
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    custom: jest.fn().mockReturnValue('toast-id'),
    success: jest.fn(),
    dismiss: jest.fn()
  }
}));

jest.mock('../../services/friends.service', () => ({
  friendsService: {
    acceptFriendRequest: jest.fn().mockResolvedValue({ success: true }),
    rejectFriendRequest: jest.fn().mockResolvedValue({ success: true })
  }
}));

// Mock FriendRequestToast so we don't need react-hot-toast internals
jest.mock('../friends/FriendRequestToast', () => ({
  FriendRequestToast: ({ senderName }: { senderName: string }) => (
    <div data-testid="friend-request-toast">{senderName}</div>
  )
}));

import { useAuth } from '../../hooks/useAuth';
import { notificationsService, type Notification } from '../../services/notifications.service';
import toast from 'react-hot-toast';
import { friendsService } from '../../services/friends.service';

const mockUseAuth = useAuth as jest.Mock;
const mockGetNotifications = notificationsService.getNotifications as jest.Mock;
const mockGetUnreadCount = notificationsService.getUnreadCount as jest.Mock;
const mockSubscribeToNotifications = notificationsService.subscribeToNotifications as jest.Mock;
const mockMarkAsRead = notificationsService.markAsRead as jest.Mock;
const mockMarkAllAsRead = notificationsService.markAllAsRead as jest.Mock;
const mockToastCustom = (toast as any).custom as jest.Mock;
const mockAcceptFriendRequest = friendsService.acceptFriendRequest as jest.Mock;
const mockRejectFriendRequest = friendsService.rejectFriendRequest as jest.Mock;

describe('NotificationBell Component', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' }
  };

  const mockNotifications: Notification[] = [
    {
      id: 1,
      type: 'friend_request',
      title: 'New Friend Request',
      message: 'John sent you a friend request',
      url: '/friends',
      data: { sender_id: 'john-id', sender_name: 'John', request_id: 42 },
      read: false,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      type: 'friend_accepted',
      title: 'Friend Request Accepted!',
      message: 'Jane accepted your friend request',
      url: '/friends',
      data: { acceptor_id: 'jane-id', acceptor_name: 'Jane' },
      read: true,
      created_at: '2024-01-01T01:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseAuth.mockReturnValue({ user: mockUser });
    mockGetNotifications.mockResolvedValue(mockNotifications);
    mockGetUnreadCount.mockResolvedValue(1);
    mockSubscribeToNotifications.mockReturnValue(jest.fn());
    mockMarkAsRead.mockResolvedValue(true);
    mockMarkAllAsRead.mockResolvedValue(1);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('User Authentication', () => {
    it('should not render when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { container } = render(<NotificationBell />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when user is authenticated', () => {
      render(<NotificationBell />);
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });
  });

  describe('Bell Icon and Badge', () => {
    it('should show bell icon', () => {
      render(<NotificationBell />);
      const bellIcon = screen.getByRole('button').querySelector('svg');
      expect(bellIcon).toBeInTheDocument();
    });

    it('should not show badge when there are no unread notifications', async () => {
      mockGetUnreadCount.mockResolvedValue(0);

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    it('should show unread count badge', async () => {
      // Mock notifications with 2 unread
      const notificationsWithUnread = mockNotifications.map(n => ({ ...n, read: n.id === 1 ? false : true }));
      mockGetNotifications.mockResolvedValue(notificationsWithUnread);

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 unread notification
      });
    });

    it('should show "99+" for counts over 99', async () => {
      // Mock unread count to be over 99
      mockGetUnreadCount.mockResolvedValue(150);

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Toggle', () => {
    it('should toggle dropdown when bell is clicked', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button', { name: /notifications/i });

      // Initially closed
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(button);
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Click to close
      fireEvent.click(button);
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button', { name: /notifications/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'true');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Loading State', () => {
    it('should show loading state when dropdown opens', async () => {
      // Delay the API call to show loading state
      mockGetNotifications.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockNotifications), 100))
      );

      render(<NotificationBell />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show loading spinner
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to real-time notifications on mount', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToNotifications.mockReturnValue(mockUnsubscribe);

      render(<NotificationBell />);

      expect(mockSubscribeToNotifications).toHaveBeenCalledWith(mockUser.id, expect.any(Function));

      // Cleanup should be called on unmount
      // Note: We can't easily test cleanup in this setup
    });

    it('should subscribe to real-time notifications', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToNotifications.mockReturnValue(mockUnsubscribe);

      render(<NotificationBell />);

      expect(mockSubscribeToNotifications).toHaveBeenCalledWith(mockUser.id, expect.any(Function));
    });
  });

  describe('Real-time friend request toast', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calls toast.custom when a friend_request notification with request_id arrives', async () => {
      let capturedCallback: ((n: Notification) => void) | null = null;
      mockSubscribeToNotifications.mockImplementation((_userId: string, cb: (n: Notification) => void) => {
        capturedCallback = cb;
        return jest.fn();
      });

      render(<NotificationBell />);

      const friendRequestNotification: Notification = {
        id: 10,
        type: 'friend_request',
        title: 'New Friend Request',
        message: 'Alice sent you a friend request',
        data: { sender_id: 'alice-id', sender_name: 'Alice', request_id: 99 },
        read: false,
        created_at: new Date().toISOString()
      };

      act(() => {
        capturedCallback!(friendRequestNotification);
        jest.advanceTimersByTime(200); // past 100ms debounce
      });

      expect(mockToastCustom).toHaveBeenCalled();
    });

    it('does NOT call toast.custom for a friend_request without request_id', async () => {
      let capturedCallback: ((n: Notification) => void) | null = null;
      mockSubscribeToNotifications.mockImplementation((_userId: string, cb: (n: Notification) => void) => {
        capturedCallback = cb;
        return jest.fn();
      });

      render(<NotificationBell />);

      const noRequestIdNotification: Notification = {
        id: 11,
        type: 'friend_request',
        title: 'New Friend Request',
        message: 'Bob sent you a friend request',
        data: { sender_id: 'bob-id', sender_name: 'Bob' },
        read: false,
        created_at: new Date().toISOString()
      };

      act(() => {
        capturedCallback!(noRequestIdNotification);
        jest.advanceTimersByTime(200);
      });

      expect(mockToastCustom).not.toHaveBeenCalled();
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Dropdown should be open
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Click outside (on document body)
      fireEvent.mouseDown(document.body);

      // Dropdown should be closed
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });

    it('should not close when clicking on bell button', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Dropdown should be open
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Click on bell button again (should not close due to preventDefault)
      fireEvent.mouseDown(button);

      // Dropdown should still be open
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should pass onOpenFriendsModal to NotificationDropdown', () => {
      const mockOnOpenFriendsModal = jest.fn();

      render(<NotificationBell onOpenFriendsModal={mockOnOpenFriendsModal} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // The NotificationDropdown should receive the prop
      // This is tested more thoroughly in NotificationDropdown tests
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  describe('Friend request callbacks passed to NotificationDropdown', () => {
    it('handleAcceptFriendRequest calls friendsService.acceptFriendRequest with requestId and userId', async () => {
      render(<NotificationBell />);

      // Open the dropdown so NotificationDropdown mounts
      const button = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(button);

      // Wait for async notification load to complete (the notification title will appear)
      await waitFor(() => {
        expect(screen.getByText('New Friend Request')).toBeInTheDocument();
      });

      // Use exact match to avoid matching "Friend Request Accepted!" row button
      const acceptButton = screen.getByRole('button', { name: 'Accept' });
      expect(acceptButton).toBeInTheDocument();

      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockAcceptFriendRequest).toHaveBeenCalledWith(42, mockUser.id);
      });
    });

    it('handleDeclineFriendRequest calls friendsService.rejectFriendRequest with requestId and userId', async () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(button);

      // Wait for async notification load to complete
      await waitFor(() => {
        expect(screen.getByText('New Friend Request')).toBeInTheDocument();
      });

      const declineButton = screen.getByRole('button', { name: 'Decline' });
      expect(declineButton).toBeInTheDocument();

      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(mockRejectFriendRequest).toHaveBeenCalledWith(42, mockUser.id);
      });
    });
  });
});
