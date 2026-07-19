import type { OpponentTrainer } from '../../types/battle-run';

const profiles: OpponentTrainer[] = [
  { id: 'nova', name: 'Nova', title: 'Ace Trainer', intro: 'Let’s see how far your team can really go.', image: '/images/trainers/ace-f.png', credit: 'Kasen' },
  { id: 'kai', name: 'Kai', title: 'Trail Ranger', intro: 'Every wild trail teaches a new battle trick.', image: '/images/trainers/scout-m.png', credit: 'ShinyDragonHunter' },
  { id: 'mira', name: 'Mira', title: 'Psychic', intro: 'The next move is already written in the stars.', image: '/images/trainers/psychic-f.png', credit: 'ryuujiryu' },
  { id: 'prof-volt', name: 'Dr. Volt', title: 'Battle Researcher', intro: 'Excellent. Your team will make fascinating data.', image: '/images/trainers/psychic-m.png', credit: 'ryuujiryu' },
  { id: 'orion', name: 'Orion', title: 'League Veteran', intro: 'Strength is earned one difficult battle at a time.', image: '/images/trainers/ace-m.png', credit: 'Kasen' },
  { id: 'rex', name: 'Rex', title: 'Street Battler', intro: 'No warm-up. Show me your strongest move!', image: '/images/trainers/hooligan.png', credit: 'Gygablastre and Ringloom' },
  { id: 'ivy', name: 'Ivy', title: 'Pokémon Ranger', intro: 'A good team protects each other. Does yours?', image: '/images/trainers/scout-f.png', credit: 'ShinyDragonHunter' },
  { id: 'tessa', name: 'Tessa', title: 'Mystic', intro: 'A small advantage is all I need.', image: '/images/trainers/medium.png', credit: 'Gygablastre and Ringloom' },
];

export function pickOpponentTrainer(stage: number, random: () => number): OpponentTrainer {
  const index = Math.floor(random() * profiles.length) % profiles.length;
  const profile = profiles[index];
  const rank = stage >= 15
    ? 'Run Champion'
    : stage === 10
      ? 'Elite Gatekeeper'
      : stage === 5
        ? 'Gatekeeper'
        : stage >= 13
          ? 'Master'
          : stage >= 9
            ? 'Elite'
            : stage >= 5
              ? 'Veteran'
              : profile.title;
  return { ...profile, title: rank };
}
