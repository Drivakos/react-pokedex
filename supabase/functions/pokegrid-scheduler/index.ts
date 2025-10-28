import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define types for our grid system
interface GridConstraint {
  id: string;
  type: string;
  value: string;
  label: string;
  description: string;
  icon: string;
  svgIcon?: string;
}

interface GridConfiguration {
  date: string;
  size: number;
  constraints: {
    rows: GridConstraint[];
    cols: GridConstraint[];
  };
  seed: string;
  difficulty: string;
  metadata: {
    generatedAt: string;
    version: string;
    algorithm: string;
  };
}

// Constraint definitions (matches frontend constants)
const TYPE_CONSTRAINTS: GridConstraint[] = [
  { id: 'fire-type', type: 'type', value: 'fire', label: 'Fire', description: 'Fire-type Pokémon', icon: '', svgIcon: '/icons/types/fire.svg' },
  { id: 'water-type', type: 'type', value: 'water', label: 'Water', description: 'Water-type Pokémon', icon: '', svgIcon: '/icons/types/water.svg' },
  { id: 'grass-type', type: 'type', value: 'grass', label: 'Grass', description: 'Grass-type Pokémon', icon: '', svgIcon: '/icons/types/grass.svg' },
  { id: 'electric-type', type: 'type', value: 'electric', label: 'Electric', description: 'Electric-type Pokémon', icon: '', svgIcon: '/icons/types/electric.svg' },
  { id: 'psychic-type', type: 'type', value: 'psychic', label: 'Psychic', description: 'Psychic-type Pokémon', icon: '', svgIcon: '/icons/types/psychic.svg' },
  { id: 'ice-type', type: 'type', value: 'ice', label: 'Ice', description: 'Ice-type Pokémon', icon: '', svgIcon: '/icons/types/ice.svg' },
  { id: 'dragon-type', type: 'type', value: 'dragon', label: 'Dragon', description: 'Dragon-type Pokémon', icon: '', svgIcon: '/icons/types/dragon.svg' },
  { id: 'flying-type', type: 'type', value: 'flying', label: 'Flying', description: 'Flying-type Pokémon', icon: '', svgIcon: '/icons/types/flying.svg' },
  { id: 'normal-type', type: 'type', value: 'normal', label: 'Normal', description: 'Normal-type Pokémon', icon: '', svgIcon: '/icons/types/normal.svg' },
  { id: 'fighting-type', type: 'type', value: 'fighting', label: 'Fighting', description: 'Fighting-type Pokémon', icon: '', svgIcon: '/icons/types/fighting.svg' },
  { id: 'poison-type', type: 'type', value: 'poison', label: 'Poison', description: 'Poison-type Pokémon', icon: '', svgIcon: '/icons/types/poison.svg' },
  { id: 'ground-type', type: 'type', value: 'ground', label: 'Ground', description: 'Ground-type Pokémon', icon: '', svgIcon: '/icons/types/ground.svg' },
  { id: 'rock-type', type: 'type', value: 'rock', label: 'Rock', description: 'Rock-type Pokémon', icon: '', svgIcon: '/icons/types/rock.svg' },
  { id: 'bug-type', type: 'type', value: 'bug', label: 'Bug', description: 'Bug-type Pokémon', icon: '', svgIcon: '/icons/types/bug.svg' },
  { id: 'ghost-type', type: 'type', value: 'ghost', label: 'Ghost', description: 'Ghost-type Pokémon', icon: '', svgIcon: '/icons/types/ghost.svg' },
  { id: 'steel-type', type: 'type', value: 'steel', label: 'Steel', description: 'Steel-type Pokémon', icon: '', svgIcon: '/icons/types/steel.svg' },
  { id: 'dark-type', type: 'type', value: 'dark', label: 'Dark', description: 'Dark-type Pokémon', icon: '', svgIcon: '/icons/types/dark.svg' },
  { id: 'fairy-type', type: 'type', value: 'fairy', label: 'Fairy', description: 'Fairy-type Pokémon', icon: '', svgIcon: '/icons/types/fairy.svg' },
];

