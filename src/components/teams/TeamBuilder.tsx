import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTeams } from '../../hooks/useTeams'
import TeamDisplay from './TeamDisplay'
import TeamForm from './TeamForm'
import PokemonSearch from './search/PokemonSearch'
import PokemonDetailView from './PokemonDetailView'
import { toast } from 'react-hot-toast'
import { Team } from '../../lib/supabase'
import { PokemonDetails } from '../../types/pokemon'
import { TeamWithPokemon } from '../../types/teams'
import { adaptToPokemonDetails } from '../../utils/pokemonAdapters'
import { fetchMultiplePokemonDetails } from '../../services/api'

interface TeamBuilderProps {
  onClose?: () => void
  selectedPokemon?: PokemonDetails | null
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ onClose, selectedPokemon: externalSelectedPokemon }) => {
  const {
    teams,
    teamPokemon,
    isLoading,
    error,
    addPokemonToTeam,
    removeFromTeam,
    createNewTeam,
    updateTeam,
    deleteTeam,
    loadFavorites
  } = useTeams()

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetails | null>(externalSelectedPokemon || null)
  const [favoritesPokemon, setFavoritesPokemon] = useState<PokemonDetails[]>([])
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false)
  const [activePosition, setActivePosition] = useState<number | null>(null)
  const [favoritesLoaded, setFavoritesLoaded] = useState(false)

  useEffect(() => {
    if (externalSelectedPokemon) setSelectedPokemon(externalSelectedPokemon)
  }, [externalSelectedPokemon])

  const loadDirectPokemon = useCallback(async () => {
    try {
      const pokemonIds = [1, 4, 7, 25, 150, 133, 6, 9]
      const results = await fetchMultiplePokemonDetails(pokemonIds)
      setFavoritesPokemon(results)
      setIsLoadingFavorites(false)
    } catch {
      setIsLoadingFavorites(false)
      toast.error('Failed to load Pokémon data. Please try again.')
    }
  }, [])

  const pokemonDataLoaded = useRef(false)

  useEffect(() => {
    const loadFavs = async () => {
      if (pokemonDataLoaded.current || favoritesPokemon.length > 0) return
      pokemonDataLoaded.current = true
      setIsLoadingFavorites(true)
      try {
        const pool = await loadFavorites()
        if (pool.length > 0) {
          const ids = pool.map(p => p.id)
          try {
            const details = await fetchMultiplePokemonDetails(ids)
            setFavoritesPokemon(details)
            setFavoritesLoaded(true)
          } catch {
            setFavoritesPokemon(pool.map(adaptToPokemonDetails))
            setFavoritesLoaded(true)
          }
        } else {
          await loadDirectPokemon()
          setFavoritesLoaded(true)
        }
      } catch {
        await loadDirectPokemon()
        setFavoritesLoaded(true)
      } finally {
        setIsLoadingFavorites(false)
      }
    }
    loadFavs()
  }, [loadFavorites, loadDirectPokemon, favoritesPokemon.length])

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeam) setSelectedTeam(teams[0])
  }, [teams, selectedTeam])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const handleTeamSelect = useCallback(
    (team: Team) => {
      if (!selectedTeam || selectedTeam.id !== team.id) {
        setSelectedTeam(team)
        setActivePosition(null)
      }
    },
    [selectedTeam]
  )

  const handleCreateTeam = useCallback(
    async (name: string, description: string) => {
      if (await createNewTeam(name, description)) setIsFormOpen(false)
    },
    [createNewTeam]
  )

  const handleUpdateTeam = useCallback(
    async (teamId: number, name: string, description: string) => {
      if (await updateTeam(teamId, name, description)) {
        setIsFormOpen(false)
        setEditingTeam(null)
      }
    },
    [updateTeam]
  )

  const handleDeleteTeam = useCallback(
    async (teamId: number) => {
      if (await deleteTeam(teamId)) {
        if (selectedTeam?.id === teamId) setSelectedTeam(teams && teams.length > 0 ? teams[0] : null)
      }
    },
    [deleteTeam, selectedTeam, teams]
  )

  const handleRemovePokemon = useCallback(
    async (teamId: number, position: number) => {
      await removeFromTeam(teamId, position)
    },
    [removeFromTeam]
  )

  const handlePokemonSelect = useCallback(
    (pokemon: PokemonDetails) => {
      setSelectedPokemon(pokemon)
      if (selectedTeam) {
        toast.success(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} selected! Now choose a position in your team.`, { duration: 3000 })
      } else if (teams && teams.length > 0) {
        toast.success(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} selected! Now select a team to add it to.`, { duration: 3000 })
        handleTeamSelect(teams[0])
      } else {
        toast.success(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} selected! Create a team to add it.`, { duration: 3000 })
      }
    },
    [selectedTeam, teams, handleTeamSelect]
  )

  const handleAddToTeam = useCallback(
    (position: number) => {
      if (!selectedTeam || !selectedPokemon) return
      addPokemonToTeam(selectedTeam.id, selectedPokemon.id, position).then(success => {
        if (success) {
          toast.success(`Added ${selectedPokemon.name} to your team!`)
          setSelectedPokemon(null)
        }
      })
    },
    [selectedTeam, selectedPokemon, addPokemonToTeam]
  )

  const isInitialLoading = isLoading || !favoritesLoaded

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 w-full gap-4 p-4 overflow-auto relative">
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 text-gray-500 hover:text-gray-700 bg-white rounded-full p-2 shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}

      <div className="lg:col-span-5 flex flex-col gap-3 overflow-auto order-2 lg:order-1">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-800">My Teams</h2>
            <button
              onClick={() => {
                setIsFormOpen(true)
                setEditingTeam(null)
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-full flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 5v14M5 12h14"/></svg>
              New Team
            </button>
          </div>

          {isLoading && teams.length === 0 ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Loading teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm mb-2">No teams yet</p>
              <button
                onClick={() => {
                  setIsFormOpen(true)
                  setEditingTeam(null)
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
                        onClick={e => {
                          e.stopPropagation()
                          setEditingTeam(team)
                          setIsFormOpen(true)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteTeam(team.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  {team.description && <p className="text-xs text-gray-500 mt-1 truncate">{team.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTeam && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <TeamDisplay
              team={{ ...selectedTeam, members: teamPokemon[selectedTeam.id] || {} } as TeamWithPokemon}
              onEditTeam={() => {
                setEditingTeam(selectedTeam)
                setIsFormOpen(true)
              }}
              onDeleteTeam={handleDeleteTeam}
              onSelectSlot={(_, position) => {
                if (selectedPokemon) {
                  handleAddToTeam(position)
                } else {
                  setActivePosition(position)
                  toast.success('Select a Pokémon to add to this position')
                }
              }}
              onRemovePokemon={(teamId, position) => handleRemovePokemon(teamId, position)}
              selectedPosition={activePosition}
            />
          </div>
        )}
      </div>

      {isInitialLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center p-6 rounded-lg bg-white shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">Loading your Pokémon data...</p>
            <p className="text-sm text-gray-500 mt-2">This will just take a moment</p>
          </div>
        </div>
      )}

      <div className="lg:col-span-7 flex flex-col gap-3 overflow-auto">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Pokémon Selection</h2>
          <PokemonSearch initialPool={favoritesPokemon} onPokemonSelect={handlePokemonSelect} isLoadingInitialPool={isLoadingFavorites} />
        </div>

        {isLoadingFavorites && favoritesPokemon.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2" />
            <p className="text-gray-500">Loading your favorite Pokémon...</p>
          </div>
        )}

        {!isLoadingFavorites && favoritesPokemon.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-3">No favorite Pokémon found</p>
            <p className="text-sm text-gray-400 mb-4">We'll load some popular Pokémon for you</p>
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              onClick={async () => {
                setIsLoadingFavorites(true)
                await loadDirectPokemon()
              }}
            >
              Load Popular Pokémon
            </button>
          </div>
        )}

        {selectedPokemon && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <PokemonDetailView
              pokemon={selectedPokemon}
              onClose={() => setSelectedPokemon(null)}
              canAddToTeam={!!selectedTeam}
              onAdd={() => {
                if (selectedTeam) {
                  toast.success('Now select a position in your team to place ' + selectedPokemon.name.charAt(0).toUpperCase() + selectedPokemon.name.slice(1), { duration: 3000 })
                  setActivePosition(-1)
                } else if (teams && teams.length > 0) {
                  toast.success('First select a team to add ' + selectedPokemon.name.charAt(0).toUpperCase() + selectedPokemon.name.slice(1) + ' to', { duration: 3000 })
                } else {
                  toast.success('Create a team first to add ' + selectedPokemon.name.charAt(0).toUpperCase() + selectedPokemon.name.slice(1), { duration: 3000 })
                  setIsFormOpen(true)
                }
              }}
            />
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => {
          setIsFormOpen(false)
          setEditingTeam(null)
        }}>
          <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <TeamForm
              onSubmit={(name: string, description: string) => {
                if (editingTeam) {
                  handleUpdateTeam(editingTeam.id, name, description)
                } else {
                  handleCreateTeam(name, description)
                }
                setIsFormOpen(false)
                setEditingTeam(null)
              }}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingTeam(null)
              }}
              initialName={editingTeam?.name || ''}
              initialDescription={editingTeam?.description || ''}
              isCreating={!editingTeam}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamBuilder
