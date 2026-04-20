#!/bin/bash

# Terrapin Tools Install Script
# This script runs entirely on your machine.
# Nothing is sent to Terrapin servers.
# You can read every line before running it.
# Source: https://terrapin.tools/install.sh
#
# Design notes:
#   - Strict mode (set -euo pipefail). Every ✓ is gated by a real success check.
#   - Up-front admin/sudo detection so non-admin users get a clear bail-out,
#     not a silent false-success march.
#   - Cleanup trap removes partial launchd state on any failure (fresh install
#     only — updates leave existing plists alone).
#   - Errors are bilingual (EN/ES). Info messages stay English for now.
#   - Final summary verifies each service via curl before claiming success.

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────
# 1. OS check
# ─────────────────────────────────────────────────────────────────────
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Terrapin currently supports Mac only. Windows support coming soon."
    echo "Visit terrapin.tools for updates."
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────
# 2. Language detection + bilingual message table
# ─────────────────────────────────────────────────────────────────────
LANG_CODE="${TERRAPIN_LANG:-${LANG:-en}}"
LANG_CODE="$(echo "$LANG_CODE" | cut -c1-2 | tr '[:upper:]' '[:lower:]')"
[[ "$LANG_CODE" != "es" ]] && LANG_CODE="en"

msg() {
    local key="$1"
    case "$LANG_CODE/$key" in
        en/admin_required)
cat <<'EOF'
❌ Terrapin install needs admin privileges to install Homebrew.

Your user account isn't an administrator. Options:

  1. Ask an admin user on this Mac to run this first (one-time):
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  2. Then come back to YOUR account and rerun:
     curl -fsSL https://terrapin.tools/install.sh | bash

If you ARE the admin on this Mac, run `sudo -v` in Terminal first to cache
your credentials, then re-run the install command above.

Stuck? Email support@terrapin.tools — I (Ryan) read every message.
EOF
            ;;
        es/admin_required)
cat <<'EOF'
❌ La instalación de Terrapin requiere privilegios de administrador para instalar Homebrew.

Tu cuenta de usuario no es administrador. Opciones:

  1. Pide a un administrador de esta Mac que ejecute esto una vez:
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  2. Después vuelve a TU cuenta y ejecuta:
     curl -fsSL https://terrapin.tools/install.sh | bash

Si TÚ eres el administrador, primero ejecuta `sudo -v` en Terminal para
guardar tus credenciales, luego vuelve a ejecutar el comando de instalación.

¿Atascado? Escribe a support@terrapin.tools — Ryan lee cada mensaje.
EOF
            ;;
        en/need_sudo_prime)
cat <<'EOF'
❌ Installing Homebrew needs sudo, and your sudo session isn't cached.

Quick fix — run these two commands in Terminal:

  sudo -v
  curl -fsSL https://terrapin.tools/install.sh | bash

The first command asks for your password once and caches it. The second
re-runs this installer with that cache in place.

Stuck? Email support@terrapin.tools
EOF
            ;;
        es/need_sudo_prime)
cat <<'EOF'
❌ Instalar Homebrew requiere sudo, y tu sesión de sudo no está guardada.

Solución rápida — ejecuta estos dos comandos en Terminal:

  sudo -v
  curl -fsSL https://terrapin.tools/install.sh | bash

El primero te pide tu contraseña una vez y la guarda. El segundo
vuelve a ejecutar este instalador con esa sesión activa.

