import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import toast from 'react-hot-toast';
import { PokemonService } from '../services/pokemon.service';
import { fetchPokemonData } from '../services/api';

interface TeamMember {
  id: number;
  team_id: number;
  pokemon_id: number;
  position: number;
  nickname?: string;
  level?: number;
  gender?: string;
  is_shiny?: boolean;
  item?: string;
  ability?: string;
  nature?: string;
  tera_type?: string;
  moves?: string[];
  evs?: any;
  ivs?: any;
}

interface TeamStore {
  // State
  currentTeam: any | null;
  teamMembers: TeamMember[];
  pokemonData: Record<number, any>;
  selectedMember: TeamMember | null;
  loading: boolean;
  
  // UI State
  showPokemonSearch: boolean;
  showMovesetEditor: boolean;
  searchQuery: string;
  searchResults: any[];
  
  // Actions
  loadTeam: (teamId: number, teams: any[], getTeamMembers: (id: number) => Promise<any[]>) => Promise<void>;
  setSelectedMember: (member: TeamMember | null) => void;
  setShowPokemonSearch: (show: boolean) => void;
  setShowMovesetEditor: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  searchPokemon: (query: string) => Promise<void>;
  
  // Team Operations (Wrappers for Auth methods that update store state)
  addPokemon: (teamId: number, pokemon: any, addMethod: any, getMembersMethod: any) => Promise<void>;
  removePokemon: (teamId: number, position: number, removeMethod: any, getMembersMethod: any) => Promise<void>;
  updateMemberBuild: (teamId: number, position: number, buildData: any, updateMethod: any, getMembersMethod: any) => Promise<void>;
}

export const useTeamStore = create<TeamStore>()(
  immer((set, get) => ({
    currentTeam: null,
    teamMembers: [],
    pokemonData: {},
    selectedMember: null,
    loading: false,
    
    showPokemonSearch: false,
    showMovesetEditor: false,
    searchQuery: '',
    searchResults: [],
    
    loadTeam: async (teamId, teams, getTeamMembers) => {
      set({ loading: true });
      try {
        const team = teams.find((t: any) => t.id === teamId);
        if (!team) return;
        
        set({ currentTeam: team });
        
        const members = await getTeamMembers(teamId);
        set({ teamMembers: members });
        
        if (members.length > 0) {
          const pokemonIds = [...new Set(members.map((m: any) => m.pokemon_id))];
          const pokemonList = await PokemonService.getBatch(pokemonIds);
          
          const newData: Record<number, any> = {};
          pokemonList.forEach(pokemon => {
            newData[pokemon.id] = {
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
          });
          set({ pokemonData: newData });
        }
      } catch (error) {
        console.error('Failed to load team data:', error);
        toast.error('Failed to load team data');
      } finally {
        set({ loading: false });
      }
    },
    
    setSelectedMember: (member) => set({ selectedMember: member }),
    setShowPokemonSearch: (show) => set({ showPokemonSearch: show }),
    setShowMovesetEditor: (show) => set({ showMovesetEditor: show }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    searchPokemon: async (query) => {
      if (query.length < 2) {
        set({ searchResults: [] });
        return;
      }
      
      try {
        const results = await fetchPokemonData(10, 0, query, {
          types: [], moves: [], generation: '', weight: { min: 0, max: 1000 }, height: { min: 0, max: 100 }, hasEvolutions: null
        });
        
        const transformedResults = results.map(p => ({
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
        
        set({ searchResults: transformedResults });
      } catch (error) {
        console.error('Failed to search Pokemon:', error);
      }
    },
    
    addPokemon: async (teamId, pokemon, addMethod, getMembersMethod) => {
      const { teamMembers } = get();
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
        await addMethod(teamId, pokemon.id, nextPosition);
        const members = await getMembersMethod(teamId);
        set({ teamMembers: members, showPokemonSearch: false, searchQuery: '' });
        
        // Ensure we have the pokemon data
        if (!get().pokemonData[pokemon.id]) {
          set(state => {
            state.pokemonData[pokemon.id] = pokemon;
          });
        }
      } catch (error) {
        toast.error('Failed to add Pokemon to team');
      }
    },
    
    removePokemon: async (teamId, position, removeMethod, getMembersMethod) => {
      try {
        await removeMethod(teamId, position);
        const members = await getMembersMethod(teamId);
        set({ teamMembers: members });
        
        const { selectedMember } = get();
        if (selectedMember?.position === position) {
          set({ showMovesetEditor: false, selectedMember: null });
        }
      } catch (error) {
        toast.error('Failed to remove Pokemon');
      }
    },
    
    updateMemberBuild: async (teamId, position, buildData, updateMethod, getMembersMethod) => {
      try {
        await updateMethod(teamId, position, buildData);
        const members = await getMembersMethod(teamId);
        set({ teamMembers: members, showMovesetEditor: false, selectedMember: null });
      } catch (error) {
        toast.error('Failed to save build');
      }
    }
  }))
);
