import type { BattleWorkerEvent } from '../types/battle-worker';

type VisualWorkerEvent = Extract<BattleWorkerEvent, { type: 'visual' }>;

function combinedTone(events: VisualWorkerEvent[]): 'positive' | 'negative' | 'neutral' {
  if (events.some(({ event }) => event.tone === 'positive')) return 'positive';
  if (events.some(({ event }) => event.tone === 'negative')) return 'negative';
  return 'neutral';
}

export function compactBattleWorkerEvents(events: BattleWorkerEvent[]): BattleWorkerEvent[] {
  const compacted: BattleWorkerEvent[] = [];
  let pendingImpactLabels: VisualWorkerEvent[] = [];

  const flushPendingLabels = () => {
    compacted.push(...pendingImpactLabels);
    pendingImpactLabels = [];
  };

  for (const workerEvent of events) {
    if (
      workerEvent.type === 'visual'
      && workerEvent.event.kind === 'effectiveness'
      && workerEvent.event.label !== 'No effect'
    ) {
      pendingImpactLabels.push(workerEvent);
      continue;
    }

    if (workerEvent.type === 'visual' && workerEvent.event.kind === 'damage' && pendingImpactLabels.length > 0) {
      const labels = pendingImpactLabels
        .map(({ event }) => event.label)
        .filter((label): label is string => Boolean(label));
      compacted.push({
        type: 'visual',
        event: {
          ...workerEvent.event,
          label: labels.join(' · '),
          tone: combinedTone(pendingImpactLabels),
        },
      });
      pendingImpactLabels = [];
      continue;
    }

    if (workerEvent.type === 'visual' || workerEvent.type === 'decision' || workerEvent.type === 'end' || workerEvent.type === 'error') {
      flushPendingLabels();
    }
    compacted.push(workerEvent);
  }

  flushPendingLabels();
  return compacted;
}