¿Atascado? Escribe a support@terrapin.tools
EOF
            ;;
        en/homebrew_failed) echo "❌ Homebrew install failed. See output above for details." ;;
        es/homebrew_failed) echo "❌ Falló la instalación de Homebrew. Revisa la salida anterior." ;;
        en/node_failed)     echo "❌ Node.js install failed. Try: brew install node" ;;
        es/node_failed)     echo "❌ Falló la instalación de Node.js. Intenta: brew install node" ;;
        en/ollama_failed)   echo "❌ Ollama install failed. Try: brew install ollama" ;;
        es/ollama_failed)   echo "❌ Falló la instalación de Ollama. Intenta: brew install ollama" ;;
        en/ollama_not_running) echo "❌ Ollama daemon didn't start. Try: ollama serve" ;;
        es/ollama_not_running) echo "❌ El servicio de Ollama no se inició. Intenta: ollama serve" ;;
        en/gemma_failed)    echo "❌ Failed to download Gemma AI. Check your internet connection and retry." ;;
        es/gemma_failed)    echo "❌ Falló la descarga de Gemma AI. Revisa tu conexión a internet y reintenta." ;;
        en/tarball_failed)  echo "❌ Failed to download the Terrapin agent package. Check your internet and retry." ;;
        es/tarball_failed)  echo "❌ Falló la descarga del paquete de Terrapin. Revisa tu conexión y reintenta." ;;
        en/npm_failed)      echo "❌ Dependency install failed. Try: cd ~/terrapin && npm install" ;;
        es/npm_failed)      echo "❌ Falló la instalación de dependencias. Intenta: cd ~/terrapin && npm install" ;;
        en/agent_not_running) echo "⚠  Terrapin agent not responding — check ~/.terrapin/agent-error.log" ;;
        es/agent_not_running) echo "⚠  El agente de Terrapin no responde — revisa ~/.terrapin/agent-error.log" ;;
        en/mail_not_running)  echo "⚠  Mail server not responding — check ~/.terrapin/mail-error.log" ;;
        es/mail_not_running)  echo "⚠  El servidor de correo no responde — revisa ~/.terrapin/mail-error.log" ;;
        en/install_failed_cleanup) echo "⚠  Install failed — cleaning up partial state before exit." ;;
        es/install_failed_cleanup) echo "⚠  La instalación falló — limpiando estado parcial antes de salir." ;;
        en/install_incomplete) echo "❌ Install completed with errors — see warnings above." ;;
        es/install_incomplete) echo "❌ Instalación completada con errores — revisa las advertencias arriba." ;;
    esac
}

# ─────────────────────────────────────────────────────────────────────
# 3. Helper functions
# ─────────────────────────────────────────────────────────────────────
ok()       { echo "✓ $1"; }
warn()     { echo "$1" >&2; }
fail()     { echo "$1" >&2; exit 1; }
fail_msg() { msg "$1"; exit 1; }

# A "healthy install" = every prerequisite present AND agent deps installed.
# Keying mode detection on this (not on residual ~/terrapin/ files) means a
# partial/broken previous install correctly falls back to fresh-install mode
# instead of entering update mode and skipping prerequisite installs.
has_healthy_install() {
    command -v brew   >/dev/null 2>&1 || return 1
    command -v node   >/dev/null 2>&1 || return 1
    command -v npm    >/dev/null 2>&1 || return 1
    command -v ollama >/dev/null 2>&1 || return 1
    ollama list 2>/dev/null | grep -q "gemma4" || return 1
    [ -d "$HOME/terrapin/node_modules/express" ] || return 1
    return 0
}

# If plists exist but the install is not healthy, those plists point at
# binaries that don't exist — they silently fail-loop in launchd forever.
# Wipe them before we proceed so any subsequent bail-out leaves a clean slate.
cleanup_stale_plists() {
    local plist_agent="$HOME/Library/LaunchAgents/tools.terrapin.agent.plist"
    local plist_mail="$HOME/Library/LaunchAgents/tools.terrapin.mail.plist"
    if ! has_healthy_install; then
        for plist in "$plist_agent" "$plist_mail"; do
            if [ -f "$plist" ]; then
                launchctl unload "$plist" 2>/dev/null || true
                rm -f "$plist"
            fi
        done
    fi
}

