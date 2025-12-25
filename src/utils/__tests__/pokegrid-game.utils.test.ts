import { calculateScore, GridCell } from '../pokegrid-game.utils';
import { GridConstraint } from '../../components/pokegrid/types';

describe('PokeGrid Game Utils', () => {
  describe('calculateScore', () => {
    // Mock constraints (not really used for scoring but needed for type matching)
    const mockConstraint: GridConstraint = {
      id: 'test',
      type: 'type',
      value: 'test',
      label: 'Test',
      description: 'Test',
      icon: 'T'
    };

    const createCell = (
      id: string, 
      isCorrect: boolean, 
      attempts: number, 
      rarity: number, 
      possibleSolutions?: number,
      pokemonId: number = 1
    ): GridCell => ({
      id,
      row: 0,
      col: 0,
      pokemon: isCorrect ? { id: pokemonId, name: 'bulbasaur', types: [], sprites: { front_default: '' } } as any : null,
      isCorrect,
      attempts,
      rarity,
      isLocked: isCorrect,
      rowConstraint: mockConstraint,
      colConstraint: mockConstraint,
      possibleSolutions
    });

    it('calculates base score correctly', () => {
      // Base score 200
      // Pool 100 -> < 250 bucket -> +50 bonus
      // Rarity default 1.25
      const cell = createCell('c1', true, 1, 0, 100); 
      const score = calculateScore([cell]);
      
      // (200 + 50) * 1.25 = 312.5 -> round to 313
      expect(score).toBe(313); 
    });

    it('applies pool size bonuses', () => {
      // < 10 solutions => +300 bonus
      const hardCell = createCell('c1', true, 1, 0, 5);
      const hardScore = calculateScore([hardCell]);
      // (200 + 300) * 1.25 = 625
      expect(hardScore).toBe(625);

      // < 30 solutions => +200 bonus
      const medHardCell = createCell('c2', true, 1, 0, 25);
      const medHardScore = calculateScore([medHardCell]);
      // (200 + 200) * 1.25 = 500
      expect(medHardScore).toBe(500);

      // < 100 solutions => +100 bonus
      const medCell = createCell('c3', true, 1, 0, 80);
      const medScore = calculateScore([medCell]);
      // (200 + 100) * 1.25 = 375
      expect(medScore).toBe(375);
    });

    it('applies rarity multipliers', () => {
      const cell = createCell('c1', true, 1, 0, 500); // Fairly common pool, +0 bonus
      
      // Mock popularity data
      const popularityData = [
        { cell_id: 'c1', pokemon_id: 1, popularity_percentage: 0.005 } // 0.5% (Very Rare)
      ];
      
      const score = calculateScore([cell], popularityData);
      
      // (200 + 0) * 2.0 = 400
      expect(score).toBe(400);
    });

    it('applies attempt penalties', () => {
      // 3 attempts = 2 penalty steps * 20 = 40 penalty
      const cell = createCell('c1', true, 3, 0, 500); 
      
      // Default rarity 1.1 for repeated attempts fallback
      // Rarity multiplier logic fallback: Math.max(0.5, 1 - (3 - 1) * 0.1) = 0.8
      
      const score = calculateScore([cell]);
      
      // (200 + 0) * 0.8 - 40 = 160 - 40 = 120
      expect(score).toBe(120);
    });

    it('caps score at 1000', () => {
      // Extreme case: Tiny pool (+300) + Super Rare (x2.0)
      const cell = createCell('c1', true, 1, 0, 5); // +300 bonus
      
      const popularityData = [
        { cell_id: 'c1', pokemon_id: 1, popularity_percentage: 0.001 } // 0.1% rarity
      ];
      
      const score = calculateScore([cell], popularityData);
      
      // Raw: (200 + 300) * 2.0 = 1000
      expect(score).toBe(1000);
    });

    it('handles correct but not yet solved cells', () => {
      const cell = createCell('c1', false, 0, 0); // Not correct
      const score = calculateScore([cell]);
      expect(score).toBe(0);
    });

    it('sums up multiple cells', () => {
      const cell1 = createCell('c1', true, 1, 0, 100); // 313
      const cell2 = createCell('c2', true, 1, 0, 100); // 313
      
      const score = calculateScore([cell1, cell2]);
      expect(score).toBe(626);
    });
  });
});
