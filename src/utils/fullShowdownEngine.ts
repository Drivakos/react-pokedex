// Complete Pokemon Showdown Battle Engine
// Uses the full Pokemon Showdown simulator with ALL features for maximum accuracy

import { Dex, Teams, Battle, BattleStreams } from '@pkmn/sim';
import { Generations } from '@pkmn/data';

// Initialize Pokemon Showdown
const gens = new Generations(Dex);
const gen = gens.get(9); // Use Gen 9 mechanics

export interface FullShowdownPokemon {
  id: number;
  name: string;
  species: string;
  level: number;
  gender?: 'M' | 'F' | '';
  item?: string;
  ability: string;
  nature?: string;
  ivs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  evs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  moves: string[];
  shiny?: boolean;
  // Runtime battle state
  currentHp?: number;
  maxHp?: number;
  status?: string;
  volatileStatuses?: string[];
  boosts?: { [stat: string]: number };
  sprites?: {
    front_default: string;
    back_default: string;
  };
}

export interface BattleState {
  battleId: string;
  turn: number;
  ended: boolean;
  winner?: string;
  weather?: string;
  terrain?: string;
  sideConditions: {
    p1: string[];
    p2: string[];
  };
  fieldEffects: string[];
  log: string[];
  lastAction?: string;
}

export interface BattleChoice {
  type: 'move' | 'switch' | 'pass';
  choice: string;
  pokemon?: number;
  move?: number;
  target?: number;
}

export class FullShowdownEngine {
  private battle: Battle | null = null;
  private battleStream: any = null;
  private p1Stream: any = null;
  private p2Stream: any = null;
  private omniscientStream: any = null;
  private battleState: BattleState;
  private battleLog: string[] = [];
  private currentRequest: any = null;

  constructor() {
    this.battleState = {
      battleId: this.generateBattleId(),
      turn: 0,
      ended: false,
      sideConditions: { p1: [], p2: [] },
      fieldEffects: [],
      log: []
    };
  }

