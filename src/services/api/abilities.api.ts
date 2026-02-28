import { cacheAside, CACHE_KEYS, CACHE_TTL } from '../../lib/redis';
import { GRAPHQL_ENDPOINT, handleGraphQLResponse } from './base';
import type { RawPokemonAbilitiesResponse, RawAbilityRaw } from '../../types/api';

/**
 * Fetches Pokemon abilities
 */
export const fetchPokemonAbilities = async (pokemonId: number) => {
  const cacheKey = `${CACHE_KEYS.POKEMON_ABILITIES}${pokemonId}`;

  return cacheAside(cacheKey, async () => {
    try {
      const query = `
        query GetPokemonAbilities($pokemonId: Int!) {
          pokemon_v2_pokemon_by_pk(id: $pokemonId) {
            abilities: pokemon_v2_pokemonabilities {
              ability: pokemon_v2_ability {
                id
                name
              }
              is_hidden
            }
          }
        }
      `;

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { pokemonId } }),
      });

      const data = await handleGraphQLResponse<RawPokemonAbilitiesResponse>(response);

      return (data.pokemon_v2_pokemon_by_pk?.abilities ?? []).map((ability: RawAbilityRaw) => ({
        ...ability,
        ability: {
          ...ability.ability,
          effect_entries: [{
            short_effect: 'Ability description',
            language: { name: 'en' }
          }]
        }
      })) || [];
    } catch (error) {
      console.error('Error fetching Pokemon abilities:', error);
      throw error;
    }
  }, CACHE_TTL.POKEMON);
};
