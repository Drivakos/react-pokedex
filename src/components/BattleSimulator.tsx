import React, { useState, useEffect, useCallback } from 'react';
import { BattleEngine } from '../utils/battleEngine';
import { ArrowLeft, Zap, Shield, Heart, Swords } from 'lucide-react';

interface BattlePokemon {
  id: number;
  name: string;
  types: string[];
  level: number;
  currentHp: number;
  maxHp: number;
  stats: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  moves: BattleMove[];
  sprites: {
    front_default: string;
    back_default: string;
    front_shiny?: string;
    back_shiny?: string;
  };
  status?: 'poison' | 'burn' | 'paralysis' | 'sleep' | 'freeze' | null;
  statusTurns?: number;
  statBoosts: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
    accuracy: number;
    evasion: number;
  };
  protected?: boolean;
  confused?: boolean;
  confusedTurns?: number;
}

interface BattleMove {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  currentPP: number;
  damageClass: 'physical' | 'special' | 'status';
  description: string;
  effect?: string;
  priority?: number;
  target?: 'opponent' | 'self' | 'all';
}

interface BattleSimulatorProps {
  playerPokemon: any;
  opponentPokemon: any;
  onBack: () => void;
  onBattleEnd?: (playerWon: boolean) => void;
  playerTeam?: any[];
  onSwitchPokemon?: (newPokemon: any) => void;
}

// Complete Pokemon type effectiveness chart
const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5, ground: 2 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, flying: 2, ground: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, ice: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

// Enhanced move database with proper effects
const MOVE_DATABASE: Record<string, Partial<BattleMove>> = {
  // Physical moves
  'tackle': { type: 'normal', power: 40, accuracy: 100, damageClass: 'physical' },
  'earthquake': { type: 'ground', power: 100, accuracy: 100, damageClass: 'physical' },
  'fire-strike': { type: 'fire', power: 70, accuracy: 100, damageClass: 'physical' },
  
  // Special moves  
  'thunderbolt': { type: 'electric', power: 90, accuracy: 100, damageClass: 'special' },
  'flamethrower': { type: 'fire', power: 90, accuracy: 100, damageClass: 'special' },
  'surf': { type: 'water', power: 90, accuracy: 100, damageClass: 'special' },
  'ice-beam': { type: 'ice', power: 90, accuracy: 100, damageClass: 'special' },
  'psychic': { type: 'psychic', power: 90, accuracy: 100, damageClass: 'special' },
  'shadow-ball': { type: 'ghost', power: 80, accuracy: 100, damageClass: 'special' },
  'fire-blast': { type: 'fire', power: 110, accuracy: 85, damageClass: 'special' },
  'water-gun': { type: 'water', power: 40, accuracy: 100, damageClass: 'special' },
  
  // Status moves (POWER = 0, NO DAMAGE)
  'growl': { type: 'normal', power: 0, accuracy: 100, damageClass: 'status', effect: 'lower_attack' },
  'protect': { type: 'normal', power: 0, accuracy: 100, damageClass: 'status', effect: 'protect', priority: 4 },
  'swords-dance': { type: 'normal', power: 0, accuracy: 100, damageClass: 'status', effect: 'raise_attack_2', target: 'self' },
  'thunder-wave': { type: 'electric', power: 0, accuracy: 90, damageClass: 'status', effect: 'paralyze' },
  'toxic': { type: 'poison', power: 0, accuracy: 90, damageClass: 'status', effect: 'bad_poison' },
  'will-o-wisp': { type: 'fire', power: 0, accuracy: 85, damageClass: 'status', effect: 'burn' },
  'recover': { type: 'normal', power: 0, accuracy: 100, damageClass: 'status', effect: 'heal_50', target: 'self' },
  'rest': { type: 'psychic', power: 0, accuracy: 100, damageClass: 'status', effect: 'rest', target: 'self' }
};

