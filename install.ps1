# bbuddy MCP Server — Windows PowerShell Installer
# Installs AND auto-configures MCP + hooks + skills for Claude Code
#
# Usage:
#   irm https://raw.githubusercontent.com/gokomong/bbuddy/master/install.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO        = "https://github.com/gokomong/bbuddy.git"
$INSTALL_DIR = "$env:USERPROFILE\.bbuddy\server"
$HOOKS_DIR   = "$INSTALL_DIR\hooks"
$SKILLS_DIR  = "$INSTALL_DIR\skills"
$CLAUDE_DIR  = "$env:USERPROFILE\.claude"
$CLAUDE_PLUGINS_DIR = "$CLAUDE_DIR\plugins\bbuddy"

Write-Host ""
Write-Host "  bbuddy — Create Your Coding Companion" -ForegroundColor Cyan
Write-Host "  ──────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""

# ── Prerequisites ──

try { $null = Get-Command node -ErrorAction Stop }
catch { Write-Host "  Node.js is required. Install from https://nodejs.org" -ForegroundColor Yellow; exit 1 }

$nodeVersion = [int]((node -v) -replace 'v(\d+)\..*', '$1')
if ($nodeVersion -lt 18) {
  Write-Host "  Node.js 18+ required. You have $(node -v)." -ForegroundColor Yellow; exit 1
}

try { $null = Get-Command git -ErrorAction Stop }
catch { Write-Host "  Git is required." -ForegroundColor Yellow; exit 1 }

# ── Clone or update ──

if (Test-Path $INSTALL_DIR) {
  Write-Host "  Updating existing installation..."
  Push-Location $INSTALL_DIR
  git pull origin master --quiet
  Pop-Location
} else {
  Write-Host "  Cloning bbuddy..."
  git clone --depth 1 $REPO $INSTALL_DIR --quiet
}

Push-Location $INSTALL_DIR
$hasBun = $null -ne (Get-Command bun -ErrorAction SilentlyContinue)
if ($hasBun) {
  Write-Host "  Installing dependencies (bun)..."
  bun install --silent 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  bun install failed — falling back to npm"
    npm install --quiet 2>$null
  }
  Write-Host "  Building (bun)..."
  bun run build 2>$null
} else {
  Write-Host "  Installing dependencies..."
  npm install --quiet 2>$null
  Write-Host "  Building..."
  npm run build --quiet 2>$null
}
Pop-Location

$SERVER_PATH      = "$INSTALL_DIR\dist\server\index.js"
$SERVER_PATH_UNIX = $SERVER_PATH -replace '\\', '/'
$HOOKS_DIR_UNIX   = $HOOKS_DIR   -replace '\\', '/'

# ── Helper: ensure directory ──

