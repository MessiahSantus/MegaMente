# Amnesia-No-More: The Layered Synapse Protocol

**Amnesia-No-More** is a persistent, multi-layered memory system designed for OpenCode CLI and other agentic environments. It resolves the common issue of context amnesia during session compacting by ensuring that crucial architectural decisions, patterns, and preferences survive indefinitely.

---

## 🧠 Architecture: The 3 Layers of Memory

The protocol is inspired by human memory and categorizes context into three distinct layers:

| Layer | Retention Period | Description & Purpose |
|-------|------------------|-----------------------|
| **Short-Term** | Last 5 Sessions | Volatile memory containing immediate session context and automatic summaries. |
| **Medium-Term** | Last 15 Sessions | Context promoted from short-term memory that remains relevant to the current milestone. |
| **Long-Term** | **Permanent** | Critical architectural decisions, code patterns, user preferences, and resolved complex bugs. |

### How it works
1. **Auto-Promotion**: As sessions close, relevant short-term context is summarized and pushed to medium-term memory.
2. **Explicit Preservation**: The AI uses the `memory_save` tool (as defined in `AGENTS.md`) to write directly to Long-Term Memory.
3. **Context Injection**: Upon starting a new session, a `.memory-manifest.md` is generated and injected into the agent's context, serving as an executive summary.

---

## 🛠 Installation Guide

If you are using the unified **MegaMente** setup, Amnesia-No-More is automatically installed when you run `install.ps1` at the root of the MegaMente project. 

However, if you wish to install it manually into an existing OpenCode project:

### Manual Setup (Windows / Linux / macOS)

1. Create the necessary `.opencode` directories in your project root:
   ```bash
   mkdir -p .opencode/plugins .opencode/tools
   ```
2. Copy the required files from this directory to your project:
   ```bash
   cp .opencode/plugins/memory-layer.ts .opencode/plugins/
   cp .opencode/tools/memory.ts .opencode/tools/
   cp AGENTS.md ./
   cp opencode.json ./
   ```
3. Ensure your `opencode.json` includes the following instructions so the agent loads the memory files:
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "instructions": [
       "AGENTS.md",
       ".opencode/memory/.memory-manifest.md",
       ".opencode/.session_context.md"
     ]
   }
   ```

### .gitignore Configuration

Ensure that transient memory files are not tracked by Git, but keep the core plugins:

```gitignore
# Amnesia-No-More transient memory
.opencode/memory/
.opencode/.session_context.md
```

---

## ⚙️ AI Configuration (`AGENTS.md`)

The `AGENTS.md` file contains the strict system prompt for the AI agent. It defines the tools (`memory_save`, `memory_search`, `memory_list`) and rules for the agent to autonomously manage its memory. **Do not modify `AGENTS.md` unless you want to alter the AI's core behavior.**

---

## 📝 License
Public Domain. Use, modify, and distribute freely.
