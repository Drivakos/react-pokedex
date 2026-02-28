import { cacheAside, CACHE_KEYS, CACHE_TTL } from '../../lib/redis';
import { GRAPHQL_ENDPOINT, handleGraphQLResponse } from './base';
import type { RawItemsResponse, RawItemData } from '../../types/api';

/**
 * Fetches competitive items
 */
export const fetchCompetitiveItems = async () => {
  const cacheKey = CACHE_KEYS.COMPETITIVE_ITEMS;

  return cacheAside(cacheKey, async () => {
    try {
      const competitiveItems = [
        'Choice Band', 'Choice Specs', 'Choice Scarf',
        'Leftovers', 'Heavy-Duty Boots', 'Assault Vest',
        'Rocky Helmet', 'Black Sludge', 'Life Orb',
        'Expert Belt', 'Muscle Band', 'Wise Glasses',
        'Focus Sash', 'Focus Band', 'Sitrus Berry',
        'Lum Berry', 'Chesto Berry', 'Leppa Berry',
        'Liechi Berry', 'Ganlon Berry', 'Salac Berry',
        'Petaya Berry', 'Apicot Berry', 'Occa Berry',
        'Passho Berry', 'Wacan Berry', 'Rindo Berry',
        'Yache Berry', 'Chople Berry', 'Kebia Berry',
        'Shuca Berry', 'Coba Berry', 'Payapa Berry',
        'Tanga Berry', 'Charti Berry', 'Kasib Berry',
        'Haban Berry', 'Colbur Berry', 'Babiri Berry',
        'Chilan Berry', 'Roseli Berry', 'Air Balloon',
        'Mental Herb', 'Power Herb', 'Quick Claw',
        'King\'s Rock', 'Razor Claw', 'Scope Lens',
        'Wide Lens', 'Zoom Lens', 'Flame Orb',
        'Toxic Orb', 'Electric Seed', 'Grassy Seed',
        'Misty Seed', 'Psychic Seed', 'Heat Rock',
        'Damp Rock', 'Smooth Rock', 'Icy Rock',
        'Eject Button', 'Red Card', 'Shed Shell',
        'Safety Goggles', 'Protective Pads', 'Clear Amulet',
        'Covert Cloak', 'Loaded Dice', 'Booster Energy',
        'Mirror Herb', 'Punching Glove'
      ];

      const query = `
        query GetCompetitiveItems($itemNames: [String!]!) {
          pokemon_v2_item(where: { name: { _in: $itemNames } }) {
            id
            name
            cost
            category: pokemon_v2_itemcategory {
              name
            }
          }
        }
      `;

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { itemNames: competitiveItems } }),
      });

      const data = await handleGraphQLResponse<RawItemsResponse>(response);

      return data.pokemon_v2_item.map((item: RawItemData) => ({
        ...item,
        effect_entries: [{
          short_effect: 'Competitive battle item',
          language: { name: 'en' }
        }],
        flavor_text_entries: [{
          flavor_text: 'Competitive battle item'
        }]
      })) || [];
    } catch (error) {
      console.error('Error fetching competitive items:', error);
      throw error;
    }
  }, CACHE_TTL.POKEMON);
};
