import React, { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const startValue = displayValue;
      const difference = value - startValue;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Use ease-out cubic animation curve
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (difference * easedProgress));

        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, displayValue, duration]);

  return (
    <span className={`${className} ${isAnimating ? 'text-yellow-500' : ''}`}>
      {displayValue.toLocaleString()}
    </span>
  );
};

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
    <div className="flex items-center justify-center gap-4 md:gap-6">
      <div className="text-center">
        <div className="text-xl md:text-2xl font-bold text-green-600">
          <AnimatedCounter value={score} />
        </div>
        <div className="text-xs text-gray-600">Score</div>
      </div>
      <div className="text-center">
        <div className="text-xl md:text-2xl font-bold text-orange-600">{guessesRemaining}</div>
        <div className="text-xs text-gray-600">Guesses Left</div>
      </div>
    </div>
  );
};