const OTHER_CONSTRAINTS: GridConstraint[] = [
  { id: 'gen-1', type: 'generation', value: 'generation-i', label: 'Generation I', description: 'Kanto region Pokémon', icon: 'I' },
  { id: 'gen-2', type: 'generation', value: 'generation-ii', label: 'Generation II', description: 'Johto region Pokémon', icon: 'II' },
  { id: 'gen-3', type: 'generation', value: 'generation-iii', label: 'Generation III', description: 'Hoenn region Pokémon', icon: 'III' },
  { id: 'gen-4', type: 'generation', value: 'generation-iv', label: 'Generation IV', description: 'Sinnoh region Pokémon', icon: 'IV' },
  { id: 'gen-5', type: 'generation', value: 'generation-v', label: 'Generation V', description: 'Unova region Pokémon', icon: 'V' },
  { id: 'starter', type: 'evolution-stage', value: 'starter', label: 'Starter', description: 'Starter Pokémon', icon: 'S' },
  { id: 'final-evo', type: 'evolution-stage', value: 'final', label: 'Final Evolution', description: 'Final evolution Pokémon', icon: 'F' },
  { id: 'legendary', type: 'evolution-stage', value: 'legendary', label: 'Legendary', description: 'Legendary Pokémon', icon: 'L' },
  { id: 'single-type', type: 'type-count', value: 'single', label: 'Single Type', description: 'Single-type Pokémon', icon: '1' },
  { id: 'dual-type', type: 'type-count', value: 'dual', label: 'Dual Type', description: 'Dual-type Pokémon', icon: '2' },
  { id: 'high-hp', type: 'stat-range', value: 'hp-high', label: 'High HP', description: 'HP ≥ 100', icon: 'HP' },
  { id: 'high-attack', type: 'stat-range', value: 'attack-high', label: 'High Attack', description: 'Attack ≥ 120', icon: 'ATK' },
  { id: 'high-speed', type: 'stat-range', value: 'speed-high', label: 'High Speed', description: 'Speed ≥ 100', icon: 'SPD' },
  { id: 'small-size', type: 'height-weight', value: 'small', label: 'Small Size', description: 'Height < 1m, Weight < 30kg', icon: 'SM' },
  { id: 'large-size', type: 'height-weight', value: 'large', label: 'Large Size', description: 'Height > 2m or Weight > 100kg', icon: 'LG' },
  { id: 'physical-moves', type: 'move-category', value: 'physical', label: 'Physical Moves', description: 'Can learn physical moves', icon: 'PHY' },
];

// Seeded random number generator
function createSeededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return function() {
    hash = ((hash * 9301) + 49297) % 233280;
    return hash / 233280;
  };
}

// Shuffle array with seeded random
function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate daily grid configuration
function generateDailyGridConfiguration(date: Date, baseSeed?: string): GridConfiguration {
  const dateString = date.toISOString().split('T')[0];
  const seed = baseSeed ? `${baseSeed}-${dateString}` : `daily-${dateString}`;
  const random = createSeededRandom(seed);
  
  // Select 3 random type constraints for rows
  const shuffledTypes = shuffleArray(TYPE_CONSTRAINTS, random);
  const rowConstraints = shuffledTypes.slice(0, 3);
  
  // Select 3 random other constraints for columns
  const shuffledOthers = shuffleArray(OTHER_CONSTRAINTS, random);
  const colConstraints = shuffledOthers.slice(0, 3);
  
  return {
    date: dateString,
    size: 3,
    constraints: {
      rows: rowConstraints,
      cols: colConstraints
    },
    seed,
    difficulty: 'medium',
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      algorithm: 'seeded-shuffle'
    }
  };
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'generate_week';
    const startDate = url.searchParams.get('start_date');
    const weeks = parseInt(url.searchParams.get('weeks') || '1');
    const seed = url.searchParams.get('seed');

    if (action === 'generate_daily') {
      // Generate today's grid if not provided date, or specific date
      const targetDate = startDate ? new Date(startDate) : new Date();
      const dateString = targetDate.toISOString().split('T')[0];
      
      const gridConfig = generateDailyGridConfiguration(targetDate);
      
      // Save to database
      const { data, error } = await supabaseClient.rpc('save_pokegrid_configuration', {
        p_grid_date: gridConfig.date,
        p_configuration: gridConfig,
        p_difficulty_level: gridConfig.difficulty,
        p_generation_seed: gridConfig.seed
      });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Generated daily PokéGrid configuration for ${dateString}`,
          result: {
            date: gridConfig.date,
            configId: data,
            success: true,
            constraints: {
              rows: gridConfig.constraints.rows.map(c => c.label),
              cols: gridConfig.constraints.cols.map(c => c.label)
            }
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'get_daily_status') {
      // Show status for today and last 6 days only
      const today = new Date();
      const status = [];

      for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() - dayOffset);
        
        const { data, error } = await supabaseClient.rpc('get_pokegrid_configuration', {
          p_grid_date: currentDate.toISOString().split('T')[0]
        });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const config = data[0];
          status.push({
            date: config.grid_date,
            difficulty: config.difficulty_level,
            available: true,
            constraints: {
              rows: config.configuration.constraints.rows.map((c: GridConstraint) => c.label),
              cols: config.configuration.constraints.cols.map((c: GridConstraint) => c.label)
            }
          });
        } else {
          status.push({
            date: currentDate.toISOString().split('T')[0],
            difficulty: 'not_generated',
            available: false,
            constraints: null
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          today: today.toISOString().split('T')[0],
          available_days: status.filter(s => s.available).length,
          status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'get_leaderboard') {
      const baseDate = startDate ? new Date(startDate) : getWeekStartDate(new Date());
      
      const { data, error } = await supabaseClient.rpc('get_weekly_pokegrid_leaderboard', {
        p_start_date: baseDate.toISOString().split('T')[0],
        p_limit: 50
      });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          weekStart: baseDate.toISOString().split('T')[0],
          leaderboard: data || []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Invalid action. Use: generate_daily, get_daily_status, or get_leaderboard' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'PokéGrid scheduler function error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper functions
function getNextMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Sunday
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday;
}

function getWeekStartDate(date: Date): Date {
  const weekStart = new Date(date);
  const dayOfWeek = weekStart.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Make Monday the start
  weekStart.setDate(weekStart.getDate() - daysToSubtract);
  return weekStart;
}
