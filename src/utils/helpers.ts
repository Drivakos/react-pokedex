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
 * Gets the official artwork URL for a Pokemon
 */
export const getOfficialArtwork = (sprites: any): string => {
  try {
    const parsedSprites = typeof sprites === 'string' 
      ? JSON.parse(sprites) 
      : sprites;
    
    return parsedSprites?.other?.['official-artwork']?.front_default || 
           parsedSprites?.front_default ||
           'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
  } catch {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
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
