# Gym Leader Challenge - Modular Architecture

This directory contains the modular implementation of the Gym Leader Challenge feature, replacing the previous monolithic `GymLeaderChallenge.tsx` component.

## 📁 Structure

### Components (`src/components/gym/`)
- **`GymLeaderChallenge.tsx`** - Main orchestrator component (135 lines)
- **`TypeSelection.tsx`** - Gym type selection phase (44 lines)
- **`PokemonSelection.tsx`** - Initial Pokemon selection (63 lines)
- **`BattlePokemonSelector.tsx`** - Pokemon selection for battles (91 lines)
- **`TeamExpansion.tsx`** - Team expansion/replacement logic (163 lines)
- **`GameOver.tsx`** - Challenge completion screen (35 lines)
- **`index.ts`** - Barrel exports for clean imports

### Hooks (`src/hooks/gym/`)
- **`useGymChallenge.ts`** - Main state management hook (251 lines)
- **`index.ts`** - Hook exports

### Utilities (`src/utils/gym/`)
- **`types.ts`** - TypeScript interfaces and types (54 lines)
- **`constants.ts`** - Constants like type colors and names (27 lines)
- **`pokemonGenerator.ts`** - Pokemon creation and moveset logic (175 lines)
- **`index.ts`** - Utility exports

## 🎯 Benefits of Modularization

### 1. **Maintainability**
- **Before**: 775+ lines in single file
- **After**: Largest component is 163 lines
- Easier to find and fix bugs
- Clearer separation of concerns

### 2. **Reusability**
- Components can be reused in different contexts
- Utilities can be shared across features
- Hooks can be composed for different use cases

### 3. **Testing**
- Each component can be unit tested independently
- Smaller surface area for testing
- Mock dependencies easily

### 4. **Performance**
- Smaller bundle sizes with tree-shaking
- Better code splitting opportunities
- Reduced re-renders (isolated state)

### 5. **Developer Experience**
- Faster IDE navigation and autocomplete
- Clearer import statements
- Better TypeScript support

## 🔄 State Management

The `useGymChallenge` hook manages all state using a reducer-like pattern:

```typescript
const { state, actions } = useGymChallenge();

// State includes:
// - gamePhase, selectedType, gymTeam, battleWins, etc.

// Actions include:
// - handleTypeSelection, handlePokemonSelection, etc.
```

## 🎮 Game Flow

1. **Type Selection** → Choose gym specialization
2. **Pokemon Selection** → Pick starting Pokemon
3. **Battle Pokemon Selection** → Choose fighter
4. **Battle** → Fight challenger (uses existing BattleSimulator)
5. **Team Expansion** → Add/replace Pokemon after victory
6. **Repeat** → Continue until defeat
7. **Game Over** → Show results and restart option

## 🚀 Usage

```tsx
import GymLeaderChallenge from './gym/GymLeaderChallenge';

<GymLeaderChallenge onExit={() => setCurrentView('pokedex')} />
```

## 🔧 Extending the System

### Adding New Phases
1. Add phase to `GamePhase` type in `types.ts`
2. Create new component in `components/gym/`
3. Add phase logic to `useGymChallenge.ts`
4. Wire up in `GymLeaderChallenge.tsx`

### Adding New Pokemon Logic
- Extend `pokemonGenerator.ts` utilities
- Update `GymPokemon` interface if needed
- Add new generator functions

### Adding New UI Components
- Create in `components/gym/`
- Export from `index.ts`
- Use consistent props pattern with other components

## 📦 Dependencies

- React & TypeScript
- Existing services: `cached-api.ts`
- Existing components: `BattleSimulator.tsx`
- Shared utilities: type colors, etc.

## 🎨 Styling

Uses Tailwind CSS with consistent patterns:
- `bg-white rounded-lg shadow-lg p-6` for containers
- Type-specific colors from `TYPE_COLORS`
- Hover states and transitions
- Responsive grid layouts 