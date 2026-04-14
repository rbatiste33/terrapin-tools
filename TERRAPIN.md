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
- **Agent server:** `agent-server.js` on `localhost:7777` — serves all files + API
- **Mail server:** `mail-server.js` on `localhost:3001` — Gmail SMTP relay
- **AI:** Gemma 4 via Ollama on `localhost:11434`
- **Data:** `~/.terrapin/` permanent files + IndexedDB browser storage + localStorage fallback
- **Deploy:** Vercel at terrapin.tools
- **Install:** `curl -fsSL https://terrapin.tools/install.sh | bash`

---

## 3. Current Tools (9)

| Tool | Type | Category | File |
|------|------|----------|------|
| Business Profile | data | all | tools/business-profile.html |
| Catering Quote Builder | document | catering | tools/catering-quote-builder.html |
| Contractor Invoice Generator | document | contractors | tools/contractor-invoice-generator.html |
| Simple CRM | data | freelancers | tools/simple-crm.html |
| Tip Calculator & Staff Splitter | utility | restaurants | tools/tip-calculator.html |
| Street Vendor Order Log | data | restaurants | tools/street-vendor-order-log.html |
| QR Code Generator | utility | all | tools/qr-code-generator.html |
| Job Site Daily Log | data | contractors | tools/job-site-daily-log.html |
| Simple Calendar | data | all | tools/simple-calendar.html |

Tool types determine agent behavior:
- **document** — PDF output, email button, attachment preview
- **data** — confirmation card, save to storage, no email
- **utility** — result display, open tool button, no email

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
- Rotating turtle thinking phrases while processing (EN/ES)
- Client email resolution from business profile + CRM contacts
- Invoice restructuring — parses natural language into structured data
- Time normalization — "2pm" → "14:00"
- Calendar param fixing — moves title from action field automatically

### System Prompt
- Includes current date for relative date calculation
- Business profile JSON
- CRM contacts list
- tools.json manifest with types
- Explicit examples for invoice and calendar tools

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
- `GET/POST /data/logs` — daily-logs/ directory

### Files
- `~/.terrapin/business-profile.json`
- `~/.terrapin/crm-contacts.json`
- `~/.terrapin/calendar-events.json`
- `~/.terrapin/daily-logs/[date]-[id].json`
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

### Free Tools
- Staff Schedule Builder — weekly schedule for small teams
- Sales Tax Tracker — track collected sales tax by period
- Avery Label Generator — print mailing labels
- Business Card Generator — simple card layout with QR code
- Freelance Project Tracker — in progress

### The Product
- **Personal Dashboard** — unified view by business type. This is where it all comes together.

---

## 15. V2 Roadmap

- **Personal dashboard** — one screen, your whole business
- **Fine tuning Gemma** — Unsloth, trained on real Terrapin usage patterns
- **Windows install script** — expand to Windows users
- **Mobile agent** — Gemma E2B running on device
- **Desktop app** — Tauri wrapper, native feel
- **More languages** — Portuguese, Chinese, Vietnamese, Korean

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
