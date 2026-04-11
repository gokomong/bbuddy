#!/usr/bin/env bash
# bbddy MCP Server — Cross-platform installer
# Installs AND auto-configures MCP + hooks + skills for Claude Code
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/gokomong/bbddy/master/install.sh | bash

set -e

REPO="https://github.com/gokomong/bbddy.git"
INSTALL_DIR="$HOME/.bbddy/server"
HOOKS_DIR="$INSTALL_DIR/hooks"
SKILLS_DIR="$INSTALL_DIR/skills"
CLAUDE_DIR="$HOME/.claude"
CLAUDE_PLUGINS_DIR="$CLAUDE_DIR/plugins/bbddy"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${BLUE}"
echo '  bbddy — Create Your Coding Companion'
echo '  ──────────────────────────────────────'
echo -e "${NC}"

# ── Prerequisites ──

if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Node.js is required but not found. Install from https://nodejs.org${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${YELLOW}Node.js 18+ required. You have $(node -v). Please upgrade.${NC}"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo -e "${YELLOW}Git is required but not found.${NC}"
  exit 1
fi

# ── Clone or update ──

if [ -d "$INSTALL_DIR" ]; then
  echo "  Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull origin master --quiet
else
  echo "  Cloning bbddy..."
  git clone --depth 1 "$REPO" "$INSTALL_DIR" --quiet
fi

cd "$INSTALL_DIR"

echo "  Installing dependencies..."
npm install --quiet 2>/dev/null
echo "  Building..."
npm run build --quiet 2>/dev/null

SERVER_PATH="$INSTALL_DIR/dist/server/index.js"

# ── Claude Code: MCP server ──

configure_claude_code_mcp() {
  local config_file="$CLAUDE_DIR/settings.json"
  mkdir -p "$CLAUDE_DIR"

  if [ ! -f "$config_file" ]; then
    cat > "$config_file" << EOJSON
{
  "mcpServers": {
    "bbddy": {
      "command": "node",
      "args": ["$SERVER_PATH"]
    }
  }
}
EOJSON
    echo -e "  ${GREEN}✓${NC} Claude Code MCP configured"
    return 0
  fi

  if grep -q '"bbddy"' "$config_file" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Claude Code MCP already configured"
    return 0
  fi

  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$config_file', 'utf-8'));
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers.bbddy = { command: 'node', args: ['$SERVER_PATH'] };
    fs.writeFileSync('$config_file', JSON.stringify(config, null, 2));
  " 2>/dev/null
  echo -e "  ${GREEN}✓${NC} Claude Code MCP configured"
}

# ── Claude Code: hooks ──

configure_hooks() {
  local config_file="$CLAUDE_DIR/settings.json"
  mkdir -p "$CLAUDE_DIR"

  if grep -q 'bbddy.*session-start' "$config_file" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Claude Code hooks already registered"
    return 0
  fi

  node -e "
    const fs = require('fs');
    const path = require('path');
    const configFile = '$config_file';
    const hooksDir = '$HOOKS_DIR';

    let config = {};
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf-8')); } catch {}
    if (!config.hooks) config.hooks = {};

    function ensureHook(eventName, entry) {
      if (!config.hooks[eventName]) config.hooks[eventName] = [];
      const already = config.hooks[eventName].some(h => JSON.stringify(h).includes('bbddy'));
      if (!already) config.hooks[eventName].push(entry);
    }

    ensureHook('SessionStart', {
      type: 'command',
      command: 'node ' + path.join(hooksDir, 'session-start.mjs')
    });
    ensureHook('Stop', {
      type: 'command',
      command: 'node ' + path.join(hooksDir, 'stop.mjs')
    });
    ensureHook('PreToolUse', {
      matcher: 'Bash',
      hooks: [{ type: 'command', command: 'node ' + path.join(hooksDir, 'pre-tool-use.mjs') }]
    });
    ensureHook('PostToolUse', {
      matcher: 'Bash',
      hooks: [{ type: 'command', command: 'node ' + path.join(hooksDir, 'post-tool-use.mjs') }]
    });

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  " 2>/dev/null
  echo -e "  ${GREEN}✓${NC} Claude Code hooks registered (SessionStart, Stop, Pre/PostToolUse)"
}

# ── Claude Code: skills (plugin) ──

configure_skills() {
  mkdir -p "$CLAUDE_PLUGINS_DIR"

  if [ -d "$SKILLS_DIR" ]; then
    if [ -L "$CLAUDE_PLUGINS_DIR/skills" ] || [ -d "$CLAUDE_PLUGINS_DIR/skills" ]; then
      echo -e "  ${GREEN}✓${NC} Skills already linked"
    else
      ln -sf "$SKILLS_DIR" "$CLAUDE_PLUGINS_DIR/skills"
      echo -e "  ${GREEN}✓${NC} Skills linked (${CLAUDE_PLUGINS_DIR}/skills)"
    fi
  fi

  local plugin_src="$INSTALL_DIR/.claude-plugin/plugin.json"
  if [ -f "$plugin_src" ] && [ ! -f "$CLAUDE_PLUGINS_DIR/plugin.json" ]; then
    cp "$plugin_src" "$CLAUDE_PLUGINS_DIR/plugin.json"
    echo -e "  ${GREEN}✓${NC} Plugin manifest installed"
  fi
}

