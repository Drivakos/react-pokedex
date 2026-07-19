import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BattlePokemonImage } from '../BattlePokemonImage';

jest.mock('@pkmn/img', () => ({
  Sprites: {
    getPokemon: (species: string) => ({ url: `https://play.pokemonshowdown.com/sprites/${species}.gif` }),
  },
}));

describe('BattlePokemonImage', () => {
  it('prefers official artwork for a base Pokémon artwork card', () => {
    render(<BattlePokemonImage id={6} species="Charizard" variant="artwork" />);

    expect(screen.getByAltText('Charizard')).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    );
  });

  it('prefers the form-specific Showdown sprite for Mega artwork', () => {
    render(<BattlePokemonImage id={6} species="Charizard-Mega-X" variant="artwork" />);

    expect(screen.getByAltText('Charizard-Mega-X')).toHaveAttribute(
      'src',
      'https://play.pokemonshowdown.com/sprites/Charizard-Mega-X.gif',
    );
  });
});