# ─────────────────────────────────────────────────────────────────────
# 4. Cleanup trap — removes partial state only on failure, fresh-install only
# ─────────────────────────────────────────────────────────────────────
CREATED_PLISTS=()  # populated only on fresh install; updates leave plists alone
cleanup() {
    local rc=$?
    [[ $rc -eq 0 ]] && return 0
    msg install_failed_cleanup >&2
    for p in "${CREATED_PLISTS[@]:-}"; do
        [[ -z "$p" ]] && continue
        launchctl unload "$p" 2>/dev/null || true
        rm -f "$p" 2>/dev/null || true
    done
    # ~/.terrapin/ is deliberately untouched — may contain user data
}
trap cleanup EXIT

# ─────────────────────────────────────────────────────────────────────
# 5. Welcome + mode detection (prerequisite-check based, not file-based)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "🐢 Welcome to Terrapin Tools"
echo ""

if has_healthy_install; then
    MODE="update"
    echo "Existing Terrapin install detected — running update..."
    echo ""
else
    MODE="fresh"
fi

# ─────────────────────────────────────────────────────────────────────
# 6. Fresh-install path: admin detection + Homebrew + Node + Ollama + Gemma
# ─────────────────────────────────────────────────────────────────────
if [ "$MODE" = "fresh" ]; then
    echo "Setting up your local AI business assistant..."
    echo "This takes about 10 minutes. Go make a coffee. ☕"
    echo ""

    # Wipe any stale launchd plists from a previous broken install BEFORE the
    # admin check — a non-admin user with stale plists bails on admin_required
    # below, and we want their Mac left clean either way.
    cleanup_stale_plists

    # 6a. Admin detection — bail early for non-admin accounts or un-primed sudo.
    # We only need sudo if Homebrew isn't already installed. If brew exists,
    # a re-run from a non-admin account is totally fine.
    if ! command -v brew >/dev/null 2>&1; then
        if ! id -Gn "$USER" 2>/dev/null | grep -qw admin; then
            fail_msg admin_required
        fi
        if ! sudo -n true 2>/dev/null; then
            fail_msg need_sudo_prime
        fi
    fi

    # 6b. Homebrew — install if missing, then re-source shellenv for correct arch.
    # NONINTERACTIVE=1 tells Homebrew's installer to skip the TTY prompt and
    # rely on the already-cached sudo session we verified above.
    if ! command -v brew >/dev/null 2>&1; then
        echo "Installing Homebrew..."
        NONINTERACTIVE=1 /bin/bash -c \
          "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
          || fail_msg homebrew_failed

        # Apple Silicon installs brew at /opt/homebrew; Intel at /usr/local.
        if [[ "$(uname -m)" == "arm64" ]] && [[ -x /opt/homebrew/bin/brew ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -x /usr/local/bin/brew ]]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
    command -v brew >/dev/null 2>&1 || fail_msg homebrew_failed
    ok "Homebrew ready"

    # 6c. Node.js
    if ! command -v node >/dev/null 2>&1; then
        echo "Installing Node.js..."
        brew install node --quiet || fail_msg node_failed
    fi
    command -v node >/dev/null 2>&1 || fail_msg node_failed
    ok "Node.js ready ($(node -v))"

    # 6d. Ollama
    if ! command -v ollama >/dev/null 2>&1; then
        echo "Installing Ollama..."
        brew install ollama --quiet || fail_msg ollama_failed
    fi
    command -v ollama >/dev/null 2>&1 || fail_msg ollama_failed
    ok "Ollama ready"
fi

# ─────────────────────────────────────────────────────────────────────
# 7. Ollama daemon — must be running before `ollama pull` AND before agent starts.
# Runs for both fresh install and update paths.
# ─────────────────────────────────────────────────────────────────────
if ! curl -sf http://localhost:11434/api/version >/dev/null 2>&1; then
    echo "Starting Ollama service..."
    command -v ollama >/dev/null 2>&1 || fail_msg ollama_not_running
    ollama serve >/dev/null 2>&1 &
    # Poll for up to 10 seconds
    for _ in 1 2 3 4 5 6 7 8 9 10; do
        curl -sf http://localhost:11434/api/version >/dev/null 2>&1 && break
        sleep 1
    done
