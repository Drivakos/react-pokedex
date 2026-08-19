import type { PokemonSet } from '@pkmn/data';
import type { DeepPartial } from '@pkmn/smogon';
import { mapRandbatsRoles, mapSmogonSets, materializeAutomaticBuild } from '../premade-builds.service';

describe('premade build mapping', () => {
  it('maps a Smogon set into editor-friendly fields', () => {
    const sets: DeepPartial<PokemonSet<string>>[] = [{
      name: 'Offensive Utility',
      item: 'Heavy-Duty Boots',
      nature: 'Jolly',
      moves: ['Headlong Rush', 'Rapid Spin', 'Knock Off', 'Ice Spinner'],
      teraType: 'Steel',
      evs: { atk: 252, spd: 4, spe: 252 },
    }];

    expect(mapSmogonSets('Great Tusk', 'gen9ou', sets)).toEqual([expect.objectContaining({
      name: 'Offensive Utility',
      source: 'smogon',
      format: 'gen9ou',
      item: 'Heavy-Duty Boots',
      moves: ['Headlong Rush', 'Rapid Spin', 'Knock Off', 'Ice Spinner'],
      evs: { attack: 252, 'special-defense': 4, speed: 252 },
    })]);
  });

  it('uses a Random Battle role when curated sets are unavailable', () => {
    const builds = mapRandbatsRoles('Charizard', {
      abilities: ['Blaze'],
      items: ['Heavy-Duty Boots'],
      roles: {
        'Setup Sweeper': {
          moves: ['Dragon Dance', 'Flare Blitz', 'Earthquake', 'Roost'],
          teraTypes: ['Dragon'],
        },
      },
    });

    expect(builds).toEqual([expect.objectContaining({
      name: 'Setup Sweeper',
      source: 'randbats',
      ability: 'Blaze',
      item: 'Heavy-Duty Boots',
      teraType: 'Dragon',
    })]);
  });

  it('turns a partial preset into a complete editor build', () => {
    const build = materializeAutomaticBuild(
      {
        id: 6,
        name: 'charizard',
        types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }],
        stats: [
          { base_stat: 84, stat: { name: 'attack' } },
          { base_stat: 109, stat: { name: 'special-attack' } },
          { base_stat: 100, stat: { name: 'speed' } },
        ],
      },
      {
        id: 'randbats:gen9:charizard:fastattacker',
        name: 'Fast Attacker',
        source: 'randbats',
        format: 'gen9randombattle',
        ability: 'Blaze',
        item: 'Heavy-Duty Boots',
        moves: ['Flamethrower', 'Hurricane'],
        teraType: 'Fire',
      },
      [
        { move: { name: 'flamethrower', power: 90, accuracy: 100, type: { name: 'fire' }, damage_class: { name: 'special' } } },
        { move: { name: 'hurricane', power: 110, accuracy: 70, type: { name: 'flying' }, damage_class: { name: 'special' } } },
        { move: { name: 'focus-blast', power: 120, accuracy: 70, type: { name: 'fighting' }, damage_class: { name: 'special' } } },
        { move: { name: 'dragon-pulse', power: 85, accuracy: 100, type: { name: 'dragon' }, damage_class: { name: 'special' } } },
      ],
      ['blaze', 'solar-power'],
    );

    expect(build).toEqual(expect.objectContaining({
      moves: ['flamethrower', 'hurricane', 'dragon-pulse', 'focus-blast'],
      ability: 'blaze',
      item: 'Heavy-Duty Boots',
      nature: 'timid',
      tera_type: 'Fire',
      level: 50,
      evs: { hp: 6, attack: 0, defense: 0, 'special-attack': 252, 'special-defense': 0, speed: 252 },
      ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
    }));
  });
});
