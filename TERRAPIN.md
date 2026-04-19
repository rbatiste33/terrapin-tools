# TERRAPIN.md — Operating Manual

Read this before every session. This is the complete picture.

---

## 1. What Terrapin Is

A local-first tool library and AI business assistant for small business owners. Not SaaS. Not subscriptions. Not complicated.

Built for the people who built America — immigrant-owned businesses, solo operators, contractors, caterers, food truck owners, freelancers. The people who don't have an IT department. The people who check their phone in a parking lot between jobs.

Every tool works in English and Spanish. Every tool runs on your computer. Your data never leaves your machine.

**Tagline:** Stop managing your tools. Start managing your business.

**Domain:** terrapin.tools
**GitHub:** github.com/rbatiste33/terrapin-tools
**Substack:** ryanbatiste.substack.com

**Privacy promise:** We will never connect your data to a cloud model. Nothing to leak. Nothing to breach. Nothing to sell.

---

## 2. The Stack

- **Tools:** Single-file HTML tools in `tools/` directory
- **Agent server:** `agent-server.js` on `localhost:7777` — serves all files + API + scheduler
- **Mail server:** `mail-server.js` on `localhost:3001` — Gmail SMTP relay
- **AI:** Gemma 4 via Ollama on `localhost:11434`
- **Scheduler:** `node-cron` — morning briefings + appointment reminders
- **Data:** `~/.terrapin/` permanent files + IndexedDB browser storage + localStorage fallback
- **Dashboard:** `dashboard.html` — personal home base with live widgets (desktop only)
- **Onboarding:** `setup-wizard.html` — 3-step wizard, auto-creates business profile
- **Deploy:** Vercel at terrapin.tools
- **Install:** `curl -fsSL https://terrapin.tools/install.sh | bash`
- **Update:** Same install command detects existing install, skips setup, just updates
- **Dev:** `npm run dev:start` — stops launchd agent, runs nodemon from dev repo

---

## 3. Current Tools (11)

| Tool | Type | Tier | Category | File |
|------|------|------|----------|------|
| Business Profile | data | free | all | tools/business-profile.html |
| Turtle Shell | data | free | all | tools/turtle-shell.html |
| Catering Quote Builder | document | free | catering | tools/catering-quote-builder.html |
| Contractor Invoice Generator | document | free | contractors | tools/contractor-invoice-generator.html |
| Simple CRM | data | free | freelancers | tools/simple-crm.html |
| Tip Calculator & Staff Splitter | utility | free | restaurants | tools/tip-calculator.html |
| Street Vendor Order Log | data | free | restaurants | tools/street-vendor-order-log.html |
| QR Code Generator | utility | free | all | tools/qr-code-generator.html |
| Job Site Daily Log | data | free | contractors | tools/job-site-daily-log.html |
| Simple Calendar | data | free | all | tools/simple-calendar.html |
| Smart Receipt Box | data | **premium ($29)** | all | tools/smart-receipt-box.html |

Tool types determine agent behavior:
- **document** — PDF output, email button, attachment preview
- **data** — confirmation card, save to storage, no email
- **utility** — result display, open tool button, no email

Tool tiers:
- Absence of `tier` in `tools.json` (or `"tier": "free"`) = free tool
- `"tier": "premium"` + `"price_usd": N` = one-time purchase. Server-side license enforcement is live — agent-server gates premium endpoints with `requireLicense(toolId)` middleware, which returns HTTP 402 for unlicensed machines. Client-side paywall blocks UI on load and stays up until a valid Gumroad key is activated. `TERRAPIN_DEV_UNLOCK=all` env var bypasses the gate for local dev only. Rendered with gold `.premium-badge` on the homepage.

---

## 4. Tool Building Standards

Every tool must have — no exceptions:

### Agent Interface
- `<!-- TERRAPIN AGENT INTERFACE -->` comment block at very top of file
- Documents: tool name, description, parameters, output
- URL parameter pre-fill with `console.log` at every step
- `autorun=true` support — auto-execute without human interaction
- `postMessage` output on completion to parent window
- `#terrapin-result` hidden div with JSON status

