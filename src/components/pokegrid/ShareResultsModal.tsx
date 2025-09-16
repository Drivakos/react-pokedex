import React from 'react';

interface GameResult {
  score: number;
  solvedCount: number;
  totalCells: number;
  accuracy: number;
  totalGuesses: number;
  perfectGame: boolean;
  date: string;
}

interface ShareResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameResult: GameResult;
  gameMode: 'daily' | 'endless';
}

export const ShareResultsModal: React.FC<ShareResultsModalProps> = ({
  isOpen,
  onClose,
  gameResult,
  gameMode
}) => {
  if (!isOpen) return null;

  const handleShare = () => {
    const shareText = `🎯 PokéGrid ${gameResult.date}\n${gameResult.solvedCount}/${gameResult.totalCells} solved • ${gameResult.score} points\n${gameResult.accuracy}% accuracy in ${gameResult.totalGuesses} guesses${gameResult.perfectGame ? ' 🏆' : ''}\n\nPlay at: ${window.location.origin}`;
    
    if (navigator.share) {
      navigator.share({ text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Results copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-800">Share Your Results</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">{gameResult.perfectGame ? '🏆' : '🎯'}</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {gameResult.perfectGame ? 'Perfect Game!' : 'Game Complete!'}
            </h3>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-bold text-green-600">{gameResult.score}</div>
                  <div className="text-gray-600">Score</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">{gameResult.solvedCount}/{gameResult.totalCells}</div>
                  <div className="text-gray-600">Solved</div>
                </div>
                <div>
                  <div className="font-bold text-purple-600">{gameResult.accuracy}%</div>
                  <div className="text-gray-600">Accuracy</div>
                </div>
                <div>
                  <div className="font-bold text-orange-600">{gameResult.totalGuesses}</div>
                  <div className="text-gray-600">Guesses</div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mb-4">
              PokéGrid #{gameResult.date} • {gameMode === 'daily' ? 'Daily' : 'Endless'} Mode
            </div>
            
            <button
              onClick={handleShare}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Share Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
