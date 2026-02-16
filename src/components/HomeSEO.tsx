import React from 'react';
import { Helmet } from 'react-helmet-async';

export const HomeSEO: React.FC = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  return (
    <Helmet>
      <title>Pokédex</title>
      <meta name="description" content="A modern Pokédex web application" />
      <link rel="canonical" href={origin} />
      <meta property="article:published_time" content="2025-04-01T00:00:00Z" />
      <meta property="article:modified_time" content="2025-04-07T00:00:00Z" />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "headline": "Pokédex",
          "description": "A modern Pokédex web application",
          "datePublished": "2025-04-01T00:00:00Z",
          "dateModified": "2025-04-07T00:00:00Z",
          "publisher": {
            "@type": "Organization",
            "name": "Pokédex",
            "logo": {
              "@type": "ImageObject",
              "url": `${origin}/images/pokedex.svg`
            }
          }
        })}
      </script>
    </Helmet>
  );
};
