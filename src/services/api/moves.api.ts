import { cacheAside, CACHE_KEYS, CACHE_TTL } from '../../lib/redis';
import { supabase } from '../../lib/supabase';
import { GRAPHQL_ENDPOINT, handleGraphQLResponse } from './base';

/**
 * Fetches Pokemon moves for moveset editor
 */
export const fetchPokemonMoves = async (pokemonId: number) => {
  const cacheKey = `${CACHE_KEYS.POKEMON_MOVES}${pokemonId}`;

  return cacheAside(cacheKey, async () => {
    try {
      const query = `
        query GetPokemonMoves($pokemonId: Int!) {
          pokemon_v2_pokemon_by_pk(id: $pokemonId) {
            moves: pokemon_v2_pokemonmoves(
              where: {
                pokemon_v2_versiongroup: {
                  pokemon_v2_versions: {
                    pokemon_v2_versionnames: {
                      pokemon_v2_language: { name: { _eq: "en" } }
                    }
                  }
                }
              }
              order_by: { level: asc }
            ) {
              move: pokemon_v2_move {
                id
                name
                type: pokemon_v2_type {
                  name
                }
                power
                accuracy
                pp
                damage_class: pokemon_v2_movedamageclass {
                  name
                }
                target: pokemon_v2_movetarget {
                  name
                }
                priority
              }
              level
              pokemon_v2_movelearnmethod {
                name
              }
            }
          }
        }
      `;

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { pokemonId } }),
      });

      const data = await handleGraphQLResponse<any>(response);
      return data.pokemon_v2_pokemon_by_pk.moves || [];
    } catch (error) {
      console.error('Error fetching Pokemon moves:', error);
      throw error;
    }
  }, CACHE_TTL.POKEMON);
};

/**
 * Fetches move details by name
 */
export const fetchMoveDetails = async (moveName: string) => {
  const cacheKey = `${CACHE_KEYS.MOVE_DETAILS}${moveName}`;

  return cacheAside(cacheKey, async () => {
    // 1. Try Supabase Database
    try {
      const { data, error } = await supabase
        .from('moves')
        .select('*')
        .eq('name', moveName)
        .single();
      
      if (data && !error) {
        return {
          ...data,
          effect_entries: [{
            short_effect: data.short_effect || '',
            language: { name: 'en' }
          }],
          flavor_text_entries: [{
            flavor_text: data.flavor_text || '',
            language: { name: 'en' }
          }]
        };
      }
    } catch (error) { /* continue */ }

    // 2. Fetch from direct GraphQL API
    try {
      const query = `
        query GetMoveDetails($moveName: String!) {
          pokemon_v2_move(where: { name: { _eq: $moveName } }) {
            id
            name
            type: pokemon_v2_type {
              name
            }
            power
            accuracy
            pp
            damage_class: pokemon_v2_movedamageclass {
              name
            }
            target: pokemon_v2_movetarget {
              name
            }
            priority
            flavor_text: pokemon_v2_moveflavortexts(
              where: { pokemon_v2_language: { name: { _eq: "en" } } }
              order_by: { pokemon_v2_versiongroup: { id: desc } }
              limit: 1
            ) {
              flavor_text
              language: pokemon_v2_language {
                name
              }
            }
            effect: pokemon_v2_moveeffect {
              effect_text: pokemon_v2_moveeffecteffecttexts(
                where: { pokemon_v2_language: { name: { _eq: "en" } } }
                limit: 1
              ) {
                short_effect
                effect
                language: pokemon_v2_language {
                  name
                }
              }
            }
          }
        }
      `;

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { moveName } }),
      });

      const data = await handleGraphQLResponse<any>(response);
      const move = data.pokemon_v2_move[0];
      
      if (move) {
        const flavorTextEntries = (move.flavor_text || []).map((ft: any) => ({
          flavor_text: ft.flavor_text,
          language: ft.language
        }));

        const effectEntries = move.effect?.effect_text?.map((et: any) => ({
          short_effect: et.short_effect,
          effect: et.effect,
          language: et.language
        })) || [];

        return {
          ...move,
          flavor_text: undefined,
          effect: undefined,
          effect_entries: effectEntries.length > 0 ? effectEntries : [{
            short_effect: '',
            language: { name: 'en' }
          }],
          flavor_text_entries: flavorTextEntries.length > 0 ? flavorTextEntries : [{
            flavor_text: '',
            language: { name: 'en' }
          }]
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching move details:', error);
      throw error;
    }
  }, CACHE_TTL.POKEMON);
};
