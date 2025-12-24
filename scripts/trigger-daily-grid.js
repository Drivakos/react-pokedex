#!/usr/bin/env node

/**
 * Trigger Daily PokéGrid Generation
 *
 * This script can be called from external cron services like:
 * - cron-job.org
 * - easycron.com
 * - GitHub Actions
 * - Any webhook service
 *
 * Usage:
 *   node scripts/trigger-daily-grid.js
 *
 * Or call the endpoint directly:
 *   curl -X POST https://your-site.netlify.app/.netlify/functions/daily-pokegrid
 */

import https from 'https';

async function triggerDailyGrid() {
  const netlifySiteUrl = process.env.NETLIFY_SITE_URL || 'https://your-site.netlify.app';

  console.log('🔄 Triggering daily PokéGrid generation...');
  console.log('Target URL:', netlifySiteUrl);

  return new Promise((resolve, reject) => {
    const url = new URL('/.netlify/functions/daily-pokegrid', netlifySiteUrl);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PokéGrid-Daily-Trigger/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (res.statusCode === 200 && result.success) {
            console.log('✅ Daily PokéGrid generated successfully!');
            console.log('   Date:', result.date);
            console.log('   Constraints:', result.result?.constraints);
            resolve(result);
          } else {
            console.error('❌ Grid generation failed:', result.error);
            reject(new Error(result.error || 'Grid generation failed'));
          }
        } catch (e) {
          console.error('❌ Invalid response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.setTimeout(30000, () => {
      console.error('❌ Request timed out');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Alternative: Call Supabase Edge Function directly
async function triggerViaSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not set');
  }

  console.log('🔄 Triggering via Supabase Edge Function...');

  return new Promise((resolve, reject) => {
    const url = new URL('/functions/v1/pokegrid-scheduler?action=generate_daily', supabaseUrl);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PokéGrid-Daily-Trigger/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (res.statusCode === 200 && result.success) {
            console.log('✅ Daily PokéGrid generated successfully!');
            console.log('   Date:', result.result.date);
            resolve(result);
          } else {
            console.error('❌ Grid generation failed:', result.error);
            reject(new Error(result.error || 'Grid generation failed'));
          }
        } catch (e) {
          console.error('❌ Invalid response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.setTimeout(30000, () => {
      console.error('❌ Request timed out');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Main execution
async function main() {
  try {
    // Try Netlify function first, fallback to Supabase
    if (process.env.NETLIFY_SITE_URL) {
      await triggerDailyGrid();
    } else {
      console.log('Netlify URL not set, using Supabase Edge Function...');
      await triggerViaSupabase();
    }
  } catch (error) {
    console.error('❌ Daily grid generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { triggerDailyGrid, triggerViaSupabase };
