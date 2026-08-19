import { createRunPokemon } from '../battle-content.service';
import { ShowdownBattleSession } from '../showdown-battle.service';
import type { BattleDecision, BattleResult } from '../../types/battle-run';

function choiceFor(decision: BattleDecision): string {
  if (decision.kind === 'move') {
    const move = decision.moves.find(option => !option.disabled);
    if (!move) throw new Error('No legal move');
    return `move ${move.slot}`;
  }
  if (decision.kind === 'switch') {
    const choice = decision.switches.find(option => !option.active && !option.fainted);
    if (!choice) throw new Error('No legal switch');
    return `switch ${choice.slot}`;
  }
  return 'default';
}

describe('manual Showdown lockstep simulation', () => {
  it('produces matching inverse results from host and guest perspectives', async () => {
    await new Promise<void>((resolve, reject) => {
      const seed = [1234, 2345, 3456, 4567] as [number, number, number, number];
      const hostDecisions = new Map<number, BattleDecision>();
      const guestDecisions = new Map<number, BattleDecision>();
      const observed = new Set<number>();
      const applied = new Set<number>();
      let hostResult: BattleResult | null = null;
      let guestResult: BattleResult | null = null;
      const watchdog = setTimeout(() => reject(new Error(JSON.stringify({ observed: [...observed], applied: [...applied] }))), 10_000);

      const maybeFinish = () => {
        if (!hostResult || !guestResult) return;
        expect(hostResult.winner === 'tie' ? 'tie' : hostResult.winner).toBe(
          guestResult.winner === 'tie'
            ? 'tie'
            : guestResult.winner === 'player' ? 'opponent' : 'player',
        );
        host.dispose();
        guest.dispose();
        clearTimeout(watchdog);
        resolve();
      };

      const scheduleAdvance = (requestId: number) => {
        observed.add(requestId);
        setTimeout(() => {
          if (applied.has(requestId)) return;
          applied.add(requestId);
          const hostChoice = hostDecisions.has(requestId) ? choiceFor(hostDecisions.get(requestId)!) : 'default';
          const guestChoice = guestDecisions.has(requestId) ? choiceFor(guestDecisions.get(requestId)!) : 'default';
          host.submitSynchronizedChoices(hostChoice, guestChoice);
          guest.submitSynchronizedChoices(hostChoice, guestChoice);
        }, 10);
      };

      const hostParty = [createRunPokemon('Charizard', 5), createRunPokemon('Pikachu', 5)];
      const guestParty = [createRunPokemon('Venusaur', 5), createRunPokemon('Blastoise', 5)];

      const host = new ShowdownBattleSession(hostParty, guestParty, {
        onSnapshot: () => undefined,
        onDecision: decision => {
          if (decision.requestId === undefined) return reject(new Error('Missing host request id'));
          hostDecisions.set(decision.requestId, decision);
          scheduleAdvance(decision.requestId);
        },
        onLog: () => undefined,
        onVisual: () => undefined,
        onEnd: result => { hostResult = result; maybeFinish(); },
        onError: (message, fatal) => { if (fatal) reject(new Error(message)); },
      }, 1, 'medium', { battle: seed, opponentAi: seed }, {
        playerSide: 'p1', opponentMode: 'manual', playerName: 'Host', opponentName: 'Guest', emitPendingDecision: false,
        onOpponentRequest: scheduleAdvance,
      });

      const guest = new ShowdownBattleSession(guestParty, hostParty, {
        onSnapshot: () => undefined,
        onDecision: decision => {
          if (decision.requestId === undefined) return reject(new Error('Missing guest request id'));
          guestDecisions.set(decision.requestId, decision);
          scheduleAdvance(decision.requestId);
        },
        onLog: () => undefined,
        onVisual: () => undefined,
        onEnd: result => { guestResult = result; maybeFinish(); },
        onError: (message, fatal) => { if (fatal) reject(new Error(message)); },
      }, 1, 'medium', { battle: seed, opponentAi: seed }, {
        playerSide: 'p2', opponentMode: 'manual', playerName: 'Guest', opponentName: 'Host', emitPendingDecision: false,
        onOpponentRequest: scheduleAdvance,
      });

      host.start();
      guest.start();
    });
  }, 15_000);
});