### Data Integration
- Business profile: `GET localhost:7777/data/profile`, fall back to localStorage `terrapin_business_profile`
- CRM contacts if client data needed: `GET localhost:7777/data/crm`, fall back to localStorage `scrm_contacts`
- IndexedDB for data tools — permanent browser storage
- Agent server `POST` on every save — `~/.terrapin/` persistence
- localStorage as fallback cache only

### UI Standards
- Back to Terrapin Tools link top left
- Footer: "A Terrapin Tool — terrapin.tools"
- Storage note for data tools: "Your data saves in this browser on this device. For permanent storage set up the Terrapin agent." — links to agent-setup.html
- EN/ES language toggle with full Spanish translations
- `data-i18n` attributes on all visible text
- Language saved to `localStorage('terrapin-language')`
- Mobile responsive — works on phone in a parking lot

### Privacy — Non-Negotiable
- **NO Vercel Analytics script inside tools — tools track nothing. Ever.**
- **NO analytics scripts anywhere in the `tools/` directory — including SEO pages**
- No external API calls with user data
- No cloud connections
- No form submissions to external servers

---

## 5. Agent Standards

### Architecture
- Agent server serves all files at `localhost:7777` — one command, one port
- `OLLAMA_URL` hardcoded to `http://localhost:11434` — never remote
- `MAIL_URL` hardcoded to `http://localhost:3001` — never remote
- Startup security check — exits with error if hostname is not localhost
- CORS locked to localhost only — rejects all external origins

### Behavior
- Human in the loop by default — nothing sends without approval
- Step-by-step progress visible in chat thread
- Tool type determines output card: document / data / utility
- Email draft preview before sending — edit, approve, or cancel
- **Direct email from chat** — agent composes emails, shows preview card with Send/Edit/Cancel
- Rotating turtle thinking phrases while processing (EN/ES)
- Client email resolution from business profile + CRM contacts
- Invoice restructuring — parses natural language into structured data
- Time normalization — "2pm" → "14:00"
- Calendar param fixing — moves title from action field automatically
- **Server-side knowledge detection** — auto-saves business facts to Turtle Shell without Gemma deciding
- **Turtle Shell question guard** — blocks Gemma from saving when user is asking a question
- **Smart multi-action chain** — only fires when connector word (and/then/also) + action verb after it
- **Personalized tool list** — agent only sees tools the user selected in dashboard
- **Scheduled reminders** — morning briefing + appointment reminders via node-cron
- **Multi-JSON parser** — handles Gemma returning multiple JSON objects in one response

### System Prompt
- Includes current date for relative date calculation
- Business profile JSON
- **Business knowledge** (Turtle Shell) — grouped by category, capped at 50 entries
- CRM contacts list
- Calendar events (upcoming)
- Job site logs (recent 10)
- tools.json manifest — **filtered to user's dashboard selection**
- Explicit examples for all tools + email + schedule
- Response types: conversation, tool call, email, schedule, question

---

## 6. Data Architecture

### Hierarchy (checked in order)
1. **Agent server** — `~/.terrapin/` files via `localhost:7777/data/*`
2. **IndexedDB** — browser persistent storage, survives cache clear
3. **localStorage** — fallback cache only

### Agent Server Endpoints
- `GET/POST /data/profile` — business-profile.json
- `GET/POST /data/crm` — crm-contacts.json
- `GET/POST /data/calendar` — calendar-events.json
- `GET/POST /data/knowledge` — knowledge.json (Turtle Shell)
- `GET/POST /data/dashboard` — dashboard.json (tool selection + onboarding state)
- `GET/POST /data/schedules` — schedules.json (cron job config)
- `GET/POST /data/logs` — daily-logs/ directory
- `GET/POST/DELETE /data/receipts` — receipts/ directory (one JSON per receipt)
- `GET /data/receipts/image/:id` — serves stored receipt JPEG from receipts/images/
- `POST /api/receipt-scan` — Gemma 4 vision proxy. Body `{image: base64}`. Saves image to `receipts/images/<id>.jpg`, returns extracted receipt JSON.
- `GET /health` — system status + version

