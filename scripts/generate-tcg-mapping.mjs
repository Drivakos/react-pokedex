
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CARDS_DIR = path.join(__dirname, '../src/data/pokemon-tcg-data/cards/en');
const OUTPUT_FILE = path.join(__dirname, '../public/data/pokemon-to-tcg-cards.json');

function generateMapping() {
    console.log('🔍 Generating Pokémon to TCG Cards mapping...');
    const mapping = {};
    let totalCards = 0;

    if (!fs.existsSync(CARDS_DIR)) {
        console.error(`❌ Cards directory not found: ${CARDS_DIR}`);
        return;
    }

    const files = fs.readdirSync(CARDS_DIR);
    
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(CARDS_DIR, file), 'utf8');
                const cards = JSON.parse(content);
                
                if (Array.isArray(cards)) {
                    cards.forEach(card => {
                        if (card.nationalPokedexNumbers && Array.isArray(card.nationalPokedexNumbers)) {
                            card.nationalPokedexNumbers.forEach(pokedexNum => {
                                if (!mapping[pokedexNum]) {
                                    mapping[pokedexNum] = [];
                                }
                                
                                // Store only essential info to keep file size small
                                mapping[pokedexNum].push({
                                    id: card.id,
                                    name: card.name,
                                    rarity: card.rarity || '',
                                    set: {
                                        name: card.set?.name || file.replace('.json', ''),
                                        series: card.set?.series || '',
                                        releaseDate: card.set?.releaseDate || ''
                                    },
                                    // Keep original images as fallbacks
                                    images: {
                                        small: card.images?.small || '',
                                        large: card.images?.large || ''
                                    }
                                });
                                totalCards++;
                            });
                        }
                    });
                }
            } catch (err) {
                console.error(`❌ Error reading ${file}: ${err.message}`);
            }
        }
    }

    // Sort cards for each Pokémon by release date (newest first)
    Object.keys(mapping).forEach(pokedexNum => {
        mapping[pokedexNum].sort((a, b) => {
            if (!a.set.releaseDate) return 1;
            if (!b.set.releaseDate) return -1;
            return b.set.releaseDate.localeCompare(a.set.releaseDate);
        });
    });

    console.log(`✅ Processed ${totalCards} card-to-pokemon links.`);
    console.log(`💾 Saving mapping to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping));
    
    const stats = fs.statSync(OUTPUT_FILE);
    console.log(`📏 Generated file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

generateMapping();
