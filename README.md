# React Pokédex

A modern, feature-rich Pokédex application built with React, TypeScript, and Tailwind CSS. This application provides comprehensive information about Pokémon, including detailed stats, evolutions, moves, and trading cards.

## Features

### Core Features
- User authentication with email/password and Google login
- Personal favorites collection for registered users
- User profiles with customizable avatars
- Infinite scrolling through Pokémon database
- Advanced filtering system with multiple criteria
- Detailed Pokémon information pages
- Smooth loading animations and transitions
- Fully responsive design for all devices

### Filtering System
- Filter Pokémon by:
  - Types (Fire, Water, Grass, etc.)
  - Moves (specific attacks and abilities)
  - Generation (I through IX)
  - Weight range
  - Height range
  - Evolution status
  - Mega evolution capability

### Pokémon Details
- Comprehensive stats visualization
- Evolution chains with evolution methods
- Complete move lists with details
- Type effectiveness chart
- Abilities and hidden abilities
- SEO-optimized content with canonical URLs

### Trading Card Game
- View Pokémon trading cards
- Interactive card display with animations
- Card rarity and set information
- Modal view for larger card images

### UI Enhancements
- Related Pokémon carousel for easy navigation
- Type-themed color schemes for Pokémon pages
- Animated transitions between pages
- Dark mode support

## Technologies Used

- **Frontend Framework**: React with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **Routing**: React Router for navigation
- **State Management**: React Hooks and Context API
- **Data Fetching**: GraphQL with PokeAPI
- **Authentication**: Supabase Auth with Google OAuth integration
- **Database**: Supabase PostgreSQL for user data and favorites
- **Performance Optimization**:
  - Intersection Observer API for infinite scrolling
  - React.memo for component memoization
  - Debounced search inputs
- **SEO**: React Helmet Async for metadata management
- **Animations**: CSS transitions and transforms

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/           # React components
│   ├── auth/             # Authentication components
│   │   ├── Login.tsx     # Login component
│   │   ├── SignUp.tsx    # Sign-up component
│   │   ├── Profile.tsx   # User profile component
│   │   └── ProtectedRoute.tsx # Route protection component
│   ├── filters/          # Filter components and logic
│   ├── PokemonPage.tsx   # Detailed Pokémon view
│   ├── PokemonCards.tsx  # Trading card display
│   ├── PokemonSeoContent.tsx # SEO-optimized content
│   ├── RelatedPokemon.tsx # Related Pokémon carousel
│   ├── FavoritePokemon.tsx # Favorite toggle component
│   ├── Navigation.tsx    # Navigation bar with auth links
│   └── ...               # Other UI components
├── contexts/            # React context providers
│   └── AuthContext.tsx  # Authentication context
├── hooks/               # Custom React hooks
│   ├── usePokemon.ts    # Pokémon data fetching
│   └── useUI.ts         # UI state management
├── lib/                 # Library integrations
│   └── supabase.ts      # Supabase client configuration
├── types/               # TypeScript type definitions
│   └── pokemon.ts       # Pokémon-related types
├── utils/               # Utility functions
└── App.tsx              # Main application component
```

## Recent Improvements

- Implemented user authentication with Supabase (email/password and Google login)
- Added user profiles with customizable usernames and avatars
- Created favorites system for registered users to save preferred Pokémon
- Added protected routes for authenticated content
- Integrated navigation with authentication state
- Added SEO optimization with canonical URLs
- Restored and enhanced Trading Card Game section
- Improved component styling for consistency
- Added carousel for Related Pokémon section
- Enhanced mobile responsiveness
- Optimized performance for large Pokémon lists
