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
      '/ps/sprites/Charizard-Mega-X.gif',
    );
  });

  it('routes Mega sprites through the same-origin proxy allowed by the CSP', () => {
    render(<BattlePokemonImage id={362} species="Glalie-Mega" variant="icon" />);

    expect(screen.getByAltText('Glalie-Mega')).toHaveAttribute(
      'src',
      '/ps/sprites/Glalie-Mega.gif',
    );
  });
});
