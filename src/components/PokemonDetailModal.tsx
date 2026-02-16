import React from 'react';
import { Pokemon } from '../types/pokemon';
import { PokemonDetail } from './PokemonDetail';

interface PokemonDetailModalProps {
  pokemon: Pokemon | null;
  onClose: () => void;
}

export const PokemonDetailModal: React.FC<PokemonDetailModalProps> = ({ pokemon, onClose }) => {
  if (!pokemon) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <PokemonDetail
        pokemon={pokemon}
        onClose={onClose}
      />
    </div>
  );
};
