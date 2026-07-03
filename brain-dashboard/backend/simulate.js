import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const megaMenteDir = path.join(os.homedir(), '.Megamente');
if (!fs.existsSync(megaMenteDir)) {
  fs.mkdirSync(megaMenteDir, { recursive: true });
}
const dbPath = path.join(megaMenteDir, 'global_memory.db');
const db = new DatabaseSync(dbPath);

const domains = ['frontend', 'backend', 'design', 'fisica', 'filosofia', 'financas', 'marketing', 'engenharia', 'matematica', 'psicologia'];

console.log("Simulating 500 memories...");

// Preparar insert
const insertMem = db.prepare('INSERT INTO memories (id, domain, type, tier, relevance, content, tags, access_count, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

for (const dom of domains) {
  try {
     insertMem.run(`hub_${dom}`, dom, 'hub', 1, 1.0, `Hub for ${dom}`, '[]', 100, new Date().toISOString());
  } catch(e) {
     // Pode já existir (UNIQUE constraint failed)
  }
}

db.exec('BEGIN TRANSACTION');
for (let i = 0; i < 500; i++) {
  const dom = domains[Math.floor(Math.random() * domains.length)];
  const tags = JSON.stringify([domains[Math.floor(Math.random() * domains.length)]]);
  const relevance = Math.random();
  const access_count = Math.floor(Math.random() * 50);
  
  insertMem.run(
    `sim_${i}_${Date.now()}`,
    dom,
    'leaf',
    2,
    relevance,
    `Simulated memory #${i} for load testing.`,
    tags,
    access_count,
    new Date().toISOString()
  );
}
db.exec('COMMIT');

db.close();
console.log("Simulation complete!");
