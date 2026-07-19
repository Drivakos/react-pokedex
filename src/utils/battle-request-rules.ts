import type { BattleDecision } from '../types/battle-run';

interface ActiveTrapState {
  trapped?: boolean;
  maybeTrapped?: boolean;
}

export function isSwitchingBlocked(active: ActiveTrapState | null | undefined): boolean {
  return active?.trapped === true;
}

export function isTrappedSwitchError(message: string): boolean {
  return /can't switch:.*active pok(?:e|é)mon is trapped/i.test(message);
}

export function canSubmitMove(decision: BattleDecision, slot: number): boolean {
  return decision.kind === 'move'
    && decision.moves.some(move => move.slot === slot && !move.disabled);
}

export function canSubmitSwitch(decision: BattleDecision, slot: number): boolean {
  return decision.kind !== 'wait'
    && !decision.switchingBlocked
    && decision.switches.some(choice => choice.slot === slot && !choice.active && !choice.fainted);
}
