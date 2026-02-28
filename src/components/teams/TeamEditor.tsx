import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { TeamMember } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import MovesetEditor from './MovesetEditor';
import './ShowdownStyles.css';

// Sub-components
import { TeamEditorHeader } from './editor/TeamEditorHeader';
import { TeamMemberTabs } from './editor/TeamMemberTabs';
import { TeamMemberCard } from './editor/TeamMemberCard';
import { PokemonSearchModal } from './editor/PokemonSearchModal';
import { useTeamStore, TeamPokemonData } from '../../store/teamStore';

interface MovesetBuildData {
  moves?: string[];
  heldItem?: string;
  ability?: string;
  nature?: string;
  evs?: TeamMember['evs'];
  ivs?: TeamMember['ivs'];
  gender?: TeamMember['gender'];
  teraType?: string;
  nickname?: string;
  isShiny?: boolean;
}

const TeamEditor: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user, getTeamMembers, addPokemonToTeam, removePokemonFromTeam, updateTeamMemberBuild, teams } = useAuth();

  const store = useTeamStore();
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const formatName = useCallback((name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }, []);

  // Load team and members using store
  useEffect(() => {
    if (teamId && user && teams) {
      store.loadTeam(parseInt(teamId), teams, getTeamMembers);
    }
  }, [teamId, user, teams, getTeamMembers]);

  // Handle Search using store
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      store.searchPokemon(store.searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [store.searchQuery]);

  const handleAddPokemon = async (pokemon: TeamPokemonData) => {
    if (!teamId) return;
    await store.addPokemon(parseInt(teamId), pokemon, addPokemonToTeam, getTeamMembers);
  };

  const handleRemoveConfirm = async () => {
    if (!teamId || !memberToRemove) return;
    await store.removePokemon(parseInt(teamId), memberToRemove.position, removePokemonFromTeam, getTeamMembers);
    setMemberToRemove(null);
  };

  const handleEditPokemon = (member: TeamMember) => {
    store.setSelectedMember(member);
    store.setShowMovesetEditor(true);
  };

  const handleSaveBuild = async (buildData: MovesetBuildData) => {
    if (!teamId || !store.selectedMember) return;
    
    const teamMemberData = {
      moves: buildData.moves || [],
      item: buildData.heldItem || '',
      ability: buildData.ability || '',
      nature: buildData.nature || 'hardy',
      evs: buildData.evs || { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
      ivs: buildData.ivs || { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
      level: store.selectedMember.level || 50,
      gender: buildData.gender || store.selectedMember.gender || 'male',
      tera_type: buildData.teraType || store.selectedMember.tera_type || 'normal',
      nickname: buildData.nickname || '',
      is_shiny: buildData.isShiny || false
    };

    await store.updateMemberBuild(parseInt(teamId), store.selectedMember.position, teamMemberData, updateTeamMemberBuild, getTeamMembers);
  };

  const exportTeamToShowdown = async () => {
    if (store.teamMembers.length === 0) {
      toast.error('No Pokémon in team to export');
      return;
    }

    try {
      const pokemonExports: string[] = [];
      for (const member of store.teamMembers) {
        const pokemon = store.pokemonData[member.pokemon_id];
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
      toast.success(`Team "${store.currentTeam?.name}" exported!`);
    } catch (error) {
      toast.error('Failed to export team');
    }
  };

  const handleCopySingle = (member: TeamMember, pokemon: TeamPokemonData) => {
    const pokemonName = formatName(pokemon.name);
    const item = member.item ? formatName(member.item) : '';
    let text = item ? `${pokemonName} @ ${item}\n` : `${pokemonName}\n`;
    if (member.ability) text += `Ability: ${formatName(member.ability)}\n`;
    if (member.nature) text += `${formatName(member.nature)} Nature\n`;
    if (member.moves?.length) member.moves.forEach((m: string) => text += `- ${formatName(m)}\n`);
    navigator.clipboard.writeText(text.trim());
    toast.success('Copied to clipboard!');
  };

  if (store.loading) return (
    <div className="sd-container">
      <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 font-bold uppercase tracking-tight">Loading Editor...</p>
      </div>
    </div>
  );

  if (!user || !store.currentTeam) return (
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
        teamName={store.currentTeam.name} 
        onBack={() => navigate('/teams')} 
        onExport={exportTeamToShowdown} 
        exportDisabled={store.teamMembers.length === 0}
      />

      <TeamMemberTabs 
        teamMembers={store.teamMembers}
        pokemonData={store.pokemonData}
        selectedMember={store.selectedMember}
        showMovesetEditor={store.showMovesetEditor}
        onEditMember={handleEditPokemon}
        onRemoveClick={(m) => setMemberToRemove(m)}
        onShowSearch={() => store.setShowPokemonSearch(true)}
        formatName={formatName}
      />

      {store.showMovesetEditor && store.selectedMember && store.pokemonData[store.selectedMember.pokemon_id] && (
        <MovesetEditor
          pokemon={{
            id: store.selectedMember.pokemon_id,
            name: store.pokemonData[store.selectedMember.pokemon_id].name,
            sprites: store.pokemonData[store.selectedMember.pokemon_id].sprites,
            types: store.pokemonData[store.selectedMember.pokemon_id].types,
            moves: store.selectedMember.moves || []
          }}
          teamId={parseInt(teamId!)}
          onBack={() => { store.setShowMovesetEditor(false); store.setSelectedMember(null); }}
          initialBuild={{
            moves: store.selectedMember.moves || [],
            nature: store.selectedMember.nature || 'hardy',
            ability: store.selectedMember.ability || '',
            gender: store.selectedMember.gender || null,
            heldItem: store.selectedMember.item || '',
            nickname: store.selectedMember.nickname || '',
            isShiny: store.selectedMember.is_shiny || false,
            teraType: store.selectedMember.tera_type || '',
            ivs: store.selectedMember.ivs || { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
            evs: store.selectedMember.evs || { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 }
          }}
          onSave={handleSaveBuild}
        />
      )}

      {!store.showMovesetEditor && (
        <div className="space-y-4 mt-4">
          {store.teamMembers.map((member) => (
            store.pokemonData[member.pokemon_id] && (
              <TeamMemberCard 
                key={member.position}
                member={member}
                pokemon={store.pokemonData[member.pokemon_id]}
                onEdit={handleEditPokemon}
                onRemoveClick={(m) => setMemberToRemove(m)}
                onCopy={handleCopySingle}
                formatName={formatName}
              />
            )
          ))}
          {store.teamMembers.length < 6 && (
            <div className="sd-panel">
              <div className="sd-add-card" onClick={() => store.setShowPokemonSearch(true)}>
                <span>+ Add Pokémon</span>
              </div>
            </div>
          )}
        </div>
      )}

      {store.showPokemonSearch && (
        <PokemonSearchModal 
          searchQuery={store.searchQuery}
          onSearchChange={(q) => store.setSearchQuery(q)}
          searchResults={store.searchResults}
          onAddPokemon={handleAddPokemon}
          onClose={() => { store.setShowPokemonSearch(false); store.setSearchQuery(''); }}
          formatName={formatName}
        />
      )}

      {/* Delete Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Remove {memberToRemove.pokemon_id && store.pokemonData[memberToRemove.pokemon_id] ? formatName(store.pokemonData[memberToRemove.pokemon_id].name) : 'this Pokémon'}?
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Are you sure you want to remove this Pokémon from your team? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
                onClick={() => setMemberToRemove(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                onClick={handleRemoveConfirm}
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamEditor;
