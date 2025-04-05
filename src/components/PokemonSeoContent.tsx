import React from 'react';
import { PokemonDetails } from '../types/pokemon';



interface PokemonSeoContentProps {
  pokemon: PokemonDetails;
}

const PokemonSeoContent: React.FC<PokemonSeoContentProps> = ({ pokemon }) => {

  const getHabitatDescription = () => {
    const typeToHabitat: Record<string, string> = {
      water: 'aquatic environments like oceans, lakes, and rivers',
      fire: 'volcanic areas and hot, arid regions',
      grass: 'forests, jungles, and grasslands with abundant vegetation',
      electric: 'power plants, urban areas, or thunderstorm-prone regions',
      ground: 'caves, mountains, and dry desert landscapes',
      rock: 'mountainous regions, rocky terrains, and ancient ruins',
      ice: 'frigid tundras, snow-capped mountains, and glacial regions',
      dragon: 'mysterious mountain ranges and ancient caves',
      fairy: 'enchanted forests and mystical landscapes',
      ghost: 'abandoned buildings, old towers, and ancient burial grounds',
      dark: 'dark caves and forests where little sunlight penetrates',
      psychic: 'areas with strong mental and cosmic energy',
      fighting: 'dojos, mountains, and areas that test physical strength',
      poison: 'toxic swamps, polluted areas, and dense jungles',
      bug: 'forests, grasslands, and areas rich with vegetation',
      flying: 'high mountains, open skies, and coastal cliffs',
      steel: 'mountains rich in metal ores and industrialized regions',
      normal: 'various environments including plains, forests, and urban areas',
    };
    
    if (!pokemon.types || pokemon.types.length === 0) {
      return 'various environments across the Pokémon world';
    }
    
    const primaryType = pokemon.types[0];
    const secondaryType = pokemon.types[1];
    
    if (!secondaryType) {
      return typeToHabitat[primaryType] || 'various environments across the Pokémon world';
    }
    
    return `environments that combine ${typeToHabitat[primaryType]} and ${typeToHabitat[secondaryType]}`;
  };
  

  const getTrainingTips = () => {
    const tips: string[] = [];
    
    if (!pokemon.stats) return tips;
  
    if (pokemon.stats.attack > pokemon.stats.special_attack) {
      tips.push(`Focus on physical attack moves to maximize ${pokemon.name}'s natural strength.`);
    } else if (pokemon.stats.special_attack > pokemon.stats.attack) {
      tips.push(`Train ${pokemon.name} with special attack moves to utilize its powerful energy-based attacks.`);
    }
    
    if (pokemon.stats.defense > 70) {
      tips.push(`${pokemon.name}'s solid defense makes it suitable for tanking hits in battles.`);
    }
    
    if (pokemon.stats.speed > 80) {
      tips.push(`Take advantage of ${pokemon.name}'s impressive speed to strike first in battles.`);
    }
    
  
    if (pokemon.types && Array.isArray(pokemon.types)) {
      if (pokemon.types.includes('water')) {
        tips.push(`As a Water-type, ${pokemon.name} excels in aquatic environments and can counter Fire, Ground, and Rock types.`);
      }
      
      if (pokemon.types.includes('fire')) {
        tips.push(`Being a Fire-type, ${pokemon.name} is effective against Grass, Ice, Bug, and Steel opponents.`);
      }
      
      if (pokemon.types.includes('grass')) {
        tips.push(`As a Grass-type, ${pokemon.name} can absorb water-based attacks and counter Water, Ground, and Rock types.`);
      }
      
      if (pokemon.types.includes('electric')) {
        tips.push(`${pokemon.name}'s Electric typing makes it devastating against Water and Flying types.`);
      }
      
      if (pokemon.types.includes('psychic')) {
        tips.push(`With its Psychic abilities, ${pokemon.name} can dominate Fighting and Poison types.`);
      }
    }
    
  
    return tips.slice(0, 3);
  };
  

  const getDietInfo = () => {
    const typeToFood: Record<string, string> = {
      water: 'aquatic plants, small fish, and water-filtered nutrients',
      fire: 'spicy berries, heat-resistant plants, and occasionally charcoal to maintain its flame',
      grass: 'sunlight through photosynthesis, nutrient-rich soil, and clean water',
      electric: 'electricity, charged berries, and static-rich minerals',
      ground: 'minerals, roots, and underground fungi',
      rock: 'minerals, stone particles, and specially hardened berries',
      ice: 'frozen berries, snow crystals, and cold-resistant plants',
      dragon: 'rare dragon fruits, energy-rich minerals, and occasionally other small Pokémon',
      fairy: 'sweet berries, flowers, and moonlight energy',
      ghost: 'spiritual energy, fear, and occasionally mischief',
      dark: 'berries that grow in darkness, small nocturnal creatures, and shadow energy',
      psychic: 'brain-boosting berries, mental energy, and psychic waves',
      fighting: 'protein-rich berries, training energy, and specialized fighting food',
      poison: 'toxic plants, pollution, and venomous substances that would be harmful to other Pokémon',
      bug: 'leaves, small plants, tree sap, and occasionally smaller bug Pokémon',
      flying: 'airborne seeds, flying insects, and berries from tall trees',
      steel: 'metal ores, minerals, and specially hardened berries',
      normal: 'standard Pokémon food, various berries, and plants',
    };
    
    if (!pokemon.types || pokemon.types.length === 0) {
      return 'a balanced diet of berries and Pokémon food';
    }
    
    const primaryType = pokemon.types[0];
    return typeToFood[primaryType] || 'a balanced diet of berries and Pokémon food';
  };
  

  const getEvolutionAdvice = () => {
    if (!pokemon.has_evolutions) {
      return `${pokemon.name} does not evolve further. Focus on maximizing its current form through training and bonding.`;
    }
    
    if (!pokemon.evolution_chain || !Array.isArray(pokemon.evolution_chain)) {
      return `${pokemon.name} has evolution potential, but the exact methods are unique. Consult a Pokémon professor for specific advice.`;
    }
    
    const evolutionMethods = pokemon.evolution_chain
      .filter(evo => evo.species_id !== pokemon.id)
      .map(evo => {
        if (evo.min_level) {
          return `level up to level ${evo.min_level}`;
        } else if (evo.item) {
          return `use a ${evo.item.replace('-', ' ')}`;
        } else if (evo.trigger_name === 'trade') {
          return 'trade with another trainer';
        } else {
          return 'special evolution method';
        }
      });
    
    if (evolutionMethods.length === 0) {
      return `${pokemon.name} has evolution potential, but the exact methods are unique. Consult a Pokémon professor for specific advice.`;
    }
    
    return `To evolve ${pokemon.name}, trainers typically need to ${evolutionMethods.join(' or ')}.`;
  };
  

  const getCompetitiveTips = () => {
    const tips: string[] = [];
    
    if (!pokemon.stats) return tips;
  
    const highestStat = Object.entries(pokemon.stats).reduce((a, b) => 
      (b[1] > a[1]) ? b : a
    );
    
    switch (highestStat[0]) {
      case 'hp':
        tips.push(`With its exceptional HP, ${pokemon.name} excels as a tank in competitive battles.`);
        break;
      case 'attack':
        tips.push(`${pokemon.name}'s high Attack stat makes it a powerful physical attacker in competitive play.`);
        break;
      case 'defense':
        tips.push(`In competitive battles, ${pokemon.name} can serve as an excellent physical wall.`);
        break;
      case 'special_attack':
        tips.push(`${pokemon.name}'s impressive Special Attack makes it a formidable special sweeper.`);
        break;
      case 'special_defense':
        tips.push(`Competitively, ${pokemon.name} functions well as a special wall against energy-based attacks.`);
        break;
      case 'speed':
        tips.push(`${pokemon.name}'s outstanding Speed allows it to outpace many opponents in competitive matches.`);
        break;
    }
    
  
    const types = pokemon.types || [];
    if (types.length === 2) {
      tips.push(`${pokemon.name}'s ${types[0]}/${types[1]} typing gives it unique matchups in the competitive meta.`);
    }
    
    return tips;
  };
  

  const getBiologyInfo = () => {
    const heightInMeters = pokemon.height / 10; // Convert from decimeters to meters
    const weightInKg = pokemon.weight / 10; // Convert from hectograms to kilograms
    
    const sizeDescription = () => {
      if (heightInMeters < 0.5) return 'tiny';
      if (heightInMeters < 1.0) return 'small';
      if (heightInMeters < 1.5) return 'medium-sized';
      if (heightInMeters < 2.0) return 'large';
      if (heightInMeters < 3.0) return 'very large';
      return 'enormous';
    };
    
    const weightDescription = () => {
      if (weightInKg < 10) return 'very light';
      if (weightInKg < 30) return 'light';
      if (weightInKg < 60) return 'average weight';
      if (weightInKg < 100) return 'heavy';
      return 'extremely heavy';
    };
    
    return `${pokemon.name} is a ${sizeDescription()} Pokémon, standing at ${heightInMeters.toFixed(1)} meters tall and weighing ${weightInKg.toFixed(1)} kg, making it ${weightDescription()} for its species. ${pokemon.flavor_text || ''}`;
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md w-full">
      <h2 className="text-2xl font-bold mb-6 border-b pb-2">Complete Pokédex Entry: {pokemon.name}</h2>
      
      <div className="space-y-8 w-full">
        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-blue-100 text-blue-800 p-1 rounded-md mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-microscope"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/></svg>
            </span>
            Biology & Physiology
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-gray-700 leading-relaxed mb-4">
              {getBiologyInfo()}
            </p>
            <p className="text-gray-700 leading-relaxed">
              {pokemon.genera ? `Classified as the ${pokemon.genera}, ` : ''}
              {pokemon.name} is known for its distinctive appearance and abilities that align with its {pokemon.types && Array.isArray(pokemon.types) ? pokemon.types.join(' and ') : ''} typing.
            </p>
          </div>
        </section>
        
        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-green-100 text-green-800 p-1 rounded-md mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mountain"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
            </span>
            Habitat & Behavior
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-gray-700 leading-relaxed mb-4">
              In the wild, {pokemon.name} typically inhabits {getHabitatDescription()}.
              {pokemon.generation ? ` First discovered in the ${pokemon.generation.replace('-', ' ').toUpperCase()} of Pokémon,` : ''} 
              it has adapted to its environment through specialized behaviors and abilities.
            </p>
            <p className="text-gray-700 leading-relaxed">
              {pokemon.name} primarily sustains itself on {getDietInfo()}, which helps maintain its health and energy levels.
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-purple-100 text-purple-800 p-1 rounded-md mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dumbbell"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
            </span>
            Training Tips
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-gray-700 leading-relaxed mb-4">
              Trainers looking to raise a strong {pokemon.name} should consider the following strategies:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              {getTrainingTips().map((tip, index) => (
                <li key={index} className="leading-relaxed">{tip}</li>
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {getEvolutionAdvice()}
            </p>
          </div>
        </section>
      
        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-red-100 text-red-800 p-1 rounded-md mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-swords"><path d="m14.5 17.5 3-3 2.5 2.5c1 1 2 1 3 0l.5-.5-8.5-8.5-1 1c-1 1-1 2 0 3l2.5 2.5-3 3"/><path d="m5.5 13.5-2 2 2 2"/><path d="m7.5 15.5-2 2"/><path d="M16 12 8.5 4.5l-.5.5c-1 1-1 2 0 3l.5.5c1 1 2 1 3 0l.5-.5 3 3-3 3"/><path d="m11.5 15.5-3 3"/><path d="m4.5 16.5-1.5 1.5"/></svg>
            </span>
            Competitive Battling
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-gray-700 leading-relaxed mb-4">
              With a base stat total of {pokemon.stats ? Object.values(pokemon.stats).reduce((a, b) => a + b, 0) : 0}, 
              {pokemon.name} has notable strengths in competitive play:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              {getCompetitiveTips().map((tip, index) => (
                <li key={index} className="leading-relaxed">{tip}</li>
              ))}
            </ul>
          </div>
        </section>
        
        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-yellow-100 text-yellow-800 p-1 rounded-md mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            </span>
            Trivia & Additional Information
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li className="leading-relaxed">
                {pokemon.name} has a base experience yield of {pokemon.base_experience || 'unknown'} points when defeated in battle.
              </li>
              <li className="leading-relaxed">
                It possesses {pokemon.abilities?.length || 0} known abilities that can provide strategic advantages in various situations.
              </li>
              <li className="leading-relaxed">
                {pokemon.name} can learn {pokemon.moves?.length || 0} different moves throughout its development, offering trainers flexibility in battle strategies.
              </li>
            </ul>
          </div>
        </section>
      </div>

      <div className="hidden">
        <h4>{pokemon.name} Pokémon Guide</h4>
        <p>Complete information about {pokemon.name} including stats, evolution methods, habitat, training tips, and competitive strategies.</p>
        <p>Pokédex entry for #{String(pokemon.id).padStart(3, '0')} {pokemon.name} - {pokemon.types.join('/')} type Pokémon.</p>
      </div>
    </div>
  );
};

export default PokemonSeoContent;