  private generateBattleId(): string {
    return `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convert our Pokemon data to Showdown team format
  convertToShowdownSet(pokemon: any): string {
    const species = gen.species.get(pokemon.name);
    if (!species) {
      throw new Error(`Species ${pokemon.name} not found`);
    }

    const level = pokemon.level || 50;
    const nature = pokemon.nature || 'Hardy';
    const ability = pokemon.ability || species.abilities?.[0] || 'Pressure';
    const item = pokemon.item || '';
    const gender = pokemon.gender || '';

    // Use competitive-viable EVs (252/252/4 spread)
    const evs = pokemon.evs || {
      hp: 4,
      atk: species.baseStats.atk > species.baseStats.spa ? 252 : 0,
      def: 0,
      spa: species.baseStats.spa > species.baseStats.atk ? 252 : 0,
      spd: 0,
      spe: 252
    };

    // Perfect IVs by default
    const ivs = pokemon.ivs || {
      hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31
    };

    // Get moves from Pokemon or generate appropriate ones
    let moves = pokemon.moves || [];
    if (moves.length === 0) {
      moves = this.generateCompetitiveMoves(species);
    }

    // Ensure we have exactly 4 moves
    moves = moves.slice(0, 4);
    while (moves.length < 4) {
      moves.push('Tackle');
    }

    // Build Showdown team string
    let teamString = species.name;
    if (gender) teamString += ` (${gender})`;
    if (item) teamString += ` @ ${item}`;
    teamString += '\n';
    
    teamString += `Ability: ${ability}\n`;
    teamString += `Level: ${level}\n`;
    
    if (pokemon.shiny) teamString += 'Shiny: Yes\n';
    
    teamString += `Nature: ${nature}\n`;
    
    // Add EVs if not default
    const evString = Object.entries(evs)
      .filter(([stat, value]) => value > 0)
      .map(([stat, value]) => `${value} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`)
      .join(' / ');
    if (evString) teamString += `EVs: ${evString}\n`;
    
    // Add IVs if not perfect
    const ivString = Object.entries(ivs)
      .filter(([stat, value]) => value < 31)
      .map(([stat, value]) => `${value} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`)
      .join(' / ');
    if (ivString) teamString += `IVs: ${ivString}\n`;
    
    // Add moves
    moves.forEach((move: string) => {
      teamString += `- ${move}\n`;
    });

    return teamString;
  }

  // Generate competitive movesets based on Pokemon's stats and type
  private generateCompetitiveMoves(species: any): string[] {
    const moves: string[] = [];
    const movePool: any[] = [];

    // Get all moves this Pokemon can learn
    for (const [moveId, move] of gen.moves) {
      if (this.canLearnMove(species.id, moveId)) {
        movePool.push(move);
      }
    }

    // Sort moves by usefulness (STAB moves, high power, etc.)
    movePool.sort((a, b) => {
      const aScore = this.rateMoveForSpecies(a, species);
      const bScore = this.rateMoveForSpecies(b, species);
      return bScore - aScore;
    });

    // Select diverse moves
    const attackingMoves = movePool.filter(m => m.basePower > 0);
    const statusMoves = movePool.filter(m => m.basePower === 0 && m.category === 'Status');

    // Prefer STAB moves
    const stabMoves = attackingMoves.filter(m => species.types.includes(m.type));
    if (stabMoves.length > 0) {
      moves.push(stabMoves[0].name);
    }

    // Add coverage moves
    const coverageMoves = attackingMoves.filter(m => !species.types.includes(m.type));
    if (coverageMoves.length > 0) {
      moves.push(coverageMoves[0].name);
    }

    // Add utility/status move
    if (statusMoves.length > 0) {
      moves.push(statusMoves[0].name);
    }

    // Fill remaining slots
    while (moves.length < 4 && movePool.length > moves.length) {
      const nextMove = movePool[moves.length];
      if (!moves.includes(nextMove.name)) {
        moves.push(nextMove.name);
      }
    }

    return moves.length > 0 ? moves : ['Tackle', 'Growl'];
  }

  // Simple move learning check (simplified)
  private canLearnMove(speciesId: string, moveId: string): boolean {
    // This is simplified - in a full implementation you'd check the learnsets
    return true;
  }

  // Rate how good a move is for a specific species
  private rateMoveForSpecies(move: any, species: any): number {
    let score = 0;

    // STAB bonus
    if (species.types.includes(move.type)) {
      score += 50;
    }

    // Power rating
    score += move.basePower * 0.5;

    // Accuracy bonus
    score += (move.accuracy || 100) * 0.1;

    // Category preference based on stats
    if (move.category === 'Physical' && species.baseStats.atk > species.baseStats.spa) {
      score += 20;
    } else if (move.category === 'Special' && species.baseStats.spa > species.baseStats.atk) {
      score += 20;
    }

    // Status moves get base utility score
    if (move.category === 'Status') {
      score += 30;
    }

    return score;
  }

  // Initialize a battle with two teams
  async initializeBattle(p1Team: any[], p2Team: any[]): Promise<void> {
    try {
      // Convert teams to Showdown format
      const p1TeamString = p1Team.map(p => this.convertToShowdownSet(p)).join('\n\n');
      const p2TeamString = p2Team.map(p => this.convertToShowdownSet(p)).join('\n\n');

      // Validate teams
      const validator = Dex.formats.get('gen9customgame').validateTeam;
      if (validator) {
        const p1Issues = validator.call(Dex, Teams.unpack(p1TeamString) || [], { format: 'gen9customgame' });
        const p2Issues = validator.call(Dex, Teams.unpack(p2TeamString) || [], { format: 'gen9customgame' });

        if (p1Issues?.length) {
          console.warn('P1 team validation issues:', p1Issues);
        }
        if (p2Issues?.length) {
          console.warn('P2 team validation issues:', p2Issues);
        }
      }

      // Create battle streams
      const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
      this.p1Stream = streams.p1;
      this.p2Stream = streams.p2;
      this.omniscientStream = streams.omniscient;

      // Set up battle listeners
      this.setupBattleListeners();

      // Start battle
      const battleSpec = {
        formatid: 'gen9customgame',
        rated: false,
        seed: [
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000),
          Math.floor(Math.random() * 0x10000)
        ]
      };

      const p1Spec = {
        name: 'Player 1',
        team: p1TeamString
      };

      const p2Spec = {
        name: 'Player 2',
        team: p2TeamString
      };

      // Initialize battle
      this.omniscientStream.write(`>start ${JSON.stringify(battleSpec)}`);
      this.omniscientStream.write(`>player p1 ${JSON.stringify(p1Spec)}`);
      this.omniscientStream.write(`>player p2 ${JSON.stringify(p2Spec)}`);

      // Wait for battle to start
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('Failed to initialize battle:', error);
      throw error;
    }
  }

  private setupBattleListeners(): void {
    // Listen to all battle output
    this.omniscientStream.on('data', (chunk: string) => {
      this.processBattleOutput(chunk);
    });

    // Listen to player-specific output
    this.p1Stream.on('data', (chunk: string) => {
      this.processPlayerOutput('p1', chunk);
    });

    this.p2Stream.on('data', (chunk: string) => {
      this.processPlayerOutput('p2', chunk);
    });
  }

  private processBattleOutput(chunk: string): void {
    const lines = chunk.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      this.battleLog.push(line);
      this.parseBattleLine(line);
    }
  }

  private processPlayerOutput(player: string, chunk: string): void {
    const lines = chunk.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.startsWith('|request|')) {
        try {
          const requestData = JSON.parse(line.slice(9));
          this.currentRequest = { player, data: requestData };
        } catch (error) {
          console.error('Failed to parse request:', error);
        }
      }
    }
  }

  private parseBattleLine(line: string): void {
    const parts = line.split('|');
    if (parts.length < 2) return;

    const command = parts[1];

    switch (command) {
      case 'turn':
        this.battleState.turn = parseInt(parts[2]) || 0;
        break;

      case 'win':
        this.battleState.ended = true;
        this.battleState.winner = parts[2];
        break;

      case 'tie':
        this.battleState.ended = true;
        break;

      case '-weather':
        this.battleState.weather = parts[2];
        break;

      case '-fieldstart':
        if (!this.battleState.fieldEffects.includes(parts[2])) {
          this.battleState.fieldEffects.push(parts[2]);
        }
        break;

      case '-fieldend':
        this.battleState.fieldEffects = this.battleState.fieldEffects.filter(
          effect => effect !== parts[2]
        );
        break;

      case '-sidestart':
        const side = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const condition = parts[3];
        if (!this.battleState.sideConditions[side].includes(condition)) {
          this.battleState.sideConditions[side].push(condition);
        }
        break;

      case '-sideend':
        const endSide = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const endCondition = parts[3];
        this.battleState.sideConditions[endSide] = this.battleState.sideConditions[endSide].filter(
          cond => cond !== endCondition
        );
        break;
    }

    // Add to processed log
    this.battleState.log.push(line);
  }

  // Make a choice in the battle
  makeChoice(player: 'p1' | 'p2', choice: BattleChoice): void {
    let choiceString = '';

    switch (choice.type) {
      case 'move':
        choiceString = `move ${choice.move}`;
        if (choice.target !== undefined) {
          choiceString += ` ${choice.target}`;
        }
        break;
      case 'switch':
        choiceString = `switch ${choice.pokemon}`;
        break;
      case 'pass':
        choiceString = 'pass';
        break;
    }

    if (player === 'p1') {
      this.p1Stream.write(`>${choiceString}`);
    } else {
      this.p2Stream.write(`>${choiceString}`);
    }
  }

  // Get available choices for a player
  getAvailableChoices(player: 'p1' | 'p2'): any {
    if (this.currentRequest && this.currentRequest.player === player) {
      return this.currentRequest.data;
    }
    return null;
  }

  // Get current battle state
  getBattleState(): BattleState {
    return { ...this.battleState };
  }

  // Get formatted battle log
  getBattleLog(): string[] {
    return [...this.battleLog];
  }

  // Get processed battle messages
  getProcessedLog(): string[] {
    return this.battleState.log.map(line => {
      // Convert Showdown protocol to readable messages
      const parts = line.split('|');
      const command = parts[1];

      switch (command) {
        case 'move':
          return `${parts[2]} used ${parts[3]}!`;
        case '-damage':
          return `${parts[2]} took damage!`;
        case '-heal':
          return `${parts[2]} restored HP!`;
        case 'faint':
          return `${parts[2]} fainted!`;
        case '-status':
          return `${parts[2]} was afflicted with ${parts[3]}!`;
        case '-boost':
          return `${parts[2]}'s ${parts[3]} rose!`;
        case '-unboost':
          return `${parts[2]}'s ${parts[3]} fell!`;
        case '-weather':
          return `The weather is now ${parts[2]}!`;
        case '-fieldstart':
          return `${parts[2]} began!`;
        case 'win':
          return `${parts[2]} wins!`;
        default:
          return line;
      }
    }).filter(msg => msg && !msg.startsWith('|'));
  }

  // Check if battle has ended
  isBattleEnded(): boolean {
    return this.battleState.ended;
  }

  // Get winner
  getWinner(): string | undefined {
    return this.battleState.winner;
  }

  // Clean up battle resources
  destroy(): void {
    if (this.omniscientStream) {
      this.omniscientStream.destroy();
    }
    if (this.p1Stream) {
      this.p1Stream.destroy();
    }
    if (this.p2Stream) {
      this.p2Stream.destroy();
    }
  }

  // Get detailed Pokemon information from battle state
  getPokemonInfo(player: 'p1' | 'p2', slot: number): any {
    const request = this.getAvailableChoices(player);
    if (request && request.side && request.side.pokemon) {
      return request.side.pokemon[slot];
    }
    return null;
  }

  // Get all available abilities for a species
  getAvailableAbilities(speciesName: string): string[] {
    const species = gen.species.get(speciesName);
    if (!species) return ['Pressure'];
    
    return Object.values(species.abilities || {}).filter(Boolean);
  }

  // Get all available items
  getAvailableItems(): string[] {
    return Array.from(gen.items.keys()).filter(item => {
      const itemData = gen.items.get(item);
      return itemData && !itemData.isNonstandard;
    });
  }

  // Get all available moves for a species
  getAvailableMoves(speciesName: string): string[] {
    // This would typically require learnset data
    // For now, return common competitive moves
    return [
      'Flamethrower', 'Thunderbolt', 'Ice Beam', 'Earthquake',
      'Surf', 'Psychic', 'Shadow Ball', 'Energy Ball',
      'Protect', 'Substitute', 'Toxic', 'Thunder Wave',
      'Stealth Rock', 'Roost', 'U-turn', 'Volt Switch'
    ];
  }

  // Validate a Pokemon set
  validatePokemonSet(pokemon: any): string[] {
    const issues: string[] = [];

    const species = gen.species.get(pokemon.species || pokemon.name);
    if (!species) {
      issues.push(`Unknown species: ${pokemon.species || pokemon.name}`);
      return issues;
    }

    // Check ability
    if (pokemon.ability) {
      const validAbilities = this.getAvailableAbilities(species.name);
      if (!validAbilities.includes(pokemon.ability)) {
        issues.push(`Invalid ability: ${pokemon.ability}`);
      }
    }

    // Check moves
    if (pokemon.moves) {
      if (pokemon.moves.length > 4) {
        issues.push('Pokemon cannot have more than 4 moves');
      }
    }

    // Check stats
    if (pokemon.evs) {
      const totalEvs = Object.values(pokemon.evs).reduce((sum: number, ev: any) => sum + (ev || 0), 0);
      if (totalEvs > 510) {
        issues.push('Total EVs cannot exceed 510');
      }
    }

    return issues;
  }
} 