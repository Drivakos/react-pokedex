import { supabase } from '../lib/supabase';
import { GridConstraint } from '../components/pokegrid/types';
import { TYPE_CONSTRAINTS, OTHER_CONSTRAINTS } from '../components/pokegrid/constants';
import { createSeededRandom, shuffleArray } from '../utils/pokegrid-game.utils';

export interface DailyGridConfig {
  grid_date: string;
  row_constraints: GridConstraint[];
  col_constraints: GridConstraint[];
}

class DailyGridService {
  async getDailyGrid(date: Date): Promise<DailyGridConfig> {
    const dateString = date.toISOString().split('T')[0];
    
    // First check if we have a stored configuration for this date
    const { data: existingConfig } = await supabase
      .from('pokegrid_daily_configs')
      .select('*')
      .eq('grid_date', dateString)
      .single();

    if (existingConfig) {
      return {
        grid_date: dateString,
        row_constraints: existingConfig.row_constraints,
        col_constraints: existingConfig.col_constraints
      };
    }

    // Generate new configuration using seeded random
    const random = createSeededRandom(dateString);
    
    // Ensure we have a good mix of constraint types
    const availableTypes = [...TYPE_CONSTRAINTS];
    const availableOthers = [...OTHER_CONSTRAINTS];
    
    // Select 3 type constraints for rows (ensuring variety)
    const shuffledTypes = shuffleArray(availableTypes, random);
    const rowConstraints = shuffledTypes.slice(0, 3);
    
    // Select 3 other constraints for columns (ensuring variety and no duplicates)
    const shuffledOthers = shuffleArray(availableOthers, random);
    const colConstraints = shuffledOthers.slice(0, 3);

    // Store the configuration for consistency
    try {
      await supabase
        .from('pokegrid_daily_configs')
        .insert({
          grid_date: dateString,
          row_constraints: rowConstraints,
          col_constraints: colConstraints
        });
    } catch (error) {
      // Ignore insert errors (might already exist due to race conditions)
      console.log('Daily grid config already exists or insert failed:', error);
    }

    return {
      grid_date: dateString,
      row_constraints: rowConstraints,
      col_constraints: colConstraints
    };
  }

  async getHistoricalGrids(days: number = 7): Promise<DailyGridConfig[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const { data } = await supabase
      .from('pokegrid_daily_configs')
      .select('*')
      .gte('grid_date', startDate.toISOString().split('T')[0])
      .lte('grid_date', endDate.toISOString().split('T')[0])
      .order('grid_date', { ascending: false });

    return data?.map(config => ({
      grid_date: config.grid_date,
      row_constraints: config.row_constraints,
      col_constraints: config.col_constraints
    })) || [];
  }

  async preGenerateGrids(days: number = 30): Promise<void> {
    const promises = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      promises.push(this.getDailyGrid(date));
    }

    await Promise.all(promises);
  }
}

export const dailyGridService = new DailyGridService();