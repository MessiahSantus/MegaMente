import { tool } from "@opencode-ai/plugin"
import * as fs from "fs/promises"
import * as path from "path"

// ============================================================
// Amnesia-No-More: Custom Tool de Memória
// Permite ao LLM salvar, buscar e listar memórias persistentes
// ============================================================

interface MemoryFragment {
  id: string
  timestamp: string
  type: "short-term" | "medium-term" | "long-term"
  category: string
  content: string
  project_id: string
  session_id?: string
}

function getMemoryDir(worktree: string): string {
  return path.join(worktree, ".opencode", "memory")
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

async function readJsonl(filePath: string): Promise<MemoryFragment[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return content.split("\n").filter(Boolean).map(line => JSON.parse(line))
  } catch {
    return []
  }
}

async function getAllMemories(memDir: string): Promise<MemoryFragment[]> {
  const short = await readJsonl(path.join(memDir, "short_term.jsonl"))
  const medium = await readJsonl(path.join(memDir, "medium_term.jsonl"))
  const long = await readJsonl(path.join(memDir, "long_term.jsonl"))
  return [...short, ...medium, ...long]
}

async function rebuildManifest(memDir: string, projectId: string) {
  const all = await getAllMemories(memDir)
  const projectMemories = all.filter(m => m.project_id === projectId)

  const longTerm = projectMemories.filter(m => m.type === "long-term")
  const mediumTerm = projectMemories.filter(m => m.type === "medium-term")
  const shortTerm = projectMemories.filter(m => m.type === "short-term")

  let md = `# 🧠 Memory Manifest — ${projectId}\n\n`
  md += `> Gerado automaticamente pelo Amnesia-No-More. Última atualização: ${new Date().toISOString()}\n\n`

  if (longTerm.length > 0) {
    md += `## Memória de Longo Prazo (Permanente)\n\n`
    for (const m of longTerm.slice(-20)) {
      md += `- **[${m.category}]** ${m.content}\n`
    }
    md += `\n`
  }

  if (mediumTerm.length > 0) {
    md += `## Memória de Médio Prazo (Sessões Recentes)\n\n`
    for (const m of mediumTerm.slice(-10)) {
      md += `- _(${new Date(m.timestamp).toLocaleDateString()})_ ${m.content.substring(0, 200)}\n`
    }
    md += `\n`
  }

  if (shortTerm.length > 0) {
    md += `## Memória de Curto Prazo (Sessão Atual/Última)\n\n`
    for (const m of shortTerm.slice(-5)) {
      md += `- ${m.content.substring(0, 150)}\n`
    }
    md += `\n`
  }

  await fs.writeFile(path.join(memDir, ".memory-manifest.md"), md)
}

// ─── Tool: Salvar memória de longo prazo ─────────────────────────

export const save = tool({
  description: "Salva uma memória importante de longo prazo (decisão, padrão de código, arquitetura, bug resolvido ou preferência do usuário). Use sempre que uma informação crítica for definida e deva ser lembrada permanentemente.",
  args: {
    content: tool.schema.string().describe("O conteúdo detalhado da memória a ser salva permanentemente."),
    category: tool.schema.enum([
      "decision",
      "code_pattern",
      "architecture",
      "bug_fix",
      "user_preference",
    ]).optional().describe("Categoria da memória. Padrão: decision"),
  },
  async execute(args, context) {
    const { worktree } = context
    const projectId = path.basename(worktree)
    const memDir = getMemoryDir(worktree)
    await fs.mkdir(memDir, { recursive: true })

    const fragment: MemoryFragment = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: "long-term",
      category: args.category || "decision",
      content: args.content,
      project_id: projectId,
    }

    const filePath = path.join(memDir, "long_term.jsonl")
    await fs.appendFile(filePath, JSON.stringify(fragment) + "\n")

    await rebuildManifest(memDir, projectId)

    return `✅ Memória de longo prazo salva com sucesso.\n- ID: ${fragment.id}\n- Categoria: ${fragment.category}\n- Conteúdo: ${fragment.content.substring(0, 100)}...`
  },
})

// ─── Tool: Buscar memórias por palavra-chave ─────────────────────

export const search = tool({
  description: "Busca memórias persistentes por palavra-chave em todas as camadas (curto, médio e longo prazo). Use quando precisar relembrar decisões, padrões ou contexto anterior.",
  args: {
    keyword: tool.schema.string().describe("Palavra-chave para buscar nas memórias."),
    layer: tool.schema.enum(["short-term", "medium-term", "long-term"]).optional().describe("Filtrar por camada específica. Se omitido, busca em todas."),
  },
  async execute(args, context) {
    const { worktree } = context
    const projectId = path.basename(worktree)
    const memDir = getMemoryDir(worktree)

    const all = await getAllMemories(memDir)
    const results = all.filter(m =>
      m.project_id === projectId &&
      (args.layer ? m.type === args.layer : true) &&
      (m.content.toLowerCase().includes(args.keyword.toLowerCase()) ||
       m.category.toLowerCase().includes(args.keyword.toLowerCase()))
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (results.length === 0) {
      return `Nenhuma memória encontrada para "${args.keyword}".`
    }

    const formatted = results.slice(0, 10).map(m =>
      `[${m.type}] [${m.category}] (${new Date(m.timestamp).toLocaleDateString()})\n  ${m.content}`
    ).join("\n\n")

    return `Encontradas ${results.length} memória(s) para "${args.keyword}":\n\n${formatted}`
  },
})

// ─── Tool: Listar memórias recentes ──────────────────────────────

export const list = tool({
  description: "Lista as memórias mais recentes. Use para recapitular o estado do projeto ou ver decisões recentes.",
  args: {
    layer: tool.schema.enum(["short-term", "medium-term", "long-term"]).optional().describe("Filtrar por camada. Se omitido, mostra todas."),
    limit: tool.schema.number().optional().describe("Número máximo de memórias. Padrão: 10"),
  },
  async execute(args, context) {
    const { worktree } = context
    const projectId = path.basename(worktree)
    const memDir = getMemoryDir(worktree)
    const limit = args.limit || 10

    const all = await getAllMemories(memDir)
    const results = all
      .filter(m =>
        m.project_id === projectId &&
        (args.layer ? m.type === args.layer : true)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    if (results.length === 0) {
      return "Nenhuma memória registrada ainda."
    }

    const formatted = results.map(m =>
      `[${m.type}] [${m.category}] (${new Date(m.timestamp).toLocaleDateString()})\n  ${m.content.substring(0, 200)}`
    ).join("\n\n")

    return `${results.length} memória(s) mais recentes:\n\n${formatted}`
  },
})
