// ══════════════════════════════════════════════════════════════
//  Terrapin Agent Server
//  Local AI agent for small business tools — localhost:7777
//  Connects to Gemma via Ollama running on your machine
// ══════════════════════════════════════════════════════════════

// Terrapin privacy promise: local models only, always.
// These are hardcoded intentionally. Never make them configurable.
// Changing these to remote URLs would break our core privacy promise.
// See terrapin.tools/privacy
const OLLAMA_URL = 'http://localhost:11434';
const MAIL_URL = 'http://localhost:3001';

// ── PRIVACY CHECK ──
const urlCheck = new URL(OLLAMA_URL);
if (urlCheck.hostname !== 'localhost' && urlCheck.hostname !== '127.0.0.1') {
  console.error('TERRAPIN PRIVACY ERROR: Ollama must run on localhost only. This is a core privacy promise.');
  process.exit(1);
}

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 7777;
const TOOLS_PATH = path.join(__dirname, 'tools.json');

// ══════════════════════════════════════
//  DATA DIRECTORY
// ══════════════════════════════════════
const TERRAPIN_DIR = path.join(os.homedir(), '.terrapin');
const DATA_FILES = {
  profile: path.join(TERRAPIN_DIR, 'business-profile.json'),
  crm: path.join(TERRAPIN_DIR, 'crm-contacts.json'),
  calendar: path.join(TERRAPIN_DIR, 'calendar-events.json'),
  logsDir: path.join(TERRAPIN_DIR, 'daily-logs')
};

function initDataDir() {
  if (!fs.existsSync(TERRAPIN_DIR)) fs.mkdirSync(TERRAPIN_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILES.logsDir)) fs.mkdirSync(DATA_FILES.logsDir, { recursive: true });
  if (!fs.existsSync(DATA_FILES.profile)) fs.writeFileSync(DATA_FILES.profile, '{}');
  if (!fs.existsSync(DATA_FILES.crm)) fs.writeFileSync(DATA_FILES.crm, '[]');
  if (!fs.existsSync(DATA_FILES.calendar)) fs.writeFileSync(DATA_FILES.calendar, '[]');
  console.log('  Data: ' + TERRAPIN_DIR);
}

// ══════════════════════════════════════
//  LOAD TOOLS MANIFEST
// ══════════════════════════════════════
let toolsManifest = { tools: [] };

function loadTools() {
  try {
    const raw = fs.readFileSync(TOOLS_PATH, 'utf8');
    toolsManifest = JSON.parse(raw);
    console.log(`  Loaded ${toolsManifest.tools.length} tools from tools.json`);
  } catch (e) {
    console.error('  ✗ Could not load tools.json:', e.message);
    console.error('  Make sure tools.json exists in the terrapin root directory.');
    process.exit(1);
  }
}

