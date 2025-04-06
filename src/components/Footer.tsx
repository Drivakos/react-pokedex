

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Legal</h3>
            <p className="text-gray-300 text-sm mb-4">
              Pokémon and Pokémon character names are trademarks of Nintendo. This project is not affiliated with, sponsored or endorsed by, or approved by Nintendo, Game Freak, or The Pokémon Company.
            </p>
            <p className="text-gray-300 text-sm mb-4">
              This is a fan project created for educational purposes only.
            </p>
            <p className="text-gray-300 text-sm">
              All Pokémon images, names, and related media are copyrighted by their respective owners including but not limited to Nintendo, The Pokémon Company, Game Freak, and Creatures Inc.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Data Sources</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>
                <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 transition-colors">
                  PokéAPI - The RESTful Pokémon API
                </a>
              </li>
              <li>
                <a href="https://pokemontcg.io/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 transition-colors">
                  Pokémon TCG API - Trading Card Game Data
                </a>
              </li>
              <li>
                <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 transition-colors">
                  PokeAPI Sprites Repository
                </a>
              </li>
              <li>
                <a href="https://www.pokemon.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 transition-colors">
                  Official Pokémon Website
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">About</h3>
            <p className="text-gray-300 text-sm mb-4">
              This Pokédex web application was created as a demonstration project showcasing React, TypeScript, and modern web development techniques.
            </p>
            <p className="text-gray-300 text-sm mb-4">
              Pokémon © {currentYear} Pokémon. © {currentYear} Nintendo/Creatures Inc./GAME FREAK inc. Pokémon character names are trademarks of Nintendo.
            </p>
            <p className="text-gray-300 text-sm">
              Pokémon TCG card images © {currentYear} Pokémon/Nintendo/Creatures/GAME FREAK. Pokémon TCG data provided by the Pokémon TCG API.
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400 text-sm">
          <p>This website is not affiliated with, maintained, authorized, endorsed, or sponsored by Nintendo, Game Freak, or The Pokémon Company.</p>
          <p className="mt-2">All content is used for educational and non-commercial purposes only.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
