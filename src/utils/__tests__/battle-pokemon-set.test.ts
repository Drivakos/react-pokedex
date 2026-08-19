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

  it('keeps explicitly itemless sets itemless', () => {
    expect(toPokemonSet({ ...bossPokemon, item: undefined }).item).toBe('');
  });

  it('passes build-specific nature and EV training into the simulator', () => {
    const set = toPokemonSet({
      ...bossPokemon,
      nature: 'Adamant',
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
    });

    expect(set.nature).toBe('Adamant');
    expect(set.evs).toEqual({ hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 });
  });

  it('preserves saved-team IVs and presentation fields', () => {
    const set = toPokemonSet({
      ...bossPokemon,
      nickname: 'Tank',
      ivs: { hp: 31, atk: 0, def: 30, spa: 31, spd: 29, spe: 1 },
      gender: 'F',
      teraType: 'Ghost',
      shiny: true,
    });

    expect(set).toMatchObject({
      name: 'Tank',
      ivs: { hp: 31, atk: 0, def: 30, spa: 31, spd: 29, spe: 1 },
      gender: 'F',
      teraType: 'Ghost',
      shiny: true,
    });
  });
});
