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

  // Load Pokemon data on component mount
  useEffect(() => {
    const loadRequiredPokemon = async () => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        // Try to fetch from cached API first, fall back to direct API
        let pokemonData = [];
        
        try {
          // Fetch first 200 Pokemon using cached API (covers all we need)
          pokemonData = await fetchCachedPokemonData(200, 0, '', {
            types: [],
            moves: [],
            generation: '',
            weight: { min: 0, max: 0 },
            height: { min: 0, max: 0 },
            hasEvolutions: null,
          });
          console.log('Successfully fetched Pokemon from cached API');
        } catch (cachedError) {
          console.warn('Cached API not available, using direct API:', cachedError);
          // Fallback to direct API - fetch in smaller batches to avoid rate limits
          pokemonData = await fetchPokemonData(200, 0, '', {
            types: [],
            moves: [],
            generation: '',
            weight: { min: 0, max: 0 },
            height: { min: 0, max: 0 },
            hasEvolutions: null,
          });
        }
        
        setState(prev => ({ ...prev, allPokemon: pokemonData, loading: false }));
      } catch (error) {
        console.error('Error loading Pokemon data:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    loadRequiredPokemon();
  }, []);

  // Generate random challenger team
  const generateChallenger = useCallback(async (): Promise<ChallengerTeam> => {
    const teamSize = Math.min(1 + Math.floor(state.battleWins / 3), 4); // Progressively larger teams
    const challengerName = CHALLENGER_NAMES[Math.floor(Math.random() * CHALLENGER_NAMES.length)];
    const team: GymPokemon[] = [];

    if (!state.allPokemon || state.allPokemon.length === 0) {
      console.warn('No Pokemon data available for challenger team generation');
      return { pokemon: team, name: challengerName };
    }

    // Get random types for diversity
    const availableTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
    
    for (let i = 0; i < teamSize; i++) {
      // Get random type for this Pokemon
      const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      
      // Get random Pokemon of that type
      const randomTypePokemon = getRandomPokemonOfType(state.allPokemon, randomType, 50);
      
      let selectedPokemon;
      if (randomTypePokemon.length > 0) {
        selectedPokemon = randomTypePokemon[Math.floor(Math.random() * randomTypePokemon.length)];
      } else {
        // Fallback to any random Pokemon if no Pokemon of that type found
        selectedPokemon = state.allPokemon[Math.floor(Math.random() * state.allPokemon.length)];
      }
      
      if (selectedPokemon) {
        // Challenger Pokemon levels scale with battle wins
        const level = Math.max(15, Math.min(60, 25 + state.battleWins * 3 + Math.floor(Math.random() * 15)));
        
        try {
          // Use async version for enhanced move diversity
          const gymPokemon = await createGymPokemon(selectedPokemon, level, true);
          team.push(gymPokemon);
        } catch (error) {
          console.warn(`Failed to create enhanced opponent ${selectedPokemon.name}, using fallback moves`, error);
          // Fallback to sync version if async fails
          const gymPokemon = createGymPokemonSync(selectedPokemon, level, true);
          team.push(gymPokemon);
        }
      }
    }

    console.log(`Generated challenger ${challengerName} with ${team.length} Pokemon (battle #${state.battleWins + 1}):`, 
      team.map(p => `${p.name} (Lv.${p.level}, ${p.types.join('/')}) - moves: ${p.moves.map(m => m.name).join(', ')}`));

    return { pokemon: team, name: challengerName };
  }, [state.allPokemon, state.battleWins]);

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
        if (won) {
          return {
            ...prev,
            isInBattle: false,
            battleWins: prev.battleWins + 1,
            comingFromLoss: false,
            gamePhase: 'team-expansion'
          };
        } else {
          // Check if there are still Pokemon with HP > 0
          const availablePokemon = prev.gymTeam.filter(p => p.currentHp > 0);
          
          if (availablePokemon.length > 0) {
            // Still have Pokemon left, let user choose next one
            return {
              ...prev,
              isInBattle: false,
              comingFromLoss: true,
              gamePhase: 'pokemon-select-for-battle'
            };
          } else {
            // All Pokemon fainted, game over
            return {
              ...prev,
              isInBattle: false,
              gamePhase: 'game-over'
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

    setState: setState
  };

  return {
    state,
    actions
  };
} 