// ══════════════════════════════════════
//  OLLAMA CONNECTIVITY
// ══════════════════════════════════════
async function checkOllama() {
  try {
    const res = await fetch(OLLAMA_URL + '/api/tags', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { connected: false, model: false };
    const data = await res.json();
    const hasGemma = (data.models || []).some(m => m.name && m.name.includes('gemma'));
    return { connected: true, model: hasGemma };
  } catch (e) {
    return { connected: false, model: false };
  }
}

async function checkMail() {
  try {
    const res = await fetch(MAIL_URL + '/health', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch (e) {
    return false;
  }
}

// ══════════════════════════════════════
//  SYSTEM PROMPT BUILDER
// ══════════════════════════════════════
function buildSystemPrompt(businessProfile, crmContacts) {
  const bizName = businessProfile?.businessName || 'your business';
  const ownerName = businessProfile?.ownerName || '';

  const toolsList = toolsManifest.tools.filter(t => t.agent_ready !== false).map(t => {
    return `- ${t.id}: ${t.description} (params: ${t.required_params.join(', ') || 'none'})`;
  }).join('\n');

  // Build lean profile — only what Gemma needs for conversation
  let profileSection = 'No business profile set up yet.';
  if (businessProfile) {
    const parts = [];
    if (businessProfile.businessName) parts.push('Business: ' + businessProfile.businessName);
    if (businessProfile.ownerName) parts.push('Owner: ' + businessProfile.ownerName);
    if (businessProfile.businessType) parts.push('Type: ' + businessProfile.businessType);
    if (businessProfile.email) parts.push('Email: ' + businessProfile.email);
    if (businessProfile.phone) parts.push('Phone: ' + businessProfile.phone);
    if (businessProfile.address) parts.push('Address: ' + businessProfile.address);
    if (businessProfile.defaultRate) parts.push('Default rate: $' + businessProfile.defaultRate + '/hr');
    // Include client list from profile
    const clients = businessProfile.clients || businessProfile.regular_clients || [];
    if (clients.length) {
      parts.push('Clients: ' + clients.map(c => {
        const cp = [c.name];
        if (c.email) cp.push(c.email);
        if (c.phone) cp.push(c.phone);
        return cp.join(', ');
      }).join(' | '));
    }
    if (businessProfile.paymentMethods) parts.push('Payment: ' + businessProfile.paymentMethods);
    profileSection = parts.join('\n');
  }

  // Build CRM contacts summary
  let crmSection = '';
  if (crmContacts && crmContacts.length) {
    const contactList = crmContacts.map(c => {
      const parts = [c.name];
      if (c.email) parts.push(c.email);
      if (c.phone) parts.push(c.phone);
      if (c.business) parts.push('(' + c.business + ')');
      return parts.join(', ');
    }).join('\n');
    crmSection = `\nCRM Contacts (${crmContacts.length}):\n${contactList}`;
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are Terrapin, a friendly business assistant for ${ownerName || bizName}. Today is ${today}.

You talk like a helpful coworker — warm, brief, and practical. The person you're helping is a busy small business owner. They don't have an IT department. Keep it simple.

ABOUT THE OWNER:
${profileSection}
${crmSection}

YOU CAN USE THESE TOOLS:
${toolsList}

HOW TO RESPOND — you must ALWAYS reply with exactly one JSON object, nothing else:

1. To have a conversation (greetings, questions, info, anything that's not a tool):
   {"response": "your friendly reply here"}

2. To use a tool (you have all the info you need):
   {"tool_id": "the-tool-id", "params": {"key": "value"}}

3. To ask for missing info before using a tool:
   {"question": "what you need to know"}

NEVER return any other format. No markdown. No tool_calls. No function calls. Just one JSON object.

PERSONALITY:
- Be warm and use the owner's first name when natural
- Reply in whatever language the user writes in — if they write Spanish, reply in Spanish
- Keep answers to 1-2 sentences unless they ask for detail
- When you look up a contact, just tell them naturally: "Tom's email is tom@example.com"
- When you can't help, be honest: "I can't do that yet, but here's what I can help with..."

USING TOOLS:
- Pull client info from the CRM contacts and business profile above — don't ask for info you already have
- Use conversation history to resolve pronouns like "him", "her", "them", "that client"
- For invoices, use flat params — the server restructures them:
  {"tool_id": "contractor-invoice-generator", "params": {"client_name": "Mike Johnson", "job_desc": "Deck repair", "labor_description": "Deck repair", "labor_hours": 6, "labor_rate": 85, "materials_description": "Materials", "materials_cost": 240}}
- For calendar events, always use action "add" and put the event name in title:
  {"tool_id": "simple-calendar", "params": {"action": "add", "title": "Meeting with Mike", "date": "2026-04-14", "time": "2pm", "type": "appointment"}}
- For adding CRM contacts:
  {"tool_id": "simple-crm", "params": {"action": "add", "name": "...", "email": "...", "phone": "...", "business": "..."}}
- Use the owner's default rate if they don't specify one
- Calculate dates from today: ${today}. Return dates as YYYY-MM-DD.`;
}

// ══════════════════════════════════════
//  TIME FORMAT NORMALIZER
// ══════════════════════════════════════
function normalizeTime(input) {
  if (!input || typeof input !== 'string') return '';
  const s = input.trim().toLowerCase();

  // Already HH:MM 24hr — pass through
  if (/^\d{2}:\d{2}$/.test(s)) return s;

  // Match: 2pm, 2:30pm, 2:30 pm, 9am, 11:30am, 12pm, 12:30am
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m) {
    let hr = parseInt(m[1]);
    const min = m[2] ? parseInt(m[2]) : 0;
    const ampm = m[3];
    if (ampm === 'pm' && hr < 12) hr += 12;
    if (ampm === 'am' && hr === 12) hr = 0;
    return String(hr).padStart(2, '0') + ':' + String(min).padStart(2, '0');
  }

  // Match bare H:MM or HH:MM without am/pm — treat as 24hr
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const parts = s.split(':');
    return String(parts[0]).padStart(2, '0') + ':' + parts[1];
  }

  return input; // can't parse, return as-is
}

// ══════════════════════════════════════
//  CLIENT EMAIL LOOKUP
// ══════════════════════════════════════
function resolveClientEmail(nameQuery, profile) {
  if (!profile) return null;

  // Check both "clients" and "regular_clients" — profile structure may vary
  const clients = profile.clients || profile.regular_clients || [];
  if (!clients.length) return null;

  const q = nameQuery.toLowerCase().trim();

  // Exact match first
  let match = clients.find(c => (c.name || '').toLowerCase() === q);

  // Partial match — query is a substring of the client name
  if (!match) {
    match = clients.find(c => (c.name || '').toLowerCase().includes(q));
  }

  // Partial match — any word in query matches any word in client name
  if (!match) {
    const queryWords = q.split(/\s+/);
    match = clients.find(c => {
      const clientWords = (c.name || '').toLowerCase().split(/\s+/);
      return queryWords.some(qw => clientWords.some(cw => cw.includes(qw) || qw.includes(cw)));
    });
  }

  if (match && match.email) {
    return { name: match.name, email: match.email, phone: match.phone || '' };
  }

  return null;
}

// ══════════════════════════════════════
//  PARSE GEMMA RESPONSE
// ══════════════════════════════════════
function parseAgentResponse(raw, businessProfile, crmContacts) {
  const text = raw.trim();
  console.log('  → Raw Gemma response:', text.substring(0, 300));

  // Try to extract JSON from the response
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // Try markdown code block first: ```json {...} ```
    const codeBlock = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlock) {
      try { json = JSON.parse(codeBlock[1]); } catch (e2) {}
    }
    // Try to find JSON object within the text
    if (!json) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { json = JSON.parse(jsonMatch[0]); } catch (e2) {}
      }
    }
  }

  if (!json) {
    return { action: 'respond', message: text };
  }

  // Handle Gemma's native tool_calls format: {"tool_calls": [{"function": "tool-id", "arguments": {...}}]}
  if (json.tool_calls && Array.isArray(json.tool_calls)) {
    const tc = json.tool_calls[0];
    if (tc && tc.function && tc.function !== 'none') {
      json = { tool_id: tc.function, params: tc.arguments || {} };
      console.log('  → Converted tool_calls format to tool_id:', json.tool_id);
    } else {
      // tool_calls with function "none" — Gemma has nothing to do, treat as conversation
      return { action: 'respond', message: "Hey! What can I help you with today?" };
    }
  }

  // Tool call
  if (json.tool_id) {
    const tool = toolsManifest.tools.find(t => t.id === json.tool_id);
    if (!tool) {
      return { action: 'respond', message: `I tried to use "${json.tool_id}" but that tool doesn't exist. Let me try again.` };
    }
    let params = json.params || {};

    console.log(`  → Gemma returned tool: ${json.tool_id}`);
    console.log(`  → Raw params:`, JSON.stringify(params, null, 2));

    // ── INVOICE RESTRUCTURING ──
    // Gemma often returns flat params instead of the nested data structure.
    // If we see flat invoice params, restructure them server-side.
    if (json.tool_id === 'contractor-invoice-generator' && !params.data) {
      console.log('  → Restructuring flat invoice params into data object');
      const data = {
        client: { name: params.client_name || params.client || '', address: params.client_address || '' },
        jobDescription: params.job_desc || params.job_description || params.description || '',
        labor: [],
        materials: [],
        notes: params.notes || ''
      };

      // Parse labor — handle various formats Gemma might use
      if (params.labor && Array.isArray(params.labor)) {
        data.labor = params.labor;
      } else if (params.labor_description || params.labor_hours || params.labor_rate) {
        data.labor.push({
          description: params.labor_description || params.job_desc || 'Labor',
          quantity: parseFloat(params.labor_hours || params.hours || params.labor_quantity || 1),
          rate: parseFloat(params.labor_rate || params.hourly_rate || params.rate || 0)
        });
      }

      // Parse materials — handle various formats
      if (params.materials && Array.isArray(params.materials)) {
        data.materials = params.materials;
      } else if (params.materials_description || params.materials_cost || params.material_cost) {
        data.materials.push({
          description: params.materials_description || 'Materials',
          quantity: parseFloat(params.materials_quantity || params.material_quantity || 1),
          rate: parseFloat(params.materials_cost || params.material_cost || params.materials_rate || 0)
        });
      }

      // Handle the common case: Gemma returns flat amounts
      if (data.labor.length === 0 && (params.labor_total || params.labor_amount)) {
        const total = parseFloat(params.labor_total || params.labor_amount);
        const hours = parseFloat(params.hours || params.labor_hours || 1);
        data.labor.push({ description: data.jobDescription || 'Labor', quantity: hours, rate: total / hours });
      }
      if (data.materials.length === 0 && (params.materials_total || params.materials_amount || params.materials_cost)) {
        const cost = parseFloat(params.materials_total || params.materials_amount || params.materials_cost);
        data.materials.push({ description: 'Materials', quantity: 1, rate: cost });
      }

      // ── LAST RESORT: parse numbers from job description text ──
      // Gemma often dumps everything into job_desc as natural language
      const desc = data.jobDescription || '';
      if (data.labor.length === 0 && desc) {
        // Match patterns like "6 hours at $85" or "6hrs @ $85/hr" or "labor: 6h x $85"
        const laborMatch = desc.match(/(\d+\.?\d*)\s*(?:hours?|hrs?|h)\s*(?:at|@|x|×)\s*\$?(\d+\.?\d*)/i);
        if (laborMatch) {
          const hours = parseFloat(laborMatch[1]);
          const rate = parseFloat(laborMatch[2]);
          // Extract a short description — text before the numbers
          const laborDesc = desc.match(/^([^.]*?)(?:\d)/)?.[1]?.trim() || desc.split('.')[0].trim() || 'Labor';
          data.labor.push({ description: laborDesc, quantity: hours, rate: rate });
          console.log(`  → Parsed labor from description: ${hours}h × $${rate}`);
        }
      }
      if (data.materials.length === 0 && desc) {
        // Match patterns like "Materials: $240" or "materials were $240" or "materials $240"
        const matsMatch = desc.match(/materials?\s*(?:were|was|:|-|=)?\s*\$?(\d+\.?\d*)/i);
        if (matsMatch) {
          const cost = parseFloat(matsMatch[1]);
          data.materials.push({ description: 'Materials', quantity: 1, rate: cost });
          console.log(`  → Parsed materials from description: $${cost}`);
        }
      }

      // Clean up job description — if we parsed numbers out, simplify it
      if ((data.labor.length || data.materials.length) && data.jobDescription) {
        // Keep just the job name, strip the pricing details
        const cleanDesc = data.jobDescription
          .replace(/\.\s*labor\s*[:.].*$/i, '')
          .replace(/\.\s*materials?\s*[:.].*$/i, '')
          .replace(/\s*labor\s*[:]\s*\d.*$/i, '')
          .replace(/\s*materials?\s*[:]\s*\$.*$/i, '')
          .replace(/\.\s*$/, '')
          .trim();
        if (cleanDesc && cleanDesc.length > 3) data.jobDescription = cleanDesc;
      }

      params = { data, client_name: data.client.name, client_email: params.client_email || '' };
      console.log('  → Restructured data:', JSON.stringify(data, null, 2));
    }

    // Resolve client email — check business profile AND CRM contacts
    let clientName = params.client_name || params.to || params.name || '';
    if (!clientName && params.data && typeof params.data === 'object') {
      clientName = params.data.client?.name || '';
    }
    if (!params.email && !params.client_email && clientName) {
      // Try business profile first
      let resolved = businessProfile ? resolveClientEmail(clientName, businessProfile) : null;
      // Then try CRM contacts
      if (!resolved && crmContacts && crmContacts.length) {
        resolved = resolveClientEmail(clientName, { clients: crmContacts });
      }
      if (resolved) {
        params.client_email = resolved.email;
        if (!params.client_name) params.client_name = resolved.name;
        console.log(`  → Resolved client: "${clientName}" → ${resolved.name} <${resolved.email}>`);
      } else {
        // No email found — ask the user for it
        console.log(`  → No email found for "${clientName}" — asking user`);
        return { action: 'ask', message: `I don't have an email for ${clientName}. What's their email address?`, pending_tool: json.tool_id, pending_params: params };
      }
    }

    // ── CALENDAR POST-PROCESSING ──
    if (json.tool_id === 'simple-calendar') {
      // Fix: Gemma often puts the event title in the action field
      if (params.action && params.action !== 'add' && params.action !== 'view') {
        console.log(`  → Calendar fix: action="${params.action}" is actually the title`);
        params.title = params.action;
        params.action = 'add';
      }
      // Default action to "add" if we have a title
      if (!params.action && params.title) {
        params.action = 'add';
      }
      // Normalize time
      if (params.time) {
        const raw = params.time;
        params.time = normalizeTime(params.time);
        if (raw !== params.time) console.log(`  → Time normalized: "${raw}" → "${params.time}"`);
      }
      console.log(`  → Calendar params (corrected):`, JSON.stringify(params));
    }

    // Build URL — base64-encode the data param if it's an object
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined || v === '') continue;
      if (k === 'data' && typeof v === 'object') {
        // Use base64url (no + or / that break in URLs)
        query.set('data', Buffer.from(JSON.stringify(v)).toString('base64url'));
      } else if (typeof v === 'object') {
        query.set(k, JSON.stringify(v));
      } else {
        query.set(k, String(v));
      }
    }
    query.set('autorun', 'true');
    const url = tool.file + '?' + query.toString();
    console.log(`  → Tool URL: ${url.substring(0, 120)}...`);
    return { action: 'call_tool', tool_id: json.tool_id, params, url };
  }

  // Clarifying question
  if (json.question) {
    return { action: 'ask', message: json.question };
  }

  // Plain response
  if (json.response) {
    return { action: 'respond', message: json.response };
  }

  // Fallback
  return { action: 'respond', message: text };
}

// ══════════════════════════════════════
//  EXPRESS SERVER
// ══════════════════════════════════════
const app = express();

// CORS — localhost, file://, and terrapin.tools (user's own browser tabs only)
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isAllowed = !origin || origin === 'null' || origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/) || origin === 'https://terrapin.tools' || origin === 'https://www.terrapin.tools';
  if (!isAllowed) {
    return res.status(403).json({ success: false, error: 'Forbidden — localhost and terrapin.tools only' });
  }
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '5mb' }));

