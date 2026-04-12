#!/bin/bash

# Terrapin Tools Install Script
# This script runs entirely on your machine.
# Nothing is sent to Terrapin servers.
# You can read every line before running it.
# Source: https://terrapin.tools/install.sh

echo ""
echo "🐢 Welcome to Terrapin Tools"
echo "Setting up your local AI business assistant..."
echo "This takes about 10 minutes. Go make a coffee. ☕"
echo ""

# Check for Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Terrapin currently supports Mac only. Windows support coming soon."
    echo "Visit terrapin.tools for updates."
    exit 1
fi

# Install Homebrew if missing
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew (this may ask for your password)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi
echo "✓ Homebrew ready"

# Install Node.js if missing
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node --quiet
fi
echo "✓ Node.js ready ($(node -v))"

# Install Ollama if missing
if ! command -v ollama &> /dev/null; then
    echo "Installing Ollama..."
    brew install ollama --quiet
fi
echo "✓ Ollama ready"

# Start Ollama service if not running
if ! pgrep -x "ollama" > /dev/null; then
    echo "Starting Ollama service..."
    ollama serve &>/dev/null &
    sleep 2
fi

# Pull Gemma
echo ""
echo "Downloading your AI brain..."
echo "About 5GB — like downloading a movie. ☕"
echo ""
ollama pull gemma4
echo ""
echo "✓ Gemma AI downloaded"

# Download Terrapin agent package
echo ""
echo "Setting up Terrapin agent..."
mkdir -p ~/terrapin
cd ~/terrapin
curl -fsSL https://terrapin.tools/agent-package.tar.gz | tar -xz
npm install --silent 2>/dev/null
echo "✓ Terrapin agent installed"

# Create data directory
mkdir -p ~/.terrapin
echo "✓ Data directory ready (~/.terrapin/)"

# Email setup — optional
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Optional: Set up email sending"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Want Terrapin to send invoices and quotes by email?"
echo "(You can always set this up later with: cd ~/terrapin && npm run setup-mail)"
echo ""
read -p "Set up email now? (y/n): " setup_email
if [[ "$setup_email" == "y" || "$setup_email" == "Y" ]]; then
    node mail-setup.js
fi

# Find node path for launchd
NODE_PATH=$(which node)

# Auto-start on login
echo ""
echo "Configuring Terrapin to start automatically..."
mkdir -p ~/Library/LaunchAgents

cat > ~/Library/LaunchAgents/tools.terrapin.agent.plist << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>tools.terrapin.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${HOME}/terrapin/agent-server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${HOME}/terrapin</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/.terrapin/agent.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/.terrapin/agent-error.log</string>
</dict>
</plist>
PLIST

launchctl load ~/Library/LaunchAgents/tools.terrapin.agent.plist 2>/dev/null
echo "✓ Auto-start configured"

# Wait for agent to start
echo "Starting Terrapin agent..."
sleep 3

# Verify agent is running
if curl -s http://localhost:7777/health > /dev/null 2>&1; then
    echo "✓ Terrapin agent is running"
else
    echo "⚠ Agent may still be starting. Give it a few seconds."
fi

# Done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ✓ Gemma AI installed"
echo "  ✓ Terrapin agent running"
echo "  ✓ Starts automatically on login"
echo "  ✓ Your data stays on this machine"
echo ""
echo "  Open: http://localhost:7777/agent.html"
echo "  Or visit: terrapin.tools/agent"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Opening your Terrapin agent now..."
sleep 2
open "http://localhost:7777/agent.html"
echo ""
echo "🐢 Tantalizing terrapin terraforming agentic planetary contributions"
echo ""
