import React, { useState, useEffect } from 'react';

interface PokemonCard {
  id: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    name: string;
    series: string;
    releaseDate?: string;
  };
  rarity?: string;
  nationalPokedexNumbers?: number[];
}

interface PokemonCardsProps {
  pokemonName: string;
  pokemonId?: number;
}

const PokemonCards: React.FC<PokemonCardsProps> = ({ pokemonName, pokemonId }) => {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [visibleCards, setVisibleCards] = useState<number>(10);
  const [hasMore, setHasMore] = useState<boolean>(true);

  useEffect(() => {
    // Reset state when Pokemon changes
    setVisibleCards(10);
    setHasMore(true);
    
    const fetchPokemonCards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Format the Pokémon name for the API query
        // Remove any special characters and make it lowercase
        const formattedName = pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Handle special cases for Pokémon with different names in the TCG
        let searchName = formattedName;
        const specialCases: Record<string, string> = {
          'nidoranf': 'nidoran female',
          'nidoranm': 'nidoran male',
          'mrmime': 'mr mime',
          'mimejr': 'mime jr',
          'farfetchd': 'farfetch d',
          'hooh': 'ho oh',
          'jangmoo': 'jangmo o',
          'hakamoo': 'hakamo o',
          'kommoo': 'kommo o',
          'porygonz': 'porygon z',
          'typenull': 'type null',
          'flabebe': 'flabébé',
          'sirfetchd': 'sirfetch d',
          'mrrime': 'mr rime'
        };
        
        if (specialCases[formattedName]) {
          searchName = specialCases[formattedName];
        }
        
        // Try multiple search strategies to get as many cards as possible
        let allCards: PokemonCard[] = [];
        
        // Strategy 1: Exact name match
        const exactMatchResponse = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=name:"${searchName}"&orderBy=set.releaseDate&pageSize=50`
        );
        
        if (exactMatchResponse.ok) {
          const exactMatchData = await exactMatchResponse.json();
          allCards = [...allCards, ...exactMatchData.data];
        }
        
        // Strategy 2: Partial name match (if exact match didn't return many results)
        if (allCards.length < 20) {
          const partialMatchResponse = await fetch(
            `https://api.pokemontcg.io/v2/cards?q=name:*${searchName}*&orderBy=set.releaseDate&pageSize=50`
          );
          
          if (partialMatchResponse.ok) {
            const partialMatchData = await partialMatchResponse.json();
            allCards = [...allCards, ...partialMatchData.data];
          }
        }
        
        // Strategy 3: Try with National Pokédex number (for older cards)
        if (pokemonId) {
          const dexNumberResponse = await fetch(
            `https://api.pokemontcg.io/v2/cards?q=nationalPokedexNumbers:${pokemonId}&orderBy=set.releaseDate&pageSize=50`
          );
          
          if (dexNumberResponse.ok) {
            const dexNumberData = await dexNumberResponse.json();
            allCards = [...allCards, ...dexNumberData.data];
          }
        }
        
        // Filter out duplicates and keep only unique cards
        const uniqueCards = allCards.filter((card: PokemonCard, index: number, self: PokemonCard[]) => 
          index === self.findIndex((c) => c.id === card.id)
        );
        
        // Sort by release date (newest first)
        uniqueCards.sort((a, b) => {
          if (a.set.releaseDate && b.set.releaseDate) {
            return new Date(b.set.releaseDate).getTime() - new Date(a.set.releaseDate).getTime();
          }
          return 0;
        });
        
        setCards(uniqueCards);
        setHasMore(uniqueCards.length > visibleCards);
      } catch (err) {
        console.error('Error fetching Pokémon cards:', err);
        setError('Failed to load Pokémon cards. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (pokemonName) {
      fetchPokemonCards();
    }
  }, [pokemonName]);

  const openCardModal = (card: PokemonCard) => {
    setSelectedCard(card);
  };

  const closeCardModal = () => {
    setSelectedCard(null);
  };

  if (loading) {
    return <div className="my-6 text-center">Loading Pokémon cards...</div>;
  }

  if (error) {
    return <div className="my-6 text-center text-red-500">{error}</div>;
  }

  if (cards.length === 0) {
    return <div className="my-6 text-center">No trading cards found for {pokemonName}.</div>;
  }

  return (
    <div className="my-8">
      <h3 className="text-xl font-bold mb-4">Trading Cards</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {cards.slice(0, visibleCards).map((card) => (
          <div 
            key={card.id} 
            className="card-container cursor-pointer transform transition-transform hover:scale-105"
            onClick={() => openCardModal(card)}
          >
            <img 
              src={card.images.small} 
              alt={`${card.name} card`} 
              className="rounded-lg shadow-md w-full"
              loading="lazy"
            />
            <div className="mt-2 text-xs text-center">
              <div className="font-medium">{card.set.name}</div>
              {card.rarity && <div className="text-gray-500">{card.rarity}</div>}
            </div>
          </div>
        ))}
      </div>
      
      {/* Show More Button */}
      {hasMore && cards.length > visibleCards && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisibleCards(prev => prev + 10)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Show More Cards
          </button>
        </div>
      )}
      
      {/* Card Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeCardModal}>
          <div className="relative max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute -top-10 right-0 text-white text-2xl"
              onClick={closeCardModal}
            >
              &times;
            </button>
            <img 
              src={selectedCard.images.large} 
              alt={`${selectedCard.name} card large`} 
              className="rounded-lg max-h-[80vh] max-w-full"
            />
            <div className="mt-2 text-center text-white">
              <div className="font-bold">{selectedCard.name}</div>
              <div>{selectedCard.set.name} · {selectedCard.set.series}</div>
              {selectedCard.rarity && <div>{selectedCard.rarity}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokemonCards;