// Serve static files — agent.html, tools, and all assets
app.use(express.static(path.join(__dirname)));

// ── HEALTH ──
app.get('/health', async (req, res) => {
  const ollama = await checkOllama();
  const mail = await checkMail();
  res.json({
    ollama: ollama.connected,
    gemma: ollama.model,
    mail,
    tools_loaded: toolsManifest.tools.length
  });
});

// ── CHAT ──
app.post('/chat', async (req, res) => {
  const { message, history, business_profile, crm_contacts } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Missing required field: message' });
  }

  // Merge CRM contacts: client-sent + server-side file
  let mergedContacts = crm_contacts || [];
  try {
    const serverContacts = JSON.parse(fs.readFileSync(DATA_FILES.crm, 'utf8'));
    if (Array.isArray(serverContacts) && serverContacts.length) {
      // Merge by adding server contacts not already in client list (by name)
      const existingNames = new Set(mergedContacts.map(c => (c.name || '').toLowerCase()));
      for (const sc of serverContacts) {
        if (!existingNames.has((sc.name || '').toLowerCase())) {
          mergedContacts.push(sc);
        }
      }
    }
  } catch(e) { /* no server CRM file or parse error */ }

  // Log profile for debugging
  if (business_profile) {
    const clients = business_profile.clients || business_profile.regular_clients || [];
    console.log(`  → Profile: ${business_profile.businessName || 'unnamed'} | ${clients.length} profile clients`);
  }
  console.log('CRM contacts available:', mergedContacts.length);

  // Strip logo from profile before building system prompt — base64 images bloat the prompt
  let profileForPrompt = business_profile || null;
  if (profileForPrompt && profileForPrompt.logo) {
    profileForPrompt = Object.assign({}, profileForPrompt);
    delete profileForPrompt.logo;
  }

  const systemPrompt = buildSystemPrompt(profileForPrompt, mergedContacts);

  // Build messages array with conversation history
  const ollamaMessages = [{ role: 'system', content: systemPrompt }];
  if (history && Array.isArray(history)) {
    // Convert chat history to Ollama format (last 20 messages, skip the current one which is last)
    for (const h of history) {
      if (h.role === 'user') {
        ollamaMessages.push({ role: 'user', content: h.text });
      } else if (h.role === 'agent') {
        ollamaMessages.push({ role: 'assistant', content: h.text });
      }
    }
  }
  ollamaMessages.push({ role: 'user', content: message });
  console.log(`  → Sending ${ollamaMessages.length} messages to Gemma (${ollamaMessages.length - 2} history)`);

  try {
    const ollamaRes = await fetch(OLLAMA_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4',
        messages: ollamaMessages,
        stream: false
      })
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      console.error('  → Ollama error:', ollamaRes.status, errText);
      return res.status(502).json({ success: false, error: "I'm having trouble thinking right now. Make sure Gemma is running." });
    }

    const data = await ollamaRes.json();
    const rawResponse = data.message?.content || '';
    const parsed = parseAgentResponse(rawResponse, business_profile, mergedContacts);

    res.json({ success: true, ...parsed, raw: rawResponse });
  } catch (e) {
    res.status(502).json({
      success: false,
      error: "I can't think right now \u2014 the AI model isn't responding. Give it a moment and try again.",
      detail: e.message
    });
  }
});

