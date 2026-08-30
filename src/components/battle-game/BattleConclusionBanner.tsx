import { useEffect } from 'react';
import type { BattleResult } from '../../types/battle-run';
import { playBattleVictoryCue } from './battle-victory-audio';

function conclusionCopy(winner: BattleResult['winner'], playerName?: string): {
  name?: string;
  message: string;
} {
  const displayName = playerName?.trim() || 'You';

  if (winner === 'player') {
    return {
      name: displayName,
      message: displayName === 'You' ? ' have won the battle!' : ' has won the battle!',
    };
  }
  if (winner === 'opponent') {
    return {
      name: displayName,
      message: displayName === 'You' ? ' were defeated.' : ' was defeated.',
    };
  }
  return { message: 'The battle ended in a draw.' };
}

export function BattleConclusionBanner({ result, playerName }: {
  result: BattleResult;
  playerName?: string;
}) {
  useEffect(() => {
    if (result.winner === 'player') playBattleVictoryCue();
  }, [result.winner]);

  const copy = conclusionCopy(result.winner, playerName);
  const victory = result.winner === 'player';

  return (
    <div
      className="battle-conclusion-overlay pointer-events-none absolute inset-0 z-30 flex items-end justify-center px-4 pb-6 sm:px-8 sm:pb-8"
      role="status"
      aria-live="assertive"
    >
      <div className={`battle-conclusion-dialog ${victory ? 'battle-conclusion-victory' : 'battle-conclusion-neutral'}`}>
        <p className="battle-conclusion-copy">
          {copy.name && <span className="battle-conclusion-name">{copy.name}</span>}
          {copy.message}
        </p>
        <span className="battle-conclusion-cursor" aria-hidden="true" />
      </div>
    </div>
  );
}
