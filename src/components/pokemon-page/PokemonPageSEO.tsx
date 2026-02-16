import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PokemonDetails } from '../../types/pokemon';

interface PokemonPageSEOProps {
  pokemonDetails: PokemonDetails;
  formattedId: string;
}

export const PokemonPageSEO: React.FC<PokemonPageSEOProps> = ({ pokemonDetails, formattedId }) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pokemonUrl = `${origin}/pokemon/${pokemonDetails.id}`;
  const thumbnailUrl = `/images/pokemon/thumbnails/${formattedId}.png`;
  const formattedName = pokemonDetails.name.charAt(0).toUpperCase() + pokemonDetails.name.slice(1);
  
  const description = pokemonDetails.flavor_text || 
    `A ${pokemonDetails.types.join('/')} type Pokémon with a base experience of ${pokemonDetails.base_experience}.`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": "Pokémon",
    "datePublished": "2025-04-01T00:00:00Z",
    "dateModified": "2025-04-07T00:00:00Z",
    "character": {
      "@type": "Character",
      "name": formattedName,
      "image": thumbnailUrl,
      "description": description,
      "identifier": `#${formattedId}`,
      "subjectOf": [
        {
          "@type": "CreativeWork",
          "name": `${formattedName} Trading Card Game Cards`,
          "description": `Collection of official Pokémon Trading Card Game cards featuring ${formattedName}`,
          "url": `${pokemonUrl}#cards`
        }
      ]
    },
    "applicationCategory": "Game",
    "genre": "Role-playing game",
    "gamePlatform": ["Nintendo Switch", "Nintendo 3DS", "Game Boy"],
    "url": pokemonUrl,
    "associatedMedia": {
      "@type": "CollectionPage",
      "name": `${formattedName} Trading Cards`,
      "description": `Official Pokémon Trading Card Game cards featuring ${formattedName}`,
      "url": `${pokemonUrl}#cards`
    }
  };

  return (
    <Helmet>
      <title>{`${pokemonDetails.name} | Pokémon #${formattedId} | Complete Pokédex Guide`}</title>
      <meta name="description" content={`Complete guide to ${pokemonDetails.name}, a ${pokemonDetails.types.join('/')} type Pokémon. Learn about its biology, habitat, training tips, evolution methods, competitive strategies, and more.`} />
      <meta name="keywords" content={`${pokemonDetails.name}, Pokémon ${formattedId}, ${pokemonDetails.types.join(', ')} type, Pokédex, Pokémon guide, Pokémon evolution, Pokémon stats, ${pokemonDetails.name} moves, ${pokemonDetails.name} abilities`} />
      <link rel="canonical" href={pokemonUrl} />
      <meta property="article:published_time" content="2025-04-01T00:00:00Z" />
      <meta property="article:modified_time" content="2025-04-07T00:00:00Z" />
      <meta property="og:title" content={`${pokemonDetails.name} | Pokémon #${formattedId} | Complete Pokédex Guide`} />
      <meta property="og:description" content={`Complete guide to ${pokemonDetails.name}, a ${pokemonDetails.types.join('/')} type Pokémon.`} />
      <meta property="og:url" content={pokemonUrl} />
      <meta property="og:type" content="article" />
      <meta property="og:image" content={thumbnailUrl} />
      <meta property="og:site_name" content="Pokédex" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@pokedex" />
      <meta name="twitter:title" content={`${formattedName} (#${formattedId}) | Pokédex`} />
      <meta name="twitter:description" content={`${formattedName} is a ${pokemonDetails.types.join('/')} type Pokémon. Learn about its stats, abilities, evolutions, and more.`} />
      <meta name="twitter:image" content={thumbnailUrl} />
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};
