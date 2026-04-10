#!/usr/bin/env bash
# Buddy MCP Server — Cross-platform installer
# Installs AND auto-configures MCP for your CLI
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/fiorastudio/buddy/master/install.sh | bash

set -e

REPO="https://github.com/fiorastudio/buddy.git"
INSTALL_DIR="$HOME/.buddy/server"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${BLUE}"
echo '  🥚 Buddy MCP Server Installer'
echo '  ─────────────────────────────'
echo -e "${NC}"

# Check prerequisites
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Node.js is required but not found. Install it from https://nodejs.org${NC}"
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

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
  echo "  Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull origin master --quiet
else
  echo "  Cloning Buddy MCP Server..."
  git clone --depth 1 "$REPO" "$INSTALL_DIR" --quiet
fi

cd "$INSTALL_DIR"

echo "  Installing dependencies..."
npm install --quiet 2>/dev/null
echo "  Building..."
npm run build --quiet 2>/dev/null

SERVER_PATH="$INSTALL_DIR/dist/server/index.js"

# ── Auto-configure MCP for detected CLIs ──

configure_claude_code() {
  local config_file="$HOME/.claude/settings.json"
  local config_dir="$HOME/.claude"

  mkdir -p "$config_dir"

  if [ ! -f "$config_file" ]; then
    # Create new settings with buddy
    cat > "$config_file" << EOJSON
{
  "mcpServers": {
    "buddy": {
      "command": "node",
      "args": ["$SERVER_PATH"]
    }
  }
}
EOJSON
    echo -e "  ${GREEN}✓${NC} Claude Code configured ${DIM}($config_file)${NC}"
    return 0
  fi

  # Check if buddy already configured
  if grep -q '"buddy"' "$config_file" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Claude Code already configured"
    return 0
  fi

  # Inject buddy into existing mcpServers (or add mcpServers section)
  if command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync('$config_file', 'utf-8'));
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers.buddy = { command: 'node', args: ['$SERVER_PATH'] };
      fs.writeFileSync('$config_file', JSON.stringify(config, null, 2));
    " 2>/dev/null
    echo -e "  ${GREEN}✓${NC} Claude Code configured ${DIM}($config_file)${NC}"
  fi
}

configure_cursor() {
  local config_file="$HOME/.cursor/mcp.json"

  if [ -d "$HOME/.cursor" ]; then
    if [ ! -f "$config_file" ]; then
      cat > "$config_file" << EOJSON
{
  "mcpServers": {
    "buddy": {
      "command": "node",
      "args": ["$SERVER_PATH"]
    }
  }
}
EOJSON
    elif ! grep -q '"buddy"' "$config_file" 2>/dev/null; then
      node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('$config_file', 'utf-8'));
        if (!config.mcpServers) config.mcpServers = {};
        config.mcpServers.buddy = { command: 'node', args: ['$SERVER_PATH'] };
        fs.writeFileSync('$config_file', JSON.stringify(config, null, 2));
      " 2>/dev/null
    fi
    echo -e "  ${GREEN}✓${NC} Cursor configured ${DIM}($config_file)${NC}"
  fi
}

configure_windsurf() {
  local config_file="$HOME/.codeium/windsurf/mcp_config.json"

  if [ -d "$HOME/.codeium" ]; then
    mkdir -p "$(dirname "$config_file")"
    if [ ! -f "$config_file" ]; then
      cat > "$config_file" << EOJSON
{
  "mcpServers": {
    "buddy": {
      "command": "node",
      "args": ["$SERVER_PATH"]
    }
  }
}
EOJSON
    elif ! grep -q '"buddy"' "$config_file" 2>/dev/null; then
      node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('$config_file', 'utf-8'));
        if (!config.mcpServers) config.mcpServers = {};
        config.mcpServers.buddy = { command: 'node', args: ['$SERVER_PATH'] };
        fs.writeFileSync('$config_file', JSON.stringify(config, null, 2));
      " 2>/dev/null
    fi
    echo -e "  ${GREEN}✓${NC} Windsurf configured ${DIM}($config_file)${NC}"
  fi
}

echo ""
echo "  Configuring MCP clients..."
configure_claude_code
configure_cursor
configure_windsurf

echo ""
echo -e "${GREEN}  ✅ Buddy installed and configured!${NC}"
echo ""
echo -e "  Now open your AI terminal and say: ${GREEN}\"hatch a buddy\"${NC} 🥚"
echo ""
