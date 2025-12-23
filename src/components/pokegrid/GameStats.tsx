import React from 'react';

interface GameStatsProps {
  score: number;
  totalGuesses: number;
  maxTotalGuesses: number;
  bonusRetries?: number;
  perfectGame?: boolean;
}

export const GameStats: React.FC<GameStatsProps> = ({
  score,
  totalGuesses,
  maxTotalGuesses,
  bonusRetries = 0,
  perfectGame = false
}) => {
  const effectiveMaxGuesses = maxTotalGuesses + bonusRetries;
  const guessesRemaining = effectiveMaxGuesses - totalGuesses;
  
  return (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{score}</div>
        <div className="text-xs text-gray-600">Score</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">{guessesRemaining}</div>
        <div className="text-xs text-gray-600">Guesses Left</div>
      </div>
    </div>
  );
};
