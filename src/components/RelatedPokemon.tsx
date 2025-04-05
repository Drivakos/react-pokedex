import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TYPE_COLORS } from '../types/pokemon';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  sprites: {
    front_default: string;
  };
}

interface RelatedPokemonProps {
  pokemonId?: number;
  pokemonType?: string;
  limit?: number;
  title?: string;
}

const RelatedPokemon: React.FC<RelatedPokemonProps> = ({ 
  pokemonId, 
  pokemonType, 
  limit = 6, 
  title = "Related Pokémon" 
}) => {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRelatedPokemon();
  }, [pokemonId, pokemonType]);

  const fetchRelatedPokemon = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Pokemon data mapping - ID to name and types
      const pokemonData: Record<number, {name: string, types: string[]}> = {
        1: { name: 'bulbasaur', types: ['grass', 'poison'] },
        2: { name: 'ivysaur', types: ['grass', 'poison'] },
        3: { name: 'venusaur', types: ['grass', 'poison'] },
        4: { name: 'charmander', types: ['fire'] },
        5: { name: 'charmeleon', types: ['fire'] },
        6: { name: 'charizard', types: ['fire', 'flying'] },
        7: { name: 'squirtle', types: ['water'] },
        8: { name: 'wartortle', types: ['water'] },
        9: { name: 'blastoise', types: ['water'] },
        25: { name: 'pikachu', types: ['electric'] },
        26: { name: 'raichu', types: ['electric'] },
        37: { name: 'vulpix', types: ['fire'] },
        38: { name: 'ninetales', types: ['fire'] },
        39: { name: 'jigglypuff', types: ['normal', 'fairy'] },
        52: { name: 'meowth', types: ['normal'] },
        54: { name: 'psyduck', types: ['water'] },
        55: { name: 'golduck', types: ['water'] },
        58: { name: 'growlithe', types: ['fire'] },
        59: { name: 'arcanine', types: ['fire'] },
        63: { name: 'abra', types: ['psychic'] },
        64: { name: 'kadabra', types: ['psychic'] },
        65: { name: 'alakazam', types: ['psychic'] },
        94: { name: 'gengar', types: ['ghost', 'poison'] },
        129: { name: 'magikarp', types: ['water'] },
        130: { name: 'gyarados', types: ['water', 'flying'] },
        131: { name: 'lapras', types: ['water', 'ice'] },
        133: { name: 'eevee', types: ['normal'] },
        143: { name: 'snorlax', types: ['normal'] },
        149: { name: 'dragonite', types: ['dragon', 'flying'] },
        150: { name: 'mewtwo', types: ['psychic'] },
        151: { name: 'mew', types: ['psychic'] }
      };
      
      // Create a delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockPokemon: Pokemon[] = [];
      
      // Get Pokemon of the same type if specified
      let relatedIds: number[] = [];
      
      if (pokemonType) {
        // Find Pokemon with the same type
        relatedIds = Object.entries(pokemonData)
          .filter(([id, data]) => {
            return data.types.includes(pokemonType) && Number(id) !== pokemonId;
          })
          .map(([id]) => Number(id))
          .slice(0, limit);
      } else {
        // Just get some random Pokemon
        const baseId = pokemonId ? Math.max(1, pokemonId % 100) : 1;
        for (let i = 0; i < limit; i++) {
          const relatedId = ((baseId + i * 7) % 150) + 1; // Use prime number for distribution
          if (relatedId !== pokemonId && pokemonData[relatedId]) {
            relatedIds.push(relatedId);
          }
        }
      }
      
      // Create Pokemon objects with correct data
      for (const id of relatedIds) {
        if (pokemonData[id]) {
          mockPokemon.push({
            id: id,
            name: pokemonData[id].name,
            types: pokemonData[id].types,
            sprites: {
              front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
            }
          });
        }
      }
      
      setPokemon(mockPokemon);
    } catch (err) {
      console.error('Error fetching related Pokémon:', err);
      setError('Failed to load related Pokémon data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">{title}</h2>
        <div className="flex justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">{title}</h2>
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">{title}</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-component-name="RelatedPokemon">
        {pokemon.map((poke) => (
          <Link 
            key={poke.id} 
            to={`/pokemon/${poke.id}`}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 flex flex-col items-center"
          >
            <div className="w-24 h-24 flex items-center justify-center">
              <img 
                src={poke.sprites.front_default} 
                alt={poke.name} 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-2 text-center">
              <h3 className="font-semibold text-gray-800 capitalize">{poke.name}</h3>
              <div className="flex justify-center gap-1 mt-1">
                {poke.types.map((type) => (
                  <span 
                    key={type} 
                    className={`text-xs px-2 py-1 rounded-full capitalize text-white`}
                    style={{
                      backgroundColor: TYPE_COLORS[type] || '#A8A878'
                    }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedPokemon;
