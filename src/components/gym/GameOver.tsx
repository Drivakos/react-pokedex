import React from 'react';

interface GameOverProps {
  battleWins: number;
  teamSize: number;
  onTryAgain: () => void;
  onExit: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ battleWins, teamSize, onTryAgain, onExit }) => {
  return (
    <div className="p-6 text-center">
      <h2 className="text-3xl font-bold mb-4 text-red-600">Challenge Complete!</h2>
      <p className="text-xl mb-6">
        You defended your gym for {battleWins} victories with a team of {teamSize} Pokémon!
      </p>
      <div className="flex justify-center gap-4">
        <button
          onClick={onTryAgain}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Try Again
        </button>
        <button
          onClick={onExit}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Return to Pokédex
        </button>
      </div>
    </div>
  );
};

export default GameOver; 