import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TYPE_COLORS } from '../types/pokemon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PokemonImage from './PokemonImage';
import pokemonDb from '../data/pokemon-db.json';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
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
  limit = 10, 
  title = "Related Pokémon" 
}) => {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const fetchRelatedPokemon = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Get all potential candidates
      let candidates: any[] = [];
      
      if (pokemonType) {
        candidates = (pokemonDb as any[]).filter(p => 
          p.types.includes(pokemonType) && p.id !== pokemonId && p.id < 10000
        );
      } else if (pokemonId) {
        candidates = (pokemonDb as any[]).filter(p => p.id !== pokemonId && p.id < 10000);
      } else {
        candidates = (pokemonDb as any[]).filter(p => p.id < 10000);
      }

      // 2. Fisher-Yates Shuffle for unbiased randomness
      const shuffled = [...candidates];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // 3. Take the first 'limit' items from the shuffled list
      const results: Pokemon[] = shuffled.slice(0, limit).map(p => ({
        id: p.id,
        name: p.name,
        types: p.types
      }));
      
      setPokemon(results);
    } catch (error) {
      console.error('Error fetching related Pokemon:', error);
      setError('Failed to load related Pokémon');
    } finally {
      setLoading(false);
    }
  }, [pokemonId, pokemonType, limit]);

  useEffect(() => {
    fetchRelatedPokemon();
  }, [fetchRelatedPokemon]);
  
  useEffect(() => {
    // Check if we need to show carousel controls
    const checkOverflow = () => {
      if (carouselRef.current) {
        const { scrollWidth, clientWidth } = carouselRef.current;
        setShowControls(scrollWidth > clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [pokemon]);

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

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const scrollAmount = clientWidth * 0.8; // Scroll 80% of the visible width
      
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollLeft - scrollAmount)
        : scrollLeft + scrollAmount;
      
      carouselRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      
      setScrollPosition(newPosition);
    }
  };

  const handleScroll = () => {
    if (carouselRef.current) {
      setScrollPosition(carouselRef.current.scrollLeft);
    }
  };

  return (
    <div className="mt-8">
      {pokemon.length > 0 ? (
        <>
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">{title}</h2>
          
          <div className="relative">
            {showControls && scrollPosition > 0 && (
              <button 
                onClick={() => scroll('left')} 
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-1 shadow-md"
                aria-label="Scroll left"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            
            <div 
              ref={carouselRef}
              className="flex overflow-x-auto pb-4 hide-scrollbar" 
              data-component-name="RelatedPokemon"
              onScroll={handleScroll}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {pokemon.map((poke) => (
                <Link 
                  key={poke.id} 
                  to={`/pokemon/${poke.id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 flex flex-col items-center flex-shrink-0 mx-2 first:ml-0 last:mr-0"
                  style={{ width: 'calc(50% - 16px)', maxWidth: '180px' }}
                >
                  <div className="w-24 h-24 flex items-center justify-center">
                    <PokemonImage 
                      pokemonId={poke.id} 
                      pokemonName={poke.name} 
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
            
            {showControls && carouselRef.current && scrollPosition < (carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 10) && (
              <button 
                onClick={() => scroll('right')} 
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-1 shadow-md"
                aria-label="Scroll right"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default RelatedPokemon;