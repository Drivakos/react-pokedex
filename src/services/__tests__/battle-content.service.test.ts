import { createDraftChoices, createEnemyParty, createRerolledDraftChoices, createRoutePreviews, createRunPokemon } from '../battle-content.service';
import { RUN_ROUTES, createSeededRandom, enemyPartySize } from '../../utils/battle-run-rules';

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

  it('supports expanded recruitment drafts from run upgrades', () => {
    const choices = createDraftChoices(3, [], createSeededRandom('expanded-draft'), false, 4);
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map(pokemon => pokemon.species)).size).toBe(4);
  });

  it('rerolls recruitment without repeating the party or discarded board', () => {
    const party = [createRunPokemon('Pikachu', 1)];
    const current = createDraftChoices(3, party, createSeededRandom('current-board'));
    const rerolled = createRerolledDraftChoices(3, party, current, createSeededRandom('new-board'));
    const excluded = new Set([...party, ...current].map(pokemon => pokemon.species));

    expect(rerolled).toHaveLength(3);
    expect(rerolled.every(pokemon => !excluded.has(pokemon.species))).toBe(true);
  });

  it('creates the stage-scaled number of opponents', () => {
    const stage = 7;
    const enemies = createEnemyParty(stage, [], createSeededRandom('enemy-seed'));
    expect(enemies).toHaveLength(enemyPartySize(stage));
  });

  it('applies the selected route to opponent levels and roster size', () => {
    const apex = RUN_ROUTES.find(route => route.id === 'apex');
    expect(apex).toBeDefined();
    const enemies = createEnemyParty(1, [], createSeededRandom('apex-seed'), apex);
    expect(enemies).toHaveLength(2);
    expect(enemies.every(pokemon => pokemon.level === 9)).toBe(true);
  });

  it('prepares deterministic, route-specific rosters for scouting', () => {
    const first = createRoutePreviews(1, [], createSeededRandom('route-scouting'));
    const second = createRoutePreviews(1, [], createSeededRandom('route-scouting'));

    expect(first).toEqual(second);
    expect(first.trail).toHaveLength(1);
    expect(first.rival).toHaveLength(1);
    expect(first.apex).toHaveLength(2);
    expect(first.trail.every(pokemon => pokemon.level === 5)).toBe(true);
    expect(first.rival.every(pokemon => pokemon.level === 7)).toBe(true);
    expect(first.apex.every(pokemon => pokemon.level === 9)).toBe(true);
  });

  it('equips checkpoint rosters with their boss mechanic item', () => {
    const stageFive = createEnemyParty(5, [], createSeededRandom('first-boss'));
    const stageTen = createEnemyParty(10, [], createSeededRandom('second-boss'));

    expect(stageFive.every(pokemon => pokemon.item === 'Sitrus Berry')).toBe(true);
    expect(stageTen.every(pokemon => pokemon.item === 'Life Orb')).toBe(true);
  });
});
