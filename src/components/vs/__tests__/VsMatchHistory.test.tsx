import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import type { VsMatchHistoryItem } from '../../../types/vs';
import { getVsMatchHistory } from '../../../services/vs-match.service';
import { VsMatchHistory } from '../VsMatchHistory';

jest.mock('../../../services/vs-match.service', () => ({
  getVsMatchHistory: jest.fn(),
}));

const mockGetVsMatchHistory = getVsMatchHistory as jest.MockedFunction<typeof getVsMatchHistory>;

function makeMatch(index: number, overrides: Partial<VsMatchHistoryItem> = {}): VsMatchHistoryItem {
  return {
    matchId: `match-${index}`,
    opponentUserId: `opponent-${index}`,
    opponentName: `Trainer ${index}`,
    winnerUserId: index % 2 === 0 ? 'user-1' : `opponent-${index}`,
    finishReason: 'completed',
    finishedAt: `2026-08-${String(20 - index).padStart(2, '0')}T12:00:00Z`,
    userTeamName: `User team ${index}`,
    opponentTeamName: `Opponent team ${index}`,
    ...overrides,
  };
}

function renderHistory() {
  return render(
    <MemoryRouter>
      <VsMatchHistory userId="user-1" />
    </MemoryRouter>,
  );
}

describe('VsMatchHistory search and pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the maximum supported history and pages through five replays at a time', async () => {
    mockGetVsMatchHistory.mockResolvedValue(Array.from({ length: 7 }, (_, index) => makeMatch(index + 1)));

    renderHistory();

    await waitFor(() => expect(mockGetVsMatchHistory).toHaveBeenCalledWith(50));
    expect(await screen.findByText('vs Trainer 1')).toBeInTheDocument();
    expect(screen.getByText('vs Trainer 5')).toBeInTheDocument();
    expect(screen.queryByText('vs Trainer 6')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next replays page' }));

    expect(screen.getByText('vs Trainer 6')).toBeInTheDocument();
    expect(screen.getByText('vs Trainer 7')).toBeInTheDocument();
    expect(screen.queryByText('vs Trainer 1')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'replays per page' }), {
      target: { value: '10' },
    });

    expect(screen.getByText('vs Trainer 1')).toBeInTheDocument();
    expect(screen.getByText('vs Trainer 7')).toBeInTheDocument();
    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it('filters by opponent, team, and result and returns to the first page', async () => {
    mockGetVsMatchHistory.mockResolvedValue([
      ...Array.from({ length: 6 }, (_, index) => makeMatch(index + 1)),
      makeMatch(7, {
        opponentName: 'Misty',
        winnerUserId: 'user-1',
        opponentTeamName: 'Cerulean Stars',
      }),
    ]);

    renderHistory();
    await screen.findByText('vs Trainer 1');
    fireEvent.click(screen.getByRole('button', { name: 'Next replays page' }));

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search replays' }), {
      target: { value: 'cerulean' },
    });

    expect(screen.getByText('vs Misty')).toBeInTheDocument();
    expect(screen.queryByText('vs Trainer 6')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next replays page' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search replays' }), {
      target: { value: 'does-not-exist' },
    });
    expect(screen.getByText('No replays match “does-not-exist”.')).toBeInTheDocument();
  });
});
