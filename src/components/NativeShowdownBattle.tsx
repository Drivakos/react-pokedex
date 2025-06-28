import React, { useState, useEffect, useRef } from 'react';
import { Dex, BattleStreams, RandomPlayerAI, Teams } from '@pkmn/sim';

interface NativeShowdownBattleProps {
  playerPokemon: any;
  opponentPokemon: any;
  onBack: () => void;
  onBattleEnd: (won: boolean) => void;
}

const NativeShowdownBattle: React.FC<NativeShowdownBattleProps> = ({
  playerPokemon,
  opponentPokemon,
  onBack,
  onBattleEnd
}) => {
  const [battleState, setBattleState] = useState<'setup' | 'battle' | 'ended'>('setup');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [currentPlayerHP, setCurrentPlayerHP] = useState(playerPokemon.currentHp);
  const [currentOpponentHP, setCurrentOpponentHP] = useState(opponentPokemon.currentHp);
  const [maxPlayerHP, setMaxPlayerHP] = useState(playerPokemon.maxHp);
  const [maxOpponentHP, setMaxOpponentHP] = useState(opponentPokemon.maxHp);
  const [availableMoves, setAvailableMoves] = useState<any[]>([]);
  const [battleWinner, setBattleWinner] = useState<'player' | 'opponent' | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  
  const streamRef = useRef<any>(null);
  const p2AIRef = useRef<any>(null);
  const battleInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React strict mode
    if (battleInitializedRef.current) return;
    battleInitializedRef.current = true;
    
    initializeBattle();
    
    // Cleanup on unmount
    return () => {
      if (p2AIRef.current) {
        // Stop AI if it exists
        p2AIRef.current = null;
      }
    };
  }, []);

  const initializeBattle = async () => {
    try {
      addToBattleLog('Initializing Pokemon Showdown battle...');

      // Create battle stream
      const battleStream = new BattleStreams.BattleStream();
      
      // Get player streams
      const streams = BattleStreams.getPlayerStreams(battleStream);
      streamRef.current = streams;

      // Convert Pokemon to Showdown team format
      const p1Team = convertToShowdownTeam(playerPokemon);
      const p2Team = convertToShowdownTeam(opponentPokemon);

      addToBattleLog('Teams converted to Showdown format');
      console.log('P1 Team:', p1Team);
      console.log('P2 Team:', p2Team);

      // Pack teams
      const p1PackedTeam = Teams.pack(p1Team);
      const p2PackedTeam = Teams.pack(p2Team);

      // Battle specification
      const spec = { formatid: 'gen9customgame' };
      const p1spec = { name: 'Player', team: p1PackedTeam };
      const p2spec = { name: 'Opponent', team: p2PackedTeam };

      // Create AI for opponent
      const p2AI = new RandomPlayerAI(streams.p2);
      p2AIRef.current = p2AI;
      p2AI.start();

      // Listen to battle output using async iteration
      const streamReader = async () => {
        try {
          for await (const chunk of streams.omniscient) {
            console.log('Battle output:', chunk);
            parseBattleMessage(chunk);
          }
        } catch (error) {
          console.error('Stream reading error:', error);
        }
      };
      
      // Start reading stream
      streamReader();

      // Listen to player stream for requests
      const p1StreamReader = async () => {
        try {
          for await (const chunk of streams.p1) {
            console.log('P1 stream:', chunk);
            handlePlayerMessage(chunk);
          }
        } catch (error) {
          console.error('P1 stream error:', error);
        }
      };
      
      p1StreamReader();

      // Start the battle
      const startCommand = `>start ${JSON.stringify(spec)}\n>player p1 ${JSON.stringify(p1spec)}\n>player p2 ${JSON.stringify(p2spec)}`;
      
      streams.omniscient.write(startCommand);

      setAvailableMoves(playerPokemon.moves || []);
      setBattleState('battle');
      addToBattleLog(`Battle started! ${playerPokemon.name} vs ${opponentPokemon.name}`);

    } catch (error) {
      console.error('Error initializing battle:', error);
      addToBattleLog(`Error setting up Pokemon Showdown battle: ${error.message}`);
      addToBattleLog('Using fallback battle system...');
      setAvailableMoves(playerPokemon.moves || []);
      setBattleState('battle');
    }
  };

  const convertToShowdownTeam = (pokemon: any) => {
    // Convert our Pokemon to Showdown team format (array of Pokemon objects)
    return [{
      name: pokemon.name,
      species: pokemon.name,
      item: pokemon.item || '',
      ability: pokemon.ability || 'pressure',
      moves: pokemon.moves?.map((move: any) => move.name) || ['tackle'],
      nature: pokemon.nature || 'hardy',
      evs: pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: pokemon.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      level: pokemon.level || 50,
      gender: '',
      shiny: false
    }];
  };

  const handlePlayerMessage = (message: string) => {
    // Handle messages directed at the player (like move requests)
    console.log('Processing player message:', message);
    
    const lines = message.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.startsWith('|request|')) {
        const requestData = line.substring(9); // Remove "|request|"
        try {
          const request = JSON.parse(requestData);
          handleTurnRequest(request);
        } catch (error) {
          console.error('Error parsing request:', error);
        }
      }
    }
  };

  const parseBattleMessage = (message: string) => {
    const lines = message.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (!line.startsWith('|')) continue;
      
      const parts = line.split('|');
      const messageType = parts[1];

      switch (messageType) {
        case 'switch':
        case 'drag':
          const pokemon = parts[2];
          addToBattleLog(`${pokemon} switched in!`);
          break;

        case 'move':
          const attacker = parts[2];
          const moveName = parts[3];
          addToBattleLog(`${attacker} used ${moveName}!`);
          break;

        case '-damage':
          const damagedPokemon = parts[2];
          const newHP = parts[3];
          addToBattleLog(`${damagedPokemon} took damage!`);
          updatePokemonHP(damagedPokemon, newHP);
          break;

        case '-heal':
          const healedPokemon = parts[2];
          const healHP = parts[3];
          addToBattleLog(`${healedPokemon} restored HP!`);
          updatePokemonHP(healedPokemon, healHP);
          break;

        case '-boost':
          const boostedPokemon = parts[2];
          const stat = parts[3];
          const amount = parts[4];
          addToBattleLog(`${boostedPokemon}'s ${stat} rose!`);
          break;

        case '-unboost':
          const unboostedPokemon = parts[2];
          const droppedStat = parts[3];
          const dropAmount = parts[4];
          addToBattleLog(`${unboostedPokemon}'s ${droppedStat} fell!`);
          break;

        case '-status':
          const statusPokemon = parts[2];
          const statusCondition = parts[3];
          addToBattleLog(`${statusPokemon} was ${statusCondition}!`);
          break;

        case '-supereffective':
          addToBattleLog("It's super effective!");
          break;

        case '-resisted':
          addToBattleLog("It's not very effective...");
          break;

        case '-crit':
          addToBattleLog("A critical hit!");
          break;

        case 'faint':
          const faintedPokemon = parts[2];
          addToBattleLog(`${faintedPokemon} fainted!`);
          checkBattleEnd(faintedPokemon);
          break;

        case 'win':
          const winner = parts[2];
          addToBattleLog(`${winner} wins!`);
          setBattleWinner(winner === 'Player' ? 'player' : 'opponent');
          setBattleState('ended');
          onBattleEnd(winner === 'Player');
          break;

        case 'turn':
          const turnNum = parts[2];
          addToBattleLog(`Turn ${turnNum}`);
          break;

        case 'player':
          if (parts[3]) {
            addToBattleLog(`${parts[2]} - ${parts[3]}`);
          }
          break;

        case 't:':
          // Timestamp, ignore
          break;

        case 'gametype':
        case 'gen':
        case 'tier':
        case 'clearpoke':
        case 'teamsize':
          // Battle setup messages, can ignore or log
          break;

        default:
          // Log other messages
          if (parts[1] && !parts[1].startsWith('-') && parts[1] !== 'request') {
            const cleanMessage = line.substring(1); // Remove leading |
            if (cleanMessage.trim()) {
              addToBattleLog(cleanMessage);
            }
          }
      }
    }
  };

  const updatePokemonHP = (pokemonName: string, hpString: string) => {
    // Parse HP format like "129/161" or "100/100" 
    const hpMatch = hpString.match(/(\d+)\/(\d+)/);
    if (!hpMatch) return;

    const currentHP = parseInt(hpMatch[1]);
    const maxHP = parseInt(hpMatch[2]);

    console.log(`Updating HP for ${pokemonName}: ${currentHP}/${maxHP}`);

    // Check if this is the player's Pokemon (p1a:)
    if (pokemonName.includes('p1a:') || pokemonName.toLowerCase().includes(playerPokemon.name.toLowerCase())) {
      setCurrentPlayerHP(currentHP);
      setMaxPlayerHP(maxHP);
      console.log(`Player HP updated to: ${currentHP}`);
    } 
    // Check if this is the opponent's Pokemon (p2a:)
    else if (pokemonName.includes('p2a:') || pokemonName.toLowerCase().includes(opponentPokemon.name.toLowerCase())) {
      setCurrentOpponentHP(currentHP);
      setMaxOpponentHP(maxHP);
      console.log(`Opponent HP updated to: ${currentHP}`);
    }
  };

  const handleTurnRequest = (request: any) => {
    console.log('Turn request:', request);
    setPendingRequest(request);
    
    // Handle team preview
    if (request.teamPreview) {
      addToBattleLog('Team preview phase - selecting starting Pokemon...');
      
      // Send team preview response (select first Pokemon)
      if (streamRef.current?.p1?.write) {
        streamRef.current.p1.write('team 1');
      }
      
      setIsPlayerTurn(false); // Wait for battle to start
      return;
    }
    
    // Sync HP values from Pokemon Showdown data
    if (request.side && request.side.pokemon) {
      const playerPokemonData = request.side.pokemon[0];
      if (playerPokemonData && playerPokemonData.condition) {
        const hpMatch = playerPokemonData.condition.match(/(\d+)\/(\d+)/);
        if (hpMatch) {
          const currentHP = parseInt(hpMatch[1]);
          const maxHP = parseInt(hpMatch[2]);
          setCurrentPlayerHP(currentHP);
          setMaxPlayerHP(maxHP);
          console.log(`Synced player HP from request: ${currentHP}/${maxHP}`);
        }
      }
    }
    
    // Handle normal turn request
    setIsPlayerTurn(true);
    
    if (request.active && request.active[0] && request.active[0].moves) {
      const moves = request.active[0].moves.map((move: any, index: number) => ({
        name: move.move,
        id: move.id,
        index: index + 1,
        disabled: move.disabled,
        pp: move.pp,
        maxpp: move.maxpp
      }));
      setAvailableMoves(moves);
    }
  };

  const checkBattleEnd = (faintedPokemon: string) => {
    console.log(`Pokemon fainted: ${faintedPokemon}`);
    
    if (faintedPokemon.includes('p1a:') || faintedPokemon.toLowerCase().includes(playerPokemon.name.toLowerCase())) {
      addToBattleLog(`${playerPokemon.name} fainted!`);
      setBattleWinner('opponent');
      setBattleState('ended');
      onBattleEnd(false);
    } else if (faintedPokemon.includes('p2a:') || faintedPokemon.toLowerCase().includes(opponentPokemon.name.toLowerCase())) {
      addToBattleLog(`${opponentPokemon.name} fainted!`);
      setBattleWinner('player');
      setBattleState('ended');
      onBattleEnd(true);
    }
  };

  const addToBattleLog = (message: string) => {
    setBattleLog(prev => [...prev, message]);
  };

  const executeMove = async (move: any) => {
    if (!streamRef.current || !isPlayerTurn || battleState !== 'battle') return;

    try {
      setIsPlayerTurn(false);
      
      // Send move choice to battle stream
      const moveChoice = `move ${move.index || move.name}`;
      
      if (streamRef.current.p1 && streamRef.current.p1.write) {
        streamRef.current.p1.write(moveChoice);
      }

    } catch (error) {
      console.error('Error executing move:', error);
      addToBattleLog('Error executing move - using fallback');
      await executeFallbackMove(move);
    }
  };

  const executeFallbackMove = async (playerMove: any) => {
    // Simple fallback battle system
    addToBattleLog(`${playerPokemon.name} used ${playerMove.name}!`);
    
    // Calculate damage (simplified)
    const damage = Math.floor(Math.random() * 50 + 20);
    const newOpponentHP = Math.max(0, currentOpponentHP - damage);
    setCurrentOpponentHP(newOpponentHP);
    
    if (damage > 0) {
      addToBattleLog(`It dealt ${damage} damage!`);
    }

    if (newOpponentHP <= 0) {
      addToBattleLog(`${opponentPokemon.name} fainted!`);
      setBattleWinner('player');
      setBattleState('ended');
      onBattleEnd(true);
      return;
    }

    // Opponent's turn
    setTimeout(() => {
      const opponentMoves = opponentPokemon.moves || [];
      const randomMove = opponentMoves[Math.floor(Math.random() * opponentMoves.length)];
      
      addToBattleLog(`${opponentPokemon.name} used ${randomMove.name}!`);
      
      const opponentDamage = Math.floor(Math.random() * 40 + 15);
      const newPlayerHP = Math.max(0, currentPlayerHP - opponentDamage);
      setCurrentPlayerHP(newPlayerHP);
      
      if (opponentDamage > 0) {
        addToBattleLog(`It dealt ${opponentDamage} damage!`);
      }

      if (newPlayerHP <= 0) {
        addToBattleLog(`${playerPokemon.name} fainted!`);
        setBattleWinner('opponent');
        setBattleState('ended');
        onBattleEnd(false);
      } else {
        setIsPlayerTurn(true);
      }
    }, 1000);
  };

  if (battleState === 'setup') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 to-green-400">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Setting up Pokemon Showdown battle...</h2>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  if (battleState === 'ended') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-400 to-pink-400">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            {battleWinner === 'player' ? 'Victory!' : 'Defeat!'}
          </h2>
          <p className="text-xl text-white mb-8">
            {battleWinner === 'player' 
              ? `${playerPokemon.name} won the battle!`
              : `${opponentPokemon.name} won the battle!`
            }
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-green-400 p-4">
      {/* Battle Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white">Pokemon Showdown Battle</h1>
        <p className="text-white opacity-90">
          {playerPokemon.name} vs {opponentPokemon.name}
        </p>
      </div>

      {/* Pokemon Display */}
      <div className="flex justify-between items-center mb-8">
        {/* Player Pokemon */}
        <div className="text-center">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            {playerPokemon.sprites?.back_default && (
              <img
                src={playerPokemon.sprites.back_default}
                alt={playerPokemon.name}
                className="w-32 h-32 mx-auto"
              />
            )}
            <h3 className="text-lg font-semibold">{playerPokemon.name}</h3>
            <p className="text-sm text-gray-600">Level {playerPokemon.level}</p>
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all duration-300"
                  style={{
                    width: `${(currentPlayerHP / maxPlayerHP) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs mt-1">
                {currentPlayerHP} / {maxPlayerHP} HP
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-white text-2xl font-bold">
          VS
        </div>

        {/* Opponent Pokemon */}
        <div className="text-center">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            {opponentPokemon.sprites?.front_default && (
              <img
                src={opponentPokemon.sprites.front_default}
                alt={opponentPokemon.name}
                className="w-32 h-32 mx-auto"
              />
            )}
            <h3 className="text-lg font-semibold">{opponentPokemon.name}</h3>
            <p className="text-sm text-gray-600">Level {opponentPokemon.level}</p>
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-4">
                <div
                  className="bg-red-500 h-4 rounded-full transition-all duration-300"
                  style={{
                    width: `${(currentOpponentHP / maxOpponentHP) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs mt-1">
                {currentOpponentHP} / {maxOpponentHP} HP
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Log */}
      <div className="bg-white rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
        <h3 className="font-semibold mb-2">Battle Log</h3>
        {battleLog.map((message, index) => (
          <p key={index} className="text-sm mb-1">
            {message}
          </p>
        ))}
      </div>

      {/* Move Selection */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="font-semibold mb-4">
          Choose a move: {!isPlayerTurn && "(Waiting for turn...)"}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {availableMoves.map((move, index) => (
            <button
              key={index}
              onClick={() => executeMove(move)}
              className={`p-4 border rounded-lg transition-colors text-left ${
                isPlayerTurn && battleState === 'battle' 
                  ? 'hover:bg-gray-50 cursor-pointer' 
                  : 'bg-gray-100 cursor-not-allowed'
              }`}
              disabled={!isPlayerTurn || battleState !== 'battle'}
            >
              <div className="font-semibold">{move.name}</div>
              <div className="text-sm text-gray-600">
                PP: {move.pp || 'N/A'} / {move.maxpp || 'N/A'}
              </div>
              {move.disabled && (
                <div className="text-xs text-red-500 mt-1">
                  Move disabled
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Back Button */}
      <div className="text-center mt-6">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Flee Battle
        </button>
      </div>
    </div>
  );
};

export default NativeShowdownBattle; 