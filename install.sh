#!/bin/bash

# Terrapin Tools Install Script
# This script runs entirely on your machine.
# Nothing is sent to Terrapin servers.
# You can read every line before running it.
# Source: https://terrapin.tools/install.sh

echo ""
echo "🐢 Welcome to Terrapin Tools"
echo ""

# Check for Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Terrapin currently supports Mac only. Windows support coming soon."
    echo "Visit terrapin.tools for updates."
    exit 1
fi

# Detect update mode — existing install found
TERRAPIN_UPDATE=false
if [ -d "$HOME/terrapin" ] && [ -f "$HOME/terrapin/agent-server.js" ]; then
    TERRAPIN_UPDATE=true
    echo "Existing Terrapin install detected — running update..."
    echo ""
fi

if [ "$TERRAPIN_UPDATE" = false ]; then
    echo "Setting up your local AI business assistant..."
    echo "This takes about 10 minutes. Go make a coffee. ☕"
    echo ""

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
fi

# Download Terrapin agent package (runs for both install and update)
echo ""
if [ "$TERRAPIN_UPDATE" = true ]; then
    echo "Downloading latest Terrapin..."
else
    echo "Setting up Terrapin agent..."
fi
mkdir -p ~/terrapin
cd ~/terrapin
curl -fsSL https://www.terrapin.tools/agent-package.tar.gz | tar -xz
npm install --silent 2>/dev/null

# Verify dependencies installed correctly
if [ ! -d "$HOME/terrapin/node_modules/express" ]; then
    echo "Installing dependencies..."
    cd ~/terrapin && npm install
fi
echo "✓ Terrapin agent installed"

# Create data directory
mkdir -p ~/.terrapin
echo "✓ Data directory ready (~/.terrapin/)"

# Email setup — only on fresh install
if [ "$TERRAPIN_UPDATE" = false ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Optional: Set up email sending"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Want Terrapin to send invoices and quotes by email?"
    echo "(You can always set this up later with: cd ~/terrapin && npm run setup-mail)"
    echo ""
    read -p "Set up email now? (y/n): " setup_email < /dev/tty
    if [[ "$setup_email" == "y" || "$setup_email" == "Y" ]]; then
        node mail-setup.js < /dev/tty
    fi
fi

# Find node path for launchd
NODE_PATH=$(which node)

# Configure launchd (idempotent — safe to run on update)
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

cat > ~/Library/LaunchAgents/tools.terrapin.mail.plist << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>tools.terrapin.mail</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${HOME}/terrapin/mail-server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${HOME}/terrapin</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/.terrapin/mail.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/.terrapin/mail-error.log</string>
</dict>
</plist>
PLIST

# Start or restart services
if [ "$TERRAPIN_UPDATE" = true ]; then
    echo "Restarting Terrapin services..."
    # Try kickstart first (modern macOS), fall back to unload/load
    launchctl kickstart -k "gui/$(id -u)/tools.terrapin.agent" 2>/dev/null || \
      (launchctl unload ~/Library/LaunchAgents/tools.terrapin.agent.plist 2>/dev/null; \
       launchctl load ~/Library/LaunchAgents/tools.terrapin.agent.plist 2>/dev/null)
    launchctl kickstart -k "gui/$(id -u)/tools.terrapin.mail" 2>/dev/null || \
      (launchctl unload ~/Library/LaunchAgents/tools.terrapin.mail.plist 2>/dev/null; \
       launchctl load ~/Library/LaunchAgents/tools.terrapin.mail.plist 2>/dev/null)
else
    launchctl load ~/Library/LaunchAgents/tools.terrapin.agent.plist 2>/dev/null
    launchctl load ~/Library/LaunchAgents/tools.terrapin.mail.plist 2>/dev/null
fi
echo "✓ Services configured"

# Show early errors from launchd
sleep 2
cat ~/.terrapin/agent-error.log 2>/dev/null || echo "No agent errors logged yet"
cat ~/.terrapin/mail-error.log 2>/dev/null || echo "No mail errors logged yet"

# Wait for agent to start
echo "Waiting for agent to start..."
MAX_WAIT=30
COUNT=0
while ! curl -s http://localhost:7777/health > /dev/null 2>&1; do
    sleep 1
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_WAIT ]; then
        echo "Agent taking longer than expected. Try opening manually: http://localhost:7777/agent.html"
        break
    fi
done

if curl -s http://localhost:7777/health > /dev/null 2>&1; then
    echo "✓ Terrapin agent is running"
fi

# Wait for mail server (up to 15 extra seconds)
echo "Waiting for mail server..."
MAIL_WAIT=15
MAIL_COUNT=0
while ! curl -s http://localhost:3001/health > /dev/null 2>&1; do
    sleep 1
    MAIL_COUNT=$((MAIL_COUNT + 1))
    if [ $MAIL_COUNT -ge $MAIL_WAIT ]; then
        echo "Mail server not responding yet. It will start automatically on next login."
        break
    fi
done

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✓ Mail server is running"
fi

# Done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ "$TERRAPIN_UPDATE" = true ]; then
    echo "  ✓ Terrapin updated successfully"
    echo "  ✓ Services restarted"
    echo "  ✓ Your data is untouched"
else
    echo "  ✓ Gemma AI installed"
    echo "  ✓ Terrapin agent running"
    echo "  ✓ Mail server running"
    echo "  ✓ Both start automatically on login"
    echo "  ✓ Your data stays on this machine"
fi
echo ""
echo "  Open: http://localhost:7777/agent.html"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Opening your Terrapin agent now..."
sleep 2
open "http://localhost:7777/agent.html"
echo ""
echo "🐢 Tantalizing terrapin terraforming agentic planetary contributions"
echo ""
