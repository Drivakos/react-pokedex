import { Dex } from '@pkmn/sim';

export function calculateMoveEffectiveness(
  moveType: string,
  category: string,
  defenderTypes: string[],
): number | null {
  if (category === 'Status' || defenderTypes.length === 0) return null;
  if (!Dex.getImmunity(moveType, defenderTypes)) return 0;

  return 2 ** Dex.getEffectiveness(moveType, defenderTypes);
}
