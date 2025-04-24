import { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import useTeamBuilder from '../../hooks/useTeamBuilder';
import TeamPool from './TeamPool';
import TeamGroup from './TeamGroup';
import { X, PlusCircle, Users, Dices, ArrowRight, Info, ExternalLink } from 'lucide-react';
import type { PokemonDetails } from '../../types/pokemon';
import TeamBuilder from './TeamBuilder';

interface TeamSelectorProps {
  pokemon?: PokemonDetails;
  onClose: () => void;
}

const TeamSelector = ({ pokemon, onClose }: TeamSelectorProps) => {
  const {
    pool,
    selectedPoolPokemon,
    selectPoolPokemon,
    teams,
    filters,
    handleFilterChange,
    teamMembers,
    teamPokemon,
    teamCoverage,
    isCreatingTeam,
    setIsCreatingTeam,
    newTeamName,
    setNewTeamName,
    handleCreateTeam,
    handleDragEndAll,
    addToTeam,
    removeFromTeam,
    deleteTeam,
    isLoading,
    user,
  } = useTeamBuilder({ externalPokemon: pokemon });

  const [isMobile, setIsMobile] = useState(false);
  const [showTeamBuilder, setShowTeamBuilder] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-redirect to TeamBuilder on mobile if teams exist
  useEffect(() => {
    if (isMobile && teams && teams.length > 0) {
      setShowTeamBuilder(true);
    }
  }, [isMobile, teams]);
  
  if (showTeamBuilder) {
    return (
      <div className="bg-white rounded-lg max-w-2xl w-full overflow-y-auto relative">
        <TeamBuilder 
          onClose={() => {
            setShowTeamBuilder(false);
            onClose && onClose();
          }}
          selectedPokemon={pokemon}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg max-w-2xl w-full p-8 text-center">
        <div>
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Team Management
          </h2>
          <p className="text-gray-600 max-w-md">
            Please log in or create an account to build and manage your Pokémon teams.
          </p>
          <button
            onClick={onClose}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowRight size={18} />
            <span>Take me to login</span>
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg max-w-2xl w-full overflow-y-auto p-6 relative" style={{ maxHeight: 'fit-content' }}>
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>

          {/* Skeleton for team pool */}
          <div className="w-full mb-6">
            <div className="h-5 w-20 bg-gray-200 rounded mb-2"></div>
            <div className="flex space-x-3 overflow-x-auto p-3 bg-gray-100 rounded-lg">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-24 h-32 bg-white shadow rounded-md p-2 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-md mb-2"></div>
                  <div className="w-12 h-3 bg-gray-200 rounded mb-1"></div>
                  <div className="flex space-x-1">
                    <div className="w-8 h-3 bg-gray-200 rounded"></div>
                    <div className="w-8 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton for teams */}
          {[1, 2].map(teamIdx => (
            <div key={teamIdx} className="w-full mb-4 bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 w-32 bg-gray-200 rounded"></div>
                <div className="flex space-x-2">
                  <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="h-5 w-full bg-gray-100 rounded mb-4"></div>
              <div className="flex space-x-2 overflow-x-auto p-2 bg-gray-50 rounded-lg">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="w-full flex justify-center items-center">
                    <div className="w-20 h-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-blue-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <p className="text-gray-700 font-medium">Loading your teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg w-full max-w-2xl p-3 sm:p-6 relative flex flex-col overflow-hidden"
      style={{ maxHeight: '90vh', height: 'fit-content' }}
    >
      <div className="flex justify-between items-center absolute top-4 right-4 z-10 gap-2">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1">
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center mb-4 mt-6 pt-2 w-full overflow-hidden">
        <div className="flex justify-between items-center w-full mb-4">
          <h2 className="text-xl sm:text-2xl font-bold capitalize">Your Teams</h2>
          
          {teams && teams.length > 0 && (
            <button 
              onClick={() => setShowTeamBuilder(true)}
              className="flex items-center gap-1 text-blue-500 text-sm font-medium"
            >
              <span>Full Editor</span>
              <ExternalLink size={16} />
            </button>
          )}
        </div>
        
        {pool.length > 0 && (
          <div className="w-full mb-4 block overflow-visible">
            <TeamPool pool={pool} selected={selectedPoolPokemon} onSelect={selectPoolPokemon} />
          </div>
        )}
        
        <DragDropContext onDragEnd={handleDragEndAll}>
          <div className="w-full overflow-y-auto pr-1 sm:pr-2" style={{ maxHeight: 'calc(65vh)', minHeight: '200px' }}>
          {teams && teams.length > 0 ? (
            teams.map(team => (
              <TeamGroup
                key={team.id}
                team={team}
                teamMembers={teamMembers[team.id] || []}
                teamPokemon={teamPokemon[team.id] || {}}
                coverage={teamCoverage[team.id] || { types: [], missing: [] }}
                filters={filters}
                handleFilterChange={handleFilterChange}
                addToTeam={addToTeam}
                removeFromTeam={removeFromTeam}
                deleteTeam={deleteTeam}
                selectedPoolPokemon={selectedPoolPokemon}
              />
            ))
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <Dices size={28} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Teams Yet</h3>
              <p className="text-gray-600 max-w-sm mb-3">
                Build a team of up to 6 Pokémon to strategize for battles and explore different type combinations.
              </p>
              <div className="flex items-center text-sm text-blue-600 mb-6 bg-blue-50 p-2 rounded-lg">
                <Info size={14} className="mr-1" />
                <span>Pro tip: Balance different types for better coverage against opponents</span>
              </div>
              <button
                onClick={() => setIsCreatingTeam(true)}
                className="bg-blue-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <PlusCircle size={16} /> Add New Team
              </button>
            </div>
          )}
          </div>
        </DragDropContext>
      </div>

      {/* Control panel area */}
      <div className="pt-3 sm:pt-4 border-t border-gray-200 mt-4 sm:mt-6 flex-shrink-0">
        {isCreatingTeam ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Create New Team</h3>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name"
                className="w-full sm:flex-1 border border-gray-300 rounded-md py-1.5 sm:py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 sm:mb-0"
                maxLength={30}
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim()}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm transition-colors ${!newTeamName.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreatingTeam(false)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          teams?.length > 0 ? (
            <button
              onClick={() => setIsCreatingTeam(true)}
              className="bg-blue-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base w-full"
            >
              <PlusCircle size={16} /> Add New Team
            </button>
          ) : null
        )}
      </div>
    </div>
  );
};

export default TeamSelector;