### Files
- `~/.terrapin/business-profile.json`
- `~/.terrapin/crm-contacts.json`
- `~/.terrapin/calendar-events.json`
- `~/.terrapin/knowledge.json` — Turtle Shell knowledge base
- `~/.terrapin/dashboard.json` — personal dashboard config
- `~/.terrapin/schedules.json` — scheduled reminders config
- `~/.terrapin/daily-logs/[date]-[id].json`
- `~/.terrapin/receipts/[id].json` — one per receipt (vendor, date, items, totals, category, thumbnail)
- `~/.terrapin/receipts/images/[id].jpg` — full-res receipt images
- `~/.terrapin/mail-config.json` — encrypted AES-256-GCM
- `~/.terrapin/mail-log.txt`
- `~/.terrapin/agent.log`

---

## 7. Privacy Manifesto

### The Promise
- Local models only. Always.
- Never connect user data to cloud AI. No OpenAI. No Anthropic. No Google Cloud. No exceptions.
- `OLLAMA_URL` hardcoded to localhost — startup check enforces this with `process.exit(1)`
- User owns all data — `~/.terrapin/` belongs to them
- No analytics scripts inside tools. Ever.
- No analytics scripts anywhere in the `tools/` directory. Ever.
- Vercel Analytics on marketing pages only: `index.html`, `agent-setup.html`, `privacy.html`
- Privacy page discloses this: "Our public website uses anonymous analytics. Our tools collect nothing."

### Weekly Enforcement
- Weekly audit every Sunday
- Grade must be GREEN before new builds ship
- YELLOW — fix before building
- RED — stop all development until resolved

---

## 8. Weekly Audit Process

Run this prompt every Sunday:

> "Run the weekly Terrapin security and privacy audit. Report everything found — do not make changes until I review."

Checks:
1. Any analytics in tools/ directory
2. Any external API calls with user data
3. Any cloud AI endpoints
4. OLLAMA_URL and MAIL_URL still hardcoded localhost
5. Startup security check still present
6. CORS still locked
7. .gitignore covers all private files
8. No credentials in public files
9. All tools have footer, nav, language toggle
10. CDN scripts from trusted sources only
11. install.sh does nothing beyond documented behavior
12. New code follows all standards

Grade: GREEN / YELLOW / RED

Track in AUDIT-LOG.md if created.

---

## 9. Language Support

- **English** — default
- **Spanish** — first class citizen, full translation on every page and every tool
- Language preference: `localStorage('terrapin-language')`
- Auto-detect: `navigator.language` starting with `es` → Spanish
- EN/ES toggle on every page — inline in nav, not fixed position
- More languages coming

---

## 10a. Update notifications

Users learn about new Terrapin versions via a gold banner in the dashboard.

**How it works:**
- `version.json` at repo root is served by Vercel at `https://terrapin.tools/version.json`
- Agent-server polls it on boot (2s after start) and every 24 hours
- Cached to `~/.terrapin/update-check.json` so offline users still see the last known state
- Dashboard calls `GET /health/updates` on load; if `update_available: true`, shows gold banner with release notes + one-click update
- Banner is dismissible per-version (dismissed version saved to localStorage)
- Same domain users already trust. No analytics, no personal data sent.

**Ship a new version:**
1. Bump `package.json` version (use `npm version patch|minor|major`)
2. Run `npm run bump -- "EN release note" "ES release note"` — updates `version.json`
3. `npm run create-package` — rebuilds tarball
4. Commit + push — Vercel deploys, users see banner within 24h or on next dashboard load

**When NOT to bump the version (just push to git):**
- Pure landing-page / marketing changes (copy edits, new sections on `index.html`, SEO pages)
- Tweaks to `/about`, `/privacy`, or other Vercel-only pages
- Fixing typos in public copy

Vercel auto-deploys from git push. The installed agent doesn't serve these pages — users see the changes on terrapin.tools immediately. No banner needed, no install needed.

**When to use `--silent`:**
- Changes that ship in the tarball but don't require an urgent update (e.g., minor tool polish, added a new SEO page that also lives in `tools/`)
- Users pick up silent releases passively next time they run `install.sh` for any reason

Usage: `npm run bump -- --silent "EN note" "ES note"`

**When to fire a real banner (default behavior):**
- Agent-server code changes (new endpoints, bug fixes, mail, scheduler)
- New tool added to `tools/`
- Tool feature additions users would notice
- Privacy or security-relevant changes

Rule of thumb: "would a user notice this if they didn't update?" Yes → banner. No → silent or no bump.

**Schema of `version.json`:**
```json
{
  "latest": "1.2.0",
  "released": "2026-04-16",
  "min_supported": "1.0.0",
  "update_url": "https://terrapin.tools/install.sh",
  "changelog_url": "https://github.com/rbatiste33/terrapin-tools/releases",
  "notes": "Smart Receipt Box shipped...",
  "notes_es": "Caja de Recibos shipped...",
  "tools": { "smart-receipt-box": { "latest": "1.0.0", "notes": "..." } }
}
```

The `tools` block is reserved for per-tool version bumps (for future premium tools that may update independently of the agent version).

---

## 10. Install

One command for a non-technical user:

```
curl -fsSL https://terrapin.tools/install.sh | bash
```

What it does:
1. Checks for Mac (Windows coming)
2. Installs Homebrew if missing
3. Installs Node.js if missing
4. Installs Ollama if missing
5. Downloads Gemma 4 (~5GB)
6. Downloads agent package from terrapin.tools
7. Optional email setup
8. Configures auto-start on login via launchd
9. Opens agent at localhost:7777/agent.html

After setup: no terminal needed. Agent starts automatically on login.

---

## 11. Hackathon

**Gemma 4 Good Hackathon** — Kaggle x Google DeepMind

- **Deadline:** May 18, 2026
- **Prize:** $200,000
- **Target tracks:** Digital Equity, Ollama Special Track, Main Track, Safety & Trust

**The story:**

Mom — Filipino immigrant, ran a catering business. Did everything on paper. The tools that existed were built for people with MBAs and IT departments. She needed something that just worked.

Taco stand — the moment it clicked. Spanish-speaking vendor, cash business, no POS system. Built the Street Vendor Order Log. That's when Terrapin stopped being a tool library and became a mission.

Local AI for immigrant-owned small businesses. Every tool in English and Spanish. Data never leaves the machine. Privacy as architecture, not policy.

**Submission needs:**
- YouTube video — 3 minutes
- Writeup — 1500 words
- GitHub repo — public, clean
- Live demo — terrapin.tools

---

## 12. Distribution

- **Build in public on X** — show the work, show the philosophy
- **Substack** — depth, story, technical decisions
- **Reddit** — respond genuinely to pain points in r/smallbusiness, r/freelance, r/contractors — never link drop
- **SEO pages** — individual landing page for each tool at tools/[name]/index.html
- **Sponsor model** — local businesses sponsor a tool build, logo on it permanently
- **PDF footer** — "Generated by Terrapin Tools — terrapin.tools" on every output

---

## 13. Monetization

- **Free tools** — always free, all core tools, no login, no account, no subscription
- **Premium tools** — one-time purchase, unlocks advanced AI-powered tools (Invoice Follow-Up, Review Response, Email Generator)
- **Tool sponsorships** — $299 (name on tool) / $499 (name + logo on tool + all PDFs)
- **No ads. Ever.**
- **No subscriptions. Ever.** — pay once, own it forever
- **Fine tuning** — Gemma fine-tuned on real user patterns with Unsloth — post user acquisition

---

## 14. Build Queue — High Priority

### Premium (one-time purchase)
- Invoice Follow-Up Generator — Gemma-powered email follow-ups
- Review Response Generator — respond to Google/Yelp reviews
- Customer Email Response Generator — professional replies in your voice
- Premium license-key gating — LIVE. Server gates premium endpoints with `requireLicense('tool-id')` middleware (HTTP 402 on unlicensed); client shows blocking, non-dismissable paywall. `TERRAPIN_DEV_UNLOCK=all` env var bypasses for dev.

### Free Tools
- Staff Schedule Builder — weekly schedule for small teams
- Sales Tax Tracker — track collected sales tax by period
- Avery Label Generator — print mailing labels
- Business Card Generator — simple card layout with QR code
- Freelance Project Tracker — deactivated, needs rebuild (file exists at tools/freelance-project-tracker.html)

### Shipped This Session
- **Turtle Shell** — SHIPPED. Agent knowledge base, server-side auto-detection of business facts
- **Personal Dashboard** — SHIPPED. Live widgets (CRM, Calendar, Knowledge), drag-and-drop, clock/date, personalized greeting. Default home at localhost:7777 after onboarding.
- **Setup Wizard** — SHIPPED. 3-step onboarding: name/type/email → pick tools → launch dashboard. Auto-creates business profile.
- **Direct Email from Chat** — SHIPPED. Agent composes emails, preview card with Send/Edit/Cancel.
- **Scheduled Reminders** — SHIPPED. Morning briefing + appointment reminders via node-cron.
- **Agent Light Theme** — SHIPPED. Warm cream background matching landing page and dashboard.
- **Update System** — SHIPPED. Version check, gold banner, update-mode install script.
- **Smart Receipt Box (first premium tool, $29)** — SHIPPED. Gemma 4 vision proxy at `/api/receipt-scan`. Upload receipt → local AI extracts vendor/date/items/totals + suggests category. Review form, IndexedDB + `~/.terrapin/receipts/` persistence, CSV + printable summary exports, EN/ES i18n, desktop-only (mobile gate).

---

## 15. V2 Roadmap

- **Ad-hoc reminders** — "remind me in 30 minutes to call Mike"
- **iMessage notifications** — local via AppleScript, privacy-compliant
- **Dark mode** — toggle for agent chat and dashboard
- **Fine tuning Gemma** — Unsloth, trained on real Terrapin usage patterns (synthetic data only — privacy compliant)
- **Windows install script** — expand to Windows users
- **Mobile agent** — Gemma E2B running on device
- **Desktop app** — Tauri wrapper, native feel
- **More languages** — Portuguese, Chinese, Vietnamese, Korean
- **Demo videos on landing page** — `demos/` folder for screen recordings

---

## When I Say Build a Tool

When I give you a tool name or description to build, automatically do all of the following without asking questions:

1. Build the tool as a single self-contained HTML file
2. Follow all Tool Building Standards in section 4
3. Save to `tools/[tool-name].html`
4. Make it callable programmatically — agent interface, URL params, postMessage
5. Update `index.html` — add tool card in featured grid
6. Update `tools.json` — add manifest entry
7. Create SEO page at `tools/[tool-name]/index.html` — NO analytics script
8. Add EN/ES language support
9. Confirm what you built and what you updated

Do all 9 steps every time. No questions. Just build and ship.

---

## The Philosophy

Unix was built in 1969 on small programs that do one thing well. The entire internet was built on that foundation. Terrapin rebuilds that philosophy for the small business agent era.

The agent is the interface now. The human doesn't need a beautiful dashboard — yet. What the agent needs underneath is something reliable, local, and fast. No auth flow, no rate limits, no monthly bill, no vendor lock-in.

Simple tools for people who work. The turtle carries everything it needs on its back.

---

## Grateful Dead Connection

Terrapin Station is a Grateful Dead album. The name is a nod to the origin of this project — which grew out of a conversation about building a personal wiki. The Dead built a community around free tape trading. Terrapin builds a library around free tools. Distribution is the product.

The lightning bolt on the turtle's shell is for the people who get it. Everyone else just sees a reliable turtle with a tool belt.

🐢 Tantalizing terrapin terraforming agentic planetary contributions.
