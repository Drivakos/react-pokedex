import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { TeamMember } from '../../lib/supabase';
import {
  Plus,
  Search,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import MovesetEditor from './MovesetEditor';
import PokemonImage from '../PokemonImage';
import localPokemonDb from '../../data/pokemon-db.json';
import './ShowdownStyles.css';

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other?: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: {
    type: {
      name: string;
    };
  }[];
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
  abilities: {
    ability: {
      name: string;
    };
    is_hidden: boolean;
  }[];
}


const TeamEditor: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, getTeamMembers, addPokemonToTeam, removePokemonFromTeam, updateTeamMemberBuild, teams } = auth as any;

  const [team, setTeam] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pokemonData, setPokemonData] = useState<Record<number, Pokemon>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showPokemonSearch, setShowPokemonSearch] = useState(false);
  const [showMovesetEditor, setShowMovesetEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);

  // Load team and members
  useEffect(() => {
    const loadTeamData = async () => {
      if (!teamId || !user) return;

      try {
        // Find team by ID
        const foundTeam = teams.find(t => t.id === parseInt(teamId));
        if (!foundTeam) {
          toast.error('Team not found');
          navigate('/teams');
          return;
        }
        setTeam(foundTeam);

        // Load team members
        const members = await getTeamMembers(parseInt(teamId));
        setTeamMembers(members || []);

        // Load Pokemon data for each member — use local JSON first, GraphQL as fallback
        const pokemonIds: number[] = members?.map((m: any) => m.pokemon_id) || [];
        const uniqueIds: number[] = [...new Set(pokemonIds)];
        const localDb = localPokemonDb as any[];
        const missingIds: number[] = [];

        // Phase 1: Load from local JSON DB (instant)
        for (const pokemonId of uniqueIds) {
          const localPokemon = localDb.find((p: any) => p.id === pokemonId);
          if (localPokemon) {
            const transformedPokemon = {
              id: localPokemon.id,
              name: localPokemon.name,
              sprites: {
                front_default: `/images/pokemon/thumbnails/${String(pokemonId).padStart(3, '0')}.png`,
                other: { 'official-artwork': { front_default: '' } }
              },
              types: (localPokemon.types || []).map((t: string) => ({
                type: { name: t }
              })),
              stats: Object.entries(localPokemon.stats || {}).map(([name, value]) => ({
                base_stat: value as number,
                stat: { name }
              })),
              abilities: []
            };
            setPokemonData(prev => ({ ...prev, [pokemonId]: transformedPokemon }));
          } else {
            missingIds.push(pokemonId);
          }
        }

        // Phase 2: Fallback to GraphQL for any Pokemon not in local DB
        for (const pokemonId of missingIds) {
          try {
            const query = `
              query GetPokemonBasic($id: Int!) {
                pokemon_v2_pokemon_by_pk(id: $id) {
                  id
                  name
                  types: pokemon_v2_pokemontypes {
                    type: pokemon_v2_type {
                      name
                    }
                  }
                  stats: pokemon_v2_pokemonstats {
                    base_stat
                    pokemon_v2_stat {
                      name
                    }
                  }
                  abilities: pokemon_v2_pokemonabilities {
                    ability: pokemon_v2_ability {
                      name
                    }
                    is_hidden
                  }
                  sprites: pokemon_v2_pokemonsprites(limit: 1) {
                    sprites
                  }
                }
              }
            `;

            const response = await fetch(import.meta.env.VITE_API_GRAPHQL_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, variables: { id: pokemonId } }),
            });

            if (response.ok) {
              const result = await response.json();

              if (result.data?.pokemon_v2_pokemon_by_pk) {
                const pokemon = result.data.pokemon_v2_pokemon_by_pk;

                let sprites: { front_default: string; other?: { 'official-artwork': { front_default: string } } } = {
                  front_default: `/images/pokemon/thumbnails/${String(pokemonId).padStart(3, '0')}.png`,
                };
                try {
                  if (pokemon.sprites?.[0]?.sprites) {
                    const spriteData = pokemon.sprites[0].sprites;
                    if (typeof spriteData === 'string') {
                      sprites = JSON.parse(spriteData);
                    } else if (typeof spriteData === 'object') {
                      sprites = spriteData;
                    }
                  } else {
                    sprites = {
                      front_default: `/images/pokemon/thumbnails/${String(pokemonId).padStart(3, '0')}.png`,
                    };
                  }
                } catch (e) {
                  sprites = {
                    front_default: `/images/pokemon/thumbnails/${String(pokemonId).padStart(3, '0')}.png`,
                  };
                }

                const transformedPokemon = {
                  id: pokemon.id,
                  name: pokemon.name,
                  sprites: sprites,
                  types: pokemon.types?.map((t: any) => ({
                    type: { name: t.type.name }
                  })) || [],
                  stats: pokemon.stats?.map((s: any) => ({
                    base_stat: s.base_stat,
                    stat: { name: s.pokemon_v2_stat.name }
                  })) || [],
                  abilities: pokemon.abilities?.map((a: any) => ({
                    ability: { name: a.ability.name },
                    is_hidden: a.is_hidden
                  })) || []
                };

                setPokemonData(prev => ({ ...prev, [pokemonId]: transformedPokemon }));
              }
            }
          } catch (error) {
            console.error(`Failed to load Pokemon ${pokemonId}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to load team data:', error);
        toast.error('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [teamId, user, teams, getTeamMembers, navigate]);

  // Search Pokemon using GraphQL
  const searchPokemon = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const searchQuery = `
        query SearchPokemon($searchTerm: String!) {
          pokemon_v2_pokemon(
            where: {
              name: { _ilike: $searchTerm }
              pokemon_v2_pokemonforms: { is_default: { _eq: true } }
            }
            limit: 10
            order_by: { id: asc }
          ) {
            id
            name
            pokemon_v2_pokemonsprites {
              data: sprites
            }
          }
        }
      `;

      const response = await fetch(import.meta.env.VITE_API_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          variables: { searchTerm: `%${query.toLowerCase()}%` }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.pokemon_v2_pokemon) {
          // Transform GraphQL results to match expected format
          const transformedResults = result.data.pokemon_v2_pokemon.map((p: any) => ({
            id: p.id,
            name: p.name,
            url: `https://pokeapi.co/api/v2/pokemon/${p.id}/` // Mock URL for compatibility
          }));
          setSearchResults(transformedResults);
        }
      }
    } catch (error) {
      console.error('Failed to search Pokemon:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => searchPokemon(searchQuery), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddPokemon = async (pokemon: any) => {
    if (!teamId) return;

    // Find next available position
    const positions = teamMembers.map(m => m.position).sort((a, b) => a - b);
    let nextPosition = 1;
    for (const pos of positions) {
      if (nextPosition === pos) nextPosition++;
      else break;
    }

    if (nextPosition > 6) {
      toast.error('Team is full (6 Pokémon maximum)');
      return;
    }

    try {
      await addPokemonToTeam(parseInt(teamId), pokemon.id || pokemon.url.split('/').slice(-2)[0], nextPosition);
      toast.success(`${pokemon.name} added to team!`);

      // Refresh team data
      const members = await getTeamMembers(parseInt(teamId));
      setTeamMembers(members || []);

      setShowPokemonSearch(false);
      setSearchQuery('');
    } catch (error) {
      toast.error('Failed to add Pokemon to team');
    }
  };

  const handleRemovePokemon = async (position: number) => {
    if (!teamId) return;

    try {
      await removePokemonFromTeam(parseInt(teamId), position);

      // Refresh team data
      const members = await getTeamMembers(parseInt(teamId));
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Failed to remove Pokemon:', error);
    }
  };

  const handleEditPokemon = (member: TeamMember) => {
    setSelectedMember(member);
    setShowMovesetEditor(true);
  };

  const handleSaveBuild = async (buildData: any) => {
    if (!teamId || !selectedMember) return;

    try {
      // Map the PokemonBuild data to TeamMember format for database
      const teamMemberData = {
        moves: buildData.moves || [],
        item: buildData.heldItem || '',
        ability: buildData.ability || '',
        nature: buildData.nature || 'hardy',
        evs: buildData.evs || {
          hp: 0,
          attack: 0,
          defense: 0,
          'special-attack': 0,
          'special-defense': 0,
          speed: 0
        },
        ivs: buildData.ivs || {
          hp: 31,
          attack: 31,
          defense: 31,
          'special-attack': 31,
          'special-defense': 31,
          speed: 31
        },
        level: selectedMember.level || 50,
        gender: buildData.gender || selectedMember.gender || 'male',
        tera_type: buildData.teraType || selectedMember.tera_type || 'normal',
        nickname: buildData.nickname || '',
        is_shiny: buildData.isShiny || false
      };

      await updateTeamMemberBuild(parseInt(teamId), selectedMember.position, teamMemberData);

      // Refresh team data
      const members = await getTeamMembers(parseInt(teamId));
      setTeamMembers(members || []);

      setShowMovesetEditor(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to save build:', error);
      toast.error('Failed to save build');
    }
  };

  const handleCloseMovesetEditor = () => {
    setShowMovesetEditor(false);
    setSelectedMember(null);
  };

  const formatName = (name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const exportTeamToShowdown = async () => {
    if (teamMembers.length === 0) {
      toast.error('No Pokémon in team to export');
      return;
    }

    try {
      const pokemonExports: string[] = [];

      for (const member of teamMembers) {
        const pokemon = pokemonData[member.pokemon_id];
        if (!pokemon) continue;

        const pokemonName = formatName(pokemon.name);
        const heldItem = member.item ? formatName(member.item) : '';
        const ability = member.ability ? formatName(member.ability) : '';
        const nature = member.nature ? formatName(member.nature) : 'Hardy';

        let entry = '';

        // Line 1: Name (with nickname) @ Item
        if (member.nickname) {
          entry += heldItem
            ? `${member.nickname} (${pokemonName}) @ ${heldItem}\n`
            : `${member.nickname} (${pokemonName})\n`;
        } else {
          entry += heldItem
            ? `${pokemonName} @ ${heldItem}\n`
            : `${pokemonName}\n`;
        }

        // Ability
        if (ability) {
          entry += `Ability: ${ability}\n`;
        }

        // Tera Type
        if (member.tera_type) {
          entry += `Tera Type: ${formatName(member.tera_type)}\n`;
        }

        // EVs (only non-zero)
        if (member.evs) {
          const evStrings: string[] = [];
          if (member.evs.hp > 0) evStrings.push(`${member.evs.hp} HP`);
          if (member.evs.attack > 0) evStrings.push(`${member.evs.attack} Atk`);
          if (member.evs.defense > 0) evStrings.push(`${member.evs.defense} Def`);
          if (member.evs['special-attack'] > 0) evStrings.push(`${member.evs['special-attack']} SpA`);
          if (member.evs['special-defense'] > 0) evStrings.push(`${member.evs['special-defense']} SpD`);
          if (member.evs.speed > 0) evStrings.push(`${member.evs.speed} Spe`);
          if (evStrings.length > 0) {
            entry += `EVs: ${evStrings.join(' / ')}\n`;
          }
        }

        // Nature
        entry += `${nature} Nature\n`;

        // IVs (only non-perfect)
        if (member.ivs) {
          const ivStrings: string[] = [];
          if (member.ivs.hp < 31) ivStrings.push(`${member.ivs.hp} HP`);
          if (member.ivs.attack < 31) ivStrings.push(`${member.ivs.attack} Atk`);
          if (member.ivs.defense < 31) ivStrings.push(`${member.ivs.defense} Def`);
          if (member.ivs['special-attack'] < 31) ivStrings.push(`${member.ivs['special-attack']} SpA`);
          if (member.ivs['special-defense'] < 31) ivStrings.push(`${member.ivs['special-defense']} SpD`);
          if (member.ivs.speed < 31) ivStrings.push(`${member.ivs.speed} Spe`);
          if (ivStrings.length > 0) {
            entry += `IVs: ${ivStrings.join(' / ')}\n`;
          }
        }

        // Moves
        if (member.moves && member.moves.length > 0) {
          member.moves.forEach((move: string) => {
            entry += `- ${formatName(move)}\n`;
          });
        }

        pokemonExports.push(entry.trim());
      }

      const fullExport = pokemonExports.join('\n\n');
      await navigator.clipboard.writeText(fullExport);
      toast.success(`Team "${team.name}" exported to clipboard!`);
    } catch (error) {
      console.error('Error exporting team:', error);
      toast.error('Failed to export team');
    }
  };

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

  const statBarClass = (stat: string) => {
    const map: Record<string, string> = {
      hp: 'sd-stat-bar--hp', attack: 'sd-stat-bar--atk', defense: 'sd-stat-bar--def',
      'special-attack': 'sd-stat-bar--spa', 'special-defense': 'sd-stat-bar--spd', speed: 'sd-stat-bar--spe',
    };
    return map[stat] || '';
  };

  const statLabel = (stat: string) => {
    const map: Record<string, string> = {
      hp: 'HP', attack: 'Atk', defense: 'Def',
      'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
    };
    return map[stat] || stat;
  };

  if (loading) {
    return (
      <div className="sd-container">
        <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p style={{ marginTop: 12, color: '#666' }}>Loading team editor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="sd-container">
        <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#666' }}>Please sign in to edit teams.</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="sd-container">
        <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ marginBottom: 12, color: '#666' }}>Team not found.</p>
          <button className="sd-header-btn" onClick={() => navigate('/teams')}>Back to Teams</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-container">
      {/* Header Bar */}
      <div className="sd-panel">
        <div className="sd-header">
          <button className="sd-header-btn" onClick={() => navigate('/teams')}>
            ‹ List
          </button>
          <input
            className="sd-team-name-input"
            value={team.name}
            readOnly
          />
          <button className="sd-header-btn" onClick={exportTeamToShowdown} disabled={teamMembers.length === 0}>
            <Upload size={12} style={{ marginRight: 3 }} />
            Export
          </button>
        </div>

        {/* Team Member Tabs */}
        <div className="sd-team-tabs">
          {teamMembers.map((member) => {
            const pokemon = pokemonData[member.pokemon_id];
            return (
              <div
                key={member.position}
                className={`sd-team-tab ${selectedMember?.position === member.position && showMovesetEditor ? 'sd-team-tab--active' : ''}`}
                onClick={() => handleEditPokemon(member)}
              >
                <PokemonImage pokemonId={member.pokemon_id} alt={pokemon?.name || ''} className="w-10 h-10" />
                <span>{member.nickname || formatName(pokemon?.name || 'Unknown')}</span>
              </div>
            );
          })}
          {teamMembers.length < 6 && (
            <button className="sd-team-tab-add" onClick={() => setShowPokemonSearch(true)} title="Add Pokémon">
              +
            </button>
          )}
        </div>
      </div>

      {/* Moveset Editor (inline, shown when a tab is active) */}
      {showMovesetEditor && selectedMember && (
        <MovesetEditor
          pokemon={{
            id: selectedMember.pokemon_id,
            name: pokemonData[selectedMember.pokemon_id]?.name || 'Unknown',
            sprites: pokemonData[selectedMember.pokemon_id]?.sprites || { other: { 'official-artwork': { front_default: '' } } },
            types: pokemonData[selectedMember.pokemon_id]?.types || [],
            moves: selectedMember.moves || []
          }}
          teamId={parseInt(teamId!)}
          onBack={handleCloseMovesetEditor}
          initialBuild={{
            moves: selectedMember.moves || [],
            nature: selectedMember.nature || 'hardy',
            ability: selectedMember.ability || '',
            gender: selectedMember.gender || null,
            heldItem: selectedMember.item || '',
            nickname: selectedMember.nickname || '',
            isShiny: selectedMember.is_shiny || false,
            teraType: selectedMember.tera_type || '',
            ivs: selectedMember.ivs || {
              hp: 31, attack: 31, defense: 31,
              'special-attack': 31, 'special-defense': 31, speed: 31
            },
            evs: selectedMember.evs || {
              hp: 0, attack: 0, defense: 0,
              'special-attack': 0, 'special-defense': 0, speed: 0
            }
          }}
          onSave={handleSaveBuild}
        />
      )}

      {/* Build Cards (one per Pokémon, shown when NOT editing) */}
      {!showMovesetEditor && (
        <>
          {teamMembers.map((member) => {
            const pokemon = pokemonData[member.pokemon_id];
            if (!pokemon) return null;

            const evs = member.evs || { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
            const ivs = member.ivs || { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 };

            return (
              <div key={member.position} className="sd-panel">
                {/* Action buttons */}
                <div className="sd-actions">
                  <button className="sd-action-btn" onClick={() => {
                    /* copy single pokemon */
                    const pokemonName = formatName(pokemon.name);
                    const item = member.item ? formatName(member.item) : '';
                    let text = item ? `${pokemonName} @ ${item}\n` : `${pokemonName}\n`;
                    if (member.ability) text += `Ability: ${formatName(member.ability)}\n`;
                    if (member.nature) text += `${formatName(member.nature)} Nature\n`;
                    if (member.moves?.length) member.moves.forEach((m: string) => text += `- ${formatName(m)}\n`);
                    navigator.clipboard.writeText(text.trim());
                    toast.success('Copied!');
                  }}>
                    ⊕ Copy
                  </button>
                  <button className="sd-action-btn" onClick={() => handleEditPokemon(member)}>✎ Edit</button>
                  <button className="sd-action-btn sd-action-btn--danger" onClick={() => handleRemovePokemon(member.position)}>🗑 Delete</button>
                </div>

                {/* Build card body */}
                <div className="sd-build-card">
                  {/* Sprite */}
                  <div className="sd-build-sprite">
                    <PokemonImage pokemonId={pokemon.id} alt={pokemon.name} className="w-20 h-20" />
                  </div>

                  {/* Top row: Nickname/Pokemon/Item | Details | Moves */}
                  <div className="sd-build-top">
                    <div>
                      <div className="sd-field-group">
                        <span className="sd-field-label">Nickname</span>
                        <span className="sd-field-input" style={{ background: '#f8f8f8' }}>{member.nickname || '—'}</span>
                      </div>
                      <div className="sd-details-row" style={{ marginTop: 4 }}>
                        <div><label>Level</label> <strong>{member.level || 100}</strong></div>
                        <div><label>Gender</label> <strong>{member.gender === 'male' ? '♂' : member.gender === 'female' ? '♀' : '—'}</strong></div>
                        <div><label>Shiny</label> <strong>{member.is_shiny ? 'Yes' : 'No'}</strong></div>
                        <div><label>Tera</label> <strong>{member.tera_type ? formatName(member.tera_type) : '—'}</strong></div>
                      </div>
                      {/* Type badges */}
                      <div style={{ marginTop: 4, display: 'flex', gap: 3 }}>
                        {pokemon.types.map((type: any, i: number) => (
                          <span key={i} className="sd-type-badge" style={{ backgroundColor: getTypeColor(type.type.name) }}>
                            {type.type.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="sd-field-group">
                        <span className="sd-field-label">Moves</span>
                        <div className="sd-moves-list">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="sd-move-slot">
                              <span className="sd-move-slot-input" style={{ background: '#f8f8f8' }}>
                                {member.moves?.[i] ? formatName(member.moves[i]) : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="sd-stats-grid sd-stats-grid--with-ivs">
                        <span></span>
                        <span></span>
                        <span className="sd-ev-header">EV</span>
                        <span className="sd-iv-header">IV</span>
                        {Object.entries(evs).map(([stat, value]) => (
                          <React.Fragment key={stat}>
                            <span className="sd-stat-label">{statLabel(stat)}</span>
                            <div className="sd-stat-bar-container">
                              <div
                                className={`sd-stat-bar ${statBarClass(stat)}`}
                                style={{ width: `${Math.min(100, ((value as number) / 252) * 100)}%` }}
                              />
                            </div>
                            <span className="sd-stat-value">{value as number || ''}</span>
                            <span className="sd-iv-value" style={{ color: (ivs as any)[stat] < 31 ? '#e53e3e' : '#888' }}>{(ivs as any)[stat]}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: Pokemon name, Item, Ability */}
                  <div className="sd-build-bottom">
                    <div className="sd-field-group">
                      <span className="sd-field-label">Pokémon</span>
                      <span className="sd-field-input" style={{ background: '#f8f8f8', fontWeight: 'bold' }}>{formatName(pokemon.name)}</span>
                    </div>
                    <div className="sd-field-group">
                      <span className="sd-field-label">Item</span>
                      <span className="sd-field-input" style={{ background: '#f8f8f8' }}>{member.item ? formatName(member.item) : '—'}</span>
                    </div>
                    <div className="sd-field-group">
                      <span className="sd-field-label">Ability</span>
                      <span className="sd-field-input" style={{ background: '#f8f8f8' }}>{member.ability ? formatName(member.ability) : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Pokemon button */}
          {teamMembers.length < 6 && (
            <div className="sd-panel">
              <div className="sd-add-card" onClick={() => setShowPokemonSearch(true)}>
                <Plus size={16} />
                <span>Add Pokémon</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pokemon Search Modal */}
      {showPokemonSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="sd-panel" style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="sd-header">
              <span style={{ fontWeight: 'bold', flex: 1 }}>Add Pokémon to Team</span>
              <button className="sd-header-btn" onClick={() => { setShowPokemonSearch(false); setSearchQuery(''); setSearchResults([]); }}>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                      <tr key={pokemon.id} onClick={() => handleAddPokemon(pokemon)}>
                        <td style={{ width: 32 }}>
                          <PokemonImage pokemonId={pokemon.id} alt={pokemon.name} className="w-6 h-6" />
                        </td>
                        <td className="sd-pokemon-name">{formatName(pokemon.name)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {pokemon.types?.map((t: any, i: number) => (
                              <span key={i} className="sd-type-badge" style={{ backgroundColor: getTypeColor(t.type?.name || t) }}>
                                {t.type?.name || t}
                              </span>
                            ))}
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
      )}
    </div>
  );
};

export default TeamEditor;
