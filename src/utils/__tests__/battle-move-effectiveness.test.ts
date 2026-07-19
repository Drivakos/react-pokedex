import { calculateMoveEffectiveness } from '../battle-move-effectiveness';

describe('battle move effectiveness', () => {
  it('calculates weaknesses and resistances', () => {
    expect(calculateMoveEffectiveness('Fire', 'Special', ['Grass'])).toBe(2);
    expect(calculateMoveEffectiveness('Fire', 'Special', ['Water'])).toBe(0.5);
  });

  it('combines both defending types', () => {
    expect(calculateMoveEffectiveness('Electric', 'Special', ['Water', 'Flying'])).toBe(4);
    expect(calculateMoveEffectiveness('Fire', 'Special', ['Water', 'Dragon'])).toBe(0.25);
  });

  it('reports type immunities', () => {
    expect(calculateMoveEffectiveness('Normal', 'Physical', ['Ghost'])).toBe(0);
    expect(calculateMoveEffectiveness('Ground', 'Physical', ['Flying'])).toBe(0);
  });

  it('does not assign damage multipliers to status moves or missing targets', () => {
    expect(calculateMoveEffectiveness('Electric', 'Status', ['Water'])).toBeNull();
    expect(calculateMoveEffectiveness('Fire', 'Special', [])).toBeNull();
  });
});
