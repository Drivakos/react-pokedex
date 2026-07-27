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
      item: 'Heavy-Duty Boots',
      buildName: 'Signature',
      nature: 'Naive',
      evs: { hp: 2, atk: 128, def: 0, spa: 128, spd: 0, spe: 252 },
      bst: 320,
    });
  });

  it('offers distinct coherent builds with matching held items for one species', () => {
    const signature = createRunPokemon('Pikachu', 4, () => 0);
    const physicalBreaker = createRunPokemon('Pikachu', 4, () => 0.4);

    expect(signature).toMatchObject({
      buildName: 'Signature',
      item: 'Heavy-Duty Boots',
      moves: ['Volt Tackle', 'Surf', 'Volt Switch', 'Thunder Wave'],
    });
    expect(physicalBreaker).toMatchObject({
      buildName: 'Physical breaker',
      item: 'Choice Band',
      nature: 'Jolly',
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ['Volt Tackle', 'Play Rough', 'Knock Off', 'Brick Break'],
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
    const soloParty = [createRunPokemon('Pikachu', 1)];
    const duoParty = [...soloParty, createRunPokemon('Bulbasaur', 1)];
    const developedParty = [
      ...duoParty,
      createRunPokemon('Squirtle', 4),
      createRunPokemon('Charmander', 4),
    ];
    const soloEnemies = createEnemyParty(1, soloParty, createSeededRandom('apex-seed'), apex);
    const duoEnemies = createEnemyParty(1, duoParty, createSeededRandom('apex-seed'), apex);
    const developedEnemies = createEnemyParty(
      4,
      developedParty,
      createSeededRandom('apex-seed'),
      apex,
    );
    expect(soloEnemies).toHaveLength(1);
    expect(duoEnemies).toHaveLength(1);
    expect(developedEnemies).toHaveLength(2);
    expect(soloEnemies.every(pokemon => pokemon.level === 5)).toBe(true);
  });

  it('prepares deterministic, route-specific rosters for scouting', () => {
    const first = createRoutePreviews(1, [], createSeededRandom('route-scouting'));
    const second = createRoutePreviews(1, [], createSeededRandom('route-scouting'));

    expect(first).toEqual(second);
    expect(first.trail).toHaveLength(1);
    expect(first.rival).toHaveLength(1);
    expect(first.apex).toHaveLength(1);
    expect(first.trail.every(pokemon => pokemon.level === 3)).toBe(true);
    expect(first.rival.every(pokemon => pokemon.level === 5)).toBe(true);
    expect(first.apex.every(pokemon => pokemon.level === 5)).toBe(true);
    const sampledBst = Array.from({ length: 50 }, (_, index) => (
      createRoutePreviews(1, [], createSeededRandom(`route-strength-${index}`))
    )).reduce((totals, preview) => ({
      trail: totals.trail + Math.max(...preview.trail.map(pokemon => pokemon.bst)),
      apex: totals.apex + Math.max(...preview.apex.map(pokemon => pokemon.bst)),
    }), { trail: 0, apex: 0 });
    expect(sampledBst.trail).toBeLessThan(sampledBst.apex);
  });

  it('equips checkpoint rosters with their boss mechanic item', () => {
    const stageFive = createEnemyParty(5, [], createSeededRandom('first-boss'));
    const stageTen = createEnemyParty(10, [], createSeededRandom('second-boss'));

    expect(stageFive.every(pokemon => pokemon.item === 'Sitrus Berry')).toBe(true);
    expect(stageTen.every(pokemon => pokemon.item === 'Life Orb')).toBe(true);
    expect(stageFive.every(pokemon => pokemon.level === 17)).toBe(true);
  });

  it('uses one fixed tough roster for every checkpoint route', () => {
    const previews = createRoutePreviews(5, [], createSeededRandom('fixed-boss'));
    expect(previews.trail).toEqual(previews.rival);
    expect(previews.rival).toEqual(previews.apex);
  });

  it('has a one-percent roll that can turn an eligible encounter into a Mega', () => {
    const choices = createDraftChoices(15, [], () => 0, false, 1);
    expect(choices[0]).toMatchObject({ isMega: true, baseSpecies: 'Venusaur' });
  });
});
