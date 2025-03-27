import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter } from 'lucide-react';
import { Pokemon, Filters } from './types/pokemon';
import { PokemonCard } from './components/PokemonCard';
import { PokemonDetail } from './components/PokemonDetail';
import { FilterPanel } from './components/FilterPanel';

function App() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<Pokemon[]>([]);
  const [displayedPokemon, setDisplayedPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPokemonRef = useRef<HTMLDivElement | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const POKEMON_PER_PAGE = 30;

  const fetchPokemonDetails = async (offset: number) => {
    try {
      const limit = POKEMON_PER_PAGE;
      const query = `
        query GetFullPokemonData($limit: Int!, $offset: Int!) {
          pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) {
            id
            name
            height
            weight
            types: pokemon_v2_pokemontypes {
              type: pokemon_v2_type {
                name
              }
            }
            moves: pokemon_v2_pokemonmoves {
              move: pokemon_v2_move {
                name
              }
            }
            sprites: pokemon_v2_pokemonsprites {
              data: sprites
            }
            species: pokemon_v2_pokemonspecy {
              generation: pokemon_v2_generation {
                name
              }
              evolution_chain_id
              evolves_from_species_id
            }
          }
        }
      `;

      console.log(`Fetching Pokemon from offset ${offset}...`);
      const response = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          variables: {
            limit,
            offset
          },
          operationName: 'GetFullPokemonData'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL Errors:', data.errors);
        throw new Error(data.errors[0].message);
      }

      if (!data.data) {
        throw new Error('Invalid response structure');
      }

      const formattedPokemon = data.data.pokemon_v2_pokemon.map((p: any) => ({
        id: p.id,
        name: p.name,
        height: p.height,
        weight: p.weight,
        types: p.types.map((t: any) => t.type.name),
        moves: p.moves.map((m: any) => ({
          move: { name: m.move.name }
        })),
        sprites: p.sprites[0]?.data || {},
        generation: p.species?.generation?.name || 'unknown',
        has_evolutions: Boolean(p.species?.evolution_chain_id),
        can_mega_evolve: false,
      }));

      setHasMore(formattedPokemon.length === limit);
      return formattedPokemon;
    } catch (error) {
      console.error('Error fetching Pokemon list:', error);
      throw error;
    }
  };

  const [filters, setFilters] = useState<Filters>({
    types: [],
    moves: [],
    generation: '',
    weight: { min: 0, max: 0 },
    height: { min: 0, max: 0 },
    canMegaEvolve: null,
    hasEvolutions: null,
  });

  const applyFilters = (pokemon: Pokemon, searchTerm: string, filters: Filters): boolean => {
    // Name search
    if (searchTerm && !pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filters.types.length > 0 && !pokemon.types.some(type => filters.types.includes(type))) {
      return false;
    }

    // Move filter
    if (filters.moves.length > 0 && !pokemon.moves.some(move => filters.moves.includes(move.move.name))) {
      return false;
    }

    // Generation filter
    if (filters.generation && pokemon.generation !== filters.generation) {
      return false;
    }

    // Weight filter
    if (filters.weight.min > 0 && pokemon.weight < filters.weight.min) return false;
    if (filters.weight.max > 0 && pokemon.weight > filters.weight.max) return false;

    // Height filter
    if (filters.height.min > 0 && pokemon.height < filters.height.min) return false;
    if (filters.height.max > 0 && pokemon.height > filters.height.max) return false;

    // Evolution filter
    if (filters.hasEvolutions !== null && pokemon.has_evolutions !== filters.hasEvolutions) {
      return false;
    }

    // Mega evolution filter
    if (filters.canMegaEvolve !== null && pokemon.can_mega_evolve !== filters.canMegaEvolve) {
      return false;
    }

    return true;
  };

  useEffect(() => {
    const fetchInitialPokemon = async () => {
      try {
        setLoading(true);
        setLoadingProgress(0);
        const initialPokemon = await fetchPokemonDetails(0);
        setPokemon(initialPokemon);
        const filtered = initialPokemon.filter((p: Pokemon) => applyFilters(p, searchTerm, filters));
        setFilteredPokemon(filtered);
        setDisplayedPokemon(filtered.slice(0, POKEMON_PER_PAGE));
        setHasMore(initialPokemon.length >= POKEMON_PER_PAGE);
      } catch (error) {
        console.error('Error in initial Pokemon fetch:', error);
      } finally {
        setLoading(false);
        setLoadingProgress(100);
      }
    };

    fetchInitialPokemon();
  }, []);

  useEffect(() => {
    const filtered = pokemon.filter(p => applyFilters(p, searchTerm, filters));
    setFilteredPokemon(filtered);
    setDisplayedPokemon(filtered.slice(0, POKEMON_PER_PAGE));
    setHasMore(filtered.length > POKEMON_PER_PAGE);
  }, [searchTerm, filters, pokemon]);

  const loadMorePokemon = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    
    try {
      const nextOffset = pokemon.length;
      const newPokemon = await fetchPokemonDetails(nextOffset);
      
      // Update main pokemon list
      setPokemon(prev => [...prev, ...newPokemon]);
      
      // Process new pokemon through filters
      const newFiltered = newPokemon.filter(p => applyFilters(p, searchTerm, filters));
      
      // Update filtered and displayed lists
      setFilteredPokemon(prev => [...prev, ...newFiltered]);
      setDisplayedPokemon(prev => [...prev, ...newFiltered]);
      
      // Check if we have more data
      setHasMore(newPokemon.length === POKEMON_PER_PAGE);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [hasMore, pokemon.length, searchTerm, filters]);

  useEffect(() => {
    if (displayedPokemon.length === 0) return;
  
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadMorePokemon();
        }
      },
      { threshold: 0.1 }
    );
  
    const lastElement = document.querySelector('.pokemon-card:last-child');
    if (lastElement) observer.observe(lastElement);
  
    return () => observer.disconnect();
  }, [displayedPokemon, loadMorePokemon]);

  useEffect(() => {
    if (lastPokemonRef.current && observerRef.current) {
      observerRef.current.observe(lastPokemonRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [displayedPokemon]);

  const availableTypes = Array.from(new Set(pokemon.flatMap(p => p.types))).sort();
  const availableMoves = Array.from(
    new Set(pokemon.flatMap(p => p.moves.map(m => m.move.name)))
  ).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold mb-4">Loading Pokédex...</div>
        <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <div className="mt-2 text-gray-600">{loadingProgress}% Complete</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Pokédex</h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Pokémon..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Filter size={20} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            availableTypes={availableTypes}
            availableMoves={availableMoves}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayedPokemon.map((pokemon, index) => (
            <div
              key={pokemon.id}
              className="pokemon-card transition-opacity duration-300 ease-in-out"
              ref={index === displayedPokemon.length - 1 ? lastPokemonRef : null}
              style={{ marginBottom: index === displayedPokemon.length - 1 ? '200px' : undefined }}
            >
              <PokemonCard
                pokemon={pokemon}
                onClick={() => setSelectedPokemon(pokemon)}
              />
            </div>
          ))}
        </div>

        {displayedPokemon.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No Pokémon found matching your criteria
          </div>
        )}

        {loadingRef.current && (
          <div className="flex justify-center items-center mt-8 mb-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {selectedPokemon && (
          <PokemonDetail
            pokemon={selectedPokemon}
            onClose={() => setSelectedPokemon(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;