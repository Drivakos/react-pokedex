import { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import type { BattleResult } from '../../types/battle-run';
import { playBattleVictoryCue } from './battle-victory-audio';

function conclusionCopy(winner: BattleResult['winner'], playerName?: string): { title: string; detail: string } {
  const displayName = playerName?.trim() || 'You';

  if (winner === 'player') {
    return {
      title: displayName === 'You' ? 'You have won the battle!' : `${displayName} has won the battle!`,
      detail: 'Victory!',
    };
  }
  if (winner === 'opponent') {
    return {
      title: displayName === 'You' ? 'You were defeated.' : `${displayName} was defeated.`,
      detail: 'The opponent won the battle.',
    };
  }
  return { title: 'Draw', detail: 'The battle ended in a tie.' };
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
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[1px]"
      role="status"
      aria-live="assertive"
    >
      <div className={`battle-event-label flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-2xl ${victory ? 'border-amber-300 bg-amber-400 text-amber-950' : 'border-slate-600 bg-slate-950/95 text-white'}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${victory ? 'bg-white/55' : 'bg-white/10'}`}>
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <strong className="block text-lg font-black leading-tight sm:text-xl">{copy.title}</strong>
          <span className={`block text-[11px] font-bold sm:text-xs ${victory ? 'text-amber-900' : 'text-slate-300'}`}>{copy.detail}</span>
        </span>
      </div>
    </div>
  );
}
