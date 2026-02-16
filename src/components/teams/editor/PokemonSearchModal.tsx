import React from 'react';
import { Search } from 'lucide-react';
import PokemonImage from '../../PokemonImage';

interface PokemonSearchModalProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: any[];
  onAddPokemon: (pokemon: any) => void;
  onClose: () => void;
  formatName: (name: string) => string;
}

export const PokemonSearchModal: React.FC<PokemonSearchModalProps> = ({
  searchQuery,
  onSearchChange,
  searchResults,
  onAddPokemon,
  onClose,
  formatName
}) => {
  const getTypeColor = (typeName: string) => {
    const typeColors: Record<string, string> = {
      normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
      grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
      ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
      rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
      steel: '#B8B8D0', fairy: '#EE99AC',
    };
    return typeColors[typeName] || '#68A090';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="sd-panel" style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="sd-header">
          <span style={{ fontWeight: 'bold', flex: 1 }}>Add Pokémon to Team</span>
          <button className="sd-header-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sd-search-bar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: 6, color: '#999' }} />
            <input
              className="sd-search-input"
              style={{ paddingLeft: 28 }}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pokémon"
              autoFocus
            />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {searchResults.length > 0 ? (
            <table className="sd-search-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Types</th>
                  <th>HP</th>
                  <th>Atk</th>
                  <th>Def</th>
                  <th>SpA</th>
                  <th>SpD</th>
                  <th>Spe</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((pokemon) => (
                  <tr key={pokemon.id} onClick={() => onAddPokemon(pokemon)}>
                    <td style={{ width: 32 }}>
                      <PokemonImage pokemonId={pokemon.id} alt={pokemon.name} className="w-6 h-6" />
                    </td>
                    <td className="sd-pokemon-name">{formatName(pokemon.name)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {pokemon.types?.map((t: any, i: number) => {
                          const typeName = t.type?.name || (typeof t === 'string' ? t : '');
                          return (
                            <span key={i} className="sd-type-badge" style={{ backgroundColor: getTypeColor(typeName) }}>
                              {typeName}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="sd-stat-cell">{pokemon.stats?.find((s: any) => s.stat?.name === 'hp')?.base_stat || '—'}</td>
                    <td className="sd-stat-cell">{pokemon.stats?.find((s: any) => s.stat?.name === 'attack')?.base_stat || '—'}</td>
                    <td className="sd-stat-cell">{pokemon.stats?.find((s: any) => s.stat?.name === 'defense')?.base_stat || '—'}</td>
                    <td className="sd-stat-cell">{pokemon.stats?.find((s: any) => s.stat?.name === 'special-attack')?.base_stat || '—'}</td>
                    <td className="sd-stat-cell">{pokemon.stats?.find((s: any) => s.stat?.name === 'special-defense')?.base_stat || '—'}</td>
                    <td className="sd-stat-cell">{pokemon.stats?.find((s: any) => s.stat?.name === 'speed')?.base_stat || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : searchQuery.length >= 2 ? (
            <p style={{ textAlign: 'center', padding: 20, color: '#888' }}>No Pokémon found</p>
          ) : (
            <p style={{ textAlign: 'center', padding: 20, color: '#888' }}>Start typing to search...</p>
          )}
        </div>
      </div>
    </div>
  );
};
