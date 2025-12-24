// Script to apply Supabase migrations
const fs = require('fs');
const path = require('path');

console.log('🚀 Applying Supabase migrations...\n');

// Check if migrations directory exists
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  console.error('❌ Migrations directory not found:', migrationsDir);
  process.exit(1);
}

// Get all migration files
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log('📁 Found migration files:');
migrationFiles.forEach(file => {
  console.log(`  - ${file}`);
});

console.log('\n🔧 To apply migrations, run one of these commands:\n');

// Option 1: Reset database (recommended for development)
console.log('Option 1 - Reset database (recommended for development):');
console.log('  npx supabase db reset\n');

// Option 2: Apply migrations individually
console.log('Option 2 - Apply migrations individually:');
migrationFiles.forEach((file, index) => {
  const migrationPath = path.join(migrationsDir, file);
  console.log(`  ${index + 1}. Apply ${file}:`);
  console.log(`     npx supabase db push --file ${migrationPath}`);
});

console.log('\n⚠️  IMPORTANT NOTES:');
console.log('  • Make sure Docker Desktop is running');
console.log('  • Make sure you are logged into Supabase CLI');
console.log('  • The popularity system will work automatically once migrations are applied');
console.log('  • Until then, the app uses standard scoring as a fallback');

console.log('\n✨ Once migrations are applied, the social evaluation system will be fully active!');
