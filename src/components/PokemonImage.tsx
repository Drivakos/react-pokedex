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
  // Use state only for tracking errors/fallbacks
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorId, setErrorId] = useState<number | null>(null);

  // Derive source based on whether we've encountered an error for this ID
  const imageSrc = React.useMemo(() => {
    const useFallback = pokemonId > 905 || (hasError && errorId === pokemonId);
    return useFallback ? getPokemonImageFallback(pokemonId) : getPokemonImageSource(pokemonId);
  }, [pokemonId, hasError, errorId]);

  const handleImageError = () => {
    if (fallbackToCdn && !hasError && pokemonId <= 905) {
      setHasError(true);
      setErrorId(pokemonId);
    }
  };

  // Reset error state if ID changes to something that might work locally
  React.useEffect(() => {
    if (errorId !== pokemonId) {
      setHasError(false);
      setErrorId(null);
    }
  }, [pokemonId, errorId]);

  return (
    <img
      src={imageSrc}
      alt={alt || `Pokemon #${pokemonId}`}
      onError={handleImageError}
      className={className}
      loading="lazy"
      decoding="async" // Further optimize decoding
      {...imgProps}
    />
  );
};

export default PokemonImage;
