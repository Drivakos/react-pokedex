import { cacheAside, CACHE_KEYS, CACHE_TTL } from '../../lib/redis';
import { GRAPHQL_ENDPOINT, handleGraphQLResponse } from './base';
import type { RawPokemonAbilitiesResponse, RawAbilityRaw } from '../../types/api';

export interface AbilityPreviewDetails {
  name: string;
  description: string;
}

/** Loads concise effect text for the abilities used by saved team members. */
export const fetchAbilityPreviewDetails = async (abilityNames: string[]): Promise<AbilityPreviewDetails[]> => {
  const names = [...new Set(abilityNames.map(name => name.trim().toLowerCase()).filter(Boolean))].sort();
  if (names.length === 0) return [];

  const cacheKey = `${CACHE_KEYS.POKEMON_ABILITIES}preview:${names.join(',')}`;
  return cacheAside(cacheKey, async () => {
    const query = `
      query GetAbilityPreviewDetails($abilityNames: [String!]!) {
        pokemon_v2_ability(where: { name: { _in: $abilityNames } }) {
          name
          flavor_text: pokemon_v2_abilityflavortexts(
            where: { pokemon_v2_language: { name: { _eq: "en" } } }
            order_by: { pokemon_v2_versiongroup: { id: desc } }
            limit: 1
          ) {
            flavor_text
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { abilityNames: names } }),
    });
    const data = await handleGraphQLResponse<{
      pokemon_v2_ability: Array<{
        name: string;
        flavor_text: Array<{ flavor_text: string }>;
      }>;
    }>(response);

    return data.pokemon_v2_ability.map(ability => ({
      name: ability.name,
      description: ability.flavor_text[0]?.flavor_text.replace(/\s+/g, ' ').trim() || 'No description available.',
    }));
  }, CACHE_TTL.POKEMON);
};

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
