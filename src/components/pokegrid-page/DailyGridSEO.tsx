import React from 'react';
import { Helmet } from 'react-helmet-async';

export const DailyGridSEO: React.FC = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  return (
    <Helmet>
      <title>Daily PokéGrid | The Ultimate Pokémon Trivia Challenge</title>
      <meta name="description" content="Test your Pokémon knowledge with the Daily PokéGrid! A Sudoku-style grid challenge where you must match Pokémon to specific type and generation constraints." />
      <meta name="keywords" content="PokéGrid, Pokémon Sudoku, Pokémon Grid, Pokémon Trivia, Daily Pokémon Game, Pokémon Type Quiz" />
      <link rel="canonical" href={`${origin}/pokegrid`} />
      <meta property="og:title" content="Daily PokéGrid Challenge" />
      <meta property="og:description" content="Can you solve today's Pokémon grid? Match the correct Pokémon to the constraints!" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${origin}/images/pokegrid-og.png`} />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "PokéGrid Challenge",
          "operatingSystem": "Web",
          "applicationCategory": "GameApplication",
          "genre": "Puzzle",
          "description": "A daily Pokémon-themed grid puzzle game.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        })}
      </script>
    </Helmet>
  );
};
