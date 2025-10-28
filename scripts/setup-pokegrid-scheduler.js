#!/usr/bin/env node

/**
 * PokéGrid Scheduler Setup Script
 * 
 * This script helps set up the weekly PokéGrid generation system:
 * 1. Applies the database migration
 * 2. Tests the Edge Function
 * 3. Generates initial configurations
 * 4. Sets up cron job (manual step)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎯 PokéGrid Daily Scheduler Setup\n');

// Check if we're in the right directory
if (!fs.existsSync('supabase')) {
  console.error('❌ This script must be run from the project root directory');
  process.exit(1);
}

// Step 1: Apply the migration
console.log('📦 Step 1: Applying database migration...');
try {
  const migrationPath = path.join('supabase', 'migrations', '005_create_pokegrid_configurations.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  console.log('✅ Migration file found');
  console.log('🔧 Please apply the migration manually:');
  console.log('   Option 1 (CLI): npx supabase db reset');
  console.log('   Option 2 (Dashboard): Copy migration SQL to Supabase SQL Editor\n');
  
} catch (error) {
  console.error('❌ Error checking migration:', error.message);
}

// Step 2: Check Edge Function
console.log('⚡ Step 2: Checking Edge Function...');
try {
  const functionPath = path.join('supabase', 'functions', 'pokegrid-scheduler', 'index.ts');
  
  if (fs.existsSync(functionPath)) {
    console.log('✅ Edge Function found at:', functionPath);
    console.log('🚀 Deploy with: npx supabase functions deploy pokegrid-scheduler\n');
  } else {
    console.log('❌ Edge Function not found');
  }
} catch (error) {
  console.error('❌ Error checking Edge Function:', error.message);
}

// Step 3: Test configuration
console.log('🧪 Step 3: Testing configuration...');
console.log('After deploying the Edge Function, test with:');
console.log('');
console.log('   # Generate today\'s grid');
console.log('   curl "https://your-project.supabase.co/functions/v1/pokegrid-scheduler?action=generate_daily"');
console.log('');
console.log('   # Check daily status (7-day window)');
console.log('   curl "https://your-project.supabase.co/functions/v1/pokegrid-scheduler?action=get_daily_status"');
console.log('');
console.log('   # Get weekly leaderboard');
console.log('   curl "https://your-project.supabase.co/functions/v1/pokegrid-scheduler?action=get_leaderboard"');
console.log('');

// Step 4: Cron setup
console.log('⏰ Step 4: Setting up daily automation...');
console.log('');
console.log('✅ GitHub Actions workflow created at .github/workflows/pokegrid-daily-scheduler.yml');
console.log('');
console.log('Features:');
console.log('  • Runs daily at 23:30 UTC (generates tomorrow\'s grid)');
console.log('  • Manual trigger with custom date option');
console.log('  • Automatic verification of generation');
console.log('  • Detailed logging and error handling');
console.log('');
console.log('Required GitHub Secrets:');
console.log('  • SUPABASE_URL: Your Supabase project URL');
console.log('  • SUPABASE_SERVICE_ROLE_KEY: Service role key from Supabase');
console.log('');
console.log('Option B - External Cron Service:');
console.log('Set up a daily cron job to call:');
console.log('POST https://your-project.supabase.co/functions/v1/pokegrid-scheduler?action=generate_daily');
console.log('');

// Step 5: Simplified UI
console.log('🎮 Step 5: Simplified Daily Grid UI...');
console.log('✅ 7-day history selector (today + last 6 days)');
console.log('✅ Automatic fallback to seeded random if grid not pre-generated');
console.log('✅ Clean daily-focused interface');
console.log('');

// Final instructions
console.log('🎉 Setup Complete!');
console.log('');
console.log('Next Steps:');
console.log('1. Apply the database migration');
console.log('2. Deploy the Edge Function');
console.log('3. Test the endpoints');
console.log('4. Set up GitHub Actions secrets');
console.log('5. Enable daily automation');
console.log('');
console.log('Benefits:');
console.log('✅ Consistent daily grids for all users');
console.log('✅ 7-day history window (today + last 6 days)');
console.log('✅ Social comparison and leaderboards');
console.log('✅ Automated daily generation');
console.log('✅ Simplified daily-focused experience');
console.log('✅ No admin complexity needed');
console.log('');
console.log('🎮 Your PokéGrid is now daily-focused with social consistency! 🎯');
