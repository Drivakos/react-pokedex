import React, { useEffect, useState } from 'react';
import { formatName } from '../../utils/helpers';
import { TYPE_COLORS } from '../../types/pokemon';
import PokemonImage from '../common/PokemonImage';
import { Shield, Zap, Target, Activity, X } from 'lucide-react';

interface PokemonType {
  type: {
    name: string;
  };
}

interface PokemonAbility {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

interface PokemonMove {
  move: {
    name: string;
    url: string;
  };
}

// Make interface more flexible to handle different data structures
interface Pokemon {
  id: number;
  name: string;
  height?: number;
  weight?: number;
  types: PokemonType[];
  abilities: PokemonAbility[] | any[];
  stats?: PokemonStat[];
  moves: PokemonMove[];
  sprites: any; // More flexible sprites structure
}

interface PokemonDetailViewProps {
  pokemon: Pokemon;
  onClose: () => void;
  onAdd?: () => void;
  canAddToTeam?: boolean;
}

const PokemonDetailView: React.FC<PokemonDetailViewProps> = ({ pokemon, onClose, onAdd, canAddToTeam = false }) => {
  const [abilityDescriptions, setAbilityDescriptions] = useState<Record<string, string>>({});
  const [typeEffectiveness, setTypeEffectiveness] = useState<{
    quadrupleDamage: string[];
    doubleDamage: string[];
    halfDamage: string[];
    quarterDamage: string[];
    noDamage: string[];
  }>({
    quadrupleDamage: [],
    doubleDamage: [],
    halfDamage: [],
    quarterDamage: [],
    noDamage: [],
  });
  
  // Handle potential errors in data structure
  const safeTypes = pokemon?.types || [];
  const safeMoves = pokemon?.moves || [];
  const safeAbilities = pokemon?.abilities || [];
  const safeStats = pokemon?.stats || [];
  const safeSprites = pokemon?.sprites || {};

  useEffect(() => {
    const fetchAbilityDescriptions = async () => {
      if (!pokemon) return;

      const descriptions: Record<string, string> = {};

      for (const abilityInfo of safeAbilities) {
        try {
          // Guard against missing url property
          if (!abilityInfo.ability?.url) {
            descriptions[abilityInfo.ability?.name || 'Unknown'] = 'Description unavailable';
            continue;
          }
          
          const response = await fetch(abilityInfo.ability.url);
          const data = await response.json();

          const englishDescription = data.effect_entries.find(
            (entry: any) => entry.language.name === 'en'
          );

          descriptions[abilityInfo.ability.name] = englishDescription
            ? englishDescription.effect
            : 'No description available.';
        } catch (error) {
          console.error(`Error fetching ability description for ${abilityInfo.ability?.name || 'unknown'}:`, error);
          descriptions[abilityInfo.ability?.name || 'Unknown'] = 'Description unavailable.';
        }
      }

      setAbilityDescriptions(descriptions);
    };

    const calculateTypeEffectiveness = async () => {
      if (!pokemon || !safeTypes.length) return;

      const typeData = await Promise.all(safeTypes.map(async (typeInfo) => {
        try {
          if (!typeInfo?.type?.name) return null;
          
          const response = await fetch(`https://pokeapi.co/api/v2/type/${typeInfo.type.name}`);
          return await response.json();
        } catch (error) {
          console.error(`Error fetching type data for ${typeInfo?.type?.name || 'unknown'}:`, error);
          return null;
        }
      }));

      const damageRelations = {
        doubleDamageFrom: new Map<string, number>(),
        halfDamageFrom: new Map<string, number>(),
        noDamageFrom: new Map<string, number>(),
      };

      typeData.forEach(data => {
        if (!data) return;

        data.damage_relations.double_damage_from.forEach((type: { name: string }) => {
          damageRelations.doubleDamageFrom.set(
            type.name,
            (damageRelations.doubleDamageFrom.get(type.name) || 1) * 2
          );
        });

        data.damage_relations.half_damage_from.forEach((type: { name: string }) => {
          damageRelations.halfDamageFrom.set(
            type.name,
            (damageRelations.halfDamageFrom.get(type.name) || 1) * 0.5
          );
        });

        data.damage_relations.no_damage_from.forEach((type: { name: string }) => {
          damageRelations.noDamageFrom.set(type.name, 0);
        });
      });

      const finalEffectiveness = {
        quadrupleDamage: [] as string[],
        doubleDamage: [] as string[],
        halfDamage: [] as string[],
        quarterDamage: [] as string[],
        noDamage: [] as string[],
      };

      // Process double damage
      damageRelations.doubleDamageFrom.forEach((value, type) => {
        if (damageRelations.noDamageFrom.has(type)) {
          return; // Immunity takes precedence
        }

        if (damageRelations.halfDamageFrom.has(type)) {
          const halfValue = damageRelations.halfDamageFrom.get(type) || 0.5;
          const combinedValue = value * halfValue;
          
          if (combinedValue === 1) {
            return; // Neutral damage, no need to display
          } else if (combinedValue === 2) {
            finalEffectiveness.doubleDamage.push(type);
          } else if (combinedValue === 0.5) {
            finalEffectiveness.halfDamage.push(type);
          }
        } else if (value === 4) {
          finalEffectiveness.quadrupleDamage.push(type);
        } else {
          finalEffectiveness.doubleDamage.push(type);
        }
      });

      // Process half damage and quarter damage
      damageRelations.halfDamageFrom.forEach((value, type) => {
        if (damageRelations.noDamageFrom.has(type) ||
          damageRelations.doubleDamageFrom.has(type)) {
          return;
        }

        if (value === 0.5) {
          finalEffectiveness.halfDamage.push(type);
        } else if (value === 0.25) {
          finalEffectiveness.quarterDamage.push(type);
        }
      });

      damageRelations.noDamageFrom.forEach((_, type) => {
        finalEffectiveness.noDamage.push(type);
      });

      setTypeEffectiveness(finalEffectiveness);
    };

    fetchAbilityDescriptions();
    calculateTypeEffectiveness();
  }, [pokemon, safeTypes, safeAbilities]);

  // Format stats for display
  const formattedStats = safeStats.map(stat => {
    return {
      name: stat.stat?.name ? formatName(stat.stat.name) : 'Unknown',
      value: stat.base_stat || 0,
      color: getStatColor(stat.stat?.name || '', stat.base_stat || 0)
    };
  }) || [];

  return (
    <div className="w-full p-4 md:p-6 overflow-auto" style={{ maxHeight: 'calc(80vh - 2rem)' }}>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold capitalize">{formatName(pokemon.name)}</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column - Basic info */}
        <div className="w-full md:w-1/3 flex flex-col items-center">
          <div className="w-full max-w-xs bg-gray-50 rounded-lg overflow-hidden mb-4">
            <PokemonImage 
              pokemon={{
                id: pokemon.id,
                name: pokemon.name,
                sprites: { front_default: getSpriteUrl(safeSprites) }
              }}
              alt={formatName(pokemon.name)}
              size="lg"
              className="object-contain"
            />
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {safeTypes.map((typeInfo, index) => (
              <span 
                key={typeInfo.type?.name || `type-${index}`}
                className={`${TYPE_COLORS[typeInfo.type?.name] || 'bg-gray-500'} text-white px-3 py-1 rounded-full capitalize`}
              >
                {typeInfo.type?.name || 'unknown'}
              </span>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full text-sm">
            <div className="bg-gray-50 p-3 rounded shadow-sm">
              <h4 className="text-gray-500 mb-1">Height</h4>
              <p className="font-semibold">{pokemon.height ? (pokemon.height / 10).toFixed(1) : '?'} m</p>
            </div>
            <div className="bg-gray-50 p-3 rounded shadow-sm">
              <h4 className="text-gray-500 mb-1">Weight</h4>
              <p className="font-semibold">{pokemon.weight ? (pokemon.weight / 10).toFixed(1) : '?'} kg</p>
            </div>
          </div>

          {onAdd && (
            <button
              className={`mt-4 w-full py-2 px-4 font-semibold rounded transition-colors ${canAddToTeam
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-white cursor-not-allowed'}`}
              onClick={onAdd}
              disabled={!canAddToTeam}
              title={canAddToTeam ? 'Add to selected team slot' : 'Select a team and slot first'}
            >
              Add to Team
            </button>
          )}
        </div>
        
        {/* Right column - Stats and details */}
        <div className="w-full md:w-2/3">
          {/* Stats section */}
          <h3 className="text-xl font-semibold mb-3 pb-2 border-b border-gray-200 flex items-center">
            <Activity className="mr-2 text-blue-500" size={20} />
            Stats
          </h3>

          <div className="mb-6 grid gap-2">
            {formattedStats.length > 0 ? formattedStats.map(stat => (
              <div key={stat.name} className="grid grid-cols-12 items-center gap-2">
                <span className="font-medium col-span-4 capitalize">
                  {stat.name === 'special-attack' ? 'Sp. Atk' : 
                   stat.name === 'special-defense' ? 'Sp. Def' : 
                   stat.name}
                </span>
                <span className="col-span-1 font-semibold">{stat.value}</span>
                <div className="col-span-7 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stat.color}`}
                    style={{ width: `${Math.min(100, stat.value * 100 / 200)}%` }} // Max baseline is 200
                  />
                </div>
              </div>
            )) : (
              <div className="text-gray-500">No stats available</div>
            )}
          </div>

          {/* Abilities section */}
          <h3 className="text-xl font-semibold mb-3 pb-2 border-b border-gray-200 flex items-center">
            <Shield className="mr-2 text-purple-500" size={20} />
            Abilities
          </h3>

          <div className="mb-6 grid gap-3">
            {safeAbilities.length > 0 ? safeAbilities.map((abilityInfo, index) => (
              <div key={abilityInfo.ability?.name || `ability-${index}`} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium capitalize">{formatName(abilityInfo.ability?.name || 'Unknown')}</h4>
                  {abilityInfo.is_hidden && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">
                      Hidden Ability
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {abilityDescriptions[abilityInfo.ability?.name || ''] || 'Description unavailable'}
                </p>
              </div>
            )) : (
              <div className="text-gray-500">No abilities available</div>
            )}
          </div>
          
          {/* Type effectiveness section */}
          <h3 className="text-xl font-semibold mb-3 pb-2 border-b border-gray-200 flex items-center">
            <Zap className="mr-2 text-yellow-500" size={20} />
            Type Effectiveness
          </h3>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeEffectiveness.quadrupleDamage.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-1">4× Damage From</h4>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.quadrupleDamage.map(type => (
                    <span
                      key={type}
                      className={`${TYPE_COLORS[type] || 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded capitalize`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {typeEffectiveness.doubleDamage.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-600 mb-1">2× Damage From</h4>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.doubleDamage.map(type => (
                    <span
                      key={type}
                      className={`${TYPE_COLORS[type] || 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded capitalize`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {typeEffectiveness.halfDamage.length > 0 && (
              <div>
                <h4 className="font-medium text-green-600 mb-1">½× Damage From</h4>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.halfDamage.map(type => (
                    <span
                      key={type}
                      className={`${TYPE_COLORS[type] || 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded capitalize`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {typeEffectiveness.quarterDamage.length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 mb-1">¼× Damage From</h4>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.quarterDamage.map(type => (
                    <span
                      key={type}
                      className={`${TYPE_COLORS[type] || 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded capitalize`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {typeEffectiveness.noDamage.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Immune To</h4>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.noDamage.map(type => (
                    <span
                      key={type}
                      className={`${TYPE_COLORS[type] || 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded capitalize`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Moves section */}
          <h3 className="text-xl font-semibold mb-3 pb-2 border-b border-gray-200 flex items-center">
            <Target className="mr-2 text-green-500" size={20} />
            Moves
          </h3>

          <div className="mb-6">
            <div className="max-h-56 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
              {safeMoves.slice(0, 30).map((moveInfo, index) => (
                <div
                  key={moveInfo.move?.name || `move-${index}`}
                  className="bg-gray-50 px-3 py-2 rounded text-sm capitalize"
                >
                  {formatName(moveInfo.move?.name || 'Unknown move')}
                </div>
              ))}
            </div>
            {safeMoves.length > 30 && (
              <div className="text-center text-sm text-gray-500 mt-2">
                + {safeMoves.length - 30} more moves
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to safely get sprite URL from various possible structures
const getSpriteUrl = (sprites: any): string | undefined => {
  if (!sprites) return undefined;
  
  // Try different possible paths to find a valid sprite
  return sprites.other?.['official-artwork']?.front_default || // Standard format
         sprites.front_default || // Fallback to direct front_default
         sprites.other?.home?.front_default || // Try Home sprite
         sprites.other?.dream_world?.front_default || // Try Dream World sprite
         undefined;
};

// Color coding for stat bars based on value
const getStatColor = (_statName: string, value: number): string => {
  if (value >= 120) return 'bg-green-500';
  if (value >= 90) return 'bg-green-400';
  if (value >= 60) return 'bg-yellow-400';
  if (value >= 30) return 'bg-orange-400';
  return 'bg-red-400';
};

export default PokemonDetailView;
