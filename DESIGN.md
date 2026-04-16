# DESIGN.md — Terrapin Tools

Design reference for terrapin.tools landing page and tool interfaces.
Inspired by TinyWow's clean grid layout but warmer, more human, with Grateful Dead soul.

---

## Visual Identity

### Colors
- **Primary background:** #F5F0E8 — warm off-white, like aged paper
- **Primary dark:** #2C3E2D — deep forest green
- **Accent gold:** #C9A84C — warm gold, tool belt buckle energy
- **Accent rust:** #B85C2C — burnt orange, earthy warmth
- **Text primary:** #1A1A1A — near black
- **Text secondary:** #6B6B6B — warm gray
- **Card background:** #FFFFFF — clean white
- **Card border:** #E8E0D0 — warm light border
- **Success green:** #4A7C59 — muted forest green

### Typography
- **Headline font:** "Playfair Display" or "Lora" — serif, warm, slightly editorial
- **Body font:** "Inter" or "DM Sans" — clean, readable, modern
- **Mono/label:** "DM Mono" — for tool names and categories
- **Headline size:** 56px desktop / 36px mobile
- **Body size:** 16px, line-height 1.6
- **Label size:** 12px uppercase, letter-spacing 0.08em

### Spacing
- **Max content width:** 1200px
- **Section padding:** 80px vertical desktop / 48px mobile
- **Card padding:** 24px
- **Grid gap:** 20px
- **Border radius:** 12px cards / 8px buttons

---

## Layout Structure

### Hero Section
- Full width, warm off-white background
- Centered layout
- Turtle mascot left or centered — large, friendly, with tool belt
- H1: Bold serif headline, 2-3 lines max
- Subline: 1 sentence, gray, explains what it is
- CTAs: "Get Started" (primary, green, links to setup wizard — hidden on mobile) + "Browse Free Tools" (secondary)
- Returning users: "Get Started" swaps to "Open Your Dashboard" (checks localStorage + server)
- Subtle texture or grain overlay for warmth
- NO hero image carousel, NO video, NO animation

### Tool Category Grid (TinyWow-inspired)
- 3-4 columns desktop, 2 mobile, 1 on small mobile
- Each category card:
  - Turtle icon doing that job (small, illustrated)
  - Category name (bold, serif)
  - Tool count ("7 free tools")
  - One featured tool name
  - Warm card background, subtle shadow on hover
- Categories: Contractors, Restaurants & Cafes, Freelancers, Retail & Shops, Food & Catering, All Businesses

### Featured Tools Section
- Horizontal scrolling row or 4-column grid
- Tool cards:
  - Tool name (bold)
  - One line description
  - Business type tag (small pill badge)
  - "Open Tool" button — green, no login copy
  - "Free" badge top right
- Tagline above section: "The best of the best. All free, no catch." (borrowed TinyWow energy)

### Why Terrapin Section
- 3 columns, icon + headline + 2 lines
- "No login. Ever." / "Runs on your computer." / "Your data stays yours."
- Simple, direct, answers the trust questions fast

### Stats Bar (optional)
- Inspired by TinyWow's "1M active users / 10M files / 200+ tools"
- Keep honest: "7 free tools / Built for the people who built America / No subscriptions"

### Email Signup
- Single centered section, warm background
- Headline: "New tools drop every week."
- Subline: "Built for the coffee shop, the dry cleaner, the contractor. Free, always."
- Email input + button, no other fields
- No dark patterns, no fake urgency

### Footer
- Simple 3-column: Navigate / Tools / About
- Tagline: "terrapin.tools — simple tools for people who work"
- Tiny steal-your-face detail somewhere — easter egg for Deadheads

---

## Component Styles

### Primary Button
- Background: #2C3E2D (forest green)
- Text: #FFFFFF
- Padding: 12px 24px
- Border radius: 8px
- Hover: slightly lighter green, subtle shadow
- Font: DM Sans, 15px, medium weight

### Secondary Button
- Background: transparent
- Border: 1.5px solid #2C3E2D
- Text: #2C3E2D
- Same padding and radius as primary
- Hover: light green fill

### Tool Card
- Background: #FFFFFF
- Border: 1px solid #E8E0D0
- Border radius: 12px
- Padding: 20px
- Hover: border color darkens, subtle lift shadow (0 4px 12px rgba(0,0,0,0.08))
- "Free" badge: #4A7C59 background, white text, top right corner, 10px font

### Category Card
- Background: #FDFAF4 (slightly warmer than white)
- Border: 1px solid #E8E0D0
- Larger padding: 28px
- Turtle icon: 48px, illustrated, doing job-specific action
- Hover: gold accent border

### Badge / Pill
- Business type tags: #F0EBE0 background, #6B6B6B text, 6px border radius
- "Free" badge: green
- "New" badge: gold

### Foundation Card (Agent Brain tools)
- Background: linear-gradient(135deg, #FDFAF4 0%, #F5EDD8 100%) — warm gold tint
- Border: 1px solid #C9A84C (gold)
- Box shadow: 0 2px 8px rgba(201, 168, 76, 0.12)
- Hover: gold border intensifies, shadow grows
- "Agent Brain" badge: gold background (#C9A84C), white text, top right
- Used for: Business Profile + Turtle Shell on homepage
- Layout: 2-column row above the regular tools grid

### Agent Chat (Light Theme)
- Background: #F5F0E8 (same warm cream as everything else)
- Top bar: #2C3E2D dark green with gold title — anchors the brand
- Agent bubbles: white (#FFFFFF) with #E8E0D0 border — card style
- User bubbles: dark green (#2C3E2D) with white text
- Send button: dark green (#2C3E2D)
- Input: white background, warm border
- Action cards: white with warm borders (same as tool cards)
- NO dark mode by default — warm and earthy is the brand (dark mode as toggle later)

### Dashboard
- Same warm cream background as all pages
- Clock: DM Mono, 48px, centered
- Greeting: Lora serif, time-based (morning/afternoon/evening)
- Live widgets: white cards with warm borders, 3-column grid
- Tool cards: draggable, subtle handle icon
- Settings modal: white card with toggles
- Desktop only — mobile shows gate with "desktop only" message

### Mobile Gate (Desktop-Only Pages)
- Centered vertically, warm cream background
- Title: Lora serif, 22px
- Subtitle: 15px, muted color
- Single CTA button linking to free tools
- Used on: dashboard.html, turtle-shell.html, agent.html

---

## Design Principles

1. **Warm, not corporate.** Every color choice should feel like a hardware store, not a SaaS dashboard.
2. **Human first.** Photography of real small businesses over abstract illustrations.
3. **The turtle is the brand.** Every section should feel like it belongs to a turtle family doing different jobs.
4. **No dark patterns.** No fake countdown timers, no "limited time" language, no hidden upgrade prompts.
5. **Mobile is equal.** The contractor is checking this on his phone in a parking lot. Design for that.
6. **The easter egg.** Somewhere on every page, a small Grateful Dead nod — a steal your face hidden in the footer, a lightning bolt detail, a color that only Deadheads would clock.
7. **TinyWow layout, Terrapin soul.** Take the grid and tool card pattern from TinyWow. Reject the clinical white. Replace with warm earth tones and personality.

---

## What NOT to Do

- No gradient hero backgrounds that look like SaaS
- No stock photos of people on laptops smiling
- No "enterprise" language anywhere
- No modal popups on first load
- No cookie consent banners that cover half the screen
- No fake social proof ("Join 50,000+ businesses!" when you have 3 users)
- No dark mode by default (warm and earthy is the brand — dark mode as optional toggle later)
