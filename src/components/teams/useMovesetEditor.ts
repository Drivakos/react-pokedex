import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchMoveDetails, fetchPokemonAbilities, fetchCompetitiveItems, fetchPokemonById, fetchPokemonMoves } from '../../services/api';
import type { PremadePokemonBuild } from '../../services/premade-builds.service';
import { formatName } from '../../utils/helpers';
import { type BuildValidationErrors, HELD_ITEMS, type MoveDetails, type MovesetEditorProps, type Nature, type PokemonBuild, moveDetailsCache, toShowdownId } from './moveset-editor-model';

type MovesetEditorControllerOptions = Pick<MovesetEditorProps, 'pokemon' | 'teamId' | 'initialBuild' | 'onSave'>;

export function useMovesetEditor({ pokemon, teamId, initialBuild, onSave }: MovesetEditorControllerOptions) {
  const initialBuildRef = useRef(initialBuild);
  const [selectedMoves, setSelectedMoves] = useState<string[]>([]);
  const [availableMoves, setAvailableMoves] = useState<string[]>([]);
  const [moveDetails, setMoveDetails] = useState<Record<string, MoveDetails>>(moveDetailsCache);
  const [validationErrors, setValidationErrors] = useState<BuildValidationErrors>({});
  const [premadeBuilds, setPremadeBuilds] = useState<PremadePokemonBuild[]>([]);
  const [showPremadeBuilds, setShowPremadeBuilds] = useState(false);
  const [premadeBuildsLoading, setPremadeBuildsLoading] = useState(false);
  const [loading, setLoading] = useState(true);


  // New build customization states
  const [pokemonBuild, setPokemonBuild] = useState<PokemonBuild>(
    initialBuild || {
      moves: [],
      nature: 'hardy',
      ability: '',
      gender: null,
      heldItem: '',
      nickname: '',
      isShiny: false,
      teraType: '',
      ivs: {
        hp: 31,
        attack: 31,
        defense: 31,
        'special-attack': 31,
        'special-defense': 31,
        speed: 31
      },
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        'special-attack': 0,
        'special-defense': 0,
        speed: 0
      }
    }
  );

  const [availableNatures] = useState<Nature[]>([
    { name: 'hardy', description: 'Neutral nature (no stat changes)' },
    { name: 'lonely', description: '+Attack, -Defense' },
    { name: 'brave', description: '+Attack, -Speed' },
    { name: 'adamant', description: '+Attack, -Sp. Attack' },
    { name: 'naughty', description: '+Attack, -Sp. Defense' },
    { name: 'bold', description: '+Defense, -Attack' },
    { name: 'docile', description: 'Neutral nature (no stat changes)' },
    { name: 'relaxed', description: '+Defense, -Speed' },
    { name: 'impish', description: '+Defense, -Sp. Attack' },
    { name: 'lax', description: '+Defense, -Sp. Defense' },
    { name: 'timid', description: '+Speed, -Attack' },
    { name: 'hasty', description: '+Speed, -Defense' },
    { name: 'serious', description: 'Neutral nature (no stat changes)' },
    { name: 'jolly', description: '+Speed, -Sp. Attack' },
    { name: 'naive', description: '+Speed, -Sp. Defense' },
    { name: 'modest', description: '+Sp. Attack, -Attack' },
    { name: 'mild', description: '+Sp. Attack, -Defense' },
    { name: 'quiet', description: '+Sp. Attack, -Speed' },
    { name: 'bashful', description: 'Neutral nature (no stat changes)' },
    { name: 'rash', description: '+Sp. Attack, -Sp. Defense' },
    { name: 'calm', description: '+Sp. Defense, -Attack' },
    { name: 'gentle', description: '+Sp. Defense, -Defense' },
    { name: 'sassy', description: '+Sp. Defense, -Speed' },
    { name: 'careful', description: '+Sp. Defense, -Sp. Attack' },
    { name: 'quirky', description: 'Neutral nature (no stat changes)' }
  ]);
  const [availableAbilities, setAvailableAbilities] = useState<string[]>([]);
  const [hasGenderDifference] = useState(false);


  // Description states
  const [abilityDescriptions, setAbilityDescriptions] = useState<Record<string, string>>({});
  const [itemDescriptions, setItemDescriptions] = useState<Record<string, string>>({});



  useEffect(() => {
    const loadPokemonData = async () => {
      setLoading(true);
      try {
        // Fetch detailed Pokemon data and moves in parallel
        const [, movesData, abilitiesData, itemsData] = await Promise.all([
          fetchPokemonById(pokemon.id),
          fetchPokemonMoves(pokemon.id),
          fetchPokemonAbilities(pokemon.id),
          fetchCompetitiveItems().catch(() => [])
        ]);

        // Process moves
        const moveNames = [...new Set(movesData.map((m) => m.move.name))];
        setAvailableMoves(moveNames);

        const newMoveDetails: Record<string, MoveDetails> = { ...moveDetailsCache };
        movesData.forEach((m) => {
          const move = m.move;
          if (!newMoveDetails[move.name]) {
            newMoveDetails[move.name] = {
              name: move.name,
              type: move.type,
              power: move.power,
              accuracy: move.accuracy,
              pp: move.pp,
              damage_class: move.damage_class,
              target: move.target,
              priority: move.priority,
              effect_entries: move.effect?.effect_text?.map((et) => ({
                short_effect: et.short_effect,
                language: { name: 'en' }
              })) || [],
              flavor_text_entries: move.flavor_text?.map((ft) => ({
                flavor_text: ft.flavor_text,
                language: { name: 'en' }
              })) || []
            };
            // Also update module-level cache
            moveDetailsCache[move.name] = newMoveDetails[move.name];
          }
        });
        setMoveDetails(newMoveDetails);

        // Process abilities
        const abilities = abilitiesData
          .filter((abilityData) => abilityData?.ability?.name)
          .map((abilityData) => abilityData.ability.name);

        setAvailableAbilities([...new Set(abilities)]);

        const abilityDescs: Record<string, string> = {};
        abilitiesData.forEach((abilityData) => {
          if (abilityData?.ability?.name) {
            const abilityName = abilityData.ability.name;
            const englishEntry = abilityData.ability.effect_entries?.find((entry) => entry?.language?.name === 'en');
            abilityDescs[abilityName] = englishEntry?.short_effect || englishEntry?.effect || 'No description available';
          }
        });
        setAbilityDescriptions(abilityDescs);

        // Process item descriptions
        const itemDescs: Record<string, string> = {};
        if (itemsData.length > 0) {
          itemsData.forEach((itemData) => {
            if (itemData?.name) {
              const itemName = itemData.name;
              const englishEntry = itemData.effect_entries?.find((entry) => entry?.language?.name === 'en');
              itemDescs[itemName] = englishEntry?.short_effect || englishEntry?.effect || 'Competitive battle item';
            }
          });
        } else {
          // Fallback items
          const fallbackDescriptions: Record<string, string> = {
            'leftovers': 'Restores HP gradually each turn',
            'choice-band': 'Boosts Attack but locks you into one move',
            'choice-scarf': 'Boosts Speed but locks you into one move',
            'choice-specs': 'Boosts Sp. Attack but locks you into one move',
            'life-orb': 'Boosts move power but causes recoil damage',
            'focus-sash': 'Survives a KO hit with 1 HP when at full health',
            'assault-vest': 'Boosts Sp. Defense but prevents status moves',
            'rocky-helmet': 'Damages attackers who make contact',
            'sitrus-berry': 'Restores HP when health is low',
            'lum-berry': 'Cures any status condition',
            'flame-orb': 'Inflicts burn status after one turn',
            'toxic-orb': 'Inflicts poison status after one turn',
            'black-sludge': 'Restores HP for Poison-types, damages others',
            'air-balloon': 'Makes holder immune to Ground moves until popped'
          };
          Object.assign(itemDescs, fallbackDescriptions);
        }
        setItemDescriptions(itemDescs);

        // Set default ability
        setPokemonBuild(prev => ({
          ...prev,
          ability: prev.ability || abilities[0] || ''
        }));

        // Load saved build
        const buildToLoad = initialBuildRef.current;
        if (buildToLoad) {
          setPokemonBuild(buildToLoad);
          setSelectedMoves(buildToLoad.moves || []);
        } else {
          const savedBuild = localStorage.getItem(`build_${teamId}_${pokemon.id}`);
          if (savedBuild) {
            const build = JSON.parse(savedBuild);
            setPokemonBuild(build);
            setSelectedMoves(build.moves || []);
          }
        }
      } catch (error) {
        console.error('Error loading Pokemon data:', error);
        toast.error('Failed to load Pokemon data');
      } finally {
        setLoading(false);
      }
    };

    loadPokemonData();
  }, [pokemon.id, teamId]);

  const handleSaveBuild = () => {
    const errors: BuildValidationErrors = {};
    if (!pokemonBuild.ability.trim()) {
      errors.ability = 'Choose an ability before saving.';
    }
    if (selectedMoves.length < 1 || selectedMoves.length > 4) {
      errors.moves = 'Choose between one and four moves before saving.';
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Complete the required battle fields before saving.');
      return;
    }

    const completeBuild = {
      ...pokemonBuild,
      moves: selectedMoves
    };

    if (onSave) {
      onSave(completeBuild);
    } else {
      // Fallback to localStorage for standalone usage
      localStorage.setItem(`build_${teamId}_${pokemon.id}`, JSON.stringify(completeBuild));
      toast.success(`Complete build saved for ${formatName(pokemon.name)}!`);
    }
  };

  const validateAndFormatInput = (value: string, min: number, max: number): number => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  };

  const handleEVChange = (stat: keyof PokemonBuild['evs'], value: string) => {
    const newValue = validateAndFormatInput(value, 0, 252);
    const evs = { ...pokemonBuild.evs };
    const currentTotal = Object.values(evs).reduce((sum, ev) => sum + ev, 0);
    const remainingEVs = 510 - (currentTotal - evs[stat]);

    // Don't allow if it would exceed 510 total
    const finalValue = Math.min(newValue, remainingEVs);

    if (newValue > remainingEVs) {
      toast.error(`Only ${remainingEVs} EVs remaining (510 total limit)`);
    } else if (finalValue !== parseInt(value, 10) && value !== '') {
      toast.error('EVs must be between 0 and 252');
    }

    setPokemonBuild(prev => ({
      ...prev,
      evs: {
        ...prev.evs,
        [stat]: finalValue
      }
    }));
  };
  const handleIVChange = (stat: keyof PokemonBuild['ivs'], value: string) => {
    const newValue = validateAndFormatInput(value, 0, 31);
    setPokemonBuild(prev => ({
      ...prev,
      ivs: {
        ...prev.ivs,
        [stat]: newValue
      }
    }));
  };


  const totalEVs = Object.values(pokemonBuild.evs).reduce((sum, ev) => sum + ev, 0);
  const remainingEVs = 510 - totalEVs;

  const exportCurrentPokemon = async () => {
    try {
      // Default values
      const pokemonName = formatName(pokemon.name);
      const heldItem = pokemonBuild.heldItem ? formatName(pokemonBuild.heldItem) : '';
      const ability = pokemonBuild.ability ? formatName(pokemonBuild.ability) : '';
      const nature = pokemonBuild.nature ? formatName(pokemonBuild.nature) : 'Hardy';
      const moves = selectedMoves || [];

      // Format EVs (only show non-zero values)
      const evs = pokemonBuild.evs || {};
      const evStrings: string[] = [];
      if (evs.hp > 0) evStrings.push(`${evs.hp} HP`);
      if (evs.attack > 0) evStrings.push(`${evs.attack} Atk`);
      if (evs.defense > 0) evStrings.push(`${evs.defense} Def`);
      if (evs['special-attack'] > 0) evStrings.push(`${evs['special-attack']} SpA`);
      if (evs['special-defense'] > 0) evStrings.push(`${evs['special-defense']} SpD`);
      if (evs.speed > 0) evStrings.push(`${evs.speed} Spe`);

      // Build the Pokemon export string
      let pokemonExport = '';

      // Pokemon name and item (with nickname if present)
      if (pokemonBuild.nickname) {
        if (heldItem) {
          pokemonExport += `${pokemonBuild.nickname} (${pokemonName}) @ ${heldItem}\n`;
        } else {
          pokemonExport += `${pokemonBuild.nickname} (${pokemonName})\n`;
        }
      } else {
        if (heldItem) {
          pokemonExport += `${pokemonName} @ ${heldItem}\n`;
        } else {
          pokemonExport += `${pokemonName}\n`;
        }
      }

      // Ability
      if (ability) {
        pokemonExport += `Ability: ${ability}\n`;
      }

      // Tera Type
      if (pokemonBuild.teraType) {
        pokemonExport += `Tera Type: ${pokemonBuild.teraType}\n`;
      }

      // EVs
      if (evStrings.length > 0) {
        pokemonExport += `EVs: ${evStrings.join(' / ')}\n`;
      }

      // Nature
      pokemonExport += `${nature} Nature\n`;

      // Moves
      if (moves.length > 0) {
        moves.forEach((move) => {
          pokemonExport += `- ${formatName(move)}\n`;
        });
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(pokemonExport.trim());
      toast.success(`${pokemonName} build exported to clipboard!`);

    } catch (error) {
      console.error('Error exporting Pokemon build:', error);
      toast.error('Failed to export Pokemon build');
    }
  };

  const loadMoveDetails = async (moveName: string): Promise<MoveDetails | null> => {
    // Check module-level cache first
    if (moveDetailsCache[moveName]) {
      if (!moveDetails[moveName]) {
        setMoveDetails(prev => ({ ...prev, [moveName]: moveDetailsCache[moveName] }));
      }
      return moveDetailsCache[moveName];
    }

    // Use api.service which now uses Supabase
    try {
      const moveData = await fetchMoveDetails(moveName);
      if (moveData) {
        const details: MoveDetails = {
          name: moveData.name,
          type: moveData.type,
          power: moveData.power,
          accuracy: moveData.accuracy,
          pp: moveData.pp,
          damage_class: moveData.damage_class,
          effect_entries: moveData.effect_entries || [],
          flavor_text_entries: moveData.flavor_text_entries || [],
          target: moveData.target,
          priority: moveData.priority
        };

        moveDetailsCache[moveName] = details;
        setMoveDetails(prev => ({ ...prev, [moveName]: details }));
        return details;
      }
    } catch (error) {
      console.error(`Error loading move details for ${moveName}:`, error);
    }

    return null;
  };

  const handleMoveToggle = async (moveName: string) => {
    if (selectedMoves.includes(moveName)) {
      setSelectedMoves(prev => prev.filter(move => move !== moveName));
    } else {
      if (selectedMoves.length >= 4) {
        toast.error('A Pokémon can only learn 4 moves at a time');
        return;
      }

      setSelectedMoves(prev => [...prev, moveName]);
      setValidationErrors(prev => ({ ...prev, moves: undefined }));
      await loadMoveDetails(moveName);
    }
  };

  const handleAbilityChange = (ability: string) => {
    setPokemonBuild(prev => ({ ...prev, ability }));
    if (ability.trim()) {
      setValidationErrors(prev => ({ ...prev, ability: undefined }));
    }
  };

  const handleRemoveMove = (moveName: string) => {
    setSelectedMoves(prev => prev.filter(move => move !== moveName));
  };

  const handlePremadeBuildsToggle = async () => {
    if (premadeBuilds.length > 0) {
      setShowPremadeBuilds(current => !current);
      return;
    }

    setPremadeBuildsLoading(true);
    try {
      const { fetchPremadeBuilds } = await import('../../services/premade-builds.service');
      const builds = await fetchPremadeBuilds(pokemon.name);
      setPremadeBuilds(builds);
      setShowPremadeBuilds(builds.length > 0);

      if (builds.length === 0) {
        toast.error(`No premade builds are available for ${formatName(pokemon.name)} yet.`);
      }
    } catch (error) {
      console.error('Error loading premade builds:', error);
      toast.error('Could not load premade builds. Please try again.');
    } finally {
      setPremadeBuildsLoading(false);
    }
  };

  const handleApplyPremadeBuild = (build: PremadePokemonBuild) => {
    const resolvedMoves = build.moves.flatMap((moveName) => {
      const moveId = toShowdownId(moveName);
      const match = availableMoves.find(availableMove => toShowdownId(availableMove) === moveId);
      return match ? [match] : [];
    }).slice(0, 4);

    if (resolvedMoves.length === 0) {
      toast.error('This build has no moves that the current editor recognizes.');
      return;
    }

    const resolvedAbility = build.ability
      ? availableAbilities.find(ability => toShowdownId(ability) === toShowdownId(build.ability || ''))
      : undefined;

    setSelectedMoves(resolvedMoves);
    setPokemonBuild(current => ({
      ...current,
      ability: resolvedAbility || current.ability || availableAbilities[0] || '',
      heldItem: build.item || current.heldItem,
      nature: build.nature?.toLowerCase() || current.nature,
      teraType: build.teraType || current.teraType,
      evs: { ...current.evs, ...build.evs },
      ivs: { ...current.ivs, ...build.ivs },
    }));
    setValidationErrors(current => ({
      ...current,
      moves: undefined,
      ability: resolvedAbility || pokemonBuild.ability || availableAbilities[0] ? undefined : current.ability,
    }));
    setShowPremadeBuilds(false);
    toast.success(
      resolvedMoves.length < build.moves.length
        ? `${build.name} applied with ${resolvedMoves.length} compatible moves. Review it before saving.`
        : `${build.name} applied. You can still customize it before saving.`,
    );
  };

  const availableHeldItems = useMemo(() => (
    [...new Set([pokemonBuild.heldItem, ...HELD_ITEMS].filter(Boolean))]
  ), [pokemonBuild.heldItem]);

  const statBarClass = (stat: string) => {
    const map: Record<string, string> = {
      hp: 'sd-stat-bar--hp', attack: 'sd-stat-bar--atk', defense: 'sd-stat-bar--def',
      'special-attack': 'sd-stat-bar--spa', 'special-defense': 'sd-stat-bar--spd', speed: 'sd-stat-bar--spe',
    };
    return map[stat] || '';
  };

  const statLabelShort = (stat: string) => {
    const map: Record<string, string> = {
      hp: 'HP', attack: 'Atk', defense: 'Def',
      'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
    };
    return map[stat] || stat;
  };

  return {
    selectedMoves,
    availableMoves,
    moveDetails,
    validationErrors,
    premadeBuilds,
    showPremadeBuilds,
    setShowPremadeBuilds,
    premadeBuildsLoading,
    loading,
    pokemonBuild,
    setPokemonBuild,
    availableNatures,
    availableAbilities,
    hasGenderDifference,
    abilityDescriptions,
    itemDescriptions,
    handleSaveBuild,
    exportCurrentPokemon,
    handleMoveToggle,
    handleAbilityChange,
    handleRemoveMove,
    handlePremadeBuildsToggle,
    handleApplyPremadeBuild,
    availableHeldItems,
    statBarClass,
    statLabelShort,
    totalEVs,
    remainingEVs,
    handleEVChange,
    handleIVChange,
  };
}
