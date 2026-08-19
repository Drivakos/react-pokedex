import { ShowdownBattleSession } from '../services/showdown-battle.service';
import type { BattleWorkerEvent, BattleWorkerRequest } from '../types/battle-worker';

const workerScope = self;
let session: ShowdownBattleSession | null = null;

function send(event: BattleWorkerEvent): void {
  workerScope.postMessage(event);
}

workerScope.onmessage = ({ data }: MessageEvent<BattleWorkerRequest>) => {
  try {
    switch (data.type) {
      case 'init':
        session = new ShowdownBattleSession(data.playerParty, data.opponentParty, {
          onSnapshot: snapshot => send({ type: 'snapshot', snapshot }),
          onDecision: decision => send({ type: 'decision', decision }),
          onLog: message => send({ type: 'log', message }),
          onVisual: event => send({ type: 'visual', event }),
          onProtocol: chunk => send({ type: 'protocol', chunk }),
          onEnd: result => send({ type: 'end', result }),
          onError: (message, fatal) => send({ type: 'error', message, fatal }),
        }, data.stage, data.difficulty);
        send({ type: 'ready' });
        break;
      case 'init-vs':
        session = new ShowdownBattleSession(data.playerParty, data.opponentParty, {
          onSnapshot: snapshot => send({ type: 'snapshot', snapshot }),
          onDecision: decision => send({ type: 'decision', decision }),
          onLog: message => send({ type: 'log', message }),
          onVisual: event => send({ type: 'visual', event }),
          onProtocol: chunk => send({ type: 'protocol', chunk }),
          onEnd: result => send({ type: 'end', result }),
          onError: (message, fatal) => send({ type: 'error', message, fatal }),
        }, 1, 'medium', {
          battle: data.battleSeed,
          opponentAi: data.battleSeed,
        }, {
          playerSide: data.isHost ? 'p1' : 'p2',
          opponentMode: 'manual',
          playerName: data.playerName,
          opponentName: data.opponentName,
          emitPendingDecision: false,
          onOpponentRequest: requestId => send({ type: 'opponent-request', requestId }),
        });
        send({ type: 'ready' });
        break;
      case 'start':
        session?.start();
        break;
      case 'choose-move':
        session?.chooseMove(data.slot);
        break;
      case 'choose-switch':
        session?.chooseSwitch(data.slot);
        break;
      case 'synchronized-choices':
        session?.submitSynchronizedChoices(data.hostChoice, data.guestChoice);
        break;
    }
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'The battle simulator stopped unexpectedly.',
      fatal: true,
    });
  }
};
