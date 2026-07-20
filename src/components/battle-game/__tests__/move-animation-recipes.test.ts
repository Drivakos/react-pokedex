import type { BattleVisualEvent } from '../../../types/battle-run';
import { getMoveAnimationRecipe } from '../move-animation-recipes';

const event = (label: string, moveType: string, moveCategory: BattleVisualEvent['moveCategory'] = 'Special'): BattleVisualEvent => ({
  id: 1,
  kind: 'move',
  actor: 'player',
  target: 'opponent',
  label,
  moveType,
  moveCategory,
  snapshot: {
    turn: 1,
    player: null,
    opponent: null,
    playerRemaining: 1,
    opponentRemaining: 1,
  },
});

describe('move animation recipes', () => {
  it('uses exact recipes for distinctive moves', () => {
    expect(getMoveAnimationRecipe(event('Hyper Voice', 'Normal')).kind).toBe('sound');
    expect(getMoveAnimationRecipe(event('Wild Charge', 'Electric', 'Physical'))).toMatchObject({
      kind: 'lightning',
      assets: expect.arrayContaining([
        '/images/battle-fx/electroball.png',
        '/images/battle-fx/lightning.png',
      ]),
    });
  });

  it('prefers move-name families before type fallbacks', () => {
    expect(getMoveAnimationRecipe(event('Fire Punch', 'Fire', 'Physical'))).toMatchObject({
      kind: 'impact',
      assets: ['/images/battle-fx/fist.png'],
    });
  });

  it('falls back to a matching elemental projectile', () => {
    expect(getMoveAnimationRecipe(event('Tera Blast', 'Grass'))).toMatchObject({
      kind: 'projectile',
      assets: ['/images/battle-fx/energyball.png'],
    });
  });

  it('matches blades and claws to the dedicated sprites', () => {
    expect(getMoveAnimationRecipe(event('Psycho Cut', 'Psychic', 'Physical'))).toMatchObject({
      kind: 'slash',
      assets: ['/images/battle-fx/sword.png'],
    });
    expect(getMoveAnimationRecipe(event('Dragon Claw', 'Dragon', 'Physical'))).toMatchObject({
      kind: 'slash',
      assets: ['/images/battle-fx/leftclaw.png', '/images/battle-fx/rightclaw.png'],
    });
  });

  it('routes sound-based Bug moves to sound, not the Bug blade fallback', () => {
    // Regression: "Bug Buzz" must not pick up the sword sprite via the Bug type.
    expect(getMoveAnimationRecipe(event('Bug Buzz', 'Bug')).kind).toBe('sound');
    expect(getMoveAnimationRecipe(event('Steel Wing', 'Steel', 'Physical')).assets)
      .toContain('/images/battle-fx/feather.png');
  });
});
