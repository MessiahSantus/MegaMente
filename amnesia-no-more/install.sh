#!/bin/bash
# ============================================================
# Amnesia-No-More: Instalador Rápido
# Copia os arquivos necessários para o projeto atual
# ============================================================

set -e

PROJECT_DIR="${1:-.}"

echo "🧠 Amnesia-No-More: Instalando no diretório '$PROJECT_DIR'..."

# Detecta o diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cria estrutura
mkdir -p "$PROJECT_DIR/.opencode/plugins"
mkdir -p "$PROJECT_DIR/.opencode/tools"

# Copia arquivos
cp "$SCRIPT_DIR/.opencode/plugins/memory-layer.ts" "$PROJECT_DIR/.opencode/plugins/"
cp "$SCRIPT_DIR/.opencode/tools/memory.ts" "$PROJECT_DIR/.opencode/tools/"
cp "$SCRIPT_DIR/AGENTS.md" "$PROJECT_DIR/"

# Merge ou cria opencode.json
if [ -f "$PROJECT_DIR/opencode.json" ]; then
  echo "⚠️  opencode.json já existe em '$PROJECT_DIR'."
  echo "   Adicione manualmente ao seu opencode.json:"
  echo '   "instructions": ["AGENTS.md", ".opencode/memory/.memory-manifest.md", ".opencode/.session_context.md"]'
else
  cp "$SCRIPT_DIR/opencode.json" "$PROJECT_DIR/"
fi

# Adiciona ao .gitignore
if [ -f "$PROJECT_DIR/.gitignore" ]; then
  if ! grep -q ".opencode/memory/" "$PROJECT_DIR/.gitignore" 2>/dev/null; then
    echo "" >> "$PROJECT_DIR/.gitignore"
    echo "# Amnesia-No-More (memórias locais)" >> "$PROJECT_DIR/.gitignore"
    echo ".opencode/memory/" >> "$PROJECT_DIR/.gitignore"
    echo ".opencode/.session_context.md" >> "$PROJECT_DIR/.gitignore"
  fi
else
  echo "# Amnesia-No-More (memórias locais)" > "$PROJECT_DIR/.gitignore"
  echo ".opencode/memory/" >> "$PROJECT_DIR/.gitignore"
  echo ".opencode/.session_context.md" >> "$PROJECT_DIR/.gitignore"
fi

echo ""
echo "✅ Amnesia-No-More instalado com sucesso!"
echo ""
echo "Próximos passos:"
echo "  1. cd $PROJECT_DIR"
echo "  2. opencode"
echo "  3. O agente agora tem memória persistente!"
echo ""
echo "Arquivos instalados:"
echo "  .opencode/plugins/memory-layer.ts"
echo "  .opencode/tools/memory.ts"
echo "  AGENTS.md"
echo "  opencode.json"
