# PokéGrid Challenge System

The PokéGrid Challenge is a daily Pokémon puzzle game where players fill a 3x3 grid with Pokémon that satisfy row and column constraints.

## 🎯 How It Works

- **Daily Grids**: Each day features a unique 3x3 grid with different constraints
- **Constraint Types**: Rows and columns have different constraint types (types, generations, stats, etc.)
- **Solvability**: All grids are guaranteed to be solvable with at least one valid solution
- **Social Features**: Compare scores with friends, view leaderboards
- **History**: Access the last 7 days of grids

## 🏗️ System Architecture

### Components

1. **Frontend** (`src/components/PokéGridChallenge.tsx`)
   - Main game interface
   - Grid display and interaction
   - Stats and leaderboards

2. **Game Logic** (`src/utils/pokegrid-game.utils.ts`)
   - Constraint checking
   - Score calculation
   - Game state management

3. **Services** (`src/services/pokegrid.service.ts`)
   - Database operations
   - Progress saving/loading
   - Leaderboard queries

4. **Generation Scripts** (`scripts/generate-daily-grids.js`)
   - Pre-generate daily grids
   - Ensure solvability
   - Local development tool

5. **Edge Functions** (`supabase/functions/pokegrid-scheduler/`)
   - Production grid generation
   - API endpoints for automation

### Database Schema

```sql
-- Main configuration table
CREATE TABLE pokegrid_configurations (
  id BIGSERIAL PRIMARY KEY,
  grid_date DATE UNIQUE NOT NULL,
  configuration JSONB NOT NULL,
  difficulty_level TEXT DEFAULT 'medium',
  generation_seed TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE pokegrid_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  grid_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  total_guesses INTEGER DEFAULT 0,
  correct_guesses INTEGER DEFAULT 0,
  game_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, grid_date)
);

-- Individual guess tracking
CREATE TABLE pokegrid_guesses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  grid_date DATE NOT NULL,
  cell_id TEXT NOT NULL,
  pokemon_id INTEGER NOT NULL,
  pokemon_name TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Setup & Deployment

### 1. Database Setup

Run the migrations in order:
```bash
# Apply all PokéGrid related migrations
# The migrations create tables and functions automatically
```

### 2. Deploy Edge Functions

```bash
# Deploy the scheduler function
npx supabase functions deploy pokegrid-scheduler
```

### 3. Set Up Automation

The system uses GitHub Actions for daily grid generation:

**Required GitHub Secrets:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key
- `SUPABASE_ACCESS_TOKEN`: For function deployment
- `SUPABASE_PROJECT_REF`: Project reference ID

**Workflow Features:**
- Runs daily at 23:30 UTC
- Generates tomorrow's grid
- Manual trigger option
- Automatic verification

### 4. Generate Initial Grids

For development or backfilling:

```bash
# Generate today's grid
node scripts/generate-daily-grids.js

# Generate next 7 days
node scripts/generate-daily-grids.js 7

# Backfill yesterday
node scripts/generate-daily-grids.js -1
```

## 🧪 Testing

### Unit Tests

```bash
# Run all PokéGrid tests
npm test -- --testPathPattern="constraint|grid|solvability|integration"

# Specific test categories
npm test -- --testPathPattern="constraint-validation"  # Constraint logic
npm test -- --testPathPattern="grid-solvability"      # Solvability checks
npm test -- --testPathPattern="pokegrid-utils"        # Game utilities
npm test -- --testPathPattern="grid-generation"       # Generation logic
```

### Integration Tests

```bash
# Full integration test suite
npm run test:integration

# Test specific components
npm test -- --testPathPattern="integration"
```

## 🎮 Game Mechanics

### Constraint Types

| Type | Description | Examples |
|------|-------------|----------|
| `type` | Pokémon must have this type | Fire, Water, Electric |
| `generation` | From specific generation | Gen I, Gen II, etc. |
| `evolution-stage` | Evolution stage | Starter, Final, Legendary |
| `stat-range` | Stat value ranges | High HP (≥100), Low Speed (≤50) |
| `height-weight` | Size categories | Small, Large, Light, Heavy |
| `type-count` | Number of types | Single Type, Dual Type |
| `move-category` | Can learn specific moves | Earthquake, Surf, Thunder Wave |
| `type-effectiveness` | Weak/strong against types | Weak to Fire, Resists Water |

### Scoring System

```
Base Score: 100 points per cell
Rarity Bonus: +20 points per cell
Attempt Penalty: -10 points per failed attempt
Popularity Multiplier: 0.7x to 2.0x based on guess rarity
```

### Guess Limits

- **Base Guesses**: 9 attempts total
- **Bonus Retries**: 3 additional attempts (unlocked by achieving perfect game)
- **Total Possible**: 12 attempts maximum

## 🔧 Development

### Adding New Constraints

1. **Update Constants** (`src/components/pokegrid/constants.ts`)
   ```typescript
   export const NEW_CONSTRAINTS = [
     { id: 'new-constraint', type: 'new-type', value: 'value', label: 'Label' }
   ];
   ```

2. **Update Validation** (`src/utils/pokegrid-game.utils.ts`)
   ```typescript
   case 'new-type':
     // Add validation logic
     return pokemon.someProperty === constraint.value;
   ```

3. **Update Generation** (`scripts/generate-daily-grids.js`)
   ```javascript
   const NEW_CONSTRAINTS = [/* new constraints */];
   ```

### Testing New Constraints

```bash
# Add test cases to constraint-validation.test.ts
test('should validate new constraint type', () => {
  // Test logic
});
```

## 📊 Monitoring & Analytics

### Key Metrics

- **Daily Active Users**: Players accessing grids
- **Completion Rate**: Percentage finishing daily grids
- **Average Score**: Mean score per grid
- **Perfect Game Rate**: Percentage achieving 9/9 first-try guesses
- **Constraint Usage**: Which constraints are most/least used

### API Endpoints

```
# Get grid configuration
GET /.netlify/functions/pokegrid-scheduler?action=get_daily_status

# Generate new grid (admin)
POST /.netlify/functions/pokegrid-scheduler?action=generate_daily

# Get leaderboard
GET /.netlify/functions/pokegrid-scheduler?action=get_leaderboard
```

## 🐛 Troubleshooting

### Common Issues

1. **Grid Not Loading**
   - Check database connection
   - Verify date is within 7-day window
   - Check for pre-generated configuration

2. **Unsolvable Grids**
   - Verify constraint combinations
   - Check solvability validation logic
   - Review constraint definitions

3. **Score Discrepancies**
   - Check popularity data availability
   - Verify attempt counting logic
   - Review scoring formula

### Debug Commands

```bash
# Check recent grids
SELECT grid_date, difficulty_level FROM pokegrid_configurations
ORDER BY grid_date DESC LIMIT 7;

# Check user progress
SELECT user_id, grid_date, score, completed FROM pokegrid_progress
WHERE grid_date = CURRENT_DATE;

# Verify constraint combinations
SELECT configuration->'rows' as rows, configuration->'cols' as cols
FROM pokegrid_configurations WHERE grid_date = CURRENT_DATE;
```

## 🎯 Future Enhancements

- **Weekly Challenges**: Special themed grids
- **Tournament Mode**: Multi-day competitions
- **Custom Grids**: User-generated challenges
- **Advanced Analytics**: Detailed performance tracking
- **Mobile Optimization**: Touch-friendly interface
- **Offline Mode**: Cache grids for offline play

---

**Built with ❤️ for the Pokémon community**