fi
curl -sf http://localhost:11434/api/version >/dev/null 2>&1 \
    || fail_msg ollama_not_running
ok "Ollama running"

# ─────────────────────────────────────────────────────────────────────
# 8. Gemma AI model — only pulled on fresh install (or if missing on update)
# ─────────────────────────────────────────────────────────────────────
if [ "$MODE" = "fresh" ] || ! ollama list 2>/dev/null | grep -q "gemma4"; then
    echo ""
    echo "Downloading your AI brain..."
    echo "About 5GB — like downloading a movie. ☕"
    echo ""
    ollama pull gemma4 || fail_msg gemma_failed
    ok "Gemma AI downloaded"
fi

# ─────────────────────────────────────────────────────────────────────
# 9. Terrapin agent package — download, extract, npm install
# Runs for both fresh install and update.
# ─────────────────────────────────────────────────────────────────────
echo ""
if [ "$MODE" = "update" ]; then
    echo "Downloading latest Terrapin..."
else
    echo "Setting up Terrapin agent..."
fi

mkdir -p "$HOME/terrapin"
cd "$HOME/terrapin"

# Tarball download — pipefail ensures a curl OR tar failure trips set -e.
if ! curl -fsSL https://www.terrapin.tools/agent-package.tar.gz | tar -xz; then
    fail_msg tarball_failed
fi

# npm install — real check, no error suppression.
if ! npm install --silent; then
    # Retry once with visible output in case --silent ate a transient error
    npm install || fail_msg npm_failed
fi
[ -d "$HOME/terrapin/node_modules/express" ] || fail_msg npm_failed
ok "Terrapin agent installed"

