/**
 * Formats Pokemon name for display
 */
export const formatName = (name: string): string => {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formats move names for display
 */
export const formatMoveName = (move: string): string => {
  return move
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Gets the thumbnail URL for a Pokemon by ID
 */
export const getThumbnailUrl = (pokemonId: number): string => {
  const paddedId = String(pokemonId).padStart(3, '0');
  return `/images/pokemon/thumbnails/${paddedId}.png`;
};

/**
 * Gets the Pokemon image URL, prioritizing local thumbnails with API fallback
 */
export const getPokemonImage = (pokemonId: number, sprites?: any): string => {
  // First try local thumbnail
  try {
    return getThumbnailUrl(pokemonId);
  } catch {
    // Fallback to API sprites
    return getOfficialArtwork(sprites);
  }
};

/**
 * Gets the official artwork URL for a Pokemon
 */
export const getOfficialArtwork = (sprites: any): string => {
  try {
    const parsedSprites = typeof sprites === 'string'
      ? JSON.parse(sprites)
      : sprites;

    return parsedSprites?.other?.['official-artwork']?.front_default ||
           parsedSprites?.front_default ||
           '/images/pokemon/thumbnails/000.png';
  } catch {
    return '/images/pokemon/thumbnails/000.png';
  }
};

/**
 * Formats Pokemon ID as a 3-digit string (e.g., #001)
 */
export const formatPokemonId = (id: number): string => {
  return `#${String(id).padStart(3, '0')}`;
};

/**
 * Formats weight from hectograms to kg
 */
export const formatWeight = (weightInHectograms: number): string => {
  const kg = weightInHectograms / 10;
  return `${kg.toFixed(1)} kg`;
};

/**
 * Formats height from decimeters to meters
 */
export const formatHeight = (heightInDecimeters: number): string => {
  const meters = heightInDecimeters / 10;
  return `${meters.toFixed(1)} m`;
};

/**
 * Gets unique array elements
 */
export const getUniqueItems = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

/**
 * Debounces a function
 */
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

/**
 * Get the appropriate Pokemon image source
 * Uses local thumbnails if available, falls back to GitHub CDN
 */
export const getPokemonImageSource = (pokemonId: number): string => {
  return `/images/pokemon/thumbnails/${String(pokemonId).padStart(3, '0')}.png`;
};

/**
 * Get the fallback Pokemon image source from the CDN proxy (which fetches from GitHub)
 */
export const getPokemonImageFallback = (pokemonId: number): string => {
  return `/api/pokemon/images/${pokemonId}`;
};

/**
 * Get the TCG card image URL from Google Storage
 */
export const getTcgCardImage = (cardId: string): string => {
  return `https://storage.googleapis.com/pokehelper/tcg-cards-webp/${cardId}.webp`;
};

/**
 * Check if a local Pokemon image exists by attempting to load it
 * This is an async function that resolves to true if the image loads successfully
 */
export const checkPokemonImageExists = (pokemonId: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    const localSrc = getPokemonImageSource(pokemonId);

    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = localSrc;

    // Timeout after 5 seconds to avoid hanging
    setTimeout(() => resolve(false), 5000);
  });
};
