import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BattleConclusionBanner } from '../BattleConclusionBanner';
import { playBattleVictoryCue } from '../battle-victory-audio';

jest.mock('../battle-victory-audio', () => ({
  playBattleVictoryCue: jest.fn(),
}));

const mockPlayBattleVictoryCue = playBattleVictoryCue as jest.Mock;

describe('BattleConclusionBanner', () => {
  beforeEach(() => mockPlayBattleVictoryCue.mockClear());

  it('announces a player victory and plays the victory cue', () => {
    render(<BattleConclusionBanner result={{ winner: 'player', faintedPlayerSpecies: [] }} playerName="Ash" />);

    expect(screen.getByRole('status')).toHaveTextContent('Ash has won the battle!');
    expect(screen.getByRole('status')).toHaveTextContent('Victory!');
    expect(mockPlayBattleVictoryCue).toHaveBeenCalledTimes(1);
  });

  it('uses a natural guest fallback when no player name is available', () => {
    render(<BattleConclusionBanner result={{ winner: 'player', faintedPlayerSpecies: [] }} />);

    expect(screen.getByRole('status')).toHaveTextContent('You have won the battle!');
  });

  it('announces a loss without playing the victory cue', () => {
    render(<BattleConclusionBanner result={{ winner: 'opponent', faintedPlayerSpecies: ['Pikachu'] }} />);

    expect(screen.getByRole('status')).toHaveTextContent('You were defeated.');
    expect(screen.getByRole('status')).toHaveTextContent('The opponent won the battle.');
    expect(mockPlayBattleVictoryCue).not.toHaveBeenCalled();
  });
});
