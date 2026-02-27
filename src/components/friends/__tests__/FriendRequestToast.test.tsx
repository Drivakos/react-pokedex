import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FriendRequestToast } from '../FriendRequestToast';

describe('FriendRequestToast', () => {
  const baseProps = {
    senderName: 'John',
    onAccept: jest.fn(),
    onDecline: jest.fn(),
    onDismiss: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sender name and "sent you a friend request" text', () => {
    render(<FriendRequestToast {...baseProps} />);
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText(/sent you a friend request/i)).toBeInTheDocument();
  });

  it('renders Accept and Decline buttons', () => {
    render(<FriendRequestToast {...baseProps} />);
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
  });

  it('calls onAccept (and onDismiss) when Accept is clicked', () => {
    render(<FriendRequestToast {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    expect(baseProps.onAccept).toHaveBeenCalledTimes(1);
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline (and onDismiss) when Decline is clicked', () => {
    render(<FriendRequestToast {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    expect(baseProps.onDecline).toHaveBeenCalledTimes(1);
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the dismiss button is clicked', () => {
    render(<FriendRequestToast {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(baseProps.onAccept).not.toHaveBeenCalled();
    expect(baseProps.onDecline).not.toHaveBeenCalled();
  });

  it('shows the first letter of the sender name (uppercase) as the avatar initial', () => {
    render(<FriendRequestToast {...baseProps} senderName="alice" />);
    // The initial bubble contains the uppercase first character
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows uppercase initial for names starting with a lowercase letter', () => {
    render(<FriendRequestToast {...baseProps} senderName="bob" />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
