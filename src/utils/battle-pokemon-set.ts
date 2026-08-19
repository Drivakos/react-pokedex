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
    name: pokemon.nickname || pokemon.species,
    species: pokemon.species,
    item: pokemon.item ?? '',
    ability: pokemon.ability,
    moves: pokemon.moves,
    nature: pokemon.nature ?? 'Hardy',
    gender: pokemon.gender ?? '',
    evs: pokemon.evs ?? statTable(85),
    ivs: pokemon.ivs ?? statTable(31),
    level: pokemon.level,
    ...(pokemon.teraType ? { teraType: pokemon.teraType } : {}),
    ...(pokemon.shiny !== undefined ? { shiny: pokemon.shiny } : {}),
  };
}
