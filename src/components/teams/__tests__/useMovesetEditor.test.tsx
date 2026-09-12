import { act, renderHook, waitFor } from '@testing-library/react';
import type { PremadePokemonBuild } from '../../../services/premade-builds.service';
import type { PokemonBuild, PokemonWithMoves } from '../moveset-editor-model';

const mockFetchPremadeBuilds = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock('../../../services/api', () => ({
  fetchPokemonById: jest.fn().mockResolvedValue({}),
  fetchPokemonMoves: jest.fn().mockResolvedValue([
    {
      move: {
        name: 'flamethrower',
        type: { name: 'fire' },
        power: 90,
        accuracy: 100,
        pp: 15,
        damage_class: { name: 'special' },
        target: { name: 'normal' },
        priority: 0,
      },
    },
    {
      move: {
        name: 'air-slash',
        type: { name: 'flying' },
        power: 75,
        accuracy: 95,
        pp: 15,
        damage_class: { name: 'special' },
        target: { name: 'normal' },
        priority: 0,
      },
    },
  ]),
  fetchPokemonAbilities: jest.fn().mockResolvedValue([
    { ability: { name: 'blaze', effect_entries: [] } },
  ]),
  fetchCompetitiveItems: jest.fn().mockResolvedValue([]),
  fetchMoveDetails: jest.fn(),
}));

jest.mock('../../../services/premade-builds.service', () => ({
  fetchPremadeBuilds: (...args: unknown[]) => mockFetchPremadeBuilds(...args),
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: (...args: unknown[]) => mockToastSuccess(...args),
}));

import { useMovesetEditor } from '../useMovesetEditor';

const pokemon: PokemonWithMoves = {
  id: 6,
  name: 'charizard',
  sprites: { other: { 'official-artwork': { front_default: 'charizard.png' } } },
  types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }],
  moves: [],
};

const initialBuild: PokemonBuild = {
  moves: ['flamethrower'],
  nature: 'modest',
  ability: 'blaze',
  gender: null,
  heldItem: 'Choice Specs',
  nickname: 'Ace',
  isShiny: true,
  teraType: 'Fire',
  evs: {
    hp: 4,
    attack: 252,
    defense: 0,
    'special-attack': 0,
    'special-defense': 0,
    speed: 252,
  },
  ivs: {
    hp: 31,
    attack: 31,
    defense: 31,
    'special-attack': 31,
    'special-defense': 31,
    speed: 31,
  },
};

const buildOptions: PremadePokemonBuild[] = [
  {
    id: 'smogon:gen9ou:special-attacker:0',
    name: 'Special Attacker',
    source: 'smogon',
    format: 'gen9ou',
    ability: 'Blaze',
    item: 'Heavy-Duty Boots',
    nature: 'Timid',
    moves: ['Flamethrower', 'Air Slash'],
    teraType: 'Flying',
    evs: { 'special-attack': 252, 'special-defense': 4, speed: 252 },
    ivs: { attack: 0 },
  },
  {
    id: 'randbats:gen9:charizard:setup',
    name: 'Setup',
    source: 'randbats',
    format: 'gen9randombattle',
    moves: ['Flamethrower'],
  },
];

describe('useMovesetEditor build options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchPremadeBuilds.mockResolvedValue(buildOptions);
  });

  it('loads every build automatically and applies a selected build as a clean starting point', async () => {
    const { result } = renderHook(() => useMovesetEditor({
      pokemon,
      teamId: 1,
      initialBuild,
      onSave: jest.fn(),
    }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.premadeBuildsLoading).toBe(false);
      expect(result.current.premadeBuilds).toHaveLength(2);
    });

    expect(mockFetchPremadeBuilds).toHaveBeenCalledWith('charizard');

    act(() => result.current.handleApplyPremadeBuild(buildOptions[0]));

    expect(result.current.selectedPremadeBuildId).toBe(buildOptions[0].id);
    expect(result.current.selectedMoves).toEqual(['flamethrower', 'air-slash']);
    expect(result.current.pokemonBuild).toEqual(expect.objectContaining({
      nickname: 'Ace',
      isShiny: true,
      ability: 'blaze',
      heldItem: 'Heavy-Duty Boots',
      nature: 'timid',
      teraType: 'Flying',
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        'special-attack': 252,
        'special-defense': 4,
        speed: 252,
      },
      ivs: {
        hp: 31,
        attack: 0,
        defense: 31,
        'special-attack': 31,
        'special-defense': 31,
        speed: 31,
      },
    }));
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Special Attacker applied. You can still customize it before saving.',
    );
  });
});
