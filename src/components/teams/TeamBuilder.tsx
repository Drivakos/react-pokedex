import React, { useState, useEffect, useCallback } from 'react';
import { useTeams } from '../../hooks/useTeams';
import TeamDisplay from './TeamDisplay';
import TeamForm from './TeamForm';
import PokemonSearch from './search/PokemonSearch';
import PokemonDetailView from './PokemonDetailView';
import { toast } from 'react-hot-toast';
import { Team } from '../../lib/supabase';
import { PokemonDetails } from '../../types/pokemon';
import { TeamWithPokemon } from '../../types/teams';
import { adaptToPokemonDetails } from '../../utils/pokemonAdapters';

/**
 * TeamBuilder component - provides a UI for creating and managing Pokemon teams
 */
interface TeamBuilderProps {
  onClose?: () => void;
  selectedPokemon?: PokemonDetails | null;
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ onClose, selectedPokemon: externalSelectedPokemon }) => {
  const {
    teams,
    teamPokemon,
    isLoading,
    error,
    loadTeamMembers,
    addPokemonToTeam,
    removeFromTeam,
    createNewTeam,
    updateExistingTeam,
    deleteExistingTeam,
    loadFavoritePool
  } = useTeams();

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetails | null>(externalSelectedPokemon || null);
  
  // Update selectedPokemon when the prop changes
  useEffect(() => {
    if (externalSelectedPokemon) {
      setSelectedPokemon(externalSelectedPokemon);
    }
  }, [externalSelectedPokemon]);
  const [favoritesPokemon, setFavoritesPokemon] = useState<PokemonDetails[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [activePosition, setActivePosition] = useState<number | null>(null);

  useEffect(() => {
    if (selectedTeam && (!teamPokemon[selectedTeam.id] || Object.keys(teamPokemon[selectedTeam.id] || {}).length === 0)) {
      loadTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam, loadTeamMembers, teamPokemon]);

  const loadDirectPokemon = useCallback(async () => {
    try {
      console.log('🚀 TeamBuilder - Loading Pokemon directly from API...');
      const pokemonIds = [1, 4, 7, 25, 150, 133, 6, 9];
      
      // Use Promise.all for parallel fetching instead of sequential
      const results = await Promise.all(pokemonIds.map(async id => {
        try {
          const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
          const data = await response.json();
          return adaptToPokemonDetails(data);
        } catch (err) {
          console.error(`🔴 TeamBuilder - Error loading Pokemon ${id}:`, err);
          return null;
        }
      }));
      
      setFavoritesPokemon(results.filter(Boolean) as PokemonDetails[]);
      setIsLoadingFavorites(false);
    } catch (error) {
      console.error('🔴 TeamBuilder - Failed to load Pokemon directly:', error);
      setIsLoadingFavorites(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoadingFavorites && favoritesPokemon.length === 0) {
      console.log('🚀 TeamBuilder - Loading favorite pool on mount...');
      setIsLoadingFavorites(true);
      
      loadFavoritePool()
        .then(pokemonPool => {
          const formattedPool = pokemonPool.map((pokemon: any) => adaptToPokemonDetails(pokemon));
          
          if (formattedPool.length > 0) {
            setFavoritesPokemon(formattedPool);
            setIsLoadingFavorites(false);
          } else {
            loadDirectPokemon();
          }
        })
        .catch(error => {
          console.error('🔴 TeamBuilder - Error loading favorites:', error);
          loadDirectPokemon();
        });
    }
  }, [isLoading, loadFavoritePool, loadDirectPokemon, favoritesPokemon, isLoadingFavorites]);

  useEffect(() => {
    if (teams) {
      console.log(`🚀 TeamBuilder - Teams data updated, ${teams.length} teams available:`, 
        teams.map(t => `${t.id}: ${t.name}`));
    } else {
      console.log('🚀 TeamBuilder - No teams data available');
    }
  }, [teams]);

  useEffect(() => {
    console.log('🚀 TeamBuilder - teamPokemon data updated:', 
      Object.keys(teamPokemon).map(teamId => 
        `Team ${teamId}: ${Object.keys(teamPokemon[Number(teamId)] || {}).length} pokemon`
      ));
  }, [teamPokemon]);

  useEffect(() => {
    if (error) {
      console.error('🔴 TeamBuilder - Error from useTeams:', error);
      toast.error(error);
    }
  }, [error]);

  const handleTeamSelect = useCallback((team: any) => {
    console.log(`🚀 TeamBuilder - handleTeamSelect called for team ${team.id}`);
    if (!selectedTeam || selectedTeam.id !== team.id) {
      console.log(`🚀 TeamBuilder - Setting selectedTeam to ${team.id}: ${team.name}`); 
      setSelectedTeam(team);
      setActivePosition(null);
      
      if (teamPokemon[team.id] === undefined && loadTeamMembers) {
        console.log(`🚀 TeamBuilder - Forcing loadTeamMembers for team ${team.id}`);
        loadTeamMembers(team.id);
      } else {
        console.log(`🚀 TeamBuilder - Team ${team.id} data already loaded:`, 
          Object.keys(teamPokemon[team.id] || {}).length, 'Pokémon');
      }
    }
  }, [selectedTeam, teamPokemon, loadTeamMembers]);

  const handleCreateTeam = useCallback(async (name: string, description: string) => {
    const success = await createNewTeam(name, description);
    if (success) {
      setIsFormOpen(false);
    }
  }, [createNewTeam]);

  const handleUpdateTeam = useCallback(async (teamId: number, name: string, description: string) => {
    const success = await updateExistingTeam(teamId, name, description);
    if (success) {
      setIsFormOpen(false);
      setEditingTeam(null);
    }
  }, [updateExistingTeam]);

  const handleDeleteTeam = useCallback(async (teamId: number) => {
    if (!window.confirm('Are you sure you want to delete this team?')) {
      return;
    }
    
    const success = await deleteExistingTeam(teamId);
    if (success && selectedTeam?.id === teamId) {
      setSelectedTeam(null);
    }
  }, [deleteExistingTeam, selectedTeam]);

  const handleAddPokemon = useCallback(async (teamId: number, pokemonId: number, position: number) => {
    await addPokemonToTeam(teamId, pokemonId, position); 
  }, [addPokemonToTeam]);

  const handleRemovePokemon = useCallback(async (teamId: number, position: number) => {
    await removeFromTeam(teamId, position);
  }, [removeFromTeam]);

  const handlePokemonSelect = useCallback((pokemon: PokemonDetails) => { 
    if (selectedTeam && activePosition !== null && pokemon && pokemon.id) {
      handleAddPokemon(selectedTeam.id, pokemon.id, activePosition);
    } else {
      toast.error('Please select a team and an empty slot first!');
    }
  }, [selectedTeam, activePosition, handleAddPokemon]);

  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-12 w-full gap-4 p-4 overflow-auto" 
      key={`teams-${teams?.length || 0}-selected-${selectedTeam?.id || 'none'}-pokemon-${selectedPokemon?.id || 'none'}`}
    >
      {onClose && (
        <button 
          onClick={onClose}
          className="fixed top-4 right-4 z-50 text-gray-500 hover:text-gray-700 bg-white rounded-full p-2 shadow-md"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}
      
      {/* Team List - Left Sidebar */}
      <div className="lg:col-span-5 flex flex-col gap-3 overflow-auto">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-800">My Teams</h2>
            <button
              onClick={() => {
                setIsFormOpen(true);
                setEditingTeam(null);
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-full flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 5v14M5 12h14"/></svg>
              New Team
            </button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm mb-2">No teams yet</p>
              <button
                onClick={() => {
                  setIsFormOpen(true);
                  setEditingTeam(null);
                }}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
              >
                Create First Team
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
              {teams.map(team => (
                <div 
                  key={team.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedTeam?.id === team.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'}`}
                  onClick={() => handleTeamSelect(team)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-800">{team.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTeam(team);
                          setIsFormOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit team"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTeam(team.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete team"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  {team.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{team.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Team Display */}
        {selectedTeam && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <TeamDisplay 
              team={{
                ...selectedTeam,
                members: teamPokemon[selectedTeam.id] || {}
              } as TeamWithPokemon}
              onEditTeam={() => {
                setEditingTeam(selectedTeam);
                setIsFormOpen(true);
              }}
              onDeleteTeam={handleDeleteTeam}
              onSelectSlot={(_, position) => setActivePosition(position)}
              onRemovePokemon={(teamId, position) => handleRemovePokemon(teamId, position)}
              selectedPosition={activePosition}
            />
          </div>
        )}
      </div>
      
      {/* Pokémon Selection - Right Content */}
      <div className="lg:col-span-7 flex flex-col gap-3 overflow-auto">
        {/* Search section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Pokémon Selection</h2>
          <PokemonSearch
            initialPool={favoritesPokemon}
            onPokemonSelect={handlePokemonSelect}
            isLoadingInitialPool={isLoadingFavorites}
          />
        </div>
        
        {/* Loading states */}
        {isLoadingFavorites && favoritesPokemon.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading Pokémon...</p>
          </div>
        )}
        
        {!isLoadingFavorites && favoritesPokemon.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-3">No Pokémon data available</p>
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              onClick={async () => {
                setIsLoadingFavorites(true);
                await loadDirectPokemon();
              }}
            >
              Reload Pokémon
            </button>
          </div>
        )}
        
        {/* Selected Pokémon details */}
        {selectedPokemon && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <PokemonDetailView
              pokemon={selectedPokemon}
              onClose={() => setSelectedPokemon(null)}
              canAddToTeam={!!selectedTeam && activePosition !== null}
            />
          </div>
        )}
      </div>
      
      {/* Team form modal */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => {
            setIsFormOpen(false);
            setEditingTeam(null);
          }}
        >
          <div 
            className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <TeamForm
              onSubmit={(name: string, description: string) => {
                if (editingTeam) {
                  handleUpdateTeam(editingTeam.id, name, description);
                } else {
                  handleCreateTeam(name, description);
                }
                setIsFormOpen(false);
                setEditingTeam(null);
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTeam(null);
              }}
              initialName={editingTeam?.name || ''}
              initialDescription={editingTeam?.description || ''}
              isCreating={!editingTeam}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamBuilder;
