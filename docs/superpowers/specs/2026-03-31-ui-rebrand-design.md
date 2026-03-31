# MentiSphere UI Rebrand — "Structured Garden"

**Date:** 2026-03-31
**Mood:** Organic & living
**Approach:** Structured Garden — clean structure with organic accents
**Scope:** Full rebrand — wiki CSS, chat widget, typography, color palette

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mood | Organic & living | "Knowledge that grows and connects like a living system" |
| Palette | Deep Forest | Dark greens, warm parchment, gold accent. Scholarly and alive. |
| Typography | Lora + Inter | Serif headings for editorial authority, sans body for readability |
| Namespace color-coding | Dropped | Unified palette. Differentiate via icons + typography instead. |
| Chat widget feel | Integrated editorial | Same fonts and palette as wiki. Conversations feel like reading, not chatbotting. |
| Approach | Structured Garden | Professional backbone with living details. Sweet spot between minimalism and immersion. |

---

## Color System

| Token | Hex | Role |
|-------|-----|------|
| `--forest-900` | `#1b2a21` | Nav bar, headings, deep backgrounds |
| `--forest-700` | `#2d5a3f` | Primary green — links, active states, key text |
| `--forest-500` | `#6b9b7d` | Labels, metadata, muted accents |
| `--forest-300` | `#a8c5b0` | Hover states, subtle fills |
| `--forest-100` | `#e8ebe4` | Pill backgrounds, tinted areas |
| `--gold` | `#c4a35a` | Accent — left borders, dots, highlights |
| `--gold-light` | `#d4b86a` | Hover gold for interactive states |
| `--parchment` | `#f4f0e8` | Message bubbles, card backgrounds |
| `--parchment-light` | `#faf8f4` | Page background |
| `--ink` | `#1a1a2e` | Body text |
| `--ink-muted` | `#5e6e64` | Secondary text, timestamps |
| `--border` | `#e0dbd0` | Default border |
| `--border-light` | `#ede9e0` | Subtle dividers |
| `--error` | `#9b3c3c` | Error states |

---

## Typography

**Fonts:** Lora (Google Fonts, serif) + Inter (Google Fonts, sans-serif)

### Headings (Lora)

| Element | Size | Weight | Line-height |
|---------|------|--------|-------------|
| Page title | 28px | 700 | 1.25 |
| Section heading (h2) | 22px | 700 | 1.3 |
| Subsection (h3) | 18px | 600 | 1.35 |
| Infobox title | 20px | 700 | 1.3 |

### Body (Inter)

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Body text | 15px | 400 | line-height 1.7 |
| UI labels | 11px | 600 | uppercase, 2px letter-spacing |
| Metadata | 12px | 400 | |
| Small | 10px | 500 | |

### Extended Headings (Lora)

| Element | Size | Weight | Line-height |
|---------|------|--------|-------------|
| h4 | 16px | 600 | 1.4 |
| h5 | 15px | 600 | 1.4 |
| h6 | 14px | 600 | 1.4 |

### Special treatments

- Lora italic for taglines, descriptions, agent subtitles
- Inter 500 for navigation items
- Inter 600 for pill badges and status indicators

### Links

- Default: `--forest-700`, no underline. Hover: `--forest-900`, underline.
- Visited: `--forest-500`
- Focus: 2px `--gold` outline offset 2px (accessibility)

### Transitions

- All interactive elements: `transition: all 0.2s ease`
- Card hover lift: `transition: transform 0.2s ease, box-shadow 0.2s ease`

### Focus states (accessibility)

- Inputs: `--forest-700` border + `rgba(45, 90, 63, 0.1)` box-shadow
- Buttons: 2px `--gold` outline, 2px offset
- Links: 2px `--gold` outline, 2px offset

---

## Components

### Navigation bar

- Background: `--forest-900`
- Logo: Lora 700, `--parchment`
- Nav links: Inter 500 11px, `--forest-300` default, `--gold` on active/hover
- Sticky, 1px border-bottom `rgba(255,255,255,0.1)`

### Infoboxes (unified across all namespaces)

- Background: `--parchment`, 1px `--border` border, 8px radius
- Left accent: 2px `--gold` border
- Namespace label: Inter 10px uppercase `--forest-500`, preceded by small `--gold` dot
- Namespace icons: Unicode characters — 🧠 (Agent), 📖 (Knowledge), ⚙️ (Skill). No SVG assets needed; rendered inline via CSS `::before` pseudo-element on namespace label.
- Title: Lora 20px 700 `--forest-900`
- Subtitle: Lora 13px italic `--forest-500`
- Metadata pills: Inter 10px, `--forest-100` bg, `--forest-700` text, 12px radius

### Cards

- Background: `--parchment-light`, 1px `--border` border, 8px radius
- Hover: `translateY(-1px)`, slightly darker border, subtle shadow
- No shadow at rest
- Optional 2px `--gold` top-border or left-border

### Pill badges

- Background: `--forest-100`, text: `--forest-700`
- 12px radius, 3px 10px padding
- For: maturity level, edit count, status

### Buttons

- Primary: `--forest-700` bg, `--parchment` text, 6px radius. Hover: `--forest-900`
- Secondary: transparent, 1px `--forest-700` border
- Gold CTA (rare): `--gold` bg, `--forest-900` text

### Dividers & rules

- Section dividers: 1px `--border-light`
- Page title underline: 2px `--gold`, 40px wide
- Blockquotes: 2px `--gold` left-border, `--parchment` bg

### Forms (PageForms extension)