// ── CALL TOOL ──
app.post('/call-tool', (req, res) => {
  const { tool_id, params } = req.body;

  if (!tool_id) {
    return res.status(400).json({ success: false, error: 'Missing required field: tool_id' });
  }

  const tool = toolsManifest.tools.find(t => t.id === tool_id);
  if (!tool) {
    return res.status(404).json({ success: false, error: 'Tool not found: ' + tool_id });
  }

  const query = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== '') {
        query.set(k, String(v));
      }
    }
  }
  query.set('autorun', 'true');

  const url = tool.file + '?' + query.toString();

  res.json({ success: true, tool_id, url, tool_name: tool.name });
});

// ══════════════════════════════════════
//  DATA ENDPOINTS — ~/.terrapin/ persistence
// ══════════════════════════════════════

// ── PROFILE ──
app.get('/data/profile', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILES.profile, 'utf8'));
    res.json(data);
  } catch(e) {
    res.json({});
  }
});

app.post('/data/profile', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILES.profile, JSON.stringify(req.body, null, 2));
    console.log('  → Profile saved: ' + (req.body.businessName || 'unnamed'));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── CRM ──
app.get('/data/crm', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILES.crm, 'utf8'));
    res.json(Array.isArray(data) ? data : []);
  } catch(e) {
    res.json([]);
  }
});

