import type { Plugin } from "@opencode-ai/plugin"
import * as fs from "fs/promises"
import * as path from "path"

// ============================================================
// Amnesia-No-More: The Layered Synapse Protocol
// Plugin principal de memória persistente em camadas
// ============================================================

interface MemoryFragment {
  id: string
  timestamp: string
  type: "short-term" | "medium-term" | "long-term"
  category: "decision" | "code_pattern" | "architecture" | "bug_fix" | "user_preference" | "session_summary"
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

function autoCategorize(content: string): MemoryFragment["category"] {
  const lower = content.toLowerCase()
  if (lower.includes("decid") || lower.includes("decision") || lower.includes("escolh")) return "decision"
  if (lower.includes("padrão") || lower.includes("pattern") || lower.includes("convention")) return "code_pattern"
  if (lower.includes("arquitetura") || lower.includes("architecture") || lower.includes("estrutura")) return "architecture"
  if (lower.includes("bug") || lower.includes("fix") || lower.includes("corrig")) return "bug_fix"
  if (lower.includes("preferência") || lower.includes("preference") || lower.includes("prefiro")) return "user_preference"
  return "session_summary"
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return content.split("\n").filter(Boolean).map(line => JSON.parse(line))
  } catch {
    return []
  }
}

async function appendJsonl(filePath: string, data: unknown) {
  await fs.appendFile(filePath, JSON.stringify(data) + "\n")
}

async function writeJsonl(filePath: string, items: unknown[]) {
  await fs.writeFile(filePath, items.map(i => JSON.stringify(i)).join("\n") + (items.length ? "\n" : ""))
}

async function buildManifest(memDir: string, projectId: string): Promise<string> {
  const shortTerm = (await readJsonl<MemoryFragment>(path.join(memDir, "short_term.jsonl")))
    .filter(m => m.project_id === projectId)
  const mediumTerm = (await readJsonl<MemoryFragment>(path.join(memDir, "medium_term.jsonl")))
    .filter(m => m.project_id === projectId)
  const longTerm = (await readJsonl<MemoryFragment>(path.join(memDir, "long_term.jsonl")))
    .filter(m => m.project_id === projectId)

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

  if (longTerm.length === 0 && mediumTerm.length === 0 && shortTerm.length === 0) {
    md += `_Nenhuma memória registrada ainda. Use a tool \`memory\` para salvar decisões importantes._\n`
  }

  return md
}

const MAX_SHORT_TERM = 5
const MAX_MEDIUM_TERM = 15

export const MemoryLayerPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  const projectId = path.basename(worktree)
  const memDir = getMemoryDir(worktree)
  await ensureDir(memDir)

  // Atualiza o manifesto no startup
  const manifest = await buildManifest(memDir, projectId)
  await fs.writeFile(path.join(memDir, ".memory-manifest.md"), manifest)

  return {
    // ─── Evento: Nova sessão criada ───────────────────────────────
    event: async ({ event }) => {
      if (event.type === "session.created") {
        await ensureDir(memDir)

        // Gera o .session_context.md com memórias relevantes para injeção
        const longTerm = (await readJsonl<MemoryFragment>(path.join(memDir, "long_term.jsonl")))
          .filter(m => m.project_id === projectId)
        const mediumTerm = (await readJsonl<MemoryFragment>(path.join(memDir, "medium_term.jsonl")))
          .filter(m => m.project_id === projectId)

        let ctx = ""
        if (longTerm.length > 0) {
          ctx += `\n## Decisões e Padrões Permanentes\n\n`
          for (const m of longTerm.slice(-15)) {
            ctx += `- **[${m.category}]** ${m.content}\n`
          }
        }
        if (mediumTerm.length > 0) {
          ctx += `\n## Contexto de Sessões Recentes\n\n`
          for (const m of mediumTerm.slice(-8)) {
            ctx += `- _(${new Date(m.timestamp).toLocaleDateString()})_ ${m.content.substring(0, 200)}\n`
          }
        }

        if (ctx) {
          await fs.writeFile(
            path.join(worktree, ".opencode", ".session_context.md"),
            `# Contexto Recuperado (Amnesia-No-More)\n${ctx}`
          )
        }

        // Atualiza manifesto
        const newManifest = await buildManifest(memDir, projectId)
        await fs.writeFile(path.join(memDir, ".memory-manifest.md"), newManifest)
      }

      // ─── Evento: Sessão ficou idle (acabou) ──────────────────────
      if (event.type === "session.idle") {
        await ensureDir(memDir)
        const shortTermFile = path.join(memDir, "short_term.jsonl")
        const mediumTermFile = path.join(memDir, "medium_term.jsonl")

        // Captura resumo da sessão como memória de curto prazo
        const sessionSummary: MemoryFragment = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          type: "short-term",
          category: "session_summary",
          content: `Sessão encerrada em ${new Date().toLocaleString()}. Verifique o histórico para detalhes.`,
          project_id: projectId,
        }
        await appendJsonl(shortTermFile, sessionSummary)

        // Promoção: se short-term excede o limite, promove o mais antigo para medium-term
        const shortTermAll = await readJsonl<MemoryFragment>(shortTermFile)
        const projectShort = shortTermAll.filter(m => m.project_id === projectId)

        if (projectShort.length > MAX_SHORT_TERM) {
          const toPromote = projectShort.slice(0, projectShort.length - MAX_SHORT_TERM)
          const toKeep = projectShort.slice(projectShort.length - MAX_SHORT_TERM)

          for (const m of toPromote) {
            m.type = "medium-term"
            await appendJsonl(mediumTermFile, m)
          }

          // Reescreve short-term com apenas os que ficam + memórias de outros projetos
          const otherProjects = shortTermAll.filter(m => m.project_id !== projectId)
          await writeJsonl(shortTermFile, [...otherProjects, ...toKeep])
        }

        // Trim medium-term se exceder limite
        const mediumTermAll = await readJsonl<MemoryFragment>(mediumTermFile)
        const projectMedium = mediumTermAll.filter(m => m.project_id === projectId)
        if (projectMedium.length > MAX_MEDIUM_TERM) {
          const otherProjects = mediumTermAll.filter(m => m.project_id !== projectId)
          const trimmed = projectMedium.slice(projectMedium.length - MAX_MEDIUM_TERM)
          await writeJsonl(mediumTermFile, [...otherProjects, ...trimmed])
        }

        // Atualiza manifesto
        const newManifest = await buildManifest(memDir, projectId)
        await fs.writeFile(path.join(memDir, ".memory-manifest.md"), newManifest)
      }
    },

    // ─── Hook de compactação ─────────────────────────────────────
    "experimental.session.compacting": async (input, output) => {
      // Injeta o manifesto de memória no contexto de compactação
      // para que informações críticas sobrevivam à compactação
      const manifestPath = path.join(memDir, ".memory-manifest.md")
      try {
        const manifestContent = await fs.readFile(manifestPath, "utf-8")
        output.context.push(`
## Amnesia-No-More: Memória Persistente do Projeto

IMPORTANTE: As informações abaixo são memórias persistentes do projeto que DEVEM ser preservadas durante a compactação.

${manifestContent}
`)
      } catch {
        // Manifesto ainda não existe, ignora
      }
    },
  }
}
