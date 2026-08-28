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
  it('reports Fly continuation as a forced wait while normal single moves stay selectable', async () => {
    await new Promise<void>((resolve, reject) => {
      const seed = [1111, 2222, 3333, 4444] as [number, number, number, number];
      const hostDecisions = new Map<number, BattleDecision>();
      const guestDecisions = new Map<number, BattleDecision>();
      const applied = new Set<number>();
      const watchdog = setTimeout(() => reject(new Error('Timed out waiting for Fly continuation')), 5_000);
      const sessions = {} as { host: ShowdownBattleSession; guest: ShowdownBattleSession };

      const finish = () => {
        sessions.host.dispose();
        sessions.guest.dispose();
        clearTimeout(watchdog);
        resolve();
      };

      const maybeAdvance = (requestId: number) => {
        const hostDecision = hostDecisions.get(requestId);
        const guestDecision = guestDecisions.get(requestId);
        if (!hostDecision || !guestDecision || applied.has(requestId)) return;

        if (requestId === 2) {
          expect(hostDecision).toMatchObject({ kind: 'wait', moves: [] });
          expect(guestDecision.kind).toBe('move');
          finish();
          return;
        }

        applied.add(requestId);
        const fly = hostDecision.moves.find(move => move.name === 'Fly');
        const guestMove = guestDecision.moves.find(move => !move.disabled);
        if (!fly || !guestMove) {
          reject(new Error('Expected selectable opening moves'));
          return;
        }
        sessions.host.submitSynchronizedChoices(`move ${fly.slot}`, `move ${guestMove.slot}`);
        sessions.guest.submitSynchronizedChoices(`move ${fly.slot}`, `move ${guestMove.slot}`);
      };

      const hostParty = [{
        ...createRunPokemon('Charizard', 5),
        item: undefined,
        moves: ['Fly', 'Splash'],
      }];
      const guestParty = [{
        ...createRunPokemon('Blissey', 5),
        item: undefined,
        moves: ['Splash'],
      }];

      sessions.host = new ShowdownBattleSession(hostParty, guestParty, {
        onSnapshot: () => undefined,
        onDecision: decision => {
          if (decision.requestId === undefined) return reject(new Error('Missing host request id'));
          hostDecisions.set(decision.requestId, decision);
          maybeAdvance(decision.requestId);
        },
        onLog: () => undefined,
        onVisual: () => undefined,
        onEnd: () => reject(new Error('Battle ended before Fly continuation')),
        onError: (message, fatal) => { if (fatal) reject(new Error(message)); },
      }, 1, 'medium', { battle: seed, opponentAi: seed }, {
        playerSide: 'p1', opponentMode: 'manual', playerName: 'Host', opponentName: 'Guest', emitPendingDecision: false,
      });

      sessions.guest = new ShowdownBattleSession(guestParty, hostParty, {
        onSnapshot: () => undefined,
        onDecision: decision => {
          if (decision.requestId === undefined) return reject(new Error('Missing guest request id'));
          guestDecisions.set(decision.requestId, decision);
          maybeAdvance(decision.requestId);
        },
        onLog: () => undefined,
        onVisual: () => undefined,
        onEnd: () => reject(new Error('Battle ended before Fly continuation')),
        onError: (message, fatal) => { if (fatal) reject(new Error(message)); },
      }, 1, 'medium', { battle: seed, opponentAi: seed }, {
        playerSide: 'p2', opponentMode: 'manual', playerName: 'Guest', opponentName: 'Host', emitPendingDecision: false,
      });

      sessions.host.start();
      sessions.guest.start();
    });
  }, 10_000);

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
