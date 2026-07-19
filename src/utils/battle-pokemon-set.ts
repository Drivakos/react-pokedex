import type { PokemonSet } from '@pkmn/data';
import type { RunPokemon } from '../types/battle-run';

const statTable = (value: number) => ({
  hp: value,
  atk: value,
  def: value,
  spa: value,
  spd: value,
  spe: value,
});

export function toPokemonSet(pokemon: RunPokemon): PokemonSet {
  return {
    name: pokemon.species,
    species: pokemon.species,
    item: pokemon.item ?? '',
    ability: pokemon.ability,
    moves: pokemon.moves,
    nature: 'Hardy',
    gender: '',
    evs: statTable(85),
    ivs: statTable(31),
    level: pokemon.level,
  };
}