const BattleSimulator: React.FC<BattleSimulatorProps> = ({ 
  playerPokemon, 
  opponentPokemon, 
  onBack,
  onBattleEnd,
  playerTeam = [],
  onSwitchPokemon
}) => {
  const [player, setPlayer] = useState<BattlePokemon | null>(null);
  const [opponent, setOpponent] = useState<BattlePokemon | null>(null);
  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [battlePhase, setBattlePhase] = useState<'select' | 'animation' | 'ended'>('select');
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('What will you do?');
  const [battleMenu, setBattleMenu] = useState<'main' | 'fight' | 'switch'>('main');
  const [playerAnimation, setPlayerAnimation] = useState<string>('');
  const [opponentAnimation, setOpponentAnimation] = useState<string>('');
  const [moveEffectAnimation, setMoveEffectAnimation] = useState<string>('');

  // Initialize battle Pokémon with enhanced stats and moves
  useEffect(() => {
    const initializePokemon = (pokemon: any): BattlePokemon => {
      const baseStats = pokemon.stats || {
        hp: 100,
        attack: 80,
        defense: 80,
        'special-attack': 80,
        'special-defense': 80,
        speed: 80
      };

      const level = pokemon.level || 50;
      const maxHp = Math.floor(((baseStats.hp * 2) * level) / 100) + level + 10;

      // Enhanced move initialization
      const initializeMoves = (pokemonMoves: any[]): BattleMove[] => {
        return pokemonMoves.slice(0, 4).map((moveData: any) => {
          const moveName = typeof moveData === 'string' ? moveData : moveData.name;
          const moveInfo = MOVE_DATABASE[moveName] || {
            type: 'normal',
            power: 50,
            accuracy: 100,
            damageClass: 'physical'
          };

          return {
            name: moveName,
            type: moveInfo.type || 'normal',
            power: moveInfo.power || 50,
            accuracy: moveInfo.accuracy || 100,
            pp: moveInfo.power === 0 ? 20 : 15,
            currentPP: moveInfo.power === 0 ? 20 : 15,
            damageClass: moveInfo.damageClass || 'physical',
            description: moveData.description || `${moveName} - A Pokémon move`,
            effect: moveInfo.effect,
            priority: moveInfo.priority || 0,
            target: moveInfo.target || 'opponent'
          };
        });
      };

      return {
        id: pokemon.id,
        name: pokemon.name,
        types: pokemon.types || ['normal'],
        level,
        currentHp: pokemon.currentHp || maxHp,
        maxHp: pokemon.maxHp || maxHp,
        stats: {
          attack: Math.floor(((baseStats.attack * 2) * level) / 100) + 5,
          defense: Math.floor(((baseStats.defense * 2) * level) / 100) + 5,
          specialAttack: Math.floor(((baseStats['special-attack'] * 2) * level) / 100) + 5,
          specialDefense: Math.floor(((baseStats['special-defense'] * 2) * level) / 100) + 5,
          speed: Math.floor(((baseStats.speed * 2) * level) / 100) + 5,
        },
        moves: initializeMoves(pokemon.moves || ['tackle', 'growl', 'protect', 'rest']),
        sprites: {
          front_default: pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || '',
          back_default: pokemon.sprites?.back_default || pokemon.sprites?.front_default || '',
        },
        status: pokemon.status || null,
        statusTurns: pokemon.statusTurns || 0,
        statBoosts: {
          attack: 0,
          defense: 0,
          specialAttack: 0,
          specialDefense: 0,
          speed: 0,
          accuracy: 0,
          evasion: 0
        },
        protected: false,
        confused: false,
        confusedTurns: 0
      };
    };

    setPlayer(initializePokemon(playerPokemon));
    setOpponent(initializePokemon(opponentPokemon));
    setBattleLog([`${playerPokemon.name} VS ${opponentPokemon.name}`, 'Battle begins!']);
  }, [playerPokemon, opponentPokemon]);

  // Enhanced damage calculation
  const calculateDamage = useCallback((attacker: BattlePokemon, defender: BattlePokemon, move: BattleMove): { damage: number; effectiveness: number; isCritical: boolean; canHit: boolean } => {
    // Status moves and protect
    if (move.power === 0) return { damage: 0, effectiveness: 1, isCritical: false, canHit: true };
    if (defender.protected && move.damageClass !== 'status') {
      return { damage: 0, effectiveness: 1, isCritical: false, canHit: false };
    }

    // Accuracy check
    const accuracyMod = attacker.statBoosts.accuracy - defender.statBoosts.evasion;
    const finalAccuracy = move.accuracy * (Math.max(1, 3 + accuracyMod) / Math.max(1, 3 - accuracyMod));
    if (Math.random() * 100 > finalAccuracy) {
      return { damage: 0, effectiveness: 1, isCritical: false, canHit: false };
    }

    // Get effective stats with boosts
    const getEffectiveStat = (baseStat: number, boost: number) => {
      const multiplier = boost >= 0 ? (2 + boost) / 2 : 2 / (2 + Math.abs(boost));
      return Math.floor(baseStat * multiplier);
    };

    const attack = move.damageClass === 'physical' 
      ? getEffectiveStat(attacker.stats.attack, attacker.statBoosts.attack)
      : getEffectiveStat(attacker.stats.specialAttack, attacker.statBoosts.specialAttack);
    
    const defense = move.damageClass === 'physical' 
      ? getEffectiveStat(defender.stats.defense, defender.statBoosts.defense)
      : getEffectiveStat(defender.stats.specialDefense, defender.statBoosts.specialDefense);
    
    // Enhanced damage formula
    let damage = ((((2 * attacker.level + 10) / 250) * (attack / defense) * move.power) + 2);
    
    // STAB (Same Type Attack Bonus)
    if (attacker.types.includes(move.type)) {
      damage *= 1.5;
    }

    // Type effectiveness
    let effectiveness = 1;
    defender.types.forEach(defenderType => {
      if (TYPE_EFFECTIVENESS[move.type]?.[defenderType] !== undefined) {
        effectiveness *= TYPE_EFFECTIVENESS[move.type][defenderType];
      }
    });
    damage *= effectiveness;

    // Status effects on damage
    if (attacker.status === 'burn' && move.damageClass === 'physical') {
      damage *= 0.5;
    }

    // Critical hit (improved rate)
    const isCritical = Math.random() < 0.0625; // 6.25% base crit rate
    if (isCritical) {
      damage *= 1.5;
    }

    // Random factor (85-100%)
    damage *= (Math.random() * 0.15 + 0.85);

    return {
      damage: Math.floor(Math.max(1, damage)),
      effectiveness,
      isCritical,
      canHit: true
    };
  }, []);

  // Apply move effects using the enhanced battle engine
  const applyMoveEffect = useCallback((move: BattleMove, user: BattlePokemon, target: BattlePokemon): { user: BattlePokemon; target: BattlePokemon; messages: string[] } => {
    // Use the enhanced battle engine for move effects
    return BattleEngine.applyMoveEffect(move, user, target);
  }, []);

  // Apply status effects at end of turn
  const applyStatusEffects = useCallback((pokemon: BattlePokemon): { pokemon: BattlePokemon; messages: string[] } => {
    const newPokemon = { ...pokemon };
    const messages: string[] = [];

    if (!newPokemon.status) return { pokemon: newPokemon, messages };

    switch (newPokemon.status) {
      case 'burn':
        const burnDamage = Math.max(1, Math.floor(newPokemon.maxHp / 16));
        newPokemon.currentHp = Math.max(0, newPokemon.currentHp - burnDamage);
        messages.push(`${pokemon.name} was hurt by its burn!`);
        break;

      case 'poison':
        const poisonDamage = newPokemon.statusTurns !== undefined 
          ? Math.max(1, Math.floor(newPokemon.maxHp * (newPokemon.statusTurns + 1) / 16))
          : Math.max(1, Math.floor(newPokemon.maxHp / 8));
        newPokemon.currentHp = Math.max(0, newPokemon.currentHp - poisonDamage);
        messages.push(`${pokemon.name} was hurt by poison!`);
        if (newPokemon.statusTurns !== undefined) {
          newPokemon.statusTurns++;
        }
        break;

      case 'sleep':
        if (typeof newPokemon.statusTurns === 'number' && newPokemon.statusTurns > 0) {
          newPokemon.statusTurns--;
          if (newPokemon.statusTurns === 0) {
            newPokemon.status = null;
            messages.push(`${pokemon.name} woke up!`);
          } else {
            messages.push(`${pokemon.name} is fast asleep!`);
          }
        }
        break;
    }

    // Clear protection at end of turn
    newPokemon.protected = false;

    return { pokemon: newPokemon, messages };
  }, []);

  // Get animation based on move type and damage class
  const getMoveAnimation = useCallback((move: BattleMove) => {
    const { damageClass, type, effect } = move;
    
    // Status moves get special animations
    if (damageClass === 'status') {
      if (effect === 'protect') return { attacker: 'defend-glow', defender: '', effect: 'protect-shield' };
      if (effect === 'heal_50' || effect === 'rest') return { attacker: 'heal-glow', defender: '', effect: 'heal-sparkles' };
      if (effect === 'raise_attack_2' || effect === 'lower_attack') return { attacker: 'stat-boost', defender: '', effect: 'stat-change' };
      if (effect === 'paralyze') return { attacker: 'status-cast', defender: 'status-paralysis', effect: 'electric-sparks' };
      if (effect === 'burn') return { attacker: 'status-cast', defender: 'status-burn', effect: 'fire-sparks' };
      if (effect === 'bad_poison') return { attacker: 'status-cast', defender: 'status-poison', effect: 'poison-bubbles' };
      return { attacker: 'status-cast', defender: '', effect: 'status-effect' };
    }
    
    // Physical moves
    if (damageClass === 'physical') {
      if (['fighting', 'rock', 'ground'].includes(type)) return { attacker: 'physical-charge', defender: 'impact-shake', effect: 'impact-burst' };
      if (type === 'normal') return { attacker: 'tackle-rush', defender: 'hit-shake', effect: 'normal-impact' };
      return { attacker: 'physical-attack', defender: 'damage-flash', effect: 'physical-impact' };
    }
    
    // Special moves get type-specific animations
    const typeAnimations: Record<string, { attacker: string; defender: string; effect: string }> = {
      fire: { attacker: 'fire-charge', defender: 'fire-damage', effect: 'fire-blast' },
      water: { attacker: 'water-charge', defender: 'water-damage', effect: 'water-splash' },
      electric: { attacker: 'electric-charge', defender: 'electric-damage', effect: 'lightning-bolt' },
      grass: { attacker: 'grass-charge', defender: 'grass-damage', effect: 'leaf-storm' },
      ice: { attacker: 'ice-charge', defender: 'ice-damage', effect: 'ice-crystals' },
      psychic: { attacker: 'psychic-focus', defender: 'psychic-damage', effect: 'psychic-waves' },
      ghost: { attacker: 'ghost-phase', defender: 'ghost-damage', effect: 'shadow-orbs' },
      dragon: { attacker: 'dragon-roar', defender: 'dragon-damage', effect: 'dragon-flames' }
    };
    
    return typeAnimations[type] || { attacker: 'special-charge', defender: 'damage-flash', effect: 'energy-blast' };
  }, []);

  // Enhanced move execution
  const executeMove = useCallback(async (attacker: BattlePokemon, defender: BattlePokemon, move: BattleMove) => {
    setIsAnimating(true);
    setBattlePhase('animation');
    setCurrentMessage(`${attacker.name} used ${move.name.replace('-', ' ')}!`);

    // Get move animations
    const animations = getMoveAnimation(move);
    
    // Set animations based on who's attacking
    if (turn === 'player') {
      setPlayerAnimation(animations.attacker);
      setOpponentAnimation(animations.defender);
    } else {
      setOpponentAnimation(animations.attacker);
      setPlayerAnimation(animations.defender);
    }
    setMoveEffectAnimation(animations.effect);

    // Clear animations after the move completes
    const clearAnimations = () => {
      setPlayerAnimation('');
      setOpponentAnimation('');
      setMoveEffectAnimation('');
    };

    // Check if Pokemon can move (paralysis, sleep, etc.)
    if (attacker.status === 'paralysis' && Math.random() < 0.25) {
      setBattleLog(prev => [...prev, `${attacker.name} is paralyzed and can't move!`]);
      setTimeout(() => {
        clearAnimations();
        setIsAnimating(false);
        setBattlePhase('select');
        setTurn(turn === 'player' ? 'opponent' : 'player');
      }, 2000);
      return;
    }

    if (attacker.status === 'sleep') {
      setBattleLog(prev => [...prev, `${attacker.name} is fast asleep!`]);
      setTimeout(() => {
        clearAnimations();
        setIsAnimating(false);
        setBattlePhase('select');
        setTurn(turn === 'player' ? 'opponent' : 'player');
      }, 2000);
      return;
    }

    const result = calculateDamage(attacker, defender, move);
    
    // Reduce PP
    const updatedMove = { ...move, currentPP: Math.max(0, move.currentPP - 1) };
    
    let newLog = [`${attacker.name} used ${move.name.replace('-', ' ')}!`];

    if (!result.canHit && defender.protected) {
      newLog.push(`${defender.name} protected itself!`);
    } else if (!result.canHit) {
      newLog.push(`${attacker.name}'s attack missed!`);
    } else {
      // Apply move effects
      const effectResult = applyMoveEffect(move, attacker, defender);
      newLog = [...newLog, ...effectResult.messages];

      // Apply damage
      if (result.damage > 0) {
        const newHp = Math.max(0, defender.currentHp - result.damage);
        
        if (result.isCritical) {
          newLog.push("A critical hit!");
        }
        
        if (result.effectiveness > 1) {
          newLog.push("It's super effective!");
        } else if (result.effectiveness < 1 && result.effectiveness > 0) {
          newLog.push("It's not very effective...");
        } else if (result.effectiveness === 0) {
          newLog.push("It had no effect!");
        }

        // Update Pokemon
        if (turn === 'player') {
          setOpponent(prev => prev ? { 
            ...effectResult.target, 
            currentHp: newHp,
            moves: prev.moves.map(m => m.name === move.name ? updatedMove : m)
          } : null);
          setPlayer(prev => prev ? effectResult.user : null);
        } else {
          setPlayer(prev => prev ? { 
            ...effectResult.target, 
            currentHp: newHp,
            moves: prev.moves.map(m => m.name === move.name ? updatedMove : m)
          } : null);
          setOpponent(prev => prev ? effectResult.user : null);
        }
      } else {
        // Just apply effects without damage
        if (turn === 'player') {
          setOpponent(prev => prev ? effectResult.target : null);
          setPlayer(prev => prev ? {
            ...effectResult.user,
            moves: prev.moves.map(m => m.name === move.name ? updatedMove : m)
          } : null);
        } else {
          setPlayer(prev => prev ? effectResult.target : null);
          setOpponent(prev => prev ? {
            ...effectResult.user,
            moves: prev.moves.map(m => m.name === move.name ? updatedMove : m)
          } : null);
        }
      }
    }

    setBattleLog(prev => [...prev, ...newLog]);

    setTimeout(() => {
      clearAnimations();
      setIsAnimating(false);
      setBattlePhase('select');
      setTurn(turn === 'player' ? 'opponent' : 'player');
    }, 3000);
  }, [calculateDamage, applyMoveEffect, turn, getMoveAnimation]);

  const handleMoveSelect = (moveIndex: number) => {
    if (!player || battlePhase !== 'select' || turn !== 'player') return;
    
    const move = player.moves[moveIndex];
    if (move.currentPP === 0) {
      setCurrentMessage(`${move.name} has no PP left!`);
      return;
    }

    setSelectedMove(moveIndex);
    executeMove(player, opponent!, move);
    setBattleMenu('main');
  };

  // Simple AI for opponent
  useEffect(() => {
    if (turn === 'opponent' && opponent && battlePhase === 'select' && !isAnimating) {
      const availableMoves = opponent.moves.filter(move => move.currentPP > 0);
      if (availableMoves.length === 0) return;

      const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      setTimeout(() => {
        executeMove(opponent, player!, randomMove);
      }, 1000);
    }
  }, [turn, opponent, battlePhase, isAnimating, executeMove, player]);

  const handlePokemonSwitch = (newPokemon: any) => {
    const switchedPokemon = {
      ...newPokemon,
      statBoosts: {
        attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0
      }
    };
    setPlayer(switchedPokemon);
    setBattleLog(prev => [...prev, `Go ${newPokemon.name}!`]);
    if (onSwitchPokemon) {
      onSwitchPokemon(newPokemon);
    }
    setBattleMenu('main');
    setTurn('opponent');
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
      grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
      ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
      rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
      steel: '#B8B8D0', fairy: '#EE99AC'
    };
    return colors[type] || '#68A090';
  };

  // Check for battle end
  useEffect(() => {
    if (!player || !opponent) return;

    if (player.currentHp <= 0) {
      setBattlePhase('ended');
      setBattleLog(prev => [...prev, `${player.name} fainted!`, 'You lost the battle!']);
      setTimeout(() => onBattleEnd?.(false), 2000);
    } else if (opponent.currentHp <= 0) {
      setBattlePhase('ended');
      setBattleLog(prev => [...prev, `${opponent.name} fainted!`, 'You won the battle!']);
      setTimeout(() => onBattleEnd?.(true), 2000);
    }
  }, [player?.currentHp, opponent?.currentHp, onBattleEnd, player, opponent]);

  // Apply status effects at end of each turn
  useEffect(() => {
    if (turn === 'player' && player && !isAnimating) {
      const { pokemon: updatedPlayer, messages } = applyStatusEffects(player);
      setPlayer(updatedPlayer);
      if (messages.length > 0) {
        setBattleLog(prev => [...prev, ...messages]);
      }
    } else if (turn === 'opponent' && opponent && !isAnimating) {
      const { pokemon: updatedOpponent, messages } = applyStatusEffects(opponent);
      setOpponent(updatedOpponent);
      if (messages.length > 0) {
        setBattleLog(prev => [...prev, ...messages]);
      }
    }
  }, [turn, isAnimating, applyStatusEffects]);

  if (!player || !opponent) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading battle...</div>;
  }

  if (battlePhase === 'ended') {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-blue-400 to-green-300 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-4">
            {player.currentHp > 0 ? 'Victory!' : 'Defeat!'}
          </div>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-400 to-green-300">
      {/* Exit Button */}
      <button
        onClick={onBack}
        className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-xl font-bold z-10"
      >
        ×
      </button>

      {/* Main Battle Area */}
      <div className="h-full flex flex-col">
        {/* Battlefield - Takes remaining space */}
        <div className="flex-1 relative min-h-0">
          {/* Opponent Pokemon */}
          <div className="absolute top-8 right-8">
            <div className="text-center">
              <div className="bg-white rounded-lg p-2 mb-2 shadow-lg">
                <div className="font-bold">{opponent.name}</div>
                <div className="text-sm">Lv.{opponent.level}</div>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(opponent.currentHp / opponent.maxHp) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs">{opponent.currentHp}/{opponent.maxHp}</div>
                {opponent.status && (
                  <div className="text-xs text-red-500 capitalize">{opponent.status}</div>
                )}
                {opponent.protected && (
                  <div className="text-xs text-blue-500">Protected</div>
                )}
              </div>
              <img
                src={opponent.sprites.front_default}
                alt={opponent.name}
                className={`w-24 h-24 transition-all duration-500 ${opponentAnimation ? `battle-${opponentAnimation}` : ''} ${isAnimating && !opponentAnimation ? 'animate-pulse' : ''}`}
              />
            </div>
          </div>

          {/* Player Pokemon */}
          <div className="absolute bottom-8 left-8">
            <div className="text-center">
              <img
                src={player.sprites.back_default || player.sprites.front_default}
                alt={player.name}
                className={`w-24 h-24 transition-all duration-500 ${playerAnimation ? `battle-${playerAnimation}` : ''} ${isAnimating && !playerAnimation ? 'animate-pulse' : ''}`}
              />
              <div className="bg-white rounded-lg p-2 mt-2 shadow-lg">
                <div className="font-bold">{player.name}</div>
                <div className="text-sm">Lv.{player.level}</div>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(player.currentHp / player.maxHp) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs">{player.currentHp}/{player.maxHp}</div>
                {player.status && (
                  <div className="text-xs text-red-500 capitalize">{player.status}</div>
                )}
                {player.protected && (
                  <div className="text-xs text-blue-500">Protected</div>
                )}
              </div>
            </div>
          </div>

          {/* Battle Log */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-90 rounded-lg p-4 w-80 max-h-32 overflow-y-auto">
            {battleLog.slice(-3).map((log, index) => (
              <div key={index} className="text-sm mb-1">{log}</div>
            ))}
          </div>

          {/* Move Effect Overlay */}
          {moveEffectAnimation && (
            <div className={`absolute inset-0 pointer-events-none flex items-center justify-center battle-${moveEffectAnimation}`}>
              <div className="text-6xl opacity-80">
                {moveEffectAnimation.includes('fire') && '🔥'}
                {moveEffectAnimation.includes('water') && '💧'}
                {moveEffectAnimation.includes('electric') && '⚡'}
                {moveEffectAnimation.includes('grass') && '🌿'}
                {moveEffectAnimation.includes('ice') && '❄️'}
                {moveEffectAnimation.includes('psychic') && '🧠'}
                {moveEffectAnimation.includes('ghost') && '👻'}
                {moveEffectAnimation.includes('dragon') && '🐉'}
                {moveEffectAnimation.includes('protect') && '🛡️'}
                {moveEffectAnimation.includes('heal') && '✨'}
                {moveEffectAnimation.includes('poison') && '☠️'}
                {moveEffectAnimation.includes('impact') && '💥'}
                {moveEffectAnimation.includes('stat') && '📈'}
                {!moveEffectAnimation.includes('fire') && 
                 !moveEffectAnimation.includes('water') && 
                 !moveEffectAnimation.includes('electric') && 
                 !moveEffectAnimation.includes('grass') && 
                 !moveEffectAnimation.includes('ice') && 
                 !moveEffectAnimation.includes('psychic') && 
                 !moveEffectAnimation.includes('ghost') && 
                 !moveEffectAnimation.includes('dragon') && 
                 !moveEffectAnimation.includes('protect') && 
                 !moveEffectAnimation.includes('heal') && 
                 !moveEffectAnimation.includes('poison') && 
                 !moveEffectAnimation.includes('impact') && 
                 !moveEffectAnimation.includes('stat') && '💫'}
              </div>
            </div>
          )}
        </div>

        {/* Interface Area - Fixed height */}
        <div className="h-48 bg-blue-800 p-4">
          {battleMenu === 'main' && battlePhase === 'select' && turn === 'player' && !isAnimating && (
            <div className="grid grid-cols-2 gap-4 h-full">
              <button
                onClick={() => setBattleMenu('fight')}
                className="bg-yellow-400 hover:bg-yellow-500 rounded-lg font-bold text-lg flex items-center justify-center"
              >
                <Swords className="mr-2" size={20} />
                FIGHT
              </button>
              <button
                onClick={() => setBattleMenu('switch')}
                className="bg-green-400 hover:bg-green-500 rounded-lg font-bold text-lg flex items-center justify-center"
                disabled={playerTeam.length <= 1}
              >
                <ArrowLeft className="mr-2" size={20} />
                POKEMON
              </button>
              <button
                onClick={onBack}
                className="bg-red-400 hover:bg-red-500 rounded-lg font-bold text-lg"
              >
                RUN
              </button>
              <button
                className="bg-gray-400 rounded-lg font-bold text-lg opacity-50 flex items-center justify-center"
                disabled
              >
                <Heart className="mr-2" size={20} />
                BAG
              </button>
            </div>
          )}

          {battleMenu === 'fight' && (
            <div className="h-full">
              <div className="grid grid-cols-2 gap-2 h-40">
                {player.moves.map((move, index) => (
                  <button
                    key={index}
                    onClick={() => handleMoveSelect(index)}
                    disabled={move.currentPP === 0 || isAnimating}
                    className={`p-2 rounded-lg text-sm font-bold transition-all ${
                      move.currentPP === 0 
                        ? 'bg-gray-400 text-gray-600' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                    style={{ backgroundColor: move.currentPP > 0 ? getTypeColor(move.type) : undefined }}
                  >
                    <div className="font-bold">{move.name.replace(/-/g, ' ').toUpperCase()}</div>
                    <div className="text-xs">PP: {move.currentPP}/{move.pp}</div>
                    <div className="text-xs">
                      {move.power > 0 ? `Power: ${move.power}` : 'Status'}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setBattleMenu('main')}
                className="mt-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
                disabled={isAnimating}
              >
                Back
              </button>
            </div>
          )}

          {battleMenu === 'switch' && (
            <div className="h-full overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {playerTeam.filter(p => p.currentHp > 0 && p.id !== player.id).map((pokemon) => (
                  <button
                    key={pokemon.id}
                    onClick={() => handlePokemonSwitch(pokemon)}
                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                    disabled={isAnimating}
                  >
                    <div className="font-bold">{pokemon.name}</div>
                    <div className="text-xs">HP: {pokemon.currentHp}/{pokemon.maxHp}</div>
                    <div className="text-xs">Lv.{pokemon.level}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setBattleMenu('main')}
                className="mt-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
                disabled={isAnimating}
              >
                Back
              </button>
            </div>
          )}

          {(isAnimating || turn === 'opponent') && (
            <div className="h-full flex items-center justify-center">
              <div className="text-white text-lg font-bold text-center">
                {currentMessage}
                {turn === 'opponent' && !isAnimating && (
                  <div className="text-sm mt-2">Opponent is choosing a move...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BattleSimulator;