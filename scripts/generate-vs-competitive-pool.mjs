import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const catalogPath = fileURLToPath(new URL('../src/data/battle-pokemon-catalog.json', import.meta.url));
const migrationPath = fileURLToPath(new URL(
  '../supabase/migrations/20260912120000_add_random_competitive_vs_teams.sql',
  import.meta.url,
));
const startMarker = '-- BEGIN GENERATED SMOGON POOL';
const endMarker = '-- END GENERATED SMOGON POOL';
const formats = new Set(['gen9ou', 'gen9uu', 'gen9ru', 'gen9nu', 'gen9pu', 'gen9zu']);

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function buildJson(build) {
  return JSON.stringify({
    ability: build.ability,
    moves: build.moves,
    item: build.item,
    nature: build.nature,
    evs: build.evs,
    ivs: build.ivs,
    ...(build.teraType ? { teraType: build.teraType } : {}),
  });
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const rows = catalog.flatMap(pokemon => {
    const build = pokemon.builds?.find(candidate => (
      candidate.source === 'smogon' && formats.has(candidate.format)
    ));
    return build ? [{ pokemon, build }] : [];
  });

  const values = rows.map(({ pokemon, build }) => (
    `  (${pokemon.id}, ${sqlString(build.format)}, ${sqlString(build.name)}, ${sqlString(buildJson(build))}::JSONB)`
  ));
  const generated = [
    startMarker,
    'INSERT INTO public.vs_competitive_builds (pokemon_id, format, build_name, build)',
    'VALUES',
    `${values.join(',\n')}`,
    'ON CONFLICT (pokemon_id, format, build_name) DO UPDATE SET',
    '  build = EXCLUDED.build,',
    '  enabled = TRUE;',
    endMarker,
  ].join('\n');

  const migration = await readFile(migrationPath, 'utf8');
  const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  if (!markerPattern.test(migration)) {
    throw new Error('Could not find the generated Smogon pool markers in the VS migration.');
  }
  await writeFile(migrationPath, migration.replace(markerPattern, generated));

  const formatCounts = Object.fromEntries([...formats].map(format => [
    format,
    rows.filter(entry => entry.build.format === format).length,
  ]));
  console.log(`Generated ${rows.length} VS competitive species from the cached Smogon catalog.`);
  console.log(formatCounts);
}

void main();
