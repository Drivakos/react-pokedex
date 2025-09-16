// Pokemon type colors extracted from the official Pokemon type icons CSS
// Source: pokemon-type-svg-icons-1.0.0/style.css

export const POKEMON_TYPE_COLORS = {
  bug: '#92BC2C',
  dark: '#595761', 
  dragon: '#0C69C8',
  electric: '#F2D94E',
  fire: '#FBA54C',
  fairy: '#EE90E6',
  fighting: '#D3425F',
  flying: '#A1BBEC',
  ghost: '#5F6DBC',
  grass: '#5FBD58',
  ground: '#DA7C4D',
  ice: '#75D0C1',
  normal: '#A0A29F',
  poison: '#B763CF',
  psychic: '#FA8581',
  rock: '#C9BB8A',
  steel: '#5695A3',
  water: '#539DDF',
} as const;

export type PokemonType = keyof typeof POKEMON_TYPE_COLORS;

// Utility function to get type color
export const getTypeColor = (type: string): string => {
  const normalizedType = type.toLowerCase() as PokemonType;
  return POKEMON_TYPE_COLORS[normalizedType] || '#A0A29F'; // Default to normal type color
};

// Utility function to get type color with opacity
export const getTypeColorWithOpacity = (type: string, opacity: number = 1): string => {
  const color = getTypeColor(type);
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Generate CSS class for type background
export const getTypeBackgroundClass = (type: string): string => {
  return `bg-[${getTypeColor(type)}]`;
};

// Generate inline style for type background
export const getTypeBackgroundStyle = (type: string, opacity: number = 1): React.CSSProperties => {
  return {
    backgroundColor: getTypeColorWithOpacity(type, opacity),
    boxShadow: `0 0 20px ${getTypeColorWithOpacity(type, 0.3)}`,
  };
};
