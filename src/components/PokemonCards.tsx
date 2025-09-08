import React, { useState, useEffect, useRef } from 'react';

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

const POKEMONTCG_API_KEY = import.meta.env.VITE_POKEMONTCG_API_KEY;

const PokemonCards: React.FC<PokemonCardsProps> = ({ pokemonName, pokemonId }) => {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastFetchedPokemon, setLastFetchedPokemon] = useState<string>('');
  

  const animationFrameIdRef = useRef<number | null>(null);
  const previousRotationRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const currentCardRef = useRef<HTMLDivElement | null>(null);
  const isRequestInProgressRef = useRef<boolean>(false);
  

  const getRarityClass = (rarity?: string): string => {
    if (!rarity) return '';
    
    const rarityLower = rarity.toLowerCase();
    

    if (rarityLower.includes('secret rare') || rarityLower.includes('hyper rare') || rarityLower.includes('rainbow rare')) {
      return 'prismatic';
    }

    else if (rarityLower.includes('holo gx') || rarityLower.includes('full art') || rarityLower.includes('alt art')) {
      return 'holographic';
    }

    else if (rarityLower.includes('rare holo') || rarityLower.includes('ultra rare') || rarityLower.includes('ex')) {
      return 'ultra-rare';
    }

    else if (rarityLower.includes('rare') || rarityLower.includes('holo')) {
      return 'rare';
    }

    else if (rarityLower.includes('uncommon')) {
      return 'uncommon';
    }

    return '';
  };
  

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cardImageContainer = e.currentTarget;
    currentCardRef.current = cardImageContainer;
    
    const cardId = cardImageContainer.getAttribute('data-card-id');
    const cardRarity = cardImageContainer.getAttribute('data-card-rarity') || '';
    if (!cardId) return;
    

    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    

    const rect = cardImageContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    

    let tiltFactor = 35;
    
    if (cardRarity.includes('prismatic')) {
      tiltFactor = 55;
    } else if (cardRarity.includes('holographic')) {
      tiltFactor = 45;
    } else if (cardRarity.includes('ultra-rare')) {
      tiltFactor = 40;
    }
    

    const rawXRotation = tiltFactor * ((y - rect.height / 2) / rect.height);
    const rawYRotation = -tiltFactor * ((x - rect.width / 2) / rect.width);
    

    const animateCard = () => {
      if (!currentCardRef.current) return;
      

      const smoothingFactor = 0.08;
      

      const prevX = previousRotationRef.current.x;
      const prevY = previousRotationRef.current.y;
      

      const xRotation = prevX + (rawXRotation - prevX) * smoothingFactor;
      const yRotation = prevY + (rawYRotation - prevY) * smoothingFactor;
      

      previousRotationRef.current = { x: xRotation, y: yRotation };
      

      currentCardRef.current.style.transform = `
        perspective(600px)
        scale(1.1)
        rotateX(${xRotation}deg)
        rotateY(${yRotation}deg)
      `;
      

      updateShineEffect(currentCardRef.current, cardRarity, xRotation, yRotation, tiltFactor);
      

      animationFrameIdRef.current = requestAnimationFrame(animateCard);
    };
    

    animateCard();
  };
    

  const updateShineEffect = (cardElement: HTMLDivElement, cardRarity: string, xRotation: number, yRotation: number, tiltFactor: number) => {
    const rect = cardElement.getBoundingClientRect();
    const shine = cardElement.querySelector('.card-shine') as HTMLElement;
    
    if (!shine) return;
    

    

    const reflectionX = rect.width * (0.5 - (yRotation / (tiltFactor * 2)));
    const reflectionY = rect.height * (0.5 - (xRotation / (tiltFactor * 2)));
    

    const tiltMagnitude = Math.sqrt(xRotation * xRotation + yRotation * yRotation) / tiltFactor;
    

    let reflectionIntensity = 0.35 + (tiltMagnitude * 0.45);
    

    if (cardRarity.includes('prismatic')) {
      reflectionIntensity = 0.45 + (tiltMagnitude * 0.55);
    } else if (cardRarity.includes('holographic')) {
      reflectionIntensity = 0.4 + (tiltMagnitude * 0.5);
    } else if (cardRarity.includes('ultra-rare')) {
      reflectionIntensity = 0.35 + (tiltMagnitude * 0.45);
    } else if (cardRarity.includes('rare')) {
      reflectionIntensity = 0.3 + (tiltMagnitude * 0.4);
    }
    

    if (cardRarity.includes('prismatic')) {

      shine.style.background = `
        radial-gradient(
          circle at ${reflectionX}px ${reflectionY}px,
          rgba(255, 255, 255, ${reflectionIntensity}) 0%,
          rgba(255, 0, 255, ${reflectionIntensity * 0.55}) 15%,
          rgba(0, 0, 255, ${reflectionIntensity * 0.55}) 30%,
          rgba(0, 255, 255, ${reflectionIntensity * 0.55}) 45%,
          rgba(0, 255, 0, ${reflectionIntensity * 0.55}) 60%,
          rgba(255, 255, 0, ${reflectionIntensity * 0.55}) 75%,
          rgba(255, 0, 0, ${reflectionIntensity * 0.55}) 90%,
          rgba(255, 255, 255, 0) 100%
        )
      `;
    } 
    else if (cardRarity.includes('holographic')) {

      const tiltAngle = Math.atan2(xRotation, yRotation) * (180 / Math.PI);
      

      shine.style.background = `
        linear-gradient(
          ${tiltAngle}deg,
          rgba(255, 255, 255, ${reflectionIntensity * 0.9}) 0%,
          rgba(120, 255, 255, ${reflectionIntensity * 0.65}) 20%,
          rgba(150, 150, 255, ${reflectionIntensity * 0.65}) 40%,
          rgba(255, 130, 255, ${reflectionIntensity * 0.65}) 60%,
          rgba(255, 255, 130, ${reflectionIntensity * 0.65}) 80%,
          rgba(255, 255, 255, 0) 100%
        )
      `;
    }
    else if (cardRarity.includes('ultra-rare')) {

      shine.style.background = `
        radial-gradient(
          circle at ${reflectionX}px ${reflectionY}px,
          rgba(255, 255, 255, ${reflectionIntensity * 0.95}) 0%,
          rgba(255, 0, 0, ${reflectionIntensity * 0.4}) 20%,
          rgba(255, 255, 0, ${reflectionIntensity * 0.4}) 40%,
          rgba(0, 255, 0, ${reflectionIntensity * 0.4}) 60%,
          rgba(0, 0, 255, ${reflectionIntensity * 0.4}) 80%,
          rgba(255, 255, 255, 0) 100%
        )
      `;
    } 
    else if (cardRarity.includes('rare')) {

      shine.style.background = `
        radial-gradient(
          circle at ${reflectionX}px ${reflectionY}px,
          rgba(255, 215, 0, ${reflectionIntensity * 0.55}) 0%,
          rgba(192, 192, 192, ${reflectionIntensity * 0.45}) 40%,
          rgba(255, 255, 255, 0) 80%
        )
      `;
    } 
    else {

      shine.style.background = `
        radial-gradient(
          circle at ${reflectionX}px ${reflectionY}px,
          rgba(255, 255, 255, ${reflectionIntensity * 0.35}) 0%,
          rgba(255, 255, 255, 0) 70%
        )
      `;
    }
    

    const particles = cardElement.querySelector('.card-particles') as HTMLElement;
    if (particles) {
      if (cardRarity.includes('prismatic') || cardRarity.includes('holographic') || cardRarity.includes('ultra-rare')) {
        particles.style.opacity = '1';
        if (cardRarity.includes('prismatic')) {
          particles.classList.add('particles-prismatic');
        } else {
          particles.classList.remove('particles-prismatic');
        }
      } else {
        particles.style.opacity = '0';
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const cardImageContainer = e.currentTarget;

    // Cancel any existing animation
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }


    cardImageContainer.style.transform = `
      perspective(600px)
      scale(1.0)
      rotateX(0deg)
      rotateY(0deg)
    `;


    previousRotationRef.current = { x: 0, y: 0 };
    currentCardRef.current = null;

    const shine = cardImageContainer.querySelector('.card-shine') as HTMLElement;
    if (shine) {
      shine.style.background = 'none';
    }

    const particles = cardImageContainer.querySelector('.card-particles') as HTMLElement;
    if (particles) {
      particles.style.opacity = '0';
    }
  };

  // Simplified fetch function
  const fetchCards = async (page: number = 1, append: boolean = false) => {
    // Prevent duplicate requests
    if (isRequestInProgressRef.current && !append) {
      return;
    }

    if (!append) {
      isRequestInProgressRef.current = true;
    }

    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Format Pokemon name for search
      const formattedName = pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Handle special cases
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

      const searchName = specialCases[formattedName] || formattedName;

      // Build search query - prefer exact match, fallback to partial
      let query = `name:"${searchName}"`;
      if (pokemonId) {
        query = `nationalPokedexNumbers:${pokemonId}`;
      }

      // Use proxy in development to avoid CORS issues, direct API in production
      const isDevelopment = import.meta.env.DEV;
      const apiUrl = isDevelopment
        ? `/api/pokemontcg/cards?q=${query}&orderBy=set.releaseDate&page=${page}&pageSize=12`
        : `https://api.pokemontcg.io/v2/cards?q=${query}&orderBy=set.releaseDate&page=${page}&pageSize=12`;

      const response = await fetch(apiUrl, {
        headers: isDevelopment ? {} : { 'X-Api-Key': POKEMONTCG_API_KEY || '' }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const newCards = data.data || [];

      if (append) {
        setCards(prev => [...prev, ...newCards]);
      } else {
        setCards(newCards);
      }

      // Check if there are more pages (API returns totalCount)
      setHasMore(data.totalCount > (page * 12));

    } catch (err: any) {
      setError('Failed to load Pokémon cards. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (!append) {
        isRequestInProgressRef.current = false;
      }
    }
  };

  // Load more cards
  const loadMoreCards = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchCards(nextPage, true);
  };

  // Use a combined key to prevent duplicate calls when both pokemonName and pokemonId change
  const pokemonKey = `${pokemonName}-${pokemonId}`;

  useEffect(() => {
    // Prevent duplicate requests for the same Pokemon
    if (pokemonName && pokemonKey !== lastFetchedPokemon) {
      setLastFetchedPokemon(pokemonKey);
      setCurrentPage(1);
      setHasMore(true);
      fetchCards(1, false);
    }

    return () => {
      // Reset request flag on cleanup to allow new requests after hot reload
      isRequestInProgressRef.current = false;
    };
  }, [pokemonKey, lastFetchedPokemon]);

  const openCardModal = (card: PokemonCard) => {
    setSelectedCard(card);
  };

  const closeCardModal = () => {
    setSelectedCard(null);
  };

  if (loading) {
    return (
      <div className="my-6 text-center">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          Loading Pokémon cards...
        </div>
      </div>
    );
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
        {cards.map((card) => {
          const rarityClass = getRarityClass(card.rarity);
          return (
            <div key={card.id} className="card-container cursor-pointer">
              <div 
                className={`card-image-container relative transition-all duration-300 ease-out hover:z-10 mb-2 ${rarityClass}`}
                style={{ transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                onClick={() => openCardModal(card)}
                onMouseMove={(e) => handleMouseMove(e)}
                onMouseLeave={handleMouseLeave}
                data-card-id={card.id}
                data-card-rarity={rarityClass}
              >
                <img 
                  src={card.images.small} 
                  alt={`${card.name} card`} 
                  title={`${card.name} - ${card.set.name} (${card.set.series})`}
                  className="rounded-lg shadow-md w-full relative z-10"
                  loading="lazy"
                />
                <div className="card-shine absolute inset-0 z-20 rounded-lg pointer-events-none"></div>
                
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 rounded-lg z-0"></div>
                

                {rarityClass === 'rare' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 to-yellow-400/20 rounded-lg z-5 pointer-events-none"></div>
                )}
                

                {rarityClass === 'ultra-rare' && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-lg z-5 pointer-events-none animate-pulse"></div>
                    <div className="card-particles absolute inset-0 z-15 rounded-lg pointer-events-none opacity-0 transition-opacity duration-300">
                      {[...Array(20)].map((_, i) => (
                        <div 
                          key={i}
                          className="absolute w-1 h-1 bg-white rounded-full animate-float"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                            animationDelay: `${Math.random() * 2}s`
                          }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 border-2 border-yellow-400/50 rounded-lg z-25 pointer-events-none"></div>
                  </>
                )}
                

                {rarityClass === 'holographic' && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 rounded-lg z-5 pointer-events-none animate-pulse"></div>
                    <div className="card-particles absolute inset-0 z-15 rounded-lg pointer-events-none opacity-0 transition-opacity duration-300">
                      {[...Array(25)].map((_, i) => (
                        <div 
                          key={i}
                          className="absolute w-1 h-1 bg-cyan-300 rounded-full animate-float"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDuration: `${1.5 + Math.random() * 2.5}s`,
                            animationDelay: `${Math.random() * 1.5}s`
                          }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 border-2 border-cyan-400/50 rounded-lg z-25 pointer-events-none"></div>
                  </>
                )}
                

                {rarityClass === 'prismatic' && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-indigo-500/30 rounded-lg z-5 pointer-events-none animate-pulse"></div>
                    <div className="card-particles absolute inset-0 z-15 rounded-lg pointer-events-none opacity-0 transition-opacity duration-300 particles-prismatic">
                      {[...Array(30)].map((_, i) => (
                        <div 
                          key={i}
                          className="absolute rounded-full animate-float"
                          style={{
                            width: `${1 + Math.random() * 2}px`,
                            height: `${1 + Math.random() * 2}px`,
                            backgroundColor: [
                              '#ff0000', '#ff7f00', '#ffff00', '#00ff00', 
                              '#0000ff', '#4b0082', '#9400d3', '#ff00ff'
                            ][Math.floor(Math.random() * 8)],
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDuration: `${1 + Math.random() * 2}s`,
                            animationDelay: `${Math.random() * 1}s`
                          }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 border-3 border-pink-400/70 rounded-lg z-25 pointer-events-none"></div>
                  </>
                )}
              </div>
              <div className="text-xs text-center">
                <div className="font-medium">{card.set.name}</div>
                {card.rarity && (
                  <div className={`
                    ${rarityClass === 'prismatic' ? 'text-pink-600 font-bold text-sm' : ''}
                    ${rarityClass === 'holographic' ? 'text-cyan-600 font-bold' : ''}
                    ${rarityClass === 'ultra-rare' ? 'text-purple-600 font-bold' : ''}
                    ${rarityClass === 'rare' ? 'text-yellow-600 font-semibold' : ''}
                    ${rarityClass === 'uncommon' ? 'text-blue-500' : ''}
                    ${!rarityClass ? 'text-gray-500' : ''}
                  `}>
                    {card.rarity}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      

      {hasMore && cards.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMoreCards}
            disabled={loadingMore}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            {loadingMore ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Loading...
              </div>
            ) : (
              'Show More Cards'
            )}
          </button>
        </div>
      )}
      

      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeCardModal}>
          <div className="relative max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute -top-10 right-0 text-white text-2xl"
              onClick={closeCardModal}
            >
              &times;
            </button>
            <div className={`relative ${getRarityClass(selectedCard.rarity)}-modal`}>
              <img 
                src={selectedCard.images.large} 
                alt={`${selectedCard.name} card large`} 
                title={`${selectedCard.name} - ${selectedCard.set.name} (${selectedCard.set.series}) - ${selectedCard.rarity || 'Trading Card'}`}
                className="rounded-lg max-h-[80vh] max-w-full relative z-10"
              />
              

              {getRarityClass(selectedCard.rarity) === 'prismatic' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-indigo-500/30 rounded-lg z-5 animate-pulse"></div>
                  <div className="absolute inset-0 z-15 rounded-lg">
                    {[...Array(40)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute rounded-full animate-float"
                        style={{
                          width: `${1 + Math.random() * 3}px`,
                          height: `${1 + Math.random() * 3}px`,
                          backgroundColor: [
                            '#ff0000', '#ff7f00', '#ffff00', '#00ff00', 
                            '#0000ff', '#4b0082', '#9400d3', '#ff00ff'
                          ][Math.floor(Math.random() * 8)],
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDuration: `${1 + Math.random() * 2}s`,
                          animationDelay: `${Math.random() * 1}s`
                        }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 border-4 border-pink-400/70 rounded-lg z-25"></div>
                </>
              )}
              
              {getRarityClass(selectedCard.rarity) === 'holographic' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 rounded-lg z-5 animate-pulse"></div>
                  <div className="absolute inset-0 z-15 rounded-lg">
                    {[...Array(35)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute w-2 h-2 bg-cyan-300 rounded-full animate-float"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDuration: `${1.5 + Math.random() * 2.5}s`,
                          animationDelay: `${Math.random() * 1.5}s`
                        }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 border-4 border-cyan-400/50 rounded-lg z-25"></div>
                </>
              )}
              
              {getRarityClass(selectedCard.rarity) === 'ultra-rare' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-lg z-5 animate-pulse"></div>
                  <div className="absolute inset-0 z-15 rounded-lg">
                    {[...Array(30)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute w-2 h-2 bg-white rounded-full animate-float"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDuration: `${2 + Math.random() * 3}s`,
                          animationDelay: `${Math.random() * 2}s`
                        }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 border-4 border-yellow-400/50 rounded-lg z-25"></div>
                </>
              )}
              
              {getRarityClass(selectedCard.rarity) === 'rare' && (
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/30 to-yellow-400/30 rounded-lg z-5"></div>
              )}
            </div>
            <div className="mt-2 text-center text-white">
              <div className="font-bold">{selectedCard.name}</div>
              <div>{selectedCard.set.name} · {selectedCard.set.series}</div>
              {selectedCard.rarity && (
                <div className={`
                  ${getRarityClass(selectedCard.rarity) === 'prismatic' ? 'text-pink-500 font-bold text-lg animate-pulse' : ''}
                  ${getRarityClass(selectedCard.rarity) === 'holographic' ? 'text-cyan-500 font-bold text-lg' : ''}
                  ${getRarityClass(selectedCard.rarity) === 'ultra-rare' ? 'text-purple-500 font-bold text-lg' : ''}
                  ${getRarityClass(selectedCard.rarity) === 'rare' ? 'text-yellow-500 font-semibold' : ''}
                  ${getRarityClass(selectedCard.rarity) === 'uncommon' ? 'text-blue-400' : ''}
                  ${!getRarityClass(selectedCard.rarity) ? 'text-gray-300' : ''}
                `}>
                  {selectedCard.rarity}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokemonCards;
