import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { TeamMember } from '../../lib/supabase';
import toast from 'react-hot-toast';
import MovesetEditor from './MovesetEditor';
import { fetchPokemonById, fetchPokemonData } from '../../services/api';
import './ShowdownStyles.css';

// Sub-components
import { TeamEditorHeader } from './editor/TeamEditorHeader';
import { TeamMemberTabs } from './editor/TeamMemberTabs';
import { TeamMemberCard } from './editor/TeamMemberCard';
import { PokemonSearchModal } from './editor/PokemonSearchModal';

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

  const formatName = useCallback((name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }, []);

  // Load team and members
  useEffect(() => {
    const loadTeamData = async () => {
      if (!teamId || !user) return;

      try {
        const foundTeam = teams.find((t: any) => t.id === parseInt(teamId));
        if (!foundTeam) {
          toast.error('Team not found');
          navigate('/teams');
          return;
        }
        setTeam(foundTeam);

        const members = await getTeamMembers(parseInt(teamId));
        setTeamMembers(members || []);

        const pokemonIds: number[] = members?.map((m: any) => m.pokemon_id) || [];
        const uniqueIds: number[] = [...new Set(pokemonIds)];
        
        for (const pokemonId of uniqueIds) {
          try {
            const pokemon = await fetchPokemonById(pokemonId);
            const transformedPokemon: Pokemon = {
              id: pokemon.id,
              name: pokemon.name,
              sprites: {
                front_default: pokemon.sprites.front_default,
                other: {
                  'official-artwork': {
                    front_default: pokemon.sprites.official_artwork
                  }
                }
              },
              types: pokemon.types.map(t => ({ type: { name: t } })),
              stats: [
                { base_stat: pokemon.stats.hp, stat: { name: 'hp' } },
                { base_stat: pokemon.stats.attack, stat: { name: 'attack' } },
                { base_stat: pokemon.stats.defense, stat: { name: 'defense' } },
                { base_stat: pokemon.stats['special-attack'], stat: { name: 'special-attack' } },
                { base_stat: pokemon.stats['special-defense'], stat: { name: 'special-defense' } },
                { base_stat: pokemon.stats.speed, stat: { name: 'speed' } },
              ],
              abilities: []
            };
            setPokemonData(prev => ({ ...prev, [pokemonId]: transformedPokemon }));
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

  // Search Pokemon
  useEffect(() => {
    const searchPokemon = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const results = await fetchPokemonData(10, 0, searchQuery, {
          types: [], moves: [], generation: '', weight: { min: 0, max: 1000 }, height: { min: 0, max: 100 }, hasEvolutions: null
        });

        const transformedResults: Pokemon[] = results.map(p => ({
          id: p.id,
          name: p.name,
          sprites: {
            front_default: p.sprites.front_default,
            other: { 'official-artwork': { front_default: p.sprites.official_artwork } }
          },
          types: p.types.map(t => ({ type: { name: t } })),
          stats: [
            { base_stat: p.stats.hp, stat: { name: 'hp' } },
            { base_stat: p.stats.attack, stat: { name: 'attack' } },
            { base_stat: p.stats.defense, stat: { name: 'defense' } },
            { base_stat: p.stats['special-attack'], stat: { name: 'special-attack' } },
            { base_stat: p.stats['special-defense'], stat: { name: 'special-defense' } },
            { base_stat: p.stats.speed, stat: { name: 'speed' } },
          ],
          abilities: []
        }));

        setSearchResults(transformedResults);
      } catch (error) {
        console.error('Failed to search Pokemon:', error);
      }
    };

    const timeoutId = setTimeout(searchPokemon, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddPokemon = async (pokemon: any) => {
    if (!teamId) return;

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
      await addPokemonToTeam(parseInt(teamId), pokemon.id, nextPosition);
      toast.success(`${formatName(pokemon.name)} added to team!`);

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
      const teamMemberData = {
        moves: buildData.moves || [],
        item: buildData.heldItem || '',
        ability: buildData.ability || '',
        nature: buildData.nature || 'hardy',
        evs: buildData.evs || { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
        ivs: buildData.ivs || { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
        level: selectedMember.level || 50,
        gender: buildData.gender || selectedMember.gender || 'male',
        tera_type: buildData.teraType || selectedMember.tera_type || 'normal',
        nickname: buildData.nickname || '',
        is_shiny: buildData.isShiny || false
      };

      await updateTeamMemberBuild(parseInt(teamId), selectedMember.position, teamMemberData);
      const members = await getTeamMembers(parseInt(teamId));
      setTeamMembers(members || []);
      setShowMovesetEditor(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to save build:', error);
      toast.error('Failed to save build');
    }
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

        let entry = member.nickname 
          ? `${member.nickname} (${pokemonName})${heldItem ? ` @ ${heldItem}` : ''}\n`
          : `${pokemonName}${heldItem ? ` @ ${heldItem}` : ''}\n`;

        if (ability) entry += `Ability: ${ability}\n`;
        if (member.tera_type) entry += `Tera Type: ${formatName(member.tera_type)}\n`;
        
        const evStrings: string[] = [];
        if (member.evs) {
          if (member.evs.hp > 0) evStrings.push(`${member.evs.hp} HP`);
          if (member.evs.attack > 0) evStrings.push(`${member.evs.attack} Atk`);
          if (member.evs.defense > 0) evStrings.push(`${member.evs.defense} Def`);
          if (member.evs['special-attack'] > 0) evStrings.push(`${member.evs['special-attack']} SpA`);
          if (member.evs['special-defense'] > 0) evStrings.push(`${member.evs['special-defense']} SpD`);
          if (member.evs.speed > 0) evStrings.push(`${member.evs.speed} Spe`);
          if (evStrings.length > 0) entry += `EVs: ${evStrings.join(' / ')}\n`;
        }

        entry += `${nature} Nature\n`;

        if (member.ivs) {
          const ivStrings: string[] = [];
          if (member.ivs.hp < 31) ivStrings.push(`${member.ivs.hp} HP`);
          if (member.ivs.attack < 31) ivStrings.push(`${member.ivs.attack} Atk`);
          if (member.ivs.defense < 31) ivStrings.push(`${member.ivs.defense} Def`);
          if (member.ivs['special-attack'] < 31) ivStrings.push(`${member.ivs['special-attack']} SpA`);
          if (member.ivs['special-defense'] < 31) ivStrings.push(`${member.ivs['special-defense']} SpD`);
          if (member.ivs.speed < 31) ivStrings.push(`${member.ivs.speed} Spe`);
          if (ivStrings.length > 0) entry += `IVs: ${ivStrings.join(' / ')}\n`;
        }

        if (member.moves?.length) {
          member.moves.forEach((move: string) => entry += `- ${formatName(move)}\n`);
        }
        pokemonExports.push(entry.trim());
      }

      await navigator.clipboard.writeText(pokemonExports.join('\n\n'));
      toast.success(`Team "${team.name}" exported!`);
    } catch (error) {
      toast.error('Failed to export team');
    }
  };

  const handleCopySingle = (member: TeamMember, pokemon: any) => {
    const pokemonName = formatName(pokemon.name);
    const item = member.item ? formatName(member.item) : '';
    let text = item ? `${pokemonName} @ ${item}\n` : `${pokemonName}\n`;
    if (member.ability) text += `Ability: ${formatName(member.ability)}\n`;
    if (member.nature) text += `${formatName(member.nature)} Nature\n`;
    if (member.moves?.length) member.moves.forEach((m: string) => text += `- ${formatName(m)}\n`);
    navigator.clipboard.writeText(text.trim());
    toast.success('Copied to clipboard!');
  };

  if (loading) return (
    <div className="sd-container">
      <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 font-bold uppercase tracking-tight">Loading Editor...</p>
      </div>
    </div>
  );

  if (!user || !team) return (
    <div className="sd-container">
      <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
        <p className="text-gray-500 font-bold uppercase tracking-tight">{!user ? 'Please sign in' : 'Team not found'}</p>
        <button className="sd-header-btn mt-4" onClick={() => navigate('/teams')}>Back to Teams</button>
      </div>
    </div>
  );

  return (
    <div className="sd-container">
      <TeamEditorHeader 
        teamName={team.name} 
        onBack={() => navigate('/teams')} 
        onExport={exportTeamToShowdown} 
        exportDisabled={teamMembers.length === 0}
      />

      <TeamMemberTabs 
        teamMembers={teamMembers}
        pokemonData={pokemonData}
        selectedMember={selectedMember}
        showMovesetEditor={showMovesetEditor}
        onEditMember={handleEditPokemon}
        onShowSearch={() => setShowPokemonSearch(true)}
        formatName={formatName}
      />

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
          onBack={() => { setShowMovesetEditor(false); setSelectedMember(null); }}
          initialBuild={{
            moves: selectedMember.moves || [],
            nature: selectedMember.nature || 'hardy',
            ability: selectedMember.ability || '',
            gender: selectedMember.gender || null,
            heldItem: selectedMember.item || '',
            nickname: selectedMember.nickname || '',
            isShiny: selectedMember.is_shiny || false,
            teraType: selectedMember.tera_type || '',
            ivs: selectedMember.ivs || { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
            evs: selectedMember.evs || { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 }
          }}
          onSave={handleSaveBuild}
        />
      )}

      {!showMovesetEditor && (
        <div className="space-y-4 mt-4">
          {teamMembers.map((member) => (
            <TeamMemberCard 
              key={member.position}
              member={member}
              pokemon={pokemonData[member.pokemon_id]}
              onEdit={handleEditPokemon}
              onRemove={handleRemovePokemon}
              onCopy={handleCopySingle}
              formatName={formatName}
            />
          ))}
          {teamMembers.length < 6 && (
            <div className="sd-panel">
              <div className="sd-add-card" onClick={() => setShowPokemonSearch(true)}>
                <span>+ Add Pokémon</span>
              </div>
            </div>
          )}
        </div>
      )}

      {showPokemonSearch && (
        <PokemonSearchModal 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onAddPokemon={handleAddPokemon}
          onClose={() => { setShowPokemonSearch(false); setSearchQuery(''); setSearchResults([]); }}
          formatName={formatName}
        />
      )}
    </div>
  );
};

export default TeamEditor;
