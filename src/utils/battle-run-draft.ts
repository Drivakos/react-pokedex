import type { RunPokemon } from '../types/battle-run';

export interface DraftFitAnalysis {
  score: number;
  label: 'Starter option' | 'Excellent fit' | 'Strong fit' | 'Balanced fit' | 'Specialist fit';
  newTypes: string[];
  powerDelta: number;
  uniqueAbility: boolean;
}

export interface ReplacementImpact {
  powerDelta: number;
  gainedTypes: string[];
  lostTypes: string[];
}

function teamTypes(party: RunPokemon[]): Set<string> {
  return new Set(party.flatMap(pokemon => pokemon.types));
}

export function analyzeDraftFit(candidate: RunPokemon, party: RunPokemon[]): DraftFitAnalysis {
  if (party.length === 0) {
    return {
      score: candidate.bst,
      label: 'Starter option',
      newTypes: [...candidate.types],
      powerDelta: 0,
      uniqueAbility: true,
    };
  }

  const representedTypes = teamTypes(party);
  const newTypes = candidate.types.filter(type => !representedTypes.has(type));
  const uniqueAbility = !party.some(pokemon => pokemon.ability === candidate.ability);
  const averageBst = Math.round(party.reduce((total, pokemon) => total + pokemon.bst, 0) / party.length);
  const powerDelta = candidate.bst - averageBst;
  const powerScore = Math.max(-15, Math.min(15, powerDelta / 10));
  const score = newTypes.length * 30 + (uniqueAbility ? 8 : 0) + powerScore;
  const label = score >= 50
    ? 'Excellent fit'
    : score >= 25
      ? 'Strong fit'
      : score >= 10
        ? 'Balanced fit'
        : 'Specialist fit';

  return { score, label, newTypes, powerDelta, uniqueAbility };
}

export function getRecommendedDraftChoice(choices: RunPokemon[], party: RunPokemon[]): RunPokemon | null {
  let recommended: RunPokemon | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  choices.forEach(candidate => {
    const score = analyzeDraftFit(candidate, party).score;
    if (score > bestScore) {
      recommended = candidate;
      bestScore = score;
    }
  });

  return recommended;
}

export function analyzeReplacementImpact(
  party: RunPokemon[],
  recruit: RunPokemon,
  replaceIndex: number,
): ReplacementImpact {
  const outgoing = party[replaceIndex];
  if (!outgoing) return { powerDelta: 0, gainedTypes: [], lostTypes: [] };

  const beforeTypes = teamTypes(party);
  const nextParty = party.map((pokemon, index) => index === replaceIndex ? recruit : pokemon);
  const afterTypes = teamTypes(nextParty);

  return {
    powerDelta: recruit.bst - outgoing.bst,
    gainedTypes: [...afterTypes].filter(type => !beforeTypes.has(type)),
    lostTypes: [...beforeTypes].filter(type => !afterTypes.has(type)),
  };
}
