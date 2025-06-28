// Pokemon Showdown Native Implementation
// Clean integration with official @pkmn packages

import { Battle } from '@pkmn/client';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';

// Export the native Showdown components
export { Battle } from '@pkmn/client';
export { Generations } from '@pkmn/data';
export { Dex } from '@pkmn/dex';

// Create the generations instance for battle tracking
export const generations = new Generations(Dex);

// Export a factory function to create new battles
export const createBattle = () => new Battle(generations);

// Re-export for backward compatibility  
export const showdown = {
  Battle,
  Generations,
  Dex,
  generations,
  createBattle
};

// Default export for convenience
export default showdown; 