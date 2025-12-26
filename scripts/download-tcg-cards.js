
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../public/images/tcg-cards');
const DATA_REPO_DIR = path.join(__dirname, '../src/data/pokemon-tcg-data/cards/en');
const METADATA_FILE = path.join(__dirname, '../src/data/tcg-cards-metadata.json');
const DELAY_MS = 400; // Increased delay to be extra safe with the image server

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url, filepath) {
  if (fs.existsSync(filepath)) {
    return 'skipped';
  }

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve('downloaded');
        });
      } else {
        response.resume();
        reject(new Error(`Status code: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Clean up partial file
      reject(err);
    });
  });
}

function loadLocalMetadata() {
    console.log('📦 Loading local metadata from cloned repository...');
    let allCards = [];

    if (!fs.existsSync(DATA_REPO_DIR)) {
        throw new Error(`Data repository not found at ${DATA_REPO_DIR}. Did the git clone finish?`);
    }

    const files = fs.readdirSync(DATA_REPO_DIR);
    
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(DATA_REPO_DIR, file), 'utf8');
                const cards = JSON.parse(content);
                // The JSON files in the repo are typically arrays of cards
                if (Array.isArray(cards)) {
                    allCards = allCards.concat(cards);
                }
            } catch (err) {
                console.error(`Error reading ${file}: ${err.message}`);
            }
        }
    }

    console.log(`✅ Loaded ${allCards.length} cards from local files.`);
    
    // Save the combined metadata for the app to use
    console.log(`💾 Saving combined metadata to ${METADATA_FILE}...`);
    fs.writeFileSync(METADATA_FILE, JSON.stringify(allCards, null, 2));
    
    return allCards;
}

async function downloadImages(cards) {
  console.log('🖼️  Starting image downloads...');
  let downloadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    // The data repo structure uses 'images.large' just like the API
    if (!card.images || !card.images.large) continue;

    const imageUrl = card.images.large;
    // Sanitize the card ID to be safe for filenames (replace invalid chars with underscore)
    const safeId = card.id.replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${safeId}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    try {
        const result = await downloadImage(imageUrl, filepath);
        
        if (result === 'downloaded') {
            downloadedCount++;
            await sleep(DELAY_MS);
        } else {
            skippedCount++;
        }

        // Log progress every 10 cards or so to reduce noise, but keep it responsive
        if (i % 10 === 0 || i === cards.length - 1) {
             const progress = Math.round(((i + 1) / cards.length) * 100);
             process.stdout.write(`\rProgress: ${progress}% (${i + 1}/${cards.length}) | ⬇️  ${downloadedCount} | ⏭️  ${skippedCount} | ❌ ${errorCount}`);
        }

    } catch (error) {
    //   console.error(`\nError downloading ${card.id}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n\n✨ Download process complete!');
  console.log(`Total Downloaded: ${downloadedCount}`);
  console.log(`Total Skipped: ${skippedCount}`);
  console.log(`Total Errors: ${errorCount}`);
}

async function main() {
  console.log('=== Pokémon TCG Downloader (Offline Mode) ===');
  
  try {
      const cards = loadLocalMetadata();
      await downloadImages(cards);
  } catch (err) {
      console.error('Fatal Error:', err.message);
  }
}

main().catch(console.error);