app.post('/data/crm', (req, res) => {
  try {
    const contacts = Array.isArray(req.body) ? req.body : (req.body.contacts || []);
    fs.writeFileSync(DATA_FILES.crm, JSON.stringify(contacts, null, 2));
    console.log('  → CRM saved: ' + contacts.length + ' contacts');
    res.json({ success: true, count: contacts.length });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── DAILY LOGS ──
app.get('/data/logs', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_FILES.logsDir).filter(f => f.endsWith('.json'));
    const logs = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(DATA_FILES.logsDir, f), 'utf8')); }
      catch(e) { return null; }
    }).filter(Boolean);
    res.json(logs);
  } catch(e) {
    res.json([]);
  }
});

app.post('/data/logs', (req, res) => {
  try {
    const entry = req.body;
    const date = entry.date || new Date().toISOString().split('T')[0];
    const filename = date + (entry.id ? '-' + entry.id : '') + '.json';
    fs.writeFileSync(path.join(DATA_FILES.logsDir, filename), JSON.stringify(entry, null, 2));
    console.log('  → Log saved: ' + date + ' — ' + (entry.jobName || ''));
    res.json({ success: true, filename });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── CALENDAR ──
app.get('/data/calendar', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILES.calendar, 'utf8'));
    res.json(Array.isArray(data) ? data : []);
  } catch(e) {
    res.json([]);
  }
});

