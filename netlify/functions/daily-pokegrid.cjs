const { createClient } = require('@supabase/supabase-js');

// Netlify scheduled function for daily PokéGrid generation
// This runs automatically based on the schedule in netlify.toml

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Starting daily PokéGrid generation...');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Calculate target date (today)
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    console.log(`Generating grid for ${dateString}`);

    // Call the Supabase Edge Function
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/pokegrid-scheduler?action=generate_daily&start_date=${dateString}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Edge function failed: ${response.status} - ${JSON.stringify(result)}`);
    }

    if (!result.success) {
      throw new Error(`Grid generation failed: ${result.error || 'Unknown error'}`);
    }

    console.log('✅ Daily PokéGrid generated successfully');
    console.log('   Date:', result.result.date);
    console.log('   Constraints:', result.result.constraints);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Daily PokéGrid generated successfully',
        date: dateString,
        result: result.result
      })
    };

  } catch (error) {
    console.error('❌ Daily PokéGrid generation failed:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
