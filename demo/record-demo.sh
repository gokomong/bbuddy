#!/usr/bin/env bash
# Records a demo GIF of buddy hatching and reacting
# Requires: terminalizer (npx terminalizer)
#
# Usage:
#   cd buddy-source
#   bash demo/record-demo.sh
#
# This creates demo/buddy-demo.gif

set -e

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$DEMO_DIR")"

cd "$PROJECT_DIR"

# Make sure it's built
npm run build --quiet 2>/dev/null

# Delete old DB for fresh hatch
rm -f ~/.buddy/buddy.db 2>/dev/null

echo "Recording demo with terminalizer..."
echo "When the recording starts, these commands will run automatically."

# Create a terminalizer config
cat > "$DEMO_DIR/demo-config.yml" << 'EOF'
# Terminalizer config for buddy demo
cols: 90
rows: 30
frameDelay: auto
maxIdleTime: 2000
cursorStyle: block
fontFamily: "Monaco, Menlo, monospace"
fontSize: 14
lineHeight: 1.2
letterSpacing: 0
theme:
  background: "#1e1e2e"
  foreground: "#cdd6f4"
  cursor: "#f5e0dc"
  black: "#45475a"
  red: "#f38ba8"
  green: "#a6e3a1"
  yellow: "#f9e2af"
  blue: "#89b4fa"
  magenta: "#f5c2e7"
  cyan: "#94e2d5"
  white: "#bac2de"
EOF

# Create a script that simulates the demo
cat > "$DEMO_DIR/demo-script.sh" << 'SCRIPT'
#!/usr/bin/env bash
# Simulated demo — shows hatch + observe + pet

echo ""
echo "  Let's hatch a buddy! 🥚"
echo ""
sleep 2

# Run hatch
cd /c/Users/steven.wu/Documents/buddy-source 2>/dev/null || cd ~/Documents/buddy-source 2>/dev/null || cd .
echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"buddy_hatch","arguments":{"name":"Nuzzlecap","species":"Mushroom","user_id":"demo-user"}}}' | timeout 10 node dist/server/index.js 2>/dev/null | tail -1 | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=JSON.parse(d);r.result.content.forEach(c=>console.log(c.text))}catch(e){}})"

sleep 3

echo ""
echo "  Let's see what Nuzzlecap thinks of our code... 👀"
echo ""
sleep 2

# Run observe
echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"buddy_observe","arguments":{"summary":"wrote a clean CSV parser with proper error handling","mode":"both"}}}' | timeout 10 node dist/server/index.js 2>/dev/null | tail -1 | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=JSON.parse(d);console.log(r.result.content[0].text)}catch(e){}})"

sleep 3

echo ""
echo "  Time to pet Nuzzlecap! ♥"
echo ""
sleep 2

# Run pet
echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"buddy_pet","arguments":{}}}' | timeout 10 node dist/server/index.js 2>/dev/null | tail -1 | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=JSON.parse(d);r.result.content.forEach(c=>console.log(c.text))}catch(e){}})"

sleep 3
echo ""
echo "  Your buddy is here to stay. 🐾"
echo ""
SCRIPT

chmod +x "$DEMO_DIR/demo-script.sh"

echo ""
echo "Demo script created at: $DEMO_DIR/demo-script.sh"
echo ""
echo "To record:"
echo "  1. Run: npx terminalizer record demo/buddy-demo --config demo/demo-config.yml"
echo "  2. In the recording, run: bash demo/demo-script.sh"
echo "  3. Press Ctrl+D to stop recording"
echo "  4. Run: npx terminalizer render demo/buddy-demo -o demo/buddy-demo.gif"
echo ""
echo "Or just run the script directly to preview:"
echo "  bash demo/demo-script.sh"
echo ""
