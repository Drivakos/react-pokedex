import React from 'react';
import { Link } from 'react-router-dom';
import { PokemonDetails } from '../../types/pokemon';
import PokemonImage from '../PokemonImage';

interface PokemonEvolutionTabProps {
  pokemonDetails: PokemonDetails;
}

export const PokemonEvolutionTab: React.FC<PokemonEvolutionTabProps> = ({ pokemonDetails }) => {
  if (!pokemonDetails.has_evolutions) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center max-w-md">
          <p className="text-gray-700">
            This Pokémon does not evolve.
          </p>
        </div>
      </div>
    );
  }

  // Find the base form
  const baseForm = pokemonDetails.evolution_chain.find(evo => !evo.evolves_from_id) || pokemonDetails.evolution_chain[0];
  
  // Helper to get all species that evolve from a given species
  const getChildren = (speciesId: number) => 
    pokemonDetails.evolution_chain.filter(evo => evo.evolves_from_id === speciesId);
    
  // Get all direct evolutions from base form
  const directEvolutions = getChildren(baseForm.species_id);
  
  // Build the tree
  const evolutionTree = {
    base: baseForm,
    branches: directEvolutions.map(directEvo => ({
      evolution: directEvo,
      furtherEvolutions: getChildren(directEvo.species_id)
    }))
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Evolution Chain</h2>
      
      <div className="relative py-8 px-4 overflow-x-auto">
        <div className="min-w-max">
          <div className="flex flex-col items-center">
            {/* Base Form */}
            <div className="flex flex-col items-center">
              <div className={`w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-2 ${baseForm.species_id === pokemonDetails.id ? 'ring-2 ring-blue-500' : ''}`}>
                <Link 
                  to={`/pokemon/${baseForm.species_id}`}
                  className="cursor-pointer transition-transform hover:scale-110"
                  title={`View ${baseForm.species_name} details`}
                >
                  <PokemonImage
                    pokemonId={baseForm.species_id}
                    alt={baseForm.species_name}
                    className="w-24 h-24 object-contain"
                  />
                </Link>
              </div>
              <div className="text-center">
                <p className="font-medium capitalize">{baseForm.species_name}</p>
                {evolutionTree.branches.length === 0 && (
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                    Final Evolution
                  </span>
                )}
              </div>
            </div>
            
            {evolutionTree.branches.length > 0 && (
              <div className="mt-6 relative w-full">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-300 z-10"></div>
                
                {evolutionTree.branches.length > 1 && (
                  <div className="absolute top-12 left-0 right-0 h-0.5 bg-gray-300 z-10 mx-auto" 
                       style={{ width: `${Math.min(100, (evolutionTree.branches.length - 1) * 33)}%` }}>
                  </div>
                )}
                
                <div className="flex justify-center mt-12 relative w-full gap-4">
                  {evolutionTree.branches.map((branch, branchIndex) => (
                    <div key={`branch-${branchIndex}`} className="flex flex-col items-center relative min-w-[150px]">
                      {evolutionTree.branches.length > 1 && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-300 z-10"></div>
                      )}
                      
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs mb-4 mt-12 whitespace-nowrap">
                        {branch.evolution.trigger_name === 'level-up' && branch.evolution.min_level && (
                          <span>Level {branch.evolution.min_level}</span>
                        )}
                        {branch.evolution.trigger_name === 'use-item' && branch.evolution.item && (
                          <span>Use {branch.evolution.item?.replace('-', ' ') || 'item'}</span>
                        )}
                        {branch.evolution.trigger_name === 'trade' && (
                          <span>Trade</span>
                        )}
                        {branch.evolution.trigger_name && !branch.evolution.min_level && !branch.evolution.item && branch.evolution.trigger_name !== 'trade' && (
                          <span>{branch.evolution.trigger_name?.replace('-', ' ') || 'Unknown'}</span>
                        )}
                        {!branch.evolution.trigger_name && (
                          <span>Evolution</span>
                        )}
                      </div>
                      
                      <div className={`w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-2 ${branch.evolution.species_id === pokemonDetails.id ? 'ring-2 ring-blue-500' : ''}`}>
                        <Link 
                          to={`/pokemon/${branch.evolution.species_id}`}
                          className="cursor-pointer transition-transform hover:scale-110"
                          title={`View ${branch.evolution.species_name} details`}
                        >
                          <PokemonImage
                            pokemonId={branch.evolution.species_id}
                            alt={branch.evolution.species_name}
                            className="w-24 h-24 object-contain"
                          />
                        </Link>
                      </div>
                      <div className="text-center">
                        <p className="font-medium capitalize">{branch.evolution.species_name}</p>
                        {branch.furtherEvolutions.length === 0 && (
                          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                            Final Evolution
                          </span>
                        )}
                      </div>
                      
                      {branch.furtherEvolutions.length > 0 && (
                        <div className="mt-6 relative w-full">
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-300 z-10"></div>
                          
                          {branch.furtherEvolutions.length > 1 && (
                            <div className="absolute top-12 left-0 right-0 h-0.5 bg-gray-300 z-10 mx-auto"
                                 style={{ width: `${Math.min(100, (branch.furtherEvolutions.length - 1) * 50)}%` }}>
                            </div>
                          )}
                          
                          <div className="flex justify-center mt-12 relative w-full gap-4">
                            {branch.furtherEvolutions.map((furtherEvo, furtherIndex) => (
                              <div key={`further-${branchIndex}-${furtherIndex}`} className="flex flex-col items-center relative min-w-[120px]">
                                {branch.furtherEvolutions.length > 1 && (
                                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-300 z-10"></div>
                                )}
                                
                                <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs mb-4 mt-12 whitespace-nowrap">
                                  {furtherEvo.trigger_name === 'level-up' && furtherEvo.min_level && (
                                    <span>Level {furtherEvo.min_level}</span>
                                  )}
                                  {furtherEvo.trigger_name === 'use-item' && furtherEvo.item && (
                                    <span>Use {furtherEvo.item?.replace('-', ' ') || 'item'}</span>
                                  )}
                                  {furtherEvo.trigger_name === 'trade' && (
                                    <span>Trade</span>
                                  )}
                                  {furtherEvo.trigger_name && !furtherEvo.min_level && !furtherEvo.item && furtherEvo.trigger_name !== 'trade' && (
                                    <span>{furtherEvo.trigger_name?.replace('-', ' ') || 'Unknown'}</span>
                                  )}
                                  {!furtherEvo.trigger_name && (
                                    <span>Evolution</span>
                                  )}
                                </div>
                                
                                <div className={`w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-2 ${furtherEvo.species_id === pokemonDetails.id ? 'ring-2 ring-blue-500' : ''}`}>
                                  <Link 
                                    to={`/pokemon/${furtherEvo.species_id}`}
                                    className="cursor-pointer transition-transform hover:scale-110"
                                    title={`View ${furtherEvo.species_name} details`}
                                  >
                                    <PokemonImage
                                      pokemonId={furtherEvo.species_id}
                                      alt={furtherEvo.species_name}
                                      className="w-24 h-24 object-contain"
                                    />
                                  </Link>
                                </div>
                                <div className="text-center">
                                  <p className="font-medium capitalize">{furtherEvo.species_name}</p>
                                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                                    Final Evolution
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Evolution Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pokemonDetails.evolution_chain.map((evo, index) => (
            <div key={`evo-detail-${index}`} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <PokemonImage
                    pokemonId={evo.species_id}
                    alt={evo.species_name}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div>
                  <h4 className="font-bold capitalize text-lg">{evo.species_name}</h4>
                  <p className="text-xs text-gray-500">#{String(evo.species_id).padStart(3, '0')}</p>
                </div>
              </div>
              
              <div className="text-sm">
                {index === 0 ? (
                  <p className="text-gray-600">Base form</p>
                ) : (
                  <div>
                    <p className="font-medium mb-1">Evolution Trigger:</p>
                    <ul className="list-disc pl-5 text-gray-600 space-y-1">
                      {evo.min_level && (
                        <li>Evolves at level {evo.min_level}</li>
                      )}
                      {evo.trigger_name && (
                        <li>Trigger: {evo.trigger_name?.replace('-', ' ') || 'Unknown'}</li>
                      )}
                      {evo.item && (
                        <li>Requires item: {evo.item?.replace('-', ' ') || 'Unknown'}</li>
                      )}
                      {!evo.min_level && !evo.item && evo.trigger_name !== 'level-up' && (
                        <li>Special evolution method</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
