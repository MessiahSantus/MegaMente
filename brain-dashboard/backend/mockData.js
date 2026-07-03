import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.resolve(process.cwd(), '../../.megamente/global_memory.db');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Remove old DB if exists to start fresh
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new DatabaseSync(dbPath);

// Create the new schema inspired by autograph
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    domain TEXT,
    type TEXT,
    tier TEXT,
    access_count INTEGER,
    relevance REAL,
    content TEXT,
    tags TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertMemory = db.prepare(`
  INSERT INTO memories (id, domain, type, tier, access_count, relevance, content, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Mock Configuration
const NUM_HUBS = 2;
const NUM_LEAVES_PER_HUB = 4; // Total = ~8 nodes
const DOMAINS = ['frontend', 'backend'];
const TIERS = ['active', 'warm', 'cold', 'archive'];

// Helper to get random item
function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to get weighted tier (more cold/archive than active)
function getWeightedTier() {
  const rand = Math.random();
  if (rand < 0.25) return 'active';   
  if (rand < 0.50) return 'warm';     
  if (rand < 0.75) return 'cold';     
  return 'archive';                   
}

// Generates access count based on tier
function getAccessCount(tier) {
  if (tier === 'active') return Math.floor(Math.random() * 50) + 20;
  if (tier === 'warm') return Math.floor(Math.random() * 19) + 5;
  if (tier === 'cold') return Math.floor(Math.random() * 4) + 1;
  return 1; // archive
}

console.log("Generatings mock data...");
const hubs = [];

// 1. Create Hubs
for (let i = 0; i < NUM_HUBS; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const id = `hub_${domain}_${i}`;
  const tier = 'active'; // Hubs are usually active
  const access_count = 100;
  const relevance = 1.0;
  
  insertMemory.run(
    id,
    domain,
    'hub',
    tier,
    access_count,
    relevance,
    `Main Hub for ${domain}`,
    JSON.stringify([domain, 'hub'])
  );
  
  hubs.push({ id, domain });
}

// 2. Create Leaves (Spokes)
let leafCount = 0;
for (const hub of hubs) {
  const numLeaves = NUM_LEAVES_PER_HUB + (Math.floor(Math.random() * 50) - 25); // Slight randomness in cluster size
  
  for (let j = 0; j < numLeaves; j++) {
    const tier = getWeightedTier();
    const access_count = getAccessCount(tier);
    // Gera uma relevância contínua dependendo do tier para criar um gradiente verdadeiro
    let minR, maxR;
    if (tier === 'active') { minR = 0.75; maxR = 1.0; }
    else if (tier === 'warm') { minR = 0.50; maxR = 0.75; }
    else if (tier === 'cold') { minR = 0.25; maxR = 0.50; }
    else { minR = 0.0; maxR = 0.25; } // archive
    
    const relevance = Number((Math.random() * (maxR - minR) + minR).toFixed(2));
    
    // Sometimes a leaf connects to a secondary domain (cross-linking)
    let tags = [hub.domain];
    if (Math.random() > 0.8) {
      const crossDomain = randomOf(DOMAINS);
      if (crossDomain !== hub.domain) tags.push(crossDomain);
    }
    
    insertMemory.run(
      `leaf_${hub.domain}_${j}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      hub.domain,
      'leaf',
      tier,
      access_count,
      relevance,
      `Leaf node data for ${hub.domain}`,
      JSON.stringify(tags)
    );
    leafCount++;
  }
}

db.close();
console.log(`Mock DB generated! ${hubs.length} Hubs and ${leafCount} Leaves created in ${dbPath}`);
