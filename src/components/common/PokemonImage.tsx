import React, { memo } from 'react';
import type { PokemonDetails } from '../../types/pokemon';

interface PokemonImageProps {
  pokemon: any;
  alt?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackId?: number;
}

const PokemonImage: React.FC<PokemonImageProps> = ({ pokemon, fallbackId, alt, size = 'md', className = '' }) => {
  // Use a single, reliable sprite source - the regular sprites are the most consistently available
  const id = pokemon?.id || fallbackId || 0;
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-14 w-14',
    lg: 'h-24 w-24',
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center ${className}`}>
      <img
        src={spriteUrl}
        alt={alt || `${pokemon?.name || 'Unknown Pokémon'}`}
        className="object-contain w-full h-full"
        loading="lazy"
        onError={(e) => {
          // If image fails to load, replace with broken image UI
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement?.classList.add('bg-gray-100', 'rounded-md');
          e.currentTarget.insertAdjacentHTML('afterend', 
            '<div class="text-gray-400 text-xs">Image not found</div>');
        }}
      />
    </div>
  );
};

// Simple memoization based on ID
export default memo(PokemonImage, (prevProps, nextProps) => {
  const prevId = prevProps.pokemon?.id || prevProps.fallbackId;
  const nextId = nextProps.pokemon?.id || nextProps.fallbackId;
  return prevId === nextId && prevProps.size === nextProps.size;
});
