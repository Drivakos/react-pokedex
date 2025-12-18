import React, { useState, useEffect } from 'react';
import { getPokemonImageSource, getPokemonImageFallback } from '../utils/helpers';

interface PokemonImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  pokemonId: number;
  fallbackToCdn?: boolean;
}

/**
 * PokemonImage component that automatically uses local thumbnails with CDN fallback
 *
 * Features:
 * - For Pokemon IDs ≤ 905: Uses local thumbnail first, falls back to GitHub CDN
 * - For Pokemon IDs > 905: Uses GitHub CDN directly (no local thumbnails available)
 * - Handles Pokemon IDs with proper zero-padding (001, 025, 150, etc.)
 * - Intelligent fallback logic prevents unnecessary failed requests
 *
 * Usage:
 * ```tsx
 * <PokemonImage pokemonId={25} alt="Pikachu" className="w-16 h-16" />
 * <PokemonImage pokemonId={10177} alt="High ID Pokemon" className="w-24 h-24" />
 * <PokemonImage pokemonId={150} fallbackToCdn={false} className="w-24 h-24" />
 * ```
 *
 * For manual control, use the helper functions:
 * ```tsx
 * import { getPokemonImageSource, getPokemonImageFallback } from '../utils/helpers';
 *
 * const localSrc = getPokemonImageSource(25); // "/images/pokemon/thumbnails/025.png"
 * const fallbackSrc = getPokemonImageFallback(25); // GitHub CDN URL
 * ```
 */
const PokemonImage: React.FC<PokemonImageProps> = ({
  pokemonId,
  fallbackToCdn = true,
  alt,
  className,
  ...imgProps
}) => {
  // For Pokemon IDs > 905, we don't have local thumbnails, so start with CDN
  const [imageSrc, setImageSrc] = useState<string>(
    pokemonId > 905 ? getPokemonImageFallback(pokemonId) : getPokemonImageSource(pokemonId)
  );
  const [hasTriedFallback, setHasTriedFallback] = useState<boolean>(pokemonId > 905);

  const handleImageError = () => {
    // For Pokemon IDs <= 905, try CDN fallback if we haven't already
    if (fallbackToCdn && !hasTriedFallback && pokemonId <= 905) {
      setImageSrc(getPokemonImageFallback(pokemonId));
      setHasTriedFallback(true);
    }
  };

  // Reset when pokemonId changes
  useEffect(() => {
    const newImageSrc = pokemonId > 905 ? getPokemonImageFallback(pokemonId) : getPokemonImageSource(pokemonId);
    setImageSrc(newImageSrc);
    setHasTriedFallback(pokemonId > 905);
  }, [pokemonId]);

  return (
    <img
      src={imageSrc}
      alt={alt || `Pokemon #${pokemonId}`}
      onError={handleImageError}
      className={className}
      {...imgProps}
    />
  );
};

export default PokemonImage;