app.post('/data/calendar', (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : (req.body.events || []);
    fs.writeFileSync(DATA_FILES.calendar, JSON.stringify(events, null, 2));
    console.log('  → Calendar saved: ' + events.length + ' events');
    res.json({ success: true, count: events.length });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── PROJECTS ──
app.get('/data/projects', (req, res) => {
  try {
    const filePath = path.join(TERRAPIN_DIR, 'projects.json');
    if (!fs.existsSync(filePath)) return res.json({ projects: [], workLogs: [] });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch(e) {
    res.json({ projects: [], workLogs: [] });
  }
});

app.post('/data/projects', (req, res) => {
  try {
    const filePath = path.join(TERRAPIN_DIR, 'projects.json');
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    const count = (req.body.projects || []).length;
    console.log('  → Projects saved: ' + count + ' projects');
    res.json({ success: true, count });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── START ──
loadTools();
initDataDir();

app.listen(PORT, '127.0.0.1', async () => {
  console.log('');
  console.log('  🐢 Terrapin Agent Server');
  console.log(`  Running on http://localhost:${PORT}`);
  console.log('');

  const ollama = await checkOllama();
  const mail = await checkMail();

  console.log('  Status:');
  console.log(`    Ollama:  ${ollama.connected ? '✓ connected' : '✗ not detected'}`);
  console.log(`    Gemma:   ${ollama.model ? '✓ model found' : '✗ not found — run: ollama pull gemma4'}`);
  console.log(`    Mail:    ${mail ? '✓ ready' : '– offline (optional)'}`);
  console.log(`    Tools:   ${toolsManifest.tools.length} loaded`);
  console.log('');
  console.log('  Endpoints:');
  console.log('    GET  /health     — system status');
  console.log('    POST /chat       — {message, business_profile} → agent response');
  console.log('    POST /call-tool  — {tool_id, params} → tool URL');
  console.log('');
  console.log(`  Data:    ${TERRAPIN_DIR}`);
  console.log('  Privacy: All AI runs locally via ' + OLLAMA_URL);
  console.log('           Your data never leaves this machine.');
  console.log('');
  console.log('\n  \ud83d\udc22 Open your Terrapin agent: http://localhost:7777/agent.html\n');

  // First-run detection — if data files are empty, open sync page to pull from browser IndexedDB
  try {
    const profile = JSON.parse(fs.readFileSync(DATA_FILES.profile, 'utf8'));
    const crm = JSON.parse(fs.readFileSync(DATA_FILES.crm, 'utf8'));
    const calendar = JSON.parse(fs.readFileSync(DATA_FILES.calendar, 'utf8'));
    const hasData = (profile && profile.businessName) || (Array.isArray(crm) && crm.length > 0) || (Array.isArray(calendar) && calendar.length > 0);
    if (!hasData) {
      console.log('  No existing data found — opening sync page to import from browser...');
      const { exec } = require('child_process');
      exec('open "https://terrapin.tools/sync?agent=ready"');
    }
  } catch(e) {
    // Data files don't exist or can't be read — skip sync
  }
});
