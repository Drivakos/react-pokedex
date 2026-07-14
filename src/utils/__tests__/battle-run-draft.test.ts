import type { RunPokemon } from '../../types/battle-run';
import { analyzeDraftFit, analyzeReplacementImpact, getRecommendedDraftChoice } from '../battle-run-draft';

const pokemon = (
  species: string,
  types: string[],
  bst: number,
  ability: string,
): RunPokemon => ({
  id: bst,
  species,
  level: 20,
  types,
  ability,
  moves: ['Tackle'],
  bst,
});

describe('battle run draft analysis', () => {
  const charizard = pokemon('Charizard', ['Fire', 'Flying'], 534, 'Blaze');
  const raichu = pokemon('Raichu', ['Electric'], 485, 'Static');
  const party = [charizard, raichu];

  it('prioritizes new team typing when recommending a recruit', () => {
    const milotic = pokemon('Milotic', ['Water'], 540, 'Marvel Scale');
    const arcanine = pokemon('Arcanine', ['Fire'], 555, 'Intimidate');
    const fit = analyzeDraftFit(milotic, party);

    expect(fit).toMatchObject({ label: 'Strong fit', newTypes: ['Water'], uniqueAbility: true });
    expect(fit.powerDelta).toBe(30);
    expect(getRecommendedDraftChoice([arcanine, milotic], party)).toBe(milotic);
  });

  it('reports the exact power and type coverage changed by a replacement', () => {
    const milotic = pokemon('Milotic', ['Water'], 540, 'Marvel Scale');
    const replacingCharizard = analyzeReplacementImpact(party, milotic, 0);
    const replacingRaichu = analyzeReplacementImpact(party, milotic, 1);

    expect(replacingCharizard).toEqual({
      powerDelta: 6,
      gainedTypes: ['Water'],
      lostTypes: ['Fire', 'Flying'],
    });
    expect(replacingRaichu).toEqual({
      powerDelta: 55,
      gainedTypes: ['Water'],
      lostTypes: ['Electric'],
    });
  });

  it('handles an invalid replacement without inventing an impact', () => {
    expect(analyzeReplacementImpact(party, charizard, 99)).toEqual({
      powerDelta: 0,
      gainedTypes: [],
      lostTypes: [],
    });
  });
});