- Inputs/textareas: 1px `--border`, 8px radius, `--parchment` bg
- Focus: `--forest-700` border, `rgba(45, 90, 63, 0.1)` shadow
- Labels: Inter 12px 600, `--forest-700`
- Fieldset borders: 1px `--border-light`

### Tables

- Header row: `--forest-100` bg, Inter 12px 600 uppercase `--forest-700`
- Body rows: alternating `--parchment-light` and white
- Borders: 1px `--border-light`
- Cell padding: 10px 14px

### Code blocks (wiki content)

- Background: `--forest-900`, text: `--parchment`, system monospace
- Padding: 16px, border-radius: 6px
- Inline code: `--forest-100` bg, `--forest-700` text, 2px 6px padding, 4px radius

---

## Chat Widget

Integrated editorial — same fonts and palette as the wiki.

- **Container:** `--parchment-light` bg, 1px `--border` border, 8px radius
- **Header:** Lora 13px "Conversation" in `--forest-900`, 1px `--border-light` bottom divider
- **User messages:** `--parchment` bg, 6px radius, 2px `--forest-500` left-border
- **Assistant messages:** no background, `--forest-700` text on `--parchment-light`
- **Input:** 1px `--border`, Inter 14px, `--parchment` bg. Focus: `--forest-700` border
- **Send button:** `--forest-700` bg, `--parchment` text, 6px radius
- **Streaming dots:** `--forest-500`, bounce animation
- **Rating buttons:** `--ink-muted` at 0.5 opacity, `--gold` on active
- **Code blocks:** `--forest-900` bg, `--parchment` text, system monospace

---

## Page Templates

### Agent page

1. Infobox: mind icon + agent name (Lora 20px) + italic subtitle
2. Gold-bordered description block
3. Content body (Lora headings, Inter body)
4. Chat widget below, 32px top margin

### Knowledge page

1. Infobox: book icon + title
2. Table of contents (Inter 12px, `--forest-500` links)
3. Dense reference body text

### Skill page

1. Infobox: gear icon + skill name
2. Spec-like labeled sections (Input, Output, Usage)
3. Code examples in dark blocks

### Main Page

1. **Hero:** Lora 32px title centered, Lora italic 16px tagline, `--parchment` bg
2. **Action cards (3):** "Create an Agent" / "Add Knowledge" / "Create a Skill" — icon, Lora 18px heading, Inter body, 2px `--gold` top-border
3. **Browse section:** DPL list with Lora 15px titles, Inter metadata
4. **How it Works:** 3 numbered steps, `--forest-100` bg, `--gold` step numbers

---

## Color Token Implementation

All 14 color tokens are defined as CSS custom properties in `:root` at the top of `Common.css`. The chat widget `styles.css` duplicates the same `:root` block (the widget is a standalone IIFE bundle, not in the MW CSS cascade).

## Font Loading

Google Fonts (Lora + Inter) loaded via `$wgHooks['BeforePageDisplay']` in `LocalSettings.php`, injecting a `<link>` tag into the HTML `<head>`. The chat widget loads fonts via its own `<link>` tag injected by the chat-loader JS.

## Infobox HTML Strategy

Keep existing CSS class names (`.agent-infobox`, `.knowledge-infobox`, `.skill-infobox`) but restyle them all identically with the unified forest palette. Namespace differentiation comes from the wiki template content (icon + label text already present), not from CSS color differences. This avoids needing to change any wiki templates or PageForms definitions.

## Files to Modify

| File | Change |
|------|--------|
| `mediawiki/Common.css` | Full rewrite — `:root` tokens, typography, all components |
| `chat-widget/src/styles.css` | Full rewrite — editorial chat styling with `:root` tokens |
| `chat-widget/src/components/AgentInfoBar.tsx` | Update header markup for new design |
| `chat-widget/src/components/ChatMessage.tsx` | Adjust classes for left-border message styling |
| `chat-widget/src/components/ChatInput.tsx` | Update input/button styling |
| `chat-widget/src/components/StreamingIndicator.tsx` | Update dot colors to `--forest-500` |
| `chat-widget/src/components/MessageList.tsx` | Update empty state styling |
| `mediawiki/Main_Page.wikitext` | Update hero, cards, browse sections for new design |
| `mediawiki/LocalSettings.php` | Add Google Fonts loading hook |
| `mediawiki/extensions/MentiSphereChat/modules/ext.mentisphere.chat/chat-loader.css` | Update container styling for new widget |

---

## Verification

### Pre-checks
1. Start the full stack with `docker compose up -d`
2. Open browser dev tools → Network tab → confirm Lora and Inter fonts load from Google Fonts
3. Inspect `:root` in Elements panel → confirm all 14 CSS custom properties are defined

### Visual verification
4. Load the Main Page — verify hero, action cards, browse sections use new palette/fonts
5. Navigate to an Agent page — verify unified infobox with 🧠 icon, gold left-border, Lora headings
6. Navigate to a Knowledge page — verify 📖 icon, same infobox style
7. Navigate to a Skill page — verify ⚙️ icon, same infobox style
8. Open an Agent chat — verify editorial chat styling, same fonts, parchment palette
9. Send a message — verify user message has `--forest-500` left-border, assistant has no background
10. Verify streaming dots are `--forest-500` green
11. Rate a message — verify `--gold` active state

### Interactive states
12. Hover on Main Page cards — verify `translateY(-1px)` lift + subtle shadow
13. Focus on chat input — verify `--forest-700` border
14. Tab through links/buttons — verify `--gold` focus outline (accessibility)

### Cleanup check
15. Grep codebase for old colors: `#2196f3`, `#1a237e`, `#00897b`, `#ff8f00` — should return zero matches in CSS/TSX files