# ── Status line ──

configure_statusline() {
  local statusline_bin="$INSTALL_DIR/dist/statusline-wrapper.js"
  local added=false

  for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$rc" ] && ! grep -q 'bbddy-statusline\|statusline-wrapper' "$rc" 2>/dev/null; then
      echo "" >> "$rc"
      echo "# bbddy statusline" >> "$rc"
      echo "export CLAUDE_CODE_STATUSLINE_CMD=\"node $statusline_bin\"" >> "$rc"
      added=true
    fi
  done

  if $added; then
    echo -e "  ${GREEN}✓${NC} Statusline configured ${DIM}(reload shell to activate)${NC}"
  else
    echo -e "  ${GREEN}✓${NC} Statusline binary: ${DIM}node $statusline_bin${NC}"
  fi
}

# ── Other MCP clients ──

configure_cursor() {
  local config_file="$HOME/.cursor/mcp.json"
  if [ ! -d "$HOME/.cursor" ]; then return; fi

  if [ ! -f "$config_file" ]; then
    cat > "$config_file" << EOJSON
{
  "mcpServers": {
    "bbddy": {
      "command": "node",
      "args": ["$SERVER_PATH"]
    }
  }
}
EOJSON
  elif ! grep -q '"bbddy"' "$config_file" 2>/dev/null; then
    node -e "
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync('$config_file', 'utf-8'));
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers.bbddy = { command: 'node', args: ['$SERVER_PATH'] };
      fs.writeFileSync('$config_file', JSON.stringify(config, null, 2));
    " 2>/dev/null
  fi
  echo -e "  ${GREEN}✓${NC} Cursor configured"
}

configure_windsurf() {
  local config_file="$HOME/.codeium/windsurf/mcp_config.json"
  if [ ! -d "$HOME/.codeium" ]; then return; fi

  mkdir -p "$(dirname "$config_file")"
  if [ ! -f "$config_file" ]; then
    cat > "$config_file" << EOJSON
{
  "mcpServers": {
    "bbddy": {
      "command": "node",
      "args": ["$SERVER_PATH"]
    }
  }
}
EOJSON
  elif ! grep -q '"bbddy"' "$config_file" 2>/dev/null; then
    node -e "
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync('$config_file', 'utf-8'));
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers.bbddy = { command: 'node', args: ['$SERVER_PATH'] };
      fs.writeFileSync('$config_file', JSON.stringify(config, null, 2));
    " 2>/dev/null
  fi
  echo -e "  ${GREEN}✓${NC} Windsurf configured"
}

# ── System prompt injection ──

BBDDY_INSTRUCTIONS='<!-- bbddy-companion -->
## bbddy Companion

You have a coding companion available via the bbddy MCP server.

**After completing any coding task** (writing code, fixing bugs, refactoring, deploying, running tests), **automatically call `bbddy_observe`** with a 1-sentence summary of what you did. This gives your companion XP and triggers a personality-flavored reaction.

At the start of each conversation, call `bbddy_status` to check on your companion.

If no companion exists, call `bbddy_create` or guide the user through `/bbddy:create`.

If the user addresses the companion by name, respond briefly in character before your normal response.
<!-- /bbddy-companion -->'

inject_prompt() {
  local file="$1"
  local cli_name="$2"
  local dir
  dir="$(dirname "$file")"
  mkdir -p "$dir"

  if [ -f "$file" ] && grep -q "bbddy-companion" "$file" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $cli_name prompt already updated"
    return 0
  fi
  echo "" >> "$file"
  echo "$BBDDY_INSTRUCTIONS" >> "$file"
  echo -e "  ${GREEN}✓${NC} $cli_name prompt updated ${DIM}($file)${NC}"
}

# ── Run everything ──

echo ""
echo "  Configuring MCP clients..."
configure_claude_code_mcp
configure_cursor
configure_windsurf

echo ""
echo "  Registering hooks..."
configure_hooks

echo ""
echo "  Installing skills..."
configure_skills

echo ""
echo "  Setting up statusline..."
configure_statusline

echo ""
echo "  Injecting companion instructions..."
inject_prompt "$HOME/.claude/CLAUDE.md" "Claude Code"
inject_prompt "$HOME/.cursorrules" "Cursor"
mkdir -p "$HOME/.codeium/windsurf/rules" 2>/dev/null
inject_prompt "$HOME/.codeium/windsurf/rules/bbddy.md" "Windsurf"
inject_prompt "$HOME/.codex/instructions.md" "Codex CLI"
inject_prompt "$HOME/.gemini/GEMINI.md" "Gemini CLI"

echo ""
echo -e "${GREEN}  ✅ bbddy installed!${NC}"
echo ""
echo -e "  Create your companion: ${GREEN}bbddy_create${NC} tool or type ${GREEN}/bbddy:create${NC}"
echo ""
