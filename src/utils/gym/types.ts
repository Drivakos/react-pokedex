export interface GymPokemon {
  id: number;
  name: string;
  species?: string;
  types: string[];
  sprites: {
    front_default: string;
    back_default: string;
  };
  stats: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  baseStats?: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  moves: Array<{
    name: string;
    type: string;
    power: number;
    accuracy: number;
    pp: number;
    currentPP: number;
    damageClass: 'physical' | 'special' | 'status';
    description: string;
    priority?: number;
    target?: string;
    effect?: string;
    learnMethod?: string;
    levelLearned?: number;
  }>;
  level: number;
  currentHp: number;
  maxHp: number;
  ability?: string;
  nature?: string;
  item?: string | null;
  status?: string | null;
  statusTurns?: number;
  // Competitive data
  ivs?: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  evs?: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  experience?: number;
  happiness?: number;
}

export interface ChallengerTeam {
  pokemon: GymPokemon[];
  name: string;
}

export type GymType = 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'ice' | 'dragon' | 'dark' | 'steel' | 'fairy' | 'fighting' | 'poison' | 'ground' | 'flying' | 'bug' | 'rock' | 'ghost' | 'normal';

export type GamePhase = 'type-selection' | 'pokemon-selection' | 'team-building' | 'battling' | 'team-expansion' | 'pokemon-select-for-battle' | 'game-over';

export interface GymChallengeState {
  gamePhase: GamePhase;
  selectedType: GymType | null;
  availablePokemon: any[];
  gymTeam: GymPokemon[];
  currentChallenger: ChallengerTeam | null;
  battleWins: number;
  isInBattle: boolean;
  loading: boolean;
  allPokemon: any[];
  selectedBattlePokemon: GymPokemon | null;
  pokemonToReplace: GymPokemon | null;
  comingFromLoss: boolean;
} 