/**
 * Script to generate a local moves-db.json from the PokeAPI GraphQL endpoint.
 * This enables the team builder to use local data instead of per-move API calls.
 *
 * Run: node scripts/generate-moves-db.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GRAPHQL_ENDPOINT = 'https://beta.pokeapi.co/graphql/v1beta';

async function fetchAllMoves() {
    console.log('Fetching all moves from PokeAPI GraphQL...');

    const query = `
    query GetAllMoves {
      pokemon_v2_move(order_by: { id: asc }) {
        id
        name
        type: pokemon_v2_type {
          name
        }
        power
        accuracy
        pp
        damage_class: pokemon_v2_movedamageclass {
          name
        }
        target: pokemon_v2_movetarget {
          name
        }
        priority
        flavor_text: pokemon_v2_moveflavortexts(
          where: { pokemon_v2_language: { name: { _eq: "en" } } }
          order_by: { pokemon_v2_versiongroup: { id: desc } }
          limit: 1
        ) {
          flavor_text
        }
        effect: pokemon_v2_moveeffect {
          effect_text: pokemon_v2_moveeffecteffecttexts(
            where: { pokemon_v2_language: { name: { _eq: "en" } } }
            limit: 1
          ) {
            short_effect
          }
        }
      }
    }
  `;

    let response;
    for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
            const wait = Math.pow(2, attempt) * 2000;
            console.log(`  Rate limited, waiting ${wait / 1000}s before retry ${attempt + 1}/5...`);
            await new Promise(r => setTimeout(r, wait));
        }
        response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        if (response.ok || response.status !== 429) break;
    }

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(result.errors[0].message);
    }

    return result.data.pokemon_v2_move;
}

async function main() {
    try {
        const rawMoves = await fetchAllMoves();
        console.log(`Fetched ${rawMoves.length} moves from API`);

        // Transform into a compact, keyed format: { "move-name": { ... } }
        const movesDb = {};

        for (const move of rawMoves) {
            const flavorText = move.flavor_text?.[0]?.flavor_text?.replace(/\n/g, ' ').replace(/\f/g, ' ').trim() || '';
            const shortEffect = move.effect?.effect_text?.[0]?.short_effect || '';

            movesDb[move.name] = {
                id: move.id,
                name: move.name,
                type: move.type?.name || 'normal',
                power: move.power,
                accuracy: move.accuracy,
                pp: move.pp,
                damage_class: move.damage_class?.name || 'status',
                target: move.target?.name || 'selected-pokemon',
                priority: move.priority || 0,
                flavor_text: flavorText,
                short_effect: shortEffect,
            };
        }

        const outputPath = path.join(__dirname, '..', 'src', 'data', 'moves-db.json');
        fs.writeFileSync(outputPath, JSON.stringify(movesDb, null, 2));

        console.log(`✅ Wrote ${Object.keys(movesDb).length} moves to ${outputPath}`);
        console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
    } catch (error) {
        console.error('❌ Error generating moves DB:', error.message);
        process.exit(1);
    }
}

main();
