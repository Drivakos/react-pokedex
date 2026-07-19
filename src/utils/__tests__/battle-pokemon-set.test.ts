import type { RunPokemon } from '../../types/battle-run';
import { toPokemonSet } from '../battle-pokemon-set';

const bossPokemon: RunPokemon = {
  id: 143,
  species: 'Snorlax',
  level: 25,
  types: ['Normal'],
  ability: 'Thick Fat',
  moves: ['Body Slam', 'Crunch'],
  bst: 540,
  item: 'Sitrus Berry',
};

describe('Showdown Pokémon set adapter', () => {
  it('passes a boss held item into the simulator team set', () => {
    expect(toPokemonSet(bossPokemon)).toMatchObject({
      species: 'Snorlax',
      level: 25,
      item: 'Sitrus Berry',
      ability: 'Thick Fat',
      moves: ['Body Slam', 'Crunch'],
    });
  });

  it('keeps ordinary recruits itemless', () => {
    expect(toPokemonSet({ ...bossPokemon, item: undefined }).item).toBe('');
  });
});
