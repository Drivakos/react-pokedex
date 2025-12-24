const { execSync } = require('child_process');

// Set environment variable for build timestamp
process.env.BUILD_TIMESTAMP = new Date().toISOString();

console.log('🚀 Starting production deployment process...');

// Check for required environment variables
console.log('🔍 Verifying environment variables...');
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please set these variables before deploying.');
  process.exit(1);
}
console.log('✅ Environment variables verified');

// Run production build
console.log('🔨 Building for production...');
try {
  execSync('npm run build:prod', { stdio: 'inherit' });
  console.log('✅ Production build completed');
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}

// Deploy to Netlify if credentials are available
if (process.env.NETLIFY_AUTH_TOKEN && process.env.NETLIFY_SITE_ID) {
  console.log('🚀 Deploying to Netlify...');
  try {
    execSync('npx netlify deploy --prod', { stdio: 'inherit' });
    console.log('✅ Netlify deployment completed');
  } catch (error) {
    console.error('❌ Netlify deployment failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️ Netlify credentials not found. Skipping deployment.');
  console.log('ℹ️ To deploy to Netlify, set NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID environment variables.');
}

console.log('🎉 Deployment process completed successfully!');
