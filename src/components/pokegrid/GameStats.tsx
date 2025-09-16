import React from 'react';

interface GameStatsProps {
  score: number;
  solvedCount: number;
  totalCells: number;
  accuracy: number;
  streak: number;
}

export const GameStats: React.FC<GameStatsProps> = ({ 
  score, 
  solvedCount, 
  totalCells, 
  accuracy, 
  streak 
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{score}</div>
        <div className="text-xs text-gray-600">Score</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
          {solvedCount}/{totalCells}
        </div>
        <div className="text-xs text-gray-600">Solved</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-purple-600">
          {accuracy}%
        </div>
        <div className="text-xs text-gray-600">Accuracy</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-orange-600">{streak}</div>
        <div className="text-xs text-gray-600">Streak</div>
      </div>
    </div>
  );
};
