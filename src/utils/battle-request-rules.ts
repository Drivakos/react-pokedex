import type { BattleDecision } from '../types/battle-run';

interface ActiveTrapState {
  trapped?: boolean;
  maybeTrapped?: boolean;
}

interface ActiveMoveState {
  moves?: Array<{
    pp?: number;
    maxpp?: number;
  }>;
}

export function isSwitchingBlocked(active: ActiveTrapState | null | undefined): boolean {
  return active?.trapped === true;
}

export function isTrappedSwitchError(message: string): boolean {
  return /can't switch:.*active pok(?:e|é)mon is trapped/i.test(message);
}

export function isForcedMoveRequest(active: ActiveMoveState | null | undefined): boolean {
  const moves = active?.moves;
  if (moves?.length !== 1) return false;

  // Showdown omits PP data when the simulator has already locked in the action,
  // including the second turn of Fly and recharge turns. A Pokémon that simply
  // has one selectable move still receives the normal PP-bearing move payload.
  return !('pp' in moves[0]) && !('maxpp' in moves[0]);
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
