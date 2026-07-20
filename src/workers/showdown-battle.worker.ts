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
          onError: message => send({ type: 'error', message }),
        }, data.stage);
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
    }
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'The battle simulator stopped unexpectedly.',
    });
  }
};
