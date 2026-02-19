import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePokemon } from '../hooks/usePokemon';
import { PokemonDetails } from '../types/pokemon';
import Footer from './Footer';
import PokemonSeoContent from './PokemonSeoContent';
import RelatedPokemon from './RelatedPokemon';
import PokemonCards from './PokemonCards';

// New specialized components
import { PokemonPageSEO } from './pokemon-page/PokemonPageSEO';
import { PokemonPageHeader } from './pokemon-page/PokemonPageHeader';
import { PokemonHero } from './pokemon-page/PokemonHero';
import { PokemonStatsTab } from './pokemon-page/PokemonStatsTab';
import { PokemonMovesTab } from './pokemon-page/PokemonMovesTab';
import { PokemonEvolutionTab } from './pokemon-page/PokemonEvolutionTab';

const PokemonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getPokemonDetails } = usePokemon({ skipFetch: true });
  
  const [pokemonDetails, setPokemonDetails] = useState<PokemonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'moves' | 'evolution'>('stats');

  useEffect(() => {
    const fetchPokemonData = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      try {
        const detailedData = await getPokemonDetails(parseInt(id, 10));
        setPokemonDetails(detailedData);
      } catch (err) {
        console.error('Error fetching Pokémon details:', err);
        setError('Failed to load Pokémon data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPokemonData();
  }, [id, getPokemonDetails]);

  const formattedId = useMemo(() => {
    return pokemonDetails ? String(pokemonDetails.id).padStart(3, '0') : '';
  }, [pokemonDetails]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading Pokémon data...</p>
        </div>
      </div>
    );
  }

  if (error || !pokemonDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{error ? 'Error' : 'Pokémon Not Found'}</h2>
          <p className="text-gray-700 mb-6">{error || "We couldn't find the Pokémon you're looking for."}</p>
          <a href="/" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
            Back to Pokédex
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PokemonPageSEO pokemonDetails={pokemonDetails} formattedId={formattedId} />
      
      <PokemonPageHeader 
        name={pokemonDetails.name} 
        formattedId={formattedId} 
        id={pokemonDetails.id} 
      />

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          
          <PokemonHero pokemonDetails={pokemonDetails} formattedId={formattedId} />

          {/* Tabs Navigation */}
          <div className="border-b">
            <div className="flex">
              <button
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'stats'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('stats')}
              >
                Stats & Info
              </button>
              <button
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'moves'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('moves')}
              >
                Moves
              </button>
              <button
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'evolution'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('evolution')}
              >
                Evolution
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'stats' && <PokemonStatsTab pokemonDetails={pokemonDetails} />}
            {activeTab === 'moves' && <PokemonMovesTab pokemonDetails={pokemonDetails} />}
            {activeTab === 'evolution' && <PokemonEvolutionTab pokemonDetails={pokemonDetails} />}
          </div>
        </div>

        <div className="mt-8">
          <PokemonSeoContent pokemon={pokemonDetails} />
          
          <div className="text-sm text-gray-500 flex justify-between mt-6 mb-2">
            <div>
              <span className="font-medium">Published:</span> April 1, 2025
            </div>
            <div>
              <span className="font-medium">Last Modified:</span> April 7, 2025
            </div>
          </div>
          
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Pokémon Trading Cards</h2>
            <PokemonCards pokemonName={pokemonDetails.name} pokemonId={pokemonDetails.id} />
          </div>
          
          {pokemonDetails.types?.[0] && (
            <RelatedPokemon 
              pokemonId={pokemonDetails.id}
              pokemonType={pokemonDetails.types[0]}
              limit={12}
              title={`Other ${pokemonDetails.types[0].charAt(0).toUpperCase() + pokemonDetails.types[0].slice(1)}-type Pokémon`}
            />
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PokemonPage;
