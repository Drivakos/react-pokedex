import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Pokemon, Filters, RawPokemonData } from './types/pokemon';
import { PokemonCard } from './components/PokemonCard';
import { PokemonDetail } from './components/PokemonDetail';
import { FilterPanel } from './components/FilterPanel';

const POKEMON_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const GRAPHQL_ENDPOINT = 'https://beta.pokeapi.co/graphql/v1beta';

function App() {
  const [displayedPokemon, setDisplayedPokemon] = useState<Pokemon[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const loadingRef = useRef(false);

  const [filters, setFilters] = useState<Filters>({
    types: [],
    moves: [],
    generation: '',
    weight: { min: 0, max: 0 },
    height: { min: 0, max: 0 },
    hasEvolutions: null,
  });

  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableMoves, setAvailableMoves] = useState<string[]>([]);

  const buildWhereConditions = (searchTerm: string, filters: Filters) => {
    const conditions = {
      types: filters.types.length > 0
        ? `pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _in: ${JSON.stringify(filters.types)} } } }`
        : '',
      
      moves: filters.moves.length > 0
        ? `pokemon_v2_pokemonmoves: { pokemon_v2_move: { name: { _in: ${JSON.stringify(filters.moves)} } } }`
        : '',
  
      generation: filters.generation
        ? `pokemon_v2_pokemonspecy: { pokemon_v2_generation: { name: { _eq: ${JSON.stringify(filters.generation)} } } }`
        : '',
  
      name: searchTerm
        ? `name: { _ilike: ${JSON.stringify(`%${searchTerm.toLowerCase()}%`)} }`
        : '',
  
      weight: filters.weight.min > 0 || filters.weight.max > 0
        ? `weight: { ${filters.weight.min > 0 ? `_gte: ${filters.weight.min},` : ''} ${filters.weight.max > 0 ? `_lte: ${filters.weight.max}` : ''} }`
        : '',
  
      height: filters.height.min > 0 || filters.height.max > 0
        ? `height: { ${filters.height.min > 0 ? `_gte: ${filters.height.min},` : ''} ${filters.height.max > 0 ? `_lte: ${filters.height.max}` : ''} }`
        : '',
  
      evolution: filters.hasEvolutions !== null
        ? `pokemon_v2_pokemonspecy: {
            pokemon_v2_evolutionchain: {
              pokemon_v2_pokemonspecies_aggregate: {
                count: ${filters.hasEvolutions ? 'gt: 1' : 'equals: 1'}
              }
            }
          }`
        : '',
    };
  
    return Object.values(conditions).filter(Boolean).join(', ');
  };
  
  const fetchPokemonDetails = async (offset: number) => {
    try {
      const whereConditions = buildWhereConditions(debouncedSearchTerm, filters);
      const typeAndCondition = filters.types.length > 0 
        ? `_and: [${filters.types.map(type => 
            `{ pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _eq: ${JSON.stringify(type)} } } } }`
          ).join(',')}]`
        : '';
  
      const query = `
        query GetFilteredPokemon($limit: Int!, $offset: Int!) {
          pokemon_v2_pokemon(
            limit: $limit, 
            offset: $offset, 
            order_by: {id: asc}
            where: {
              ${whereConditions}
              ${typeAndCondition}
              pokemon_v2_pokemonforms: { 
                is_default: { _eq: true }
              }
            }
          ) {
            id
            name
            height
            weight
            is_default
            base_experience
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
              pokemon_v2_pokemons {
                pokemon_v2_pokemonforms {
                  form_name
                  is_default
                }
              }
              pokemon_v2_evolutionchain {
                pokemon_v2_pokemonspecies {
                  name
                }
              }
            }
            forms: pokemon_v2_pokemonforms {
              form_name
              is_default
            }
          }
        }
      `;
  
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { limit: POKEMON_PER_PAGE, offset } }),
      });
  
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
  
      const rawPokemon = result.data.pokemon_v2_pokemon as RawPokemonData[];
      
      return rawPokemon.map(p => ({
        id: p.id,
        name: p.name,
        height: p.height,
        weight: p.weight,
        types: p.types.map(t => t.type.name),
        moves: p.moves.map(m => m.move.name),
        sprites: p.sprites[0]?.data || {},
        generation: p.species?.generation?.name || 'unknown',
        has_evolutions: p.species?.pokemon_v2_pokemons?.some(pokemon => 
          pokemon.pokemon_v2_pokemonforms?.some(form => form.form_name !== "None")
        ),
        is_default: p.is_default,
        base_experience: p.base_experience,
      }));
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    const fetchInitialPokemon = async () => {
      try {
        if (initialLoad) {
          setLoading(true);
          setLoadingProgress(0);
        }
        const initialPokemon = await fetchPokemonDetails(0);
        setDisplayedPokemon(initialPokemon);
        setHasMore(initialPokemon.length === POKEMON_PER_PAGE);
        setPage(0);
      } catch (error) {
        throw error;
      } finally {
        if (initialLoad) {
          setLoading(false);
          setLoadingProgress(100);
          setInitialLoad(false);
        }
        setIsSearching(false);
      }
    };

    fetchInitialPokemon();
  }, [debouncedSearchTerm, filters, initialLoad]);

  useEffect(() => {
    const fetchTypesAndMoves = async () => {
      const query = `
        query GetAllTypesAndMoves {
          pokemon_v2_type(where: {pokemon_v2_pokemontypes: {pokemon_v2_pokemon: {}}}) {
            name
          }
          pokemon_v2_move(where: {pokemon_v2_pokemonmoves: {pokemon_v2_pokemon: {}}}) {
            name
          }
        }
      `;

      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        const result = await response.json();
        if (result.errors) {
          throw new Error(result.errors[0].message);
        }

        const types = result.data.pokemon_v2_type.map((t: { name: string }) => t.name).sort();
        const moves = result.data.pokemon_v2_move.map((m: { name: string }) => m.name).sort();
        setAvailableTypes(types);
        setAvailableMoves(moves);
      } catch (error) {
        console.error('Error fetching types and moves:', error);
      }
    };

    fetchTypesAndMoves();
  }, []);

  const loadMorePokemon = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    
    try {
      const nextPage = page + 1;
      const morePokemon = await fetchPokemonDetails(nextPage * POKEMON_PER_PAGE);
      
      if (morePokemon.length > 0) {
        setDisplayedPokemon(prev => [...prev, ...morePokemon]);
        setPage(nextPage);
        setHasMore(morePokemon.length === POKEMON_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      throw error;
    } finally {
      loadingRef.current = false;
    }
  }, [hasMore, page, debouncedSearchTerm, filters, POKEMON_PER_PAGE]);

  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry && lastEntry.isIntersecting && !loadingRef.current && hasMore) {
          loadMorePokemon();
        }
      },
      { threshold: 0.5 }
    );

    const lastElement = document.querySelector('.pokemon-card:last-child');
    if (lastElement) {
      observer.observe(lastElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [displayedPokemon, loadMorePokemon, hasMore, loading]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {loading && initialLoad ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="mt-4 text-gray-600">Loading Pokémon...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          {selectedPokemon && (
            <PokemonDetail
              pokemon={selectedPokemon}
              onClose={() => setSelectedPokemon(null)}
            />
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Pokémon..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isSearching ? 'bg-gray-50' : 'bg-white'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                </div>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Search size={20} />
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

          {displayedPokemon.length === 0 && !isSearching && (
            <div className="text-center text-gray-500 mt-8">
              {searchTerm ? `No Pokémon found matching "${searchTerm}"` : 'No Pokémon found matching your criteria'}
            </div>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 transition-opacity duration-300 ${
            isSearching ? 'opacity-50' : 'opacity-100'
          }`}>
            {displayedPokemon.map((pokemon) => (
              <div
                key={pokemon.id}
                className="pokemon-card"
                onClick={() => setSelectedPokemon(pokemon)}
              >
                <PokemonCard 
                  pokemon={pokemon}
                  onClick={() => setSelectedPokemon(pokemon)}
                />
              </div>
            ))}
          </div>

          {!initialLoad && loadingRef.current && displayedPokemon.length > 0 && !isSearching && (
            <div className="flex justify-center items-center mt-8 mb-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;