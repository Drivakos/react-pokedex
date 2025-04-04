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

const PokemonCards: React.FC<PokemonCardsProps> = ({ pokemonName, pokemonId }) => {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [visibleCards, setVisibleCards] = useState<number>(10);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  // Use refs instead of state for animation values to prevent re-renders
  const animationFrameIdRef = useRef<number | null>(null);
  const previousRotationRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const currentCardRef = useRef<HTMLDivElement | null>(null);
  
  // Get card rarity class for special effects
  const getRarityClass = (rarity?: string): string => {
    if (!rarity) return '';
    
    const rarityLower = rarity.toLowerCase();
    
    // Prismatic cards (highest tier)
    if (rarityLower.includes('secret rare') || rarityLower.includes('hyper rare') || rarityLower.includes('rainbow rare')) {
      return 'prismatic';
    }
    // Holographic cards (very high tier)
    else if (rarityLower.includes('holo gx') || rarityLower.includes('full art') || rarityLower.includes('alt art')) {
      return 'holographic';
    }
    // Ultra rare cards (high tier)
    else if (rarityLower.includes('rare holo') || rarityLower.includes('ultra rare') || rarityLower.includes('ex')) {
      return 'ultra-rare';
    }
    // Rare cards (medium tier)
    else if (rarityLower.includes('rare') || rarityLower.includes('holo')) {
      return 'rare';
    }
    // Uncommon cards (low tier)
    else if (rarityLower.includes('uncommon')) {
      return 'uncommon';
    }
    // Common cards (lowest tier)
    return '';
  };
  
  // Handle 3D card effect on mouse move with smooth transitions
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cardImageContainer = e.currentTarget;
    currentCardRef.current = cardImageContainer;
    
    const cardId = cardImageContainer.getAttribute('data-card-id');
    const cardRarity = cardImageContainer.getAttribute('data-card-rarity') || '';
    if (!cardId) return;
    
    // Cancel any existing animation frame
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    
    // Store card data for animation
    const rect = cardImageContainer.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const y = e.clientY - rect.top; // y position within the element
    
    // Increase tilt angle based on rarity - with higher values
    let tiltFactor = 35; // Base tilt for common cards (increased from 25)
    
    if (cardRarity.includes('prismatic')) {
      tiltFactor = 55; // Maximum tilt for prismatic cards (increased from 40)
    } else if (cardRarity.includes('holographic')) {
      tiltFactor = 45; // High tilt for holographic cards (increased from 35)
    } else if (cardRarity.includes('ultra-rare')) {
      tiltFactor = 40; // Enhanced tilt for ultra-rare cards (increased from 30)
    }
    
    // Calculate raw rotation values
    const rawXRotation = tiltFactor * ((y - rect.height / 2) / rect.height);
    const rawYRotation = -tiltFactor * ((x - rect.width / 2) / rect.width);
    
    // Start animation loop
    const animateCard = () => {
      if (!currentCardRef.current) return;
      
      // Apply smoothing by interpolating between previous and current rotation
      const smoothingFactor = 0.08; // Lower value for smoother transitions (reduced from 0.15)
      
      // Get previous rotation values from ref
      const prevX = previousRotationRef.current.x;
      const prevY = previousRotationRef.current.y;
      
      // Interpolate between previous rotation and new rotation for smoothness
      const xRotation = prevX + (rawXRotation - prevX) * smoothingFactor;
      const yRotation = prevY + (rawYRotation - prevY) * smoothingFactor;
      
      // Update previous rotation ref for next frame
      previousRotationRef.current = { x: xRotation, y: yRotation };
      
      // Apply the transformation with increased perspective for more dramatic effect
      currentCardRef.current.style.transform = `
        perspective(600px)
        scale(1.1)
        rotateX(${xRotation}deg)
        rotateY(${yRotation}deg)
      `;
      
      // Apply shine effect based on card tilt
      updateShineEffect(currentCardRef.current, cardRarity, xRotation, yRotation, tiltFactor);
      
      // Continue animation loop
      animationFrameIdRef.current = requestAnimationFrame(animateCard);
    };
    
    // Start the animation
    animateCard();
  };
    
  // Separate function to update shine effect
  const updateShineEffect = (cardElement: HTMLDivElement, cardRarity: string, xRotation: number, yRotation: number, tiltFactor: number) => {
    const rect = cardElement.getBoundingClientRect();
    const shine = cardElement.querySelector('.card-shine') as HTMLElement;
    
    if (!shine) return;
    
    // Calculate light reflection based on card tilt
    // This creates a more realistic effect as if light is reflecting off the card surface
    // The reflection position changes based on how the card is tilted
    
    // Calculate reflection position based on tilt
    const reflectionX = rect.width * (0.5 - (yRotation / (tiltFactor * 2)));
    const reflectionY = rect.height * (0.5 - (xRotation / (tiltFactor * 2)));
    
    // Calculate intensity based on tilt angle
    // More extreme angles = more intense reflection
    const tiltMagnitude = Math.sqrt(xRotation * xRotation + yRotation * yRotation) / tiltFactor;
    
    // Base reflection intensity - balanced for all cards
    let reflectionIntensity = 0.35 + (tiltMagnitude * 0.45); // 0.35 to 0.8 range
    
    // Adjust intensity based on card rarity
    if (cardRarity.includes('prismatic')) {
      reflectionIntensity = 0.45 + (tiltMagnitude * 0.55); // 0.45 to 1.0 range for prismatic
    } else if (cardRarity.includes('holographic')) {
      reflectionIntensity = 0.4 + (tiltMagnitude * 0.5); // 0.4 to 0.9 range for holographic
    } else if (cardRarity.includes('ultra-rare')) {
      reflectionIntensity = 0.35 + (tiltMagnitude * 0.45); // 0.35 to 0.8 range for ultra-rare
    } else if (cardRarity.includes('rare')) {
      reflectionIntensity = 0.3 + (tiltMagnitude * 0.4); // 0.3 to 0.7 range for rare
    }
    
    // Enhanced shine effects based on rarity
    if (cardRarity.includes('prismatic')) {
      // Prismatic effect with rainbow colors and intense shine
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
      // Calculate angle based on tilt direction
      const tiltAngle = Math.atan2(xRotation, yRotation) * (180 / Math.PI);
      
      // Holographic effect with linear gradient that changes with tilt angle
      // Reduced opacity to make sure card art remains visible
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
      // Rainbow holographic effect for ultra rare
      // Reduced opacity to ensure card art visibility
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
      // Gold/silver shine for rare cards
      // Significantly reduced opacity to fix the issue with rare holos
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
      // Standard shine for common cards
      // Very subtle effect
      shine.style.background = `
        radial-gradient(
          circle at ${reflectionX}px ${reflectionY}px,
          rgba(255, 255, 255, ${reflectionIntensity * 0.35}) 0%,
          rgba(255, 255, 255, 0) 70%
        )
      `;
    }
    
    // Update particle effects
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

    // Reset transform with a smooth transition
    // The transition is defined in the style attribute of the element
    cardImageContainer.style.transform = `
      perspective(600px)
      scale(1.0)
      rotateX(0deg)
      rotateY(0deg)
    `;

    // Reset previous rotation ref
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
        {cards.slice(0, visibleCards).map((card) => {
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
                {/* Basic shine effect for all cards */}
                <div className="card-shine absolute inset-0 z-20 rounded-lg pointer-events-none"></div>
                
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 rounded-lg z-0"></div>
                
                {/* Special effects for different card rarities */}
                
                {/* Rare cards */}
                {rarityClass === 'rare' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 to-yellow-400/20 rounded-lg z-5 pointer-events-none"></div>
                )}
                
                {/* Ultra rare special effects */}
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
                
                {/* Holographic special effects */}
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
                
                {/* Prismatic special effects */}
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
            <div className={`relative ${getRarityClass(selectedCard.rarity)}-modal`}>
              <img 
                src={selectedCard.images.large} 
                alt={`${selectedCard.name} card large`} 
                title={`${selectedCard.name} - ${selectedCard.set.name} (${selectedCard.set.series}) - ${selectedCard.rarity || 'Trading Card'}`}
                className="rounded-lg max-h-[80vh] max-w-full relative z-10"
              />
              
              {/* Special effects for rare cards in modal view */}
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
