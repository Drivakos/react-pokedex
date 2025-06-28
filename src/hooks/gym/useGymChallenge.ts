import { useState, useEffect, useCallback } from 'react';
import { fetchPokemonData } from '../../services/api';
import { fetchCachedPokemonData } from '../../services/cached-api';
import { GymChallengeState, GymType, GymPokemon, ChallengerTeam } from '../../utils/gym/types';
import { CHALLENGER_NAMES } from '../../utils/gym/constants';
import { createGymPokemonSync, getRandomPokemonOfType } from '../../utils/gym/pokemonGenerator';
import { createGymPokemon } from '../../utils/gym/pokemonGenerator';

export function useGymChallenge() {
  const [state, setState] = useState<GymChallengeState>({
    gamePhase: 'type-selection',
    selectedType: null,
    availablePokemon: [],
    gymTeam: [],
    currentChallenger: null,
    battleWins: 0,
    isInBattle: false,
    loading: false,
    allPokemon: [],
    selectedBattlePokemon: null,
    pokemonToReplace: null,
    comingFromLoss: false,
  });

  // Track used Pokemon for better variety across battles
  const [usedPokemonIds, setUsedPokemonIds] = useState<Set<number>>(new Set());

  // Load Pokemon data on component mount
  useEffect(() => {
    const loadRequiredPokemon = async () => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        // Try to fetch from cached API first, fall back to direct API
        let pokemonData = [];
        
        try {
          // Fetch up to 1000 Pokemon using cached API (covers all generations)
          pokemonData = await fetchCachedPokemonData(1000, 0, '', {
            types: [],
            moves: [],
            generation: '',
            weight: { min: 0, max: 0 },
            height: { min: 0, max: 0 },
            hasEvolutions: null,
          });
          console.log(`Successfully fetched ${pokemonData.length} Pokemon from cached API`);
        } catch (cachedError) {
          console.warn('Cached API not available, using direct API:', cachedError);
          // Fallback to direct API - fetch more Pokemon for variety
          pokemonData = await fetchPokemonData(1000, 0, '', {
            types: [],
            moves: [],
            generation: '',
            weight: { min: 0, max: 0 },
            height: { min: 0, max: 0 },
            hasEvolutions: null,
          });
          console.log(`Successfully fetched ${pokemonData.length} Pokemon from direct API`);
        }
        
        // Add debug info about Pokemon generations loaded
        const generationStats = pokemonData.reduce((stats, pokemon) => {
          const id = pokemon.id;
          let gen = 'Unknown';
          if (id <= 151) gen = 'Gen 1';
          else if (id <= 251) gen = 'Gen 2';
          else if (id <= 386) gen = 'Gen 3';
          else if (id <= 493) gen = 'Gen 4';
          else if (id <= 649) gen = 'Gen 5';
          else if (id <= 721) gen = 'Gen 6';
          else if (id <= 809) gen = 'Gen 7';
          else if (id <= 905) gen = 'Gen 8';
          else gen = 'Gen 9+';
          
          stats[gen] = (stats[gen] || 0) + 1;
          return stats;
        }, {} as Record<string, number>);
        
        console.log('Pokemon generations loaded:', generationStats);
        console.log(`Total Pokemon available for battles: ${pokemonData.length}`);
        setState(prev => ({ ...prev, allPokemon: pokemonData, loading: false }));
      } catch (error) {
        console.error('Error loading Pokemon data:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    loadRequiredPokemon();
  }, []);

  // Enhanced challenger generation with better randomization
  const generateChallenger = useCallback(async (): Promise<ChallengerTeam> => {
    const teamSize = Math.min(1 + Math.floor(state.battleWins / 3), 4); // Progressively larger teams
    const challengerName = CHALLENGER_NAMES[Math.floor(Math.random() * CHALLENGER_NAMES.length)];
    const team: GymPokemon[] = [];

    if (!state.allPokemon || state.allPokemon.length === 0) {
      console.warn('No Pokemon data available for challenger team generation');
      return { pokemon: team, name: challengerName };
    }

    // Get all available types for better variety
    const availableTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
    
    // Track Pokemon IDs used in this team to prevent duplicates
    const teamPokemonIds = new Set<number>();
    
    // Create a pool of available Pokemon, prioritizing unused ones
    const availablePokemon = state.allPokemon.filter(pokemon => !usedPokemonIds.has(pokemon.id));
    const fallbackPokemon = state.allPokemon; // Use all Pokemon if needed
    
    console.log(`Generating challenger team #${state.battleWins + 1}:`);
    console.log(`- Available unused Pokemon: ${availablePokemon.length}/${state.allPokemon.length}`);
    console.log(`- Team size: ${teamSize}`);
    
    for (let i = 0; i < teamSize; i++) {
      let selectedPokemon = null;
      let attempts = 0;
      const maxAttempts = 20; // Prevent infinite loops
      
      while (!selectedPokemon && attempts < maxAttempts) {
        attempts++;
        
        // Get random type for variety
        const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        
        // First try with unused Pokemon
        let candidatePokemon = getRandomPokemonOfType(availablePokemon, randomType, 20);
        
        // If not enough unused Pokemon of this type, try all Pokemon
        if (candidatePokemon.length < 3 && availablePokemon.length !== state.allPokemon.length) {
          candidatePokemon = getRandomPokemonOfType(fallbackPokemon, randomType, 30);
        }
        
        // If still no Pokemon of this type found, get any type
        if (candidatePokemon.length === 0) {
          candidatePokemon = availablePokemon.length > 0 ? 
            availablePokemon.slice(0, 20) : 
            fallbackPokemon.slice(0, 20);
        }
        
        // Filter out Pokemon already in this team
        const validCandidates = candidatePokemon.filter(pokemon => !teamPokemonIds.has(pokemon.id));
        
        if (validCandidates.length > 0) {
          selectedPokemon = validCandidates[Math.floor(Math.random() * validCandidates.length)];
          teamPokemonIds.add(selectedPokemon.id);
        }
      }
      
      // Fallback: if we still don't have a Pokemon, get any unused one
      if (!selectedPokemon) {
        const remainingPokemon = state.allPokemon.filter(pokemon => !teamPokemonIds.has(pokemon.id));
        if (remainingPokemon.length > 0) {
          selectedPokemon = remainingPokemon[Math.floor(Math.random() * remainingPokemon.length)];
          teamPokemonIds.add(selectedPokemon.id);
        }
      }
      
      if (selectedPokemon) {
        // Challenger Pokemon levels scale with battle wins
        const level = Math.max(15, Math.min(60, 25 + state.battleWins * 3 + Math.floor(Math.random() * 15)));
        
        try {
          // Use async version for enhanced move diversity
          const gymPokemon = await createGymPokemon(selectedPokemon, level, true);
          team.push(gymPokemon);
          
          console.log(`  - Selected: ${selectedPokemon.name} (Lv.${level}, ${selectedPokemon.types?.join('/') || 'unknown'}) - ${usedPokemonIds.has(selectedPokemon.id) ? 'REUSED' : 'NEW'}`);
          console.log(`    Ability: ${gymPokemon.ability} | Nature: ${gymPokemon.nature}`);
        } catch (error) {
          console.warn(`Failed to create enhanced opponent ${selectedPokemon.name}, using fallback moves`, error);
          // Fallback to sync version if async fails
          const gymPokemon = createGymPokemonSync(selectedPokemon, level, true);
          team.push(gymPokemon);
          console.log(`    Ability: ${gymPokemon.ability} | Nature: ${gymPokemon.nature} (fallback)`);
        }
        
        // Mark Pokemon as used for future battles
        setUsedPokemonIds(prev => new Set([...prev, selectedPokemon.id]));
      }
    }

    console.log(`Generated challenger "${challengerName}" with ${team.length} Pokemon:`, 
      team.map(p => `${p.name} (Lv.${p.level}, ${p.types.join('/')})`));
    
    // Reset used Pokemon tracking after every 10 battles to allow reuse
    if (state.battleWins > 0 && state.battleWins % 10 === 0) {
      console.log('Resetting used Pokemon pool for variety after 10 battles');
      setUsedPokemonIds(new Set());
    }

    return { pokemon: team, name: challengerName };
  }, [state.allPokemon, state.battleWins, usedPokemonIds]);

  // Action creators
  const actions = {
    handleTypeSelection: (type: GymType) => {
      const options = getRandomPokemonOfType(state.allPokemon, type, 3);
      setState(prev => ({
        ...prev,
        selectedType: type,
        availablePokemon: options,
        gamePhase: 'pokemon-selection',
        comingFromLoss: false
      }));
    },

    handlePokemonSelection: async (pokemon: any) => {
      // Use async version for better move generation
      try {
        const gymPokemon = await createGymPokemon(pokemon, 50);
        setState(prev => ({
          ...prev,
          gymTeam: [gymPokemon],
          gamePhase: 'pokemon-select-for-battle'
        }));
      } catch (error) {
        console.warn('Failed to create gym Pokemon with async moves, using sync version', error);
        const gymPokemon = createGymPokemonSync(pokemon, 50);
        setState(prev => ({
          ...prev,
          gymTeam: [gymPokemon],
          gamePhase: 'pokemon-select-for-battle'
        }));
      }
    },

    startNewBattle: async () => {
      const challenger = await generateChallenger();
      setState(prev => ({
        ...prev,
        currentChallenger: challenger,
        isInBattle: true
      }));
    },

    handleBattleComplete: (won: boolean) => {
      setState(prev => {
        // Update the gym team with the battle Pokemon's current state
        const updatedGymTeam = prev.gymTeam.map(p => 
          p.id === prev.selectedBattlePokemon?.id ? {
            ...p,
            currentHp: won ? p.currentHp : 0, // If lost, set HP to 0
            status: prev.selectedBattlePokemon?.status || null,
            statusTurns: prev.selectedBattlePokemon?.statusTurns || 0
          } : p
        );

        if (won) {
          return {
            ...prev,
            isInBattle: false,
            battleWins: prev.battleWins + 1,
            comingFromLoss: false,
            gamePhase: 'team-expansion',
            gymTeam: updatedGymTeam,
            selectedBattlePokemon: null // Clear selected Pokemon
          };
        } else {
          // Check if there are still Pokemon with HP > 0 after this battle
          const availablePokemon = updatedGymTeam.filter(p => p.currentHp > 0);
          
          if (availablePokemon.length > 0) {
            // Still have Pokemon left, let user choose next one
            return {
              ...prev,
              isInBattle: false,
              comingFromLoss: true,
              gamePhase: 'pokemon-select-for-battle',
              gymTeam: updatedGymTeam,
              selectedBattlePokemon: null // Clear selected Pokemon
            };
          } else {
            // All Pokemon fainted, game over
            return {
              ...prev,
              isInBattle: false,
              gamePhase: 'game-over',
              gymTeam: updatedGymTeam,
              selectedBattlePokemon: null // Clear selected Pokemon
            };
          }
        }
      });
    },

    handleBattlePokemonSelection: async (pokemon: GymPokemon) => {
      const challenger = await generateChallenger();
      setState(prev => ({
        ...prev,
        selectedBattlePokemon: pokemon,
        currentChallenger: challenger,
        comingFromLoss: false,
        gamePhase: 'battling'
      }));
    },

    handleTeamExpansion: async (pokemon: any) => {
      // Use async version for better move generation
      try {
        const newGymPokemon = await createGymPokemon(pokemon, 50);
        
        setState(prev => {
          if (prev.pokemonToReplace) {
            // Replace the selected Pokemon
            return {
              ...prev,
              gymTeam: prev.gymTeam.map(p => p.id === prev.pokemonToReplace!.id ? newGymPokemon : p),
              pokemonToReplace: null,
              gamePhase: 'pokemon-select-for-battle'
            };
          } else {
            // Add new Pokemon to team
            return {
              ...prev,
              gymTeam: [...prev.gymTeam, newGymPokemon],
              gamePhase: 'pokemon-select-for-battle'
            };
          }
        });
      } catch (error) {
        console.warn('Failed to create gym Pokemon with async moves, using sync version', error);
        const newGymPokemon = createGymPokemonSync(pokemon, 50);
        
        setState(prev => {
          if (prev.pokemonToReplace) {
            // Replace the selected Pokemon
            return {
              ...prev,
              gymTeam: prev.gymTeam.map(p => p.id === prev.pokemonToReplace!.id ? newGymPokemon : p),
              pokemonToReplace: null,
              gamePhase: 'pokemon-select-for-battle'
            };
          } else {
            // Add new Pokemon to team
            return {
              ...prev,
              gymTeam: [...prev.gymTeam, newGymPokemon],
              gamePhase: 'pokemon-select-for-battle'
            };
          }
        });
      }
    },

    handlePokemonReplacement: (pokemonToReplace: GymPokemon) => {
      setState(prev => ({
        ...prev,
        pokemonToReplace
      }));
    },

    resetChallenge: () => {
      setState({
        gamePhase: 'type-selection',
        selectedType: null,
        availablePokemon: [],
        gymTeam: [],
        currentChallenger: null,
        battleWins: 0,
        isInBattle: false,
        loading: false,
        allPokemon: state.allPokemon, // Keep the loaded Pokemon data
        selectedBattlePokemon: null,
        pokemonToReplace: null,
        comingFromLoss: false,
      });
      // Clear used Pokemon tracking for completely fresh start
      setUsedPokemonIds(new Set());
      console.log('Challenge reset - Pokemon variety pool refreshed');
    },

    refreshAvailablePokemon: () => {
      if (state.selectedType) {
        const newOptions = getRandomPokemonOfType(state.allPokemon, state.selectedType, 3);
        setState(prev => ({
          ...prev,
          availablePokemon: newOptions
        }));
      }
    },

    setGamePhase: (phase: GymChallengeState['gamePhase']) => {
      setState(prev => ({ ...prev, gamePhase: phase }));
    },

    setPokemonToReplace: (pokemon: GymPokemon | null) => {
      setState(prev => ({ ...prev, pokemonToReplace: pokemon }));
    },

    refreshPokemonPool: () => {
      setUsedPokemonIds(new Set());
      console.log('Pokemon variety pool manually refreshed - all Pokemon available again');
    },

    setState: setState
  };

  return {
    state,
    actions,
    debug: {
      usedPokemonCount: usedPokemonIds.size,
      totalPokemonCount: state.allPokemon.length,
      usedPokemonIds: Array.from(usedPokemonIds)
    }
  };
} 