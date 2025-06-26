// Mock Pokemon types for testing
export const mockPokemon = {
  id: 1,
  name: 'bulbasaur',
  height: 7,
  weight: 69,
  base_experience: 64,
  types: ['grass', 'poison'],
  moves: ['tackle', 'vine-whip'],
  sprites: {
    front_default: 'https://example.com/sprite.png'
  },
  generation: 'generation-i',
  forms: ['bulbasaur'],
  evolution_chain: ['bulbasaur', 'ivysaur', 'venusaur']
};

export const mockPokemonDetails = {
  ...mockPokemon,
  abilities: ['overgrow', 'chlorophyll'],
  stats: {
    hp: 45,
    attack: 49,
    defense: 49,
    special_attack: 65,
    special_defense: 65,
    speed: 45
  },
  species: {
    flavor_text: 'A strange seed was planted on its back at birth.',
    habitat: 'grassland',
    color: 'green'
  }
};

export const mockFilters = {
  types: [],
  moves: [],
  generation: '',
  weight: { min: 0, max: 0 },
  height: { min: 0, max: 0 },
  hasEvolutions: null
};

export const mockRawPokemonData = {
  id: 1,
  name: 'bulbasaur',
  height: 7,
  weight: 69,
  is_default: true,
  base_experience: 64,
  types: [
    { type: { name: 'grass' } },
    { type: { name: 'poison' } }
  ],
  moves: [
    { move: { name: 'tackle' } },
    { move: { name: 'vine-whip' } }
  ],
  sprites: [
    { data: { front_default: 'https://example.com/sprite.png' } }
  ],
  species: {
    generation: { name: 'generation-i' },
    pokemon_v2_pokemons: [
      {
        pokemon_v2_pokemonforms: [
          { form_name: 'bulbasaur', is_default: true }
        ]
      }
    ],
    pokemon_v2_evolutionchain: {
      pokemon_v2_pokemonspecies: [
        { name: 'bulbasaur' },
        { name: 'ivysaur' },
        { name: 'venusaur' }
      ]
    }
  },
  forms: [
    { form_name: 'bulbasaur', is_default: true }
  ]
}; 