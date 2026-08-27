import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTeamEditor } from '../../hooks/useTeamEditor';
import type { TeamMember } from '../../lib/supabase';
import type { MovesetBuildData, TeamPokemonData } from '../../types/team-builder';
import {
  formatPokemonName,
  serializeShowdownMember,
  serializeShowdownTeam,
  toTeamMemberBuild,
} from '../../utils/team-builder';
import MovesetEditor from './MovesetEditor';
import { TeamEditorHeader } from './editor/TeamEditorHeader';
import { TeamMemberTabs } from './editor/TeamMemberTabs';
import { TeamMemberCard } from './editor/TeamMemberCard';
import { PokemonSearchModal } from './editor/PokemonSearchModal';
import './ShowdownStyles.css';

const TeamEditor: React.FC = () => {
  const { teamId: teamIdParam } = useParams<{ teamId: string }>();
  const teamId = Number(teamIdParam);
  const validTeamId = Number.isInteger(teamId) && teamId > 0 ? teamId : null;
  const navigate = useNavigate();
  const { user, updateTeam } = useAuth();
  const editor = useTeamEditor(validTeamId);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [addingPokemonId, setAddingPokemonId] = useState<number | null>(null);
  const [reorderingMemberId, setReorderingMemberId] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleAddPokemon = async (pokemon: TeamPokemonData) => {
    setAddingPokemonId(pokemon.id);
    try {
      let automaticBuild: Partial<TeamMember> | undefined;
      let automaticBuildFailed = false;
      try {
        const { fetchAutomaticPokemonBuild } = await import('../../services/premade-builds.service');
        const build = await fetchAutomaticPokemonBuild(pokemon);
        if (!build.ability || build.moves.length === 0) {
          throw new Error('Automatic build is missing required battle fields');
        }
        automaticBuild = build;
      } catch (buildError) {
        automaticBuildFailed = true;
        console.warn('Automatic build unavailable; adding Pokémon without a build:', buildError);
      }

      const addedMember = await editor.addPokemon(pokemon, automaticBuild);
      if (!addedMember) return;
      if (automaticBuildFailed) {
        toast.error('Pokémon added without an automatic build. Please configure it manually.');
      }
      editor.editMember(addedMember);
    } catch (error) {
      console.error('Failed to add Pokémon to team:', error);
      toast.error('Failed to add Pokémon to the team.');
    } finally {
      setAddingPokemonId(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!memberToRemove || removing) return;
    setRemoving(true);
    try {
      if (await editor.removePokemon(memberToRemove)) setMemberToRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  const handleReorderPokemon = async (member: TeamMember, targetPosition: number) => {
    if (reorderingMemberId !== null) return;
    setReorderingMemberId(member.id);
    try {
      await editor.reorderPokemon(member, targetPosition);
    } finally {
      setReorderingMemberId(null);
    }
  };

  const handleSaveBuild = async (buildData: MovesetBuildData) => {
    if (!editor.selectedMember) return;
    const updated = await editor.updateMemberBuild(
      editor.selectedMember,
      toTeamMemberBuild(buildData, editor.selectedMember),
    );
    if (updated) editor.closeMovesetEditor();
  };

  const exportTeamToShowdown = async () => {
    if (editor.teamMembers.length === 0) {
      toast.error('No Pokémon in team to export');
      return;
    }
    const exportText = serializeShowdownTeam(editor.teamMembers, editor.pokemonData);
    if (!exportText) {
      toast.error('Team data is still loading. Please try again.');
      return;
    }
    try {
      await navigator.clipboard.writeText(exportText);
      toast.success(`Team "${editor.currentTeam?.name}" exported!`);
    } catch {
      toast.error('Clipboard access was blocked. Please allow clipboard access and try again.');
    }
  };

  const handleCopySingle = async (member: TeamMember, pokemon: TeamPokemonData) => {
    try {
      await navigator.clipboard.writeText(serializeShowdownMember(member, pokemon));
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Clipboard access was blocked.');
    }
  };

  const handleRename = async (name: string) => {
    if (!editor.currentTeam || validTeamId === null) return false;
    return updateTeam(validTeamId, name, editor.currentTeam.description);
  };

  if (editor.loading) {
    return (
      <div className="sd-container">
        <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500 font-bold uppercase tracking-tight">Loading Editor...</p>
        </div>
      </div>
    );
  }

  if (!user || !editor.currentTeam) {
    return (
      <div className="sd-container">
        <div className="sd-panel" style={{ padding: 40, textAlign: 'center' }}>
          <p className="text-gray-500 font-bold uppercase tracking-tight">
            {!user ? 'Please sign in' : editor.error ?? 'Team not found'}
          </p>
          <button className="sd-header-btn mt-4" onClick={() => navigate('/teams')}>Back to Teams</button>
        </div>
      </div>
    );
  }

  const selectedPokemon = editor.selectedMember
    ? editor.pokemonData[editor.selectedMember.pokemon_id]
    : undefined;

  return (
    <div className="sd-container">
      <TeamEditorHeader
        teamName={editor.currentTeam.name}
        onBack={() => navigate('/teams')}
        onExport={() => void exportTeamToShowdown()}
        exportDisabled={editor.teamMembers.length === 0}
        onRename={handleRename}
      />

      <TeamMemberTabs
        teamMembers={editor.teamMembers}
        pokemonData={editor.pokemonData}
        selectedMember={editor.selectedMember}
        showMovesetEditor={editor.showMovesetEditor}
        onEditMember={editor.editMember}
        onRemoveClick={setMemberToRemove}
        onReorderMember={(member, targetPosition) => void handleReorderPokemon(member, targetPosition)}
        reorderingMemberId={reorderingMemberId}
        onShowSearch={() => editor.setShowPokemonSearch(true)}
        formatName={formatPokemonName}
      />

      {editor.showMovesetEditor && editor.selectedMember && selectedPokemon && (
        <MovesetEditor
          key={editor.selectedMember.id}
          pokemon={{
            id: editor.selectedMember.pokemon_id,
            name: selectedPokemon.name,
            sprites: selectedPokemon.sprites,
            types: selectedPokemon.types,
            moves: editor.selectedMember.moves ?? [],
          }}
          teamId={teamId}
          onBack={editor.closeMovesetEditor}
          initialBuild={{
            moves: editor.selectedMember.moves ?? [],
            nature: editor.selectedMember.nature ?? 'hardy',
            ability: editor.selectedMember.ability ?? '',
            gender: editor.selectedMember.gender ?? null,
            heldItem: editor.selectedMember.item ?? '',
            nickname: editor.selectedMember.nickname ?? '',
            isShiny: editor.selectedMember.is_shiny ?? false,
            teraType: editor.selectedMember.tera_type ?? '',
            ivs: editor.selectedMember.ivs ?? { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
            evs: editor.selectedMember.evs ?? { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
          }}
          onSave={handleSaveBuild}
        />
      )}

      {!editor.showMovesetEditor && (
        <div className="space-y-4 mt-4">
          {editor.teamMembers.map(member => {
            const pokemon = editor.pokemonData[member.pokemon_id];
            return pokemon ? (
              <TeamMemberCard
                key={member.id}
                member={member}
                pokemon={pokemon}
                onEdit={editor.editMember}
                onRemoveClick={setMemberToRemove}
                onCopy={(entry, data) => void handleCopySingle(entry, data)}
                formatName={formatPokemonName}
              />
            ) : null;
          })}
          {editor.teamMembers.length < 6 && (
            <div className="sd-panel">
              <button className="sd-add-card w-full" onClick={() => editor.setShowPokemonSearch(true)}>
                + Add Pokémon
              </button>
            </div>
          )}
        </div>
      )}

      {editor.showPokemonSearch && (
        <PokemonSearchModal
          searchQuery={editor.searchQuery}
          onSearchChange={editor.setSearchQuery}
          searchResults={editor.searchResults}
          searching={editor.searching}
          onAddPokemon={handleAddPokemon}
          addingPokemonId={addingPokemonId}
          onClose={editor.closePokemonSearch}
          formatName={formatPokemonName}
        />
      )}

      {memberToRemove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Remove {editor.pokemonData[memberToRemove.pokemon_id]
                ? formatPokemonName(editor.pokemonData[memberToRemove.pokemon_id].name)
                : 'this Pokémon'}?
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              This removes the Pokémon and its saved build from the team.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 disabled:opacity-50"
                onClick={() => setMemberToRemove(null)}
                disabled={removing}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={() => void handleRemoveConfirm()}
                disabled={removing}
              >
                <Trash2 size={16} />
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamEditor;
