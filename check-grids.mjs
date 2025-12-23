import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

try {
  const today = new Date().toISOString().split('T')[0];
  const result = await supabase
    .from('pokegrid_configurations')
    .select('grid_date, difficulty_level')
    .gte('grid_date', today)
    .order('grid_date', {ascending: true})
    .limit(10);

  console.log('Generated grids:');
  if (result.data && result.data.length > 0) {
    result.data.forEach(grid => {
      console.log(`${grid.grid_date}: ${grid.difficulty_level}`);
    });
  } else {
    console.log('No grids found');
  }
} catch (error) {
  console.error('Error:', error);
}
