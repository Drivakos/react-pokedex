import { Pokemon } from '../types/pokemon';
import { supabase } from '../lib/supabase';

// Pokemon data service to fetch complete Pokemon information
class PokemonService {
  private pokemonCache = new Map<number, Pokemon>();

  async getEnhancedPokemon(pokemonId: number): Promise<Pokemon | null> {
    // Check cache first
    if (this.pokemonCache.has(pokemonId)) {
      return this.pokemonCache.get(pokemonId)!;
    }

    try {
      // Use your existing cached API service
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          url: `pokemon/${pokemonId}`,
          cache_duration: 86400 // 24 hours
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const pokemonData = await response.json();
      
      // Transform the data to include enhanced information
      const enhancedPokemon: Pokemon = {
        id: pokemonData.id,
        name: pokemonData.name,
        height: pokemonData.height,
        weight: pokemonData.weight,
        types: pokemonData.types.map((t: any) => t.type.name),
        moves: pokemonData.moves.map((m: any) => m.move.name),
        sprites: pokemonData.sprites,
        generation: this.getGenerationFromId(pokemonData.id),
        has_evolutions: await this.checkHasEvolutions(pokemonData.id),
        is_default: pokemonData.is_default,
        base_experience: pokemonData.base_experience,
        
        // Enhanced data
        stats: {
          hp: pokemonData.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0,
          attack: pokemonData.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 0,
          defense: pokemonData.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 0,
          'special-attack': pokemonData.stats.find((s: any) => s.stat.name === 'special-attack')?.base_stat || 0,
          'special-defense': pokemonData.stats.find((s: any) => s.stat.name === 'special-defense')?.base_stat || 0,
          speed: pokemonData.stats.find((s: any) => s.stat.name === 'speed')?.base_stat || 0,
        },
        abilities: pokemonData.abilities.map((a: any) => a.ability.name),
        evolution_chain: await this.getEvolutionChain(pokemonData.species.url),
        habitat: await this.getHabitat(pokemonData.species.url),
        is_legendary: await this.checkIsLegendary(pokemonData.species.url),
        is_mythical: await this.checkIsMythical(pokemonData.species.url),
        is_starter: this.checkIsStarter(pokemonData.name),
      };

      // Cache the enhanced Pokemon
      this.pokemonCache.set(pokemonId, enhancedPokemon);
      
      return enhancedPokemon;
    } catch (error) {
      console.error(`Failed to fetch enhanced Pokemon ${pokemonId}:`, error);
      return null;
    }
  }

  private getGenerationFromId(id: number): string {
    if (id <= 151) return 'generation-i';
    if (id <= 251) return 'generation-ii';
    if (id <= 386) return 'generation-iii';
    if (id <= 493) return 'generation-iv';
    if (id <= 649) return 'generation-v';
    if (id <= 721) return 'generation-vi';
    if (id <= 809) return 'generation-vii';
    if (id <= 905) return 'generation-viii';
    return 'generation-ix';
  }

  private async checkHasEvolutions(pokemonId: number): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          url: `pokemon-species/${pokemonId}`,
          cache_duration: 86400
        })
      });

      const speciesData = await response.json();
      const evolutionChainResponse = await fetch(speciesData.evolution_chain.url);
      const evolutionData = await evolutionChainResponse.json();
      
      // Check if this Pokemon has any evolutions
      return this.hasEvolutionsInChain(evolutionData.chain, pokemonId);
    } catch (error) {
      return false;
    }
  }

  private hasEvolutionsInChain(chain: any, pokemonId: number): boolean {
    // Recursive function to check evolution chain
    if (chain.species.url.includes(`/${pokemonId}/`)) {
      return chain.evolves_to.length > 0;
    }
    
    for (const evolution of chain.evolves_to) {
      if (this.hasEvolutionsInChain(evolution, pokemonId)) {
        return true;
      }
    }
    
    return false;
  }

  private async getEvolutionChain(speciesUrl: string): Promise<any> {
    try {
      const speciesResponse = await fetch(speciesUrl);
      const speciesData = await speciesResponse.json();
      const evolutionResponse = await fetch(speciesData.evolution_chain.url);
      const evolutionData = await evolutionResponse.json();
      
      return this.parseEvolutionChain(evolutionData.chain);
    } catch (error) {
      return undefined;
    }
  }

  private parseEvolutionChain(chain: any): any {
    // Parse evolution chain data
    const evolutions = [];
    let current = chain;
    
    while (current) {
      evolutions.push({
        species_name: current.species.name,
        evolution_details: current.evolution_details
      });
      
      current = current.evolves_to[0]; // Take first evolution path
    }
    
    return {
      evolves_from: evolutions.length > 1 ? evolutions[evolutions.length - 2].species_name : undefined,
      evolves_to: evolutions.length > 1 ? evolutions.slice(1).map(e => e.species_name) : [],
      evolution_method: evolutions[1]?.evolution_details[0]?.trigger?.name
    };
  }

  private async getHabitat(speciesUrl: string): Promise<string | undefined> {
    try {
      const response = await fetch(speciesUrl);
      const data = await response.json();
      return data.habitat?.name;
    } catch (error) {
      return undefined;
    }
  }

  private async checkIsLegendary(speciesUrl: string): Promise<boolean> {
    try {
      const response = await fetch(speciesUrl);
      const data = await response.json();
      return data.is_legendary || false;
    } catch (error) {
      return false;
    }
  }

  private async checkIsMythical(speciesUrl: string): Promise<boolean> {
    try {
      const response = await fetch(speciesUrl);
      const data = await response.json();
      return data.is_mythical || false;
    } catch (error) {
      return false;
    }
  }

  private checkIsStarter(name: string): boolean {
    const starters = [
      'bulbasaur', 'charmander', 'squirtle',
      'chikorita', 'cyndaquil', 'totodile',
      'treecko', 'torchic', 'mudkip',
      'turtwig', 'chimchar', 'piplup',
      'snivy', 'tepig', 'oshawott',
      'chespin', 'fennekin', 'froakie',
      'rowlet', 'litten', 'popplio',
      'grookey', 'scorbunny', 'sobble',
      'sprigatito', 'fuecoco', 'quaxly'
    ];
    
    return starters.includes(name.toLowerCase());
  }

  async batchEnhancePokemon(pokemonList: Pokemon[]): Promise<Pokemon[]> {
    const enhanced = await Promise.all(
      pokemonList.map(async (pokemon) => {
        const enhancedPokemon = await this.getEnhancedPokemon(pokemon.id);
        return enhancedPokemon || pokemon; // Fallback to original if enhancement fails
      })
    );
    
    return enhanced;
  }
}

export const pokemonService = new PokemonService();