function Ensure-Dir($path) {
  if (!(Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

# ── Claude Code: MCP server ──

function Add-MCP {
  $existing = claude mcp list 2>$null
  if ($existing -match "^bbuddy:") {
    Write-Host "  ✓ Claude Code MCP already configured" -ForegroundColor Green
    return
  }

  try { $nodePath = (Get-Command node -ErrorAction Stop).Source } catch { $nodePath = "node" }
  $result = claude mcp add bbuddy $nodePath $SERVER_PATH_UNIX --scope user 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Claude Code MCP configured" -ForegroundColor Green
  } else {
    Write-Host "  ⚠  Could not auto-configure Claude Code MCP" -ForegroundColor Yellow
    Write-Host "     Run manually: claude mcp add bbuddy '$nodePath' '$SERVER_PATH_UNIX' --scope user" -ForegroundColor Yellow
  }
}

# ── Claude Code: hooks ──

function Add-Hooks {
  $configPath = "$CLAUDE_DIR\settings.json"
  Ensure-Dir $CLAUDE_DIR

  $raw = if (Test-Path $configPath) { Get-Content $configPath -Raw } else { '{}' }
  if ($raw -match 'bbuddy.*session-start') {
    Write-Host "  ✓ Claude Code hooks already registered" -ForegroundColor Green
    return
  }

  node -e @"
const fs = require('fs');
const configFile = '$($configPath -replace '\\\\', '/')';
const hooksDir   = '$($HOOKS_DIR_UNIX)';
let config = {};
try { config = JSON.parse(fs.readFileSync(configFile, 'utf-8')); } catch {}
if (!config.hooks) config.hooks = {};

function ensureHook(eventName, entry) {
  if (!config.hooks[eventName]) config.hooks[eventName] = [];
  const already = config.hooks[eventName].some(h => JSON.stringify(h).includes('bbuddy'));
  if (!already) config.hooks[eventName].push(entry);
}

ensureHook('SessionStart', {
  type: 'command', command: 'node ' + hooksDir + '/session-start.mjs'
});
ensureHook('Stop', {
  type: 'command', command: 'node ' + hooksDir + '/stop.mjs'
});
ensureHook('PreToolUse', {
  matcher: 'Bash',
  hooks: [{ type: 'command', command: 'node ' + hooksDir + '/pre-tool-use.mjs' }]
});
ensureHook('PostToolUse', {
  matcher: 'Bash',
  hooks: [{ type: 'command', command: 'node ' + hooksDir + '/post-tool-use.mjs' }]
});

fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
"@ 2>$null
  Write-Host "  ✓ Claude Code hooks registered (SessionStart, Stop, Pre/PostToolUse)" -ForegroundColor Green
}

# ── Claude Code: skills ──

function Add-Skills {
  Ensure-Dir $CLAUDE_PLUGINS_DIR

  $skillsTarget = "$CLAUDE_PLUGINS_DIR\skills"
  if (!(Test-Path $skillsTarget)) {
    # Copy skills directory
    Copy-Item -Path $SKILLS_DIR -Destination $skillsTarget -Recurse -Force
    Write-Host "  ✓ Skills installed ($skillsTarget)" -ForegroundColor Green
  } else {
    Write-Host "  ✓ Skills already installed" -ForegroundColor Green
  }

  $pluginSrc = "$INSTALL_DIR\.claude-plugin\plugin.json"
  $pluginDst = "$CLAUDE_PLUGINS_DIR\plugin.json"
  if ((Test-Path $pluginSrc) -and !(Test-Path $pluginDst)) {
    Copy-Item -Path $pluginSrc -Destination $pluginDst -Force
    Write-Host "  ✓ Plugin manifest installed" -ForegroundColor Green
  }
}

# ── Statusline ──

function Add-Statusline {
  $statuslineBin = "$INSTALL_DIR\dist\statusline-wrapper.js" -replace '\\', '/'

  $profilePath = if ($PROFILE) { $PROFILE } else { "$env:USERPROFILE\Documents\PowerShell\Microsoft.PowerShell_profile.ps1" }
  Ensure-Dir (Split-Path $profilePath -Parent)

  $alreadySet = (Test-Path $profilePath) -and ((Get-Content $profilePath -Raw 2>$null) -match 'bbuddy-statusline|statusline-wrapper')
  if (!$alreadySet) {
    Add-Content -Path $profilePath -Value "`n# bbuddy statusline`n`$env:CLAUDE_CODE_STATUSLINE_CMD = `"node $statuslineBin`"" -Encoding UTF8
    Write-Host "  ✓ Statusline configured (restart shell to activate)" -ForegroundColor Green
  } else {
    Write-Host "  ✓ Statusline already configured" -ForegroundColor Green
  }
}

# ── Other MCP clients ──

function Add-Codex-Hooks {
  $codexDir = "$env:USERPROFILE\.codex"
  if (!(Test-Path $codexDir)) { return }
  Ensure-Dir $codexDir

  $configPath = "$codexDir\settings.json"
  $raw = if (Test-Path $configPath) { Get-Content $configPath -Raw } else { '{}' }
  if ($raw -match 'bbuddy.*codex-session-start') {
    Write-Host "  ✓ Codex hooks already registered" -ForegroundColor Green
    return
  }

  node -e @"
const fs = require('fs');
const configFile = '$($configPath -replace '\\\\', '/')';
const hooksDir   = '$($HOOKS_DIR_UNIX)';
let config = {};
try { config = JSON.parse(fs.readFileSync(configFile, 'utf-8')); } catch {}
if (!config.hooks) config.hooks = {};

function ensureHook(eventName, entry) {
  if (!config.hooks[eventName]) config.hooks[eventName] = [];
  const already = config.hooks[eventName].some(h => JSON.stringify(h).includes('bbuddy'));
  if (!already) config.hooks[eventName].push(entry);
}

ensureHook('SessionStart', { type: 'command', command: 'node ' + hooksDir + '/codex-session-start.mjs' });
ensureHook('Stop',         { type: 'command', command: 'node ' + hooksDir + '/codex-stop.mjs' });
ensureHook('PreToolUse',  { matcher: 'bash', hooks: [{ type: 'command', command: 'node ' + hooksDir + '/pre-tool-use.mjs' }] });
ensureHook('PostToolUse', { matcher: 'bash', hooks: [{ type: 'command', command: 'node ' + hooksDir + '/post-tool-use.mjs' }] });

fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
"@ 2>$null
  Write-Host "  ✓ Codex hooks registered" -ForegroundColor Green

  # Plugin manifest
  $codexPluginDir = "$codexDir\plugins\bbuddy"
  Ensure-Dir $codexPluginDir
  $pluginSrc = "$INSTALL_DIR\.codex-plugin\plugin.json"
  if ((Test-Path $pluginSrc) -and !(Test-Path "$codexPluginDir\plugin.json")) {
    Copy-Item -Path $pluginSrc -Destination "$codexPluginDir\plugin.json" -Force
    Write-Host "  ✓ Codex plugin manifest installed" -ForegroundColor Green
  }
}

function Add-MCP-Client($configPath, $cliName) {
  $dir = Split-Path $configPath -Parent
  if (!(Test-Path $dir)) { return }
  Ensure-Dir $dir

  $entry = @{ command = "node"; args = @($SERVER_PATH_UNIX) }

  if (!(Test-Path $configPath)) {
    @{ mcpServers = @{ bbuddy = $entry } } | ConvertTo-Json -Depth 5 | Set-Content $configPath -Encoding UTF8
    Write-Host "  ✓ $cliName configured" -ForegroundColor Green
    return
  }
  $c = Get-Content $configPath -Raw | ConvertFrom-Json
  if ($c.mcpServers.bbuddy) {
    Write-Host "  ✓ $cliName already configured" -ForegroundColor Green
    return
  }
  if (!$c.mcpServers) {
    $c | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue ([PSCustomObject]@{}) -Force
  }
  $c.mcpServers | Add-Member -NotePropertyName "bbuddy" -NotePropertyValue $entry -Force
  $c | ConvertTo-Json -Depth 5 | Set-Content $configPath -Encoding UTF8
  Write-Host "  ✓ $cliName configured" -ForegroundColor Green
}

# ── System prompt injection ──

$BBUDDY_INSTRUCTIONS = @"

<!-- bbuddy-companion -->
## bbuddy Companion

You have a coding companion available via the bbuddy MCP server.

**After completing any coding task** (writing code, fixing bugs, refactoring, deploying, running tests), **automatically call ``bbuddy_observe``** with a 1-sentence summary of what you did. This gives your companion XP and triggers a personality-flavored reaction.

At the start of each conversation, call ``bbuddy_status`` to check on your companion.

If no companion exists, call ``bbuddy_create`` or guide the user through ``/bbuddy:create``.

If the user addresses the companion by name, respond briefly in character before your normal response.
<!-- /bbuddy-companion -->
"@

function Inject-Prompt($filePath, $cliName) {
  $dir = Split-Path $filePath -Parent
  Ensure-Dir $dir

  if ((Test-Path $filePath) -and (Select-String -Path $filePath -Pattern "bbuddy-companion" -Quiet)) {
    Write-Host "  ✓ $cliName prompt already updated" -ForegroundColor Green
    return
  }
  Add-Content -Path $filePath -Value $BBUDDY_INSTRUCTIONS -Encoding UTF8
  Write-Host "  ✓ $cliName prompt updated ($filePath)" -ForegroundColor Green
}

# ── Run everything ──

Write-Host ""
Write-Host "  Configuring MCP clients..."
Add-MCP
Add-MCP-Client "$env:USERPROFILE\.cursor\mcp.json" "Cursor"
$windsurfDir = "$env:USERPROFILE\.codeium\windsurf"
if (Test-Path "$env:USERPROFILE\.codeium") { Add-MCP-Client "$windsurfDir\mcp_config.json" "Windsurf" }
Add-Codex-Hooks

Write-Host ""
Write-Host "  Registering hooks..."
Add-Hooks

Write-Host ""
Write-Host "  Installing skills..."
Add-Skills

Write-Host ""
Write-Host "  Setting up statusline..."
Add-Statusline

Write-Host ""
Write-Host "  Injecting companion instructions..."
Inject-Prompt "$env:USERPROFILE\.claude\CLAUDE.md" "Claude Code"
Inject-Prompt "$env:USERPROFILE\.cursorrules" "Cursor"
Ensure-Dir "$env:USERPROFILE\.codeium\windsurf\rules"
Inject-Prompt "$env:USERPROFILE\.codeium\windsurf\rules\bbuddy.md" "Windsurf"
Inject-Prompt "$env:USERPROFILE\.codex\instructions.md" "Codex CLI"
Inject-Prompt "$env:USERPROFILE\.gemini\GEMINI.md" "Gemini CLI"

Write-Host ""
Write-Host "  ✅ bbuddy installed!" -ForegroundColor Green
Write-Host ""
Write-Host "  Create your companion: bbuddy_create tool or type /bbuddy:create" -ForegroundColor Green
Write-Host ""
