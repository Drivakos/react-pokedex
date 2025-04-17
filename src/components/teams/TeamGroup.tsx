import React, { useState } from 'react';
import type { Team } from '../../lib/supabase';
import type { PokemonDetails, Filters } from '../../types/pokemon';
import { TYPE_COLORS } from '../../types/pokemon';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { X, Plus, Trash2, GripVertical, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import PokemonImage from '../common/PokemonImage';

interface TeamGroupProps {
  team: Team;
  teamMembers: number[];
  teamPokemon: Record<number, number>;
  coverage: { types: string[]; missing: string[] };
  filters: Filters;
  handleFilterChange: (filters: Filters) => void;
  addToTeam: (teamId: number) => void;
  deleteTeam: (teamId: number) => void;
  removeFromTeam: (teamId: number, position: number) => void;
  selectedPoolPokemon: PokemonDetails | null;
}

const TeamGroup: React.FC<TeamGroupProps> = ({
  team,
  teamMembers,
  teamPokemon,
  coverage: { types },
  filters,
  handleFilterChange,
  addToTeam,
  deleteTeam,
  removeFromTeam,
  selectedPoolPokemon,
}) => {
  const positions = [1, 2, 3, 4, 5, 6];
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  
  const handleDeleteTeam = () => {
    if (teamMembers.length === 0) {
      // If team is empty, delete without confirmation
      deleteTeam(team.id);
      return;
    }
    
    // Otherwise show confirmation
    setDeleteConfirmation(true);
  };
  
  const confirmDelete = () => {
    deleteTeam(team.id);
    setDeleteConfirmation(false);
    toast.success('Team deleted successfully');
  };
  
  const cancelDelete = () => {
    setDeleteConfirmation(false);
  };

  return (
    <div className="mb-8 bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">{team.name}</h3>
          {team.description && (
            <div className="ml-2 text-gray-500 hover:text-gray-700 cursor-help group relative">
              <Info size={16} />
              <div className="absolute left-0 -bottom-1 transform translate-y-full w-48 bg-gray-800 text-white p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {team.description}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => addToTeam(team.id)}
            className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <Plus size={16} />
            {selectedPoolPokemon ? `Add ${selectedPoolPokemon.name}` : 'Add Pokémon'}
          </button>
          {deleteConfirmation ? (
            <div className="flex items-center space-x-1 bg-gray-100 px-1 py-1 rounded shadow-sm border border-gray-300">
              <button
                onClick={confirmDelete}
                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={cancelDelete}
                className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleDeleteTeam}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
              title="Delete Team"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-sm font-medium bg-gray-700 text-white px-2 py-0.5 rounded">Type Coverage:</span>
          {types.length > 0 ? (
            types.map(type => (
              <button
                key={type}
                onClick={() => handleFilterChange({ ...filters, types: filters.types.includes(type) ? filters.types : [...filters.types, type] })}
                className={`${TYPE_COLORS[type] || 'bg-gray-300'} text-white text-xs px-2 py-1 rounded capitalize hover:opacity-80 transition-opacity`}
              >
                {type}
              </button>
            ))
          ) : (
            <span className="text-xs text-gray-500 italic">No type coverage yet. Add Pokémon to the team.</span>
          )}
        </div>
        <div className="text-xs text-gray-500 italic">
          {teamMembers.length}/6 Pokémon in team • Click on a type to filter Pokémon by that type
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center mb-2">
          <p className="text-sm font-medium text-gray-700">Team Pokémon:</p>
          <div className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full flex items-center">
            <GripVertical size={12} className="mr-1" /> Drag to reorder
          </div>
        </div>
        <Droppable droppableId={`team-${team.id}`} direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex space-x-2 overflow-x-auto p-2 bg-gray-50 rounded-lg"
            >
              {positions.map((pos, idx) => {
                const hasPokemon = teamMembers.includes(pos);
                const pokeId = teamPokemon[pos] || 0;
                
                return (
                  <Draggable
                    key={`team-${team.id}-pos-${pos}`}
                    draggableId={`team-${team.id}-pos-${pos}`}
                    index={idx}
                    isDragDisabled={!hasPokemon}
                  >
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className="flex-shrink-0 transition-all duration-200 hover:scale-105 relative"
                      >
                        {hasPokemon ? (
                          <div className="relative group">
                            <div className="relative bg-white border border-gray-200 rounded p-2 h-20 w-20 flex items-center justify-center">
                              <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-br font-medium">
                                {pos}
                              </div>
                              <PokemonImage
                                pokemon={{ id: parseInt(String(pokeId)), name: `pokemon-${pokeId}` }}
                                fallbackId={parseInt(String(pokeId))}
                                alt={`Pokémon #${pokeId}`}
                                size="md"
                                className="cursor-pointer"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all duration-200 pointer-events-none z-10">
                                <GripVertical size={18} className="text-white opacity-0 group-hover:opacity-80 filter drop-shadow transform -translate-y-1 group-hover:translate-y-0 transition-all duration-300" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium text-white bg-gray-800 bg-opacity-0 group-hover:bg-opacity-70 py-0.5 transform translate-y-full group-hover:translate-y-0 transition-all duration-200 pointer-events-none">
                                Drag to reorder
                              </div>
                            </div>
                            <button
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-200"
                              onClick={() => removeFromTeam(team.id, pos)}
                              title="Remove Pokémon"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="bg-gray-100 border border-dashed border-gray-300 rounded p-2 h-20 w-20 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors group"
                            onClick={() => addToTeam(team.id)}
                          >
                            <Plus size={20} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                            <span className="text-xs text-gray-400 mt-1 group-hover:text-gray-600 transition-colors">Add here</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};

export default TeamGroup;
