import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const dotenvPath = path.join(dirname(__dirname), '.env');
if (fs.existsSync(dotenvPath)) {
  console.log('📄 Loading environment variables from .env file');
  const envConfig = fs.readFileSync(dotenvPath, 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
    .reduce((acc, [key, value]) => {
      acc[key] = value.replace(/^['"](.+)['"]$/, '$1').trim();
      return acc;
    }, {});

  // Set environment variables
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
  console.log('✅ Environment variables loaded');
}

// Required environment variables for production
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SITE_URL'
];

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please set these variables before running the production build.');
  process.exit(1);
}
console.log('✅ All required environment variables are set');

// Run security checks before building
console.log('🔒 Running security audit...');
try {
  execSync('npm audit --production', { stdio: 'inherit' });
  console.log('✅ Security audit passed');
} catch (error) {
  console.warn('⚠️ Security audit found issues. Review them before deploying to production.');
  // Continue with build despite warnings
}

// Run linting
console.log('🧹 Running linter...');
try {
  execSync('npm run lint', { stdio: 'inherit' });
  console.log('✅ Linting passed');
} catch (error) {
  console.warn('⚠️ Linting found issues, but continuing with build for production.');
  // Don't exit - allow build to continue despite linting issues
}

// Build the application
try {
  console.log('🔨 Building for production...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Production build completed successfully');
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}

// Generate build info
const packageJsonPath = path.join(dirname(__dirname), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const gitCommit = (() => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
})();

const buildInfo = {
  name: packageJson.name,
  version: packageJson.version,
  buildTime: new Date().toISOString(),
  environment: 'production',
  commit: gitCommit
};

// Create dist directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, '../dist'))) {
  fs.mkdirSync(path.join(__dirname, '../dist'), { recursive: true });
}

// Write build info to file
fs.writeFileSync(
  path.join(__dirname, '../dist/build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);
console.log('✅ Build info created');

// Create robots.txt if it doesn't exist
if (!fs.existsSync(path.join(__dirname, '../public/robots.txt'))) {
  const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
`;
  fs.writeFileSync(path.join(__dirname, '../public/robots.txt'), robotsTxt);
  console.log('✅ robots.txt created');
}

console.log('🚀 Production build is ready for deployment');
