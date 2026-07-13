import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Dex } from '@pkmn/sim';

const dex = Dex.forGen(9);
const output = fileURLToPath(new URL('../src/data/battle-pokemon-catalog.json', import.meta.url));

const species = dex.species.all().filter(entry => (
  entry.exists &&
  entry.num > 0 &&
  entry.num <= 1025 &&
  !entry.isNonstandard &&
  !entry.battleOnly &&
  !entry.forme
));

function pickMoves(entry) {
  const movePool = [...dex.species.getMovePool(entry.id)]
    .map(moveId => dex.moves.get(moveId))
    .filter(move => (
      move.exists &&
      move.category !== 'Status' &&
      move.basePower >= 35 &&
      move.basePower <= 120 &&
      (move.accuracy === true || move.accuracy >= 75) &&
      !move.selfdestruct &&
      !move.flags.charge &&
      !move.hasCrashDamage
    ))
    .sort((a, b) => {
      const aStab = entry.types.includes(a.type) ? 1 : 0;
      const bStab = entry.types.includes(b.type) ? 1 : 0;
      return (bStab - aStab) || (b.basePower - a.basePower);
    });

  const selected = [];
  const selectedTypes = new Set();
  for (const move of movePool) {
    if (selected.length >= 4) break;
    if (!selectedTypes.has(move.type) || selected.length < 2) {
      selected.push(move.name);
      selectedTypes.add(move.type);
    }
  }
  for (const move of movePool) {
    if (selected.length >= 4) break;
    if (!selected.includes(move.name)) selected.push(move.name);
  }
  return selected.length > 0 ? selected : ['Tackle'];
}

const catalog = species.map(entry => ({
  id: entry.num,
  species: entry.name,
  types: [...entry.types],
  ability: entry.abilities[0],
  moves: pickMoves(entry),
  bst: Object.values(entry.baseStats).reduce((total, stat) => total + stat, 0),
}));

async function main() {
  await mkdir(fileURLToPath(new URL('../src/data', import.meta.url)), { recursive: true });
  await writeFile(output, `${JSON.stringify(catalog)}\n`);
  console.log(`Generated ${catalog.length} Battle Run Pokémon at ${output}`);
}

void main();
