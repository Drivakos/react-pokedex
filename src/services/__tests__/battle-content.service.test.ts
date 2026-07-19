import {
  createDraftChoices,
  createEnemyParty,
  createRerolledDraftChoices,
  createRoutePreviews,
  createRunPokemon,
  developPartyPokemon,
  getPartyDevelopmentChoices,
  getPokemonDevelopmentOptions,
} from '../battle-content.service';
import { RUN_ROUTES, createSeededRandom, enemyPartySize, getRecruitmentRewardProfile } from '../../utils/battle-run-rules';

describe('battle content catalog', () => {
  it('creates battle-ready Pokémon without loading the simulator', () => {
    expect(createRunPokemon('Pikachu', 4)).toEqual({
      id: 25,
      species: 'Pikachu',
      level: 11,
      types: ['Electric'],
      ability: 'Static',
      moves: ['Volt Tackle', 'Surf', 'Volt Switch', 'Thunder Wave'],
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

  it('offers one-stage and branching evolutions at the current level', () => {
    const bulbasaur = createRunPokemon('Bulbasaur', 4);
    const eevee = createRunPokemon('Eevee', 4);

    expect(getPokemonDevelopmentOptions(bulbasaur)).toEqual([
      expect.objectContaining({
        kind: 'evolution',
        pokemon: expect.objectContaining({ species: 'Ivysaur', level: bulbasaur.level }),
      }),
    ]);
    expect(getPokemonDevelopmentOptions(eevee).map(option => option.pokemon.species)).toEqual([
      'Vaporeon', 'Jolteon', 'Flareon', 'Espeon', 'Umbreon', 'Leafeon', 'Glaceon', 'Sylveon',
    ]);
  });

  it('offers Mega forms to fully evolved Pokémon and limits the party to one Mega', () => {
    const venusaur = createRunPokemon('Venusaur', 6);
    const charizard = createRunPokemon('Charizard', 6);
    const charizardMegas = getPokemonDevelopmentOptions(charizard);

    expect(charizardMegas.map(option => option.pokemon.species)).toEqual([
      'Charizard-Mega-X', 'Charizard-Mega-Y',
    ]);
    expect(charizardMegas.every(option => option.kind === 'mega' && option.pokemon.isMega)).toBe(true);

    const developed = developPartyPokemon([venusaur, charizard], 0, 'Venusaur-Mega');
    expect(developed?.[0]).toMatchObject({
      species: 'Venusaur-Mega',
      baseSpecies: 'Venusaur',
      level: venusaur.level,
      isMega: true,
      bst: 625,
    });
    expect(getPartyDevelopmentChoices(developed ?? []).flatMap(choice => choice.options))
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'mega' })]));
  });

  it('keeps a Mega Pokémon and its base species out of future recruitment drafts', () => {
    const venusaur = createRunPokemon('Venusaur', 6);
    const party = developPartyPokemon([venusaur], 0, 'Venusaur-Mega');
    expect(party).not.toBeNull();

    const choices = createDraftChoices(
      6,
      party ?? [],
      createSeededRandom('mega-exclusions'),
      false,
      1025,
    );
    const species = choices.map(pokemon => pokemon.species);

    expect(species).not.toContain('Venusaur');
    expect(species).not.toContain('Venusaur-Mega');
  });

  it('rejects development targets that are not available to that party member', () => {
    const party = [createRunPokemon('Bulbasaur', 2)];
    expect(developPartyPokemon(party, 0, 'Venusaur')).toBeNull();
    expect(developPartyPokemon(party, 4, 'Ivysaur')).toBeNull();
  });

  it('supports expanded recruitment drafts from run upgrades', () => {
    const choices = createDraftChoices(3, [], createSeededRandom('expanded-draft'), false, 4);
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map(pokemon => pokemon.species)).size).toBe(4);
  });

  it('materializes Apex spoils as a larger, higher-level recruitment board', () => {
    const apex = RUN_ROUTES.find(route => route.id === 'apex') ?? null;
    const reward = getRecruitmentRewardProfile(4, apex);
    const choices = createDraftChoices(
      reward.stage,
      [],
      createSeededRandom('apex-reward'),
      false,
      reward.choiceCount,
    );

    expect(choices).toHaveLength(4);
    expect(choices.every(pokemon => pokemon.level === 15)).toBe(true);
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
