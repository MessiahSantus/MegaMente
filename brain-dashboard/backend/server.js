import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const megaMenteDir = path.join(os.homedir(), '.Megamente');
if (!fs.existsSync(megaMenteDir)) {
  fs.mkdirSync(megaMenteDir, { recursive: true });
}
const dbPath = path.join(megaMenteDir, 'global_memory.db');

app.get('/api/neurons', (req, res) => {
  try {
    const db = new DatabaseSync(dbPath);
    // Select all memories
    const memories = db.prepare('SELECT * FROM memories').all();
    db.close();

    const nodes = [];
    const links = [];
    
    // Create Nodes
    memories.forEach(m => {
      let tags = [];
      try { tags = JSON.parse(m.tags); } catch (e) {}

      nodes.push({
        id: m.id,
        domain: m.domain,
        type: m.type,
        tier: m.tier,
        relevance: m.relevance,
        access_count: m.access_count,
        content: m.content,
        tags: tags,
        timestamp: m.timestamp
      });
    });

    // Create Links
    // 1. Link every leaf to its domain hub
    // 2. Link leaves that share secondary tags
    
    // Map to find hubs quickly
    const hubMap = {};
    nodes.filter(n => n.type === 'hub').forEach(hub => {
      hubMap[hub.domain] = hub;
    });

    // To prevent too many heavy cross-links visually, we only link:
    // a) Leaf to its Hub
    // b) Leaf to another Hub if it shares that tag
    // c) Hub to Hub (maybe?)

    for (const node of nodes) {
      if (node.type === 'leaf') {
        // Link to main domain hub
        if (hubMap[node.domain]) {
          links.push({
            source: node.id,
            target: hubMap[node.domain].id,
            value: 1 // strong link
          });
        }
        
        // Link to cross-domain hubs based on tags
        node.tags.forEach(tag => {
          if (tag !== node.domain && hubMap[tag]) {
            links.push({
              source: node.id,
              target: hubMap[tag].id,
              value: 0.5 // weaker cross-link
            });
          }
        });
      }
    }
    
    // Optional: Connect all hubs together loosely
    const hubList = Object.values(hubMap);
    for (let i = 0; i < hubList.length; i++) {
      for (let j = i + 1; j < hubList.length; j++) {
        links.push({
          source: hubList[i].id,
          target: hubList[j].id,
          value: 0.1 // very weak gravity between hubs
        });
      }
    }

    res.json({ nodes, links });
  } catch (error) {
    console.error("Erro ao acessar a Mente Global:", error);
    res.json({ nodes: [], links: [] });
  }
});

app.post('/api/neurons', (req, res) => {
  try {
    const { domain, content, tags } = req.body;
    
    if (!domain || !content) {
      return res.status(400).json({ error: 'Domain and content are required' });
    }

    const db = new DatabaseSync(dbPath);
    
    // Check if domain hub exists
    const hub = db.prepare('SELECT id FROM memories WHERE domain = ? AND type = "hub"').get(domain);
    
    let newNodes = [];
    
    if (!hub) {
      // Create new hub for this domain
      const insertHub = db.prepare(`
        INSERT INTO memories (domain, type, tier, relevance, access_count, content, tags) 
        VALUES (?, 'hub', 'L1', 1.0, 50, ?, '[]')
      `);
      const resultHub = insertHub.run(domain, `Núcleo de ${domain}`);
      
      newNodes.push({
        id: resultHub.lastInsertRowid,
        domain: domain,
        type: 'hub',
        tier: 'L1',
        relevance: 1.0,
        access_count: 50,
        content: `Núcleo de ${domain}`,
        tags: [],
        timestamp: new Date().toISOString()
      });
    }
    
    // Process tags
    let tagsStr = '[]';
    let tagsArr = [];
    if (tags) {
      tagsArr = tags.split(',').map(t => t.trim()).filter(t => t);
      tagsStr = JSON.stringify(tagsArr);
    }
    
    // Create the actual memory (leaf)
    const insertLeaf = db.prepare(`
      INSERT INTO memories (domain, type, tier, relevance, access_count, content, tags) 
      VALUES (?, 'leaf', 'L3', 0.9, 1, ?, ?)
    `);
    
    const resultLeaf = insertLeaf.run(domain, content, tagsStr);
    
    newNodes.push({
      id: resultLeaf.lastInsertRowid,
      domain: domain,
      type: 'leaf',
      tier: 'L3',
      relevance: 0.9,
      access_count: 1,
      content: content,
      tags: tagsArr,
      timestamp: new Date().toISOString()
    });
    
    db.close();
    
    // We don't generate links here, the frontend will just refetch or dynamically link
    res.json({ success: true, newNodes });
    
  } catch (error) {
    console.error("Erro ao criar nova memória:", error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🧠 Tronco Cerebral Ativado. Escutando pulsos na porta ${PORT}`);
});
