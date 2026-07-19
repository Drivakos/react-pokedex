import { createRunPokemon, developPartyPokemon } from '../battle-content.service';
import { ShowdownBattleSession } from '../showdown-battle.service';
import type { BattleSnapshot } from '../../types/battle-run';

describe('ShowdownBattleSession', () => {
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
});