# Read version from the just-extracted package.json for the .installed marker
# written at the end of a fully-verified install. Fallback to "unknown" if the
# file is missing or the format changes — the marker is advisory, not critical.
TERRAPIN_VERSION=$(grep -E '"version"[[:space:]]*:' "$HOME/terrapin/package.json" 2>/dev/null \
    | head -n1 | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
[ -z "$TERRAPIN_VERSION" ] && TERRAPIN_VERSION="unknown"

# ─────────────────────────────────────────────────────────────────────
# 10. Data directory
# ─────────────────────────────────────────────────────────────────────
mkdir -p "$HOME/.terrapin"
[ -d "$HOME/.terrapin" ] || fail "Failed to create ~/.terrapin/"
ok "Data directory ready (~/.terrapin/)"

# ─────────────────────────────────────────────────────────────────────
# 11. Email setup — optional, fresh install only, interactive only
# ─────────────────────────────────────────────────────────────────────
if [ "$MODE" = "fresh" ] && [ -r /dev/tty ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Optional: Set up email sending"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Want Terrapin to send invoices and quotes by email?"
    echo "(You can always set this up later with: cd ~/terrapin && npm run setup-mail)"
    echo ""
    read -r -p "Set up email now? (y/n): " setup_email < /dev/tty || setup_email=n
    if [[ "$setup_email" == "y" || "$setup_email" == "Y" ]]; then
        node mail-setup.js < /dev/tty || warn "Mail setup skipped or failed — you can retry later with: cd ~/terrapin && npm run setup-mail"
    fi
fi

# ─────────────────────────────────────────────────────────────────────
# 12. Configure launchd — idempotent; replaces any stale plists
# ─────────────────────────────────────────────────────────────────────
NODE_PATH=$(command -v node)
[ -n "$NODE_PATH" ] && [ -x "$NODE_PATH" ] || fail_msg node_failed

echo ""
echo "Configuring Terrapin to start automatically..."
mkdir -p "$HOME/Library/LaunchAgents"

AGENT_PLIST="$HOME/Library/LaunchAgents/tools.terrapin.agent.plist"
MAIL_PLIST="$HOME/Library/LaunchAgents/tools.terrapin.mail.plist"

# Track plists we're about to write FRESH (not present before this run) so the
# cleanup trap only removes the ones we created. On update, the plists already
# exist and should survive a mid-run failure.
if [ "$MODE" = "fresh" ]; then
    [ ! -f "$AGENT_PLIST" ] && CREATED_PLISTS+=("$AGENT_PLIST")
    [ ! -f "$MAIL_PLIST" ]  && CREATED_PLISTS+=("$MAIL_PLIST")
fi

cat > "$AGENT_PLIST" << PLIST
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

cat > "$MAIL_PLIST" << PLIST
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

# ─────────────────────────────────────────────────────────────────────
# 13. Start (or restart) services — unload any stale copies first for idempotency
# ─────────────────────────────────────────────────────────────────────
if [ "$MODE" = "update" ]; then
    echo "Restarting Terrapin services..."
    launchctl kickstart -k "gui/$(id -u)/tools.terrapin.agent" 2>/dev/null || {
        launchctl unload "$AGENT_PLIST" 2>/dev/null || true
        launchctl load "$AGENT_PLIST" 2>/dev/null || true
    }
    launchctl kickstart -k "gui/$(id -u)/tools.terrapin.mail" 2>/dev/null || {
        launchctl unload "$MAIL_PLIST" 2>/dev/null || true
        launchctl load "$MAIL_PLIST" 2>/dev/null || true
    }
else
    # Fresh install — unload first in case a prior failed run left stale state,
    # then load. Load errors are non-fatal here; the health probe below is the
    # real success gate.
    launchctl unload "$AGENT_PLIST" 2>/dev/null || true
    launchctl unload "$MAIL_PLIST"  2>/dev/null || true
    launchctl load   "$AGENT_PLIST" 2>/dev/null || true
    launchctl load   "$MAIL_PLIST"  2>/dev/null || true
fi

# ─────────────────────────────────────────────────────────────────────
# 14. Wait for services — agent (7777) + mail (3001)
# ─────────────────────────────────────────────────────────────────────
echo "Waiting for agent to start..."
for _ in $(seq 1 30); do
    curl -sf http://localhost:7777/health >/dev/null 2>&1 && break
    sleep 1
done

echo "Waiting for mail server..."
for _ in $(seq 1 15); do
    curl -sf http://localhost:3001/health >/dev/null 2>&1 && break
    sleep 1
done

# ─────────────────────────────────────────────────────────────────────
# 15. Honest final summary — verify each service before claiming success
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SUMMARY_OK=true

if curl -sf http://localhost:11434/api/version >/dev/null 2>&1; then
    ok "Ollama running"
else
    msg ollama_not_running; SUMMARY_OK=false
fi

if curl -sf http://localhost:7777/health >/dev/null 2>&1; then
    ok "Terrapin agent running"
else
    msg agent_not_running; SUMMARY_OK=false
fi

if curl -sf http://localhost:3001/health >/dev/null 2>&1; then
    ok "Mail server running"
else
    msg mail_not_running; SUMMARY_OK=false
fi

echo ""
if [ "$SUMMARY_OK" = true ]; then
    if [ "$MODE" = "update" ]; then
        ok "Terrapin updated successfully"
        ok "Your data is untouched"
    else
        ok "Both start automatically on login"
        ok "Your data stays on this machine"
    fi

    # Success marker — written only after all 3 health probes returned 200.
    # Advisory only; has_healthy_install() is the source of truth for mode
    # detection. Useful for forward-compatible version tracking.
    INSTALLED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    printf '{"version":"%s","installed_at":"%s"}\n' \
        "$TERRAPIN_VERSION" "$INSTALLED_AT" > "$HOME/.terrapin/.installed"

    echo ""
    echo "  Open: http://localhost:7777/agent.html"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Opening your Terrapin agent now..."
    sleep 2
    open "http://localhost:7777/agent.html" || true
    echo ""
    echo "🐢 Tantalizing terrapin terraforming agentic planetary contributions"
    echo ""
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    fail_msg install_incomplete
fi
