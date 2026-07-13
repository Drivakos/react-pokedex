import { createDraftChoices, createEnemyParty, createRunPokemon } from '../battle-content.service';
import { createSeededRandom, enemyPartySize } from '../../utils/battle-run-rules';

describe('battle content catalog', () => {
  it('creates battle-ready Pokémon without loading the simulator', () => {
    expect(createRunPokemon('Pikachu', 4)).toEqual({
      id: 25,
      species: 'Pikachu',
      level: 11,
      types: ['Electric'],
      ability: 'Static',
      moves: ['Volt Tackle', 'Thunderbolt', 'Iron Tail', 'Play Rough'],
      bst: 320,
    });
  });

  it('keeps seeded drafts repeatable and excludes party members', () => {
    const party = [createRunPokemon('Pikachu', 1)];
    const first = createDraftChoices(3, party, createSeededRandom('catalog-seed'));
    const second = createDraftChoices(3, party, createSeededRandom('catalog-seed'));

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first.map(pokemon => pokemon.species)).not.toContain('Pikachu');
  });

  it('creates the stage-scaled number of opponents', () => {
    const stage = 7;
    const enemies = createEnemyParty(stage, [], createSeededRandom('enemy-seed'));
    expect(enemies).toHaveLength(enemyPartySize(stage));
  });
});
