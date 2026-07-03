import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';

const dbPath = path.resolve(process.cwd(), '../../.megamente/global_memory.db');
const memDir = path.dirname(dbPath);

if (!fs.existsSync(memDir)) {
  fs.mkdirSync(memDir, { recursive: true });
}

// Apaga para resetar
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    project_id TEXT NOT NULL,
    tags TEXT NOT NULL
  )
`);

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

const insertStmt = db.prepare(`
  INSERT INTO memories (id, timestamp, type, category, content, project_id, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Simulando dados conectados
const data = [
  { project_id: 'amnesia-no-more', category: 'architecture', type: 'long-term', tags: ['sqlite', 'database', 'core'], content: 'Migramos todo o sistema de LTM (Long Term Memory) para SQLite nativo para resolver gargalos de performance.' },
  { project_id: 'gbrain', category: 'decision', type: 'medium-term', tags: ['core', 'ai-routing', 'performance'], content: 'O gbrain agora roteia as queries pesadas primeiro, consultando o banco SQLite antes de chamar a API do modelo.' },
  { project_id: 'mi4uu-brain', category: 'user_preference', type: 'long-term', tags: ['ui', 'glassmorphism', 'react'], content: 'O usuário adora interfaces dark mode com glassmorphism e partículas de energia.' },
  { project_id: 'mindmuxai-brain', category: 'code_pattern', type: 'long-term', tags: ['react', 'ai-routing', 'visualization'], content: 'Padrão adotado: react-force-graph para visualização de mentes conectadas e sinapses.' },
  { project_id: 'amnesia-no-more', category: 'bug_fix', type: 'short-term', tags: ['database', 'sqlite'], content: 'Corrigido o problema de locks de escrita rodando operações async no DatabaseSync.' },
  { project_id: 'MegaMente', category: 'decision', type: 'long-term', tags: ['core', 'architecture', 'sqlite', 'ui'], content: 'O Cérebro Global unifica todos os 4 agentes. Apenas um banco de dados para governar todos eles.' }
];

data.forEach((item, index) => {
  // Aumenta o tempo para simular histórico
  const time = new Date(Date.now() - (1000 * 60 * 60 * 24 * index)).toISOString();
  
  insertStmt.run(
    generateId(),
    time,
    item.type,
    item.category,
    item.content,
    item.project_id,
    JSON.stringify(item.tags)
  );
});

console.log(`✅ [Seed] ${data.length} memórias injetadas com sucesso e tags cruzadas!`);
db.close();
