import type { CSSProperties } from 'react';
import type { BattleVisualEvent } from '../../types/battle-run';
import { getMoveAnimationRecipe } from './move-animation-recipes';

export function MoveBattleEffect({ event }: { event: BattleVisualEvent }) {
  const recipe = getMoveAnimationRecipe(event);
  const direction = event.actor === 'player' ? 'right' : 'left';
  const target = event.target === 'player' || (event.target === undefined && event.actor === 'opponent')
    ? 'player'
    : 'opponent';
  const effectStyle = { '--move-fx-accent': recipe.accent } as CSSProperties;

  return (
    <div
      className={`move-fx move-fx-${recipe.kind} move-fx-${direction} move-fx-target-${target}`}
      style={effectStyle}
      aria-hidden="true"
    >
      <div className="move-fx-glow" />
      {recipe.assets.map((src, index) => (
        <img
          key={`${src}-${index}`}
          src={src}
          alt=""
          className={`move-fx-sprite move-fx-sprite-${index + 1}`}
          draggable={false}
        />
      ))}
      <span className="move-fx-particle move-fx-particle-1" />
      <span className="move-fx-particle move-fx-particle-2" />
      <span className="move-fx-particle move-fx-particle-3" />
    </div>
  );
}
