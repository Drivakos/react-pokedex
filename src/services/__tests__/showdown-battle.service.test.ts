import { createRunPokemon, developPartyPokemon } from '../battle-content.service';
import { ShowdownBattleSession } from '../showdown-battle.service';
import type { BattleSnapshot } from '../../types/battle-run';

describe('ShowdownBattleSession', () => {
  it('emits the supplied player and opponent trainer names in the scene protocol', async () => {
    let protocol = '';

    await new Promise<void>((resolve, reject) => {
      const session = new ShowdownBattleSession(
        [createRunPokemon('Pikachu', 3)],
        [createRunPokemon('Eevee', 3)],
        {
          onSnapshot: () => undefined,
          onDecision: decision => {
            if (decision.kind === 'wait') return;
            session.dispose();
            resolve();
          },
          onLog: () => undefined,
          onVisual: () => undefined,
          onProtocol: chunk => { protocol += chunk; },
          onEnd: () => resolve(),
          onError: (message, fatal) => { if (fatal) reject(new Error(message)); },
        },
        3,
        'easy',
        undefined,
        { playerName: 'Ash', opponentName: 'Nova' },
      );

      session.start();
    });

    expect(protocol).toContain('|player|p1|Ash|');
    expect(protocol).toContain('|player|p2|Nova|');
  });

  it('starts and resolves a battle with a permanent Mega party member', async () => {
    const venusaur = createRunPokemon('Venusaur', 7);
    const megaParty = developPartyPokemon([venusaur], 0, 'Venusaur-Mega');
    expect(megaParty).not.toBeNull();

    await new Promise<void>((resolve, reject) => {
      let latestSnapshot: BattleSnapshot | null = null;
      const session = new ShowdownBattleSession(
        megaParty ?? [],
        [createRunPokemon('Wooper', 1)],
        {
          onSnapshot: snapshot => { latestSnapshot = snapshot; },
          onDecision: decision => {
            if (decision.kind !== 'move') return;
            const move = decision.moves.find(option => option.power > 0) ?? decision.moves[0];
            session.chooseMove(move.slot);
          },
          onLog: () => undefined,
          onVisual: () => undefined,
          onEnd: result => {
            expect(result.winner).toBe('player');
            expect(latestSnapshot?.player).toMatchObject({
              id: 3,
              species: 'Venusaur-Mega',
              types: ['Grass', 'Poison'],
            });
            resolve();
          },
          onError: reject,
        },
        7,
      );

      session.start();
    });
  });

  it('survives transient client typing gaps during multi-Pokémon faint and switch batches', async () => {
    const abomasnow = createRunPokemon('Abomasnow', 5);
    const megaParty = developPartyPokemon([abomasnow], 0, 'Abomasnow-Mega');
    expect(megaParty).not.toBeNull();

    await new Promise<void>((resolve, reject) => {
      const session = new ShowdownBattleSession(
        [
          createRunPokemon('Wugtrio', 5),
          createRunPokemon('Gothorita', 5),
          createRunPokemon('Gallade', 5),
          createRunPokemon('Glalie', 5),
          createRunPokemon('Squawkabilly', 5),
        ],
        [
          createRunPokemon('Slowking', 5),
          ...(megaParty ?? []),
          createRunPokemon('Garganacl', 5),
        ],
        {
          onSnapshot: () => undefined,
          onDecision: decision => {
            if (decision.kind === 'move') {
              const move = decision.moves
                .filter(option => !option.disabled)
                .sort((left, right) => right.power - left.power)[0];
              if (move) session.chooseMove(move.slot);
            }
            if (decision.kind === 'switch') {
              const choice = decision.switches.find(option => !option.active && !option.fainted);
              if (choice) session.chooseSwitch(choice.slot);
            }
          },
          onLog: () => undefined,
          onVisual: () => undefined,
          onEnd: () => resolve(),
          onError: (message, fatal) => {
            if (fatal) reject(new Error(message));
          },
        },
        5,
        'hard',
      );

      session.start();
    });
  });
});
