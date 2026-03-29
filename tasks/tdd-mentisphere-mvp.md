# Technical Design Document: MentiSphere MVP

## Architecture Overview

MentiSphere is a two-system architecture: **MediaWiki** handles all wiki functionality (pages, governance, revisions, talk pages, user profiles), and a lightweight **Chat Service** handles the AI-specific features (LLM chat, RAG retrieval, chat history).

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│                                                              │
│  MediaWiki UI (Citizen skin)         Chat Widget (embedded)  │
│  ┌────────────────────────────┐     ┌─────────────────────┐  │
│  │ Agent/Knowledge/Skill pages│     │ Chat with agent     │  │
│  │ Talk pages, History, Diffs │     │ Streaming responses │  │
│  │ Watchlists, Profiles      │     │ Message rating      │  │
│  │ Search, Leaderboards      │     │                     │  │
│  └────────────────────────────┘     └──────────┬──────────┘  │
└───────────────┬──────────────────────────────────┼────────────┘
                │                                  │
        ┌───────▼───────────┐             ┌────────▼──────────┐
        │    MEDIAWIKI       │             │   CHAT SERVICE    │
        │    (PHP 8.2)       │◄────────────│   (Next.js API)   │
        │                    │ MW API:     │                   │
        │ • Page storage     │ read agent  │ • LLM calls       │
        │ • Revisions/diffs  │ prompts &   │ • RAG retrieval   │
        │ • Talk pages       │ knowledge   │ • Streaming SSE   │
        │ • User accounts    │ pages       │ • Chat history    │
        │ • Watchlists       │             │ • Message ratings │
        │ • Categories       │             │ • Embeddings      │
        │ • Search (CirrusSearch)          │                   │
        │ • Permissions      │             │                   │
        └───────┬────────────┘             └────────┬──────────┘
                │                                   │
        ┌───────▼────────┐              ┌───────────▼─────────┐
        │    MariaDB     │              │    PostgreSQL        │
        │  (MW default)  │              │  + pgvector          │
        │                │              │                      │
        │ • Wiki content │              │ • chat_sessions      │
        │ • Users        │              │ • chat_messages      │
        │ • Revisions    │              │ • knowledge_embeddings│
        │ • Watchlists   │              │ • message_ratings    │
        └────────────────┘              └──────────────────────┘
                                                │
                                        ┌───────▼──────┐
                                        │  Anthropic   │
                                        │  Claude API  │
                                        └──────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Wiki platform** | MediaWiki 1.42+ | 20 years of battle-tested wiki features. Revision history, talk pages, diffs, watchlists, user profiles, permissions, search — all built-in. Saves weeks of development. |
| **MediaWiki skin** | Citizen | Modern, responsive, clean UI. Closest to a contemporary web app. Active development. |
| **Chat delivery** | Separate Next.js service | MediaWiki is PHP — not suited for SSE streaming, LLM orchestration, or vector search. Keep AI concerns in a purpose-built service. |
| **Chat embedding** | MediaWiki extension + iframe/JS widget | Embeds the chat UI into agent pages seamlessly. Extension adds a "Chat" tab to agent pages. |
| **Chat database** | PostgreSQL + pgvector | Chat history and RAG embeddings live outside MediaWiki's MariaDB. Keeps concerns separated. pgvector avoids a separate vector DB service. |
| **LLM provider** | Anthropic Claude (behind abstraction) | Best reasoning quality. Abstract behind interface so providers are swappable. |
| **RAG source** | MediaWiki API → embeddings | Knowledge pages are authored in MediaWiki. Chat service reads them via MW API, chunks, embeds, and stores in pgvector. |
| **Authentication bridge** | Shared session / OAuth | User logs in via MediaWiki. Chat service validates identity via MW API or shared cookie/token. Single source of truth for users. |
| **Hosting** | VPS (Docker Compose) | MediaWiki needs PHP + MariaDB + file storage. Not suited for serverless. Docker Compose bundles everything on one machine. |

---

## Technology Stack

### Wiki Layer (MediaWiki)

- **Software:** MediaWiki 1.42 LTS
- **PHP:** 8.2+
- **Database:** MariaDB 10.6+
- **Skin:** Citizen (modern responsive skin)
- **Search:** CirrusSearch extension (Elasticsearch-backed full-text search)
- **Structured Data:** Cargo extension (structured fields on pages — maturity level, domain, dependencies)
- **Templates:** Lua-based templates (Scribunto) for agent/knowledge/skill page structure
- **Key Extensions:**
  - **CirrusSearch** — full-text search with filters and facets
  - **Cargo** — structured data queries (leaderboards, dependency graphs, filtering)
  - **Scribunto** — Lua templating for page infoboxes and structured rendering
  - **VisualEditor** — WYSIWYG editing for non-technical contributors
  - **Echo** — notification system (watchlists, talk page pings)
  - **Thanks** — one-click recognition for edits (barnstar-lite)
  - **PageAssessment** — quality assessment / maturity levels (stub → featured)
  - **AbuseFilter** — anti-vandalism rule engine
  - **MentiSphereChat** — custom extension to embed chat widget on agent pages

### Chat Layer (Next.js Service)

- **Runtime:** Node.js 20+ (Next.js API routes)
- **Framework:** Next.js 15 (API routes only — no frontend pages, just the chat widget served as static assets)
- **Database:** PostgreSQL 16 + pgvector extension
- **ORM:** Drizzle ORM
- **LLM:** Anthropic SDK (@anthropic-ai/sdk)
- **Embeddings:** Anthropic or OpenAI embeddings API (for knowledge page vectorization)
- **Validation:** Zod
- **Rate Limiting:** In-memory rate limiter (or Redis if needed later)

### Infrastructure

- **Hosting:** Single VPS (e.g., Hetzner, DigitalOcean, or Railway)
- **Orchestration:** Docker Compose (MediaWiki + MariaDB + PostgreSQL + Chat Service + Elasticsearch)
- **Reverse Proxy:** Nginx (routes wiki.mentisphere.org → MediaWiki, chat API → Chat Service)
- **TLS:** Let's Encrypt (auto-renewing via Certbot)
- **Backups:** Automated daily DB dumps (MariaDB + PostgreSQL) to object storage
- **Monitoring:** Uptime Kuma (self-hosted) + basic Nginx access logs
- **CI/CD:** GitHub Actions (chat service lint + build + deploy via SSH)

---

## MediaWiki Configuration

### Page Types via Namespaces

MediaWiki namespaces give each page type its own URL prefix, talk page, and permission set.

| Page Type | Namespace | URL Pattern | Talk Page |
|-----------|-----------|-------------|-----------|
| Agent | `Agent:` (NS 3000) | `/wiki/Agent:Medical_Triage` | `Agent_talk:Medical_Triage` |
| Knowledge | `Knowledge:` (NS 3010) | `/wiki/Knowledge:Swiss_Tax_Law` | `Knowledge_talk:Swiss_Tax_Law` |
| Skill | `Skill:` (NS 3020) | `/wiki/Skill:PDF_Generation` | `Skill_talk:PDF_Generation` |
| Orchestrator | `Orchestrator:` (NS 3030) | `/wiki/Orchestrator:Main` | `Orchestrator_talk:Main` |

### Agent Page Template Structure

Every Agent page uses a mandatory template (enforced via Lua/Scribunto):

```wikitext
{{AgentPage
| name = Medical Triage Agent
| domain = Medical
| maturity = start
| description = An expert medical triage agent that helps assess symptoms and recommend next steps.
| knowledge_deps = Knowledge:Pharmacology, Knowledge:Emergency_Protocols
| skill_deps = Skill:DICOM_Analysis
| known_limitations = Not a replacement for professional medical advice. Does not handle pediatric cases yet.
}}

== Identity and Purpose ==
You are a medical triage specialist with expertise in...

== Steps ==
1. First, assess the patient's primary complaint...
2. Then, evaluate severity using...

== Output ==
Provide your assessment in the following format...
```

### Cargo Structured Data

The Cargo extension stores structured fields from templates in queryable tables:

**Cargo Table: `agent_data`**

| Field | Type | Description |
|-------|------|-------------|
| _pageName | String | Page title |
| name | String | Agent display name |
| domain | String | Domain category |
| maturity | String | stub/start/c/b/ga/featured |
| description | String | Short description |
| knowledge_deps | List of Page | Knowledge page dependencies |
| skill_deps | List of Page | Skill page dependencies |
| created_by | String | Original author username |
| chat_count | Integer | Total chat sessions (synced from chat service) |

This enables queries like: "Show all Featured agents in the Medical domain, sorted by chat count."

### Leaderboard via Cargo Queries

Leaderboards are wiki pages using Cargo queries — no custom code needed:

```wikitext
{{#cargo_query:
  tables=agent_data
  | fields=_pageName, domain, maturity, chat_count
  | where=maturity='featured'
  | order by=chat_count DESC
  | limit=20
}}
```

Contribution leaderboards can use MediaWiki's built-in user contribution counts or a custom Cargo table that tracks edit scores.

### Maturity Assessment

The **PageAssessment** extension (or a simpler custom template) adds quality ratings:

- **Stub** — minimal prompt, no knowledge dependencies
- **Start** — basic prompt with some structure
- **C** — follows template, has knowledge deps
- **B** — community-reviewed, good eval feedback on talk page
- **GA (Good Agent)** — passed community review process
- **Featured** — best-in-domain, exemplary prompt engineering

Maturity level is displayed in the page infobox and is filterable in search.

---

## Chat Service: Database Schema

The chat service has its own PostgreSQL database. Only AI-specific data lives here.

### Table: `chat_sessions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Session ID |
| mw_user_id | integer | NOT NULL | MediaWiki user ID |
| mw_username | text | NOT NULL | MediaWiki username (cached) |
| agent_page_title | text | NOT NULL | MediaWiki page title (e.g., "Agent:Medical_Triage") |
| created_at | timestamptz | DEFAULT now() | Session start |

### Table: `chat_messages`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Message ID |
| session_id | uuid | FK → chat_sessions.id, NOT NULL | Parent session |
| role | text | NOT NULL, CHECK (user\|assistant) | Sender |
| content | text | NOT NULL | Message body |
| rating | text | NULLABLE, CHECK (helpful\|not_helpful) | User feedback |
| created_at | timestamptz | DEFAULT now() | Send time |

### Table: `knowledge_embeddings`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Embedding ID |
| page_title | text | NOT NULL | MediaWiki knowledge page title |
| page_revision_id | integer | NOT NULL | MW revision ID (for cache invalidation) |
| chunk_index | integer | NOT NULL | Chunk position |
| chunk_text | text | NOT NULL | The text chunk |
| embedding | vector(1536) | NOT NULL | Vector embedding |
| created_at | timestamptz | DEFAULT now() | Embedding time |

**Indexes:** HNSW index on embedding. Unique on (page_title, page_revision_id, chunk_index).

### Table: `agent_stats`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| agent_page_title | text | PK | Agent page title |
| total_sessions | integer | DEFAULT 0 | Total chat sessions |
| total_messages | integer | DEFAULT 0 | Total messages sent |
| helpful_count | integer | DEFAULT 0 | Helpful ratings |
| not_helpful_count | integer | DEFAULT 0 | Not helpful ratings |
| updated_at | timestamptz | DEFAULT now() | Last update |

These stats are periodically synced back to MediaWiki (via MW API or Cargo) to display on agent pages.

---

## Chat Service: API Specifications

Base URL: `https://chat.mentisphere.org/api` (or `/chat-api` via Nginx reverse proxy on same domain)

### Authentication Bridge

The chat service validates users via MediaWiki:

1. User logs into MediaWiki normally
2. The chat widget includes the user's MW session cookie
3. Chat service calls MW API (`action=query&meta=userinfo`) to validate the session and get user ID/username
4. Chat service caches the validated identity for the session duration

### `POST /api/sessions`

- **Purpose:** Start a new chat session with an agent
- **Auth Required:** Yes (MW session cookie)
- **Request Body:** `{ agent_page_title: string }`
- **Response:** `{ session_id: string, agent_name: string }`
- **Logic:**
  1. Validate user via MW API
  2. Fetch agent page content via MW API (`action=parse&page=Agent:X`)
  3. Create session record
  4. Return session ID
- **Error Cases:** 401 (invalid session), 404 (agent page not found)

### `POST /api/sessions/[id]/messages`

- **Purpose:** Send a message and receive a streaming AI response
- **Auth Required:** Yes
- **Request Body:** `{ content: string }`
- **Response:** `text/event-stream` (Server-Sent Events)
- **Logic:**
  1. Load agent page's system prompt (cached, refreshed on MW revision change)
  2. Load conversation history from `chat_messages`
  3. Retrieve relevant knowledge chunks via pgvector similarity search on the user's message
  4. Construct LLM call: system prompt + knowledge context + conversation history + user message
  5. Stream response from Anthropic API
  6. Save user message + complete assistant response to `chat_messages`
  7. Update `agent_stats` counters
- **Error Cases:** 401, 404 (session not found), 429 (rate limited)

### `POST /api/messages/[id]/rate`

- **Purpose:** Rate a chat message
- **Auth Required:** Yes
- **Request Body:** `{ rating: "helpful" | "not_helpful" }`
- **Response:** `{ success: true }`
- **Error Cases:** 401, 404

### `GET /api/sessions?agent=Agent:Medical_Triage`

- **Purpose:** Get user's chat history with an agent
- **Auth Required:** Yes
- **Response:** `{ sessions: [{ id, agent_page_title, created_at, message_count }] }`

### `GET /api/sessions/[id]/messages`

- **Purpose:** Get messages for a session
- **Auth Required:** Yes
- **Response:** `{ messages: [{ id, role, content, rating, created_at }] }`

### `POST /api/embeddings/sync`

- **Purpose:** Re-embed a knowledge page after it's edited (called via MW webhook or cron)
- **Auth Required:** Service key (internal only)
- **Request Body:** `{ page_title: string }`
- **Logic:**
  1. Fetch page content via MW API
  2. Chunk the text
  3. Generate embeddings
  4. Upsert into `knowledge_embeddings` (delete old revision's chunks, insert new)

### `GET /api/stats/[agent_page_title]`

- **Purpose:** Get chat stats for an agent (consumed by MW to display on agent pages)
- **Auth Required:** No
- **Response:** `{ total_sessions, total_messages, helpful_count, not_helpful_count }`

---

## Custom MediaWiki Extension: MentiSphereChat

A lightweight PHP extension that adds the chat interface to agent pages.

### What It Does

1. **Adds a "Chat" tab** to all pages in the Agent namespace
2. **Embeds the chat widget** (served as static JS/CSS from the chat service)
3. **Passes context** to the widget: agent page title, user session cookie, chat service URL

### Extension Structure

```
extensions/MentiSphereChat/
├── extension.json              # Extension registration
├── includes/
│   ├── MentiSphereChatHooks.php  # Hook handlers
│   └── MentiSphereChatAction.php # "Chat" tab action
├── modules/
│   └── ext.mentisphere.chat/
│       ├── chat-widget.js      # Loads chat UI from chat service
│       └── chat-widget.css     # Styling for embedded widget
└── i18n/
    └── en.json                 # Translations
```

### Key Hooks

- `SkinTemplateNavigation::Universal` — adds "Chat" tab to Agent pages
- `BeforePageDisplay` — injects chat widget JS/CSS on agent pages
- `PageSaveComplete` — triggers embedding sync when knowledge pages are edited

### Chat Widget Embedding

```php
// MentiSphereChatHooks.php
public static function onBeforePageDisplay( OutputPage $out, Skin $skin ) {
    $title = $out->getTitle();
    if ( $title->getNamespace() === NS_AGENT ) {
        $out->addModules( 'ext.mentisphere.chat' );
        $out->addJsConfigVars( [
            'wgMentiSphereChatServiceUrl' => $wgMentiSphereChatServiceUrl,
            'wgMentiSphereAgentPage' => $title->getPrefixedText(),
        ] );
    }
}
```

The chat widget itself is a small React app bundled as a single JS file, loaded into a container div on the agent page. It communicates directly with the chat service API.

---

## Chat Widget: Component Architecture

The chat widget is a standalone React micro-app, built separately and served as static assets.

### Components

- `ChatWidget` — Root component. Manages session state, renders chat panel.
- `MessageList` — Scrollable list of chat messages with auto-scroll
- `ChatMessage` — Single message bubble (user or assistant). Markdown rendered. Rating buttons on assistant messages.
- `ChatInput` — Text input with send button. Disabled while streaming.
- `AgentInfoBar` — Agent name, "View Source" link back to wiki page, maturity badge
- `StreamingIndicator` — Typing indicator while response streams in

### File Structure

```
chat-widget/
├── src/
│   ├── App.tsx                 # Root — reads MW config vars, initializes
│   ├── components/
│   │   ├── ChatWidget.tsx
│   │   ├── MessageList.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── AgentInfoBar.tsx
│   │   └── StreamingIndicator.tsx
│   ├── hooks/
│   │   └── use-chat.ts         # SSE streaming hook
│   ├── lib/
│   │   ├── api.ts              # Chat service API client
│   │   └── markdown.ts         # Markdown → HTML renderer
│   ├── types.ts
│   └── index.tsx               # Entry point, mounts to #mentisphere-chat
├── package.json
├── tsconfig.json
├── vite.config.ts              # Builds to single JS + CSS bundle
└── dist/                       # Built output → served by chat service
    ├── chat-widget.js
    └── chat-widget.css
```

Built with Vite for fast bundling into a single JS file that MediaWiki loads.

---

## Chat Service: File Structure

```
chat-service/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── sessions/
│   │       │   ├── route.ts                    # POST create, GET list
│   │       │   └── [id]/
│   │       │       └── messages/
│   │       │           └── route.ts            # POST send (streaming), GET history
│   │       ├── messages/
│   │       │   └── [id]/
│   │       │       └── rate/
│   │       │           └── route.ts            # POST rate
│   │       ├── embeddings/
│   │       │   └── sync/
│   │       │       └── route.ts                # POST sync knowledge embeddings
│   │       └── stats/
│   │           └── [agentPageTitle]/
│   │               └── route.ts                # GET agent stats
│   ├── lib/
│   │   ├── mediawiki/
│   │   │   ├── client.ts                       # MW API client (fetch pages, validate sessions)
│   │   │   └── types.ts
│   │   ├── llm/
│   │   │   ├── provider.ts                     # Abstract LLM interface
│   │   │   ├── anthropic.ts                    # Anthropic Claude implementation
│   │   │   └── types.ts
│   │   ├── rag/
│   │   │   ├── embeddings.ts                   # Generate embeddings
│   │   │   ├── retrieval.ts                    # Query pgvector
│   │   │   └── chunker.ts                      # Split pages into chunks
│   │   ├── auth.ts                             # Validate MW session
│   │   └── utils.ts
│   ├── db/
│   │   ├── schema.ts                           # Drizzle schema
│   │   └── migrations/
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── Dockerfile
└── .env.example
```

---

## Infrastructure: Docker Compose

```yaml
# docker-compose.yml
services:
  mediawiki:
    image: mediawiki:1.42
    ports:
      - "8080:80"
    volumes:
      - ./mediawiki/LocalSettings.php:/var/www/html/LocalSettings.php
      - ./mediawiki/extensions/MentiSphereChat:/var/www/html/extensions/MentiSphereChat
      - ./mediawiki/skins/citizen:/var/www/html/skins/citizen
      - wiki-images:/var/www/html/images
    depends_on:
      - mariadb
      - elasticsearch
    environment:
      - MEDIAWIKI_DB_HOST=mariadb
      - MEDIAWIKI_DB_NAME=mentisphere_wiki

  mariadb:
    image: mariadb:10.11
    volumes:
      - mariadb-data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=mentisphere_wiki

  elasticsearch:
    image: elasticsearch:7.17.18
    volumes:
      - es-data:/usr/share/elasticsearch/data
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms256m -Xmx256m"

  chat-service:
    build: ./chat-service
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    environment:
      - DATABASE_URL=postgresql://mentisphere:${PG_PASSWORD}@postgres:5432/mentisphere_chat
      - MEDIAWIKI_API_URL=http://mediawiki:80/api.php
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=mentisphere_chat
      - POSTGRES_USER=mentisphere
      - POSTGRES_PASSWORD=${PG_PASSWORD}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/certs:/etc/nginx/certs
    depends_on:
      - mediawiki
      - chat-service

volumes:
  mariadb-data:
  postgres-data:
  es-data:
  wiki-images:
```

### Nginx Routing

```nginx
server {
    server_name mentisphere.org;

    # Wiki — all /wiki/* and /api.php routes
    location / {
        proxy_pass http://mediawiki:80;
    }

    # Chat service API
    location /chat-api/ {
        proxy_pass http://chat-service:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Connection '';       # Required for SSE
        proxy_buffering off;                  # Required for streaming
    }

    # Chat widget static assets
    location /chat-assets/ {
        proxy_pass http://chat-service:3000/assets/;
    }
}
```

---

## Implementation Phases (Vertical Slices)

### Phase 1: MediaWiki Setup (Days 1-2)

**Goal:** Wiki running with custom namespaces, templates, and a few seed pages.

- Docker Compose setup (MediaWiki + MariaDB + Elasticsearch)
- Install and configure Citizen skin
- Register custom namespaces: Agent, Knowledge, Skill, Orchestrator (+ talk namespaces)
- Install extensions: CirrusSearch, Cargo, Scribunto, VisualEditor, Echo, Thanks, AbuseFilter
- Create Lua templates: AgentPage, KnowledgePage, SkillPage infoboxes
- Create Cargo table definitions for structured data
- Seed 5 sample agent pages, 3 knowledge pages, 2 skill pages
- Configure categories: domains (Medical, Legal, Cooking, Tech, etc.)
- Nginx reverse proxy with TLS

**Deliverable:** A functioning wiki where users can create, edit, and browse agent/knowledge/skill pages with structured templates, full revision history, talk pages, and search.

### Phase 2: Chat Service Foundation (Days 3-5)

**Goal:** Chat service running, can talk to an agent.

- Next.js project setup (API routes only)
- PostgreSQL + pgvector via Docker Compose
- Drizzle schema for `chat_sessions`, `chat_messages`
- MediaWiki API client (`lib/mediawiki/client.ts`): fetch page content, validate user session
- LLM abstraction layer + Anthropic implementation
- `POST /api/sessions` — create session, fetch agent prompt from MW
- `POST /api/sessions/[id]/messages` — streaming chat with SSE
- Basic auth bridge: validate MW session cookie via MW API
- Test end-to-end: call API directly, get streaming response using agent's system prompt

**Deliverable:** A working chat API that reads agent prompts from MediaWiki and streams LLM responses.

### Phase 3: Chat Widget + MW Extension (Days 6-8)

**Goal:** Chat embedded in MediaWiki agent pages.

- Build chat widget (React + Vite): ChatWidget, MessageList, ChatMessage, ChatInput components
- SSE streaming hook (`use-chat.ts`)
- Markdown rendering in chat messages
- Message rating (helpful / not helpful)
- Agent info bar with "View Source" link to wiki page
- Build MentiSphereChat MediaWiki extension: adds "Chat" tab to Agent namespace, injects widget JS
- Bundle and serve widget assets from chat service
- Chat session persistence (resume previous conversation)

**Deliverable:** Users can click "Chat" on any agent page and have a streaming conversation.

### Phase 4: RAG Pipeline (Days 9-10)

**Goal:** Agents can access their declared knowledge pages during chat.

- Knowledge page chunker (`lib/rag/chunker.ts`)
- Embedding generation (`lib/rag/embeddings.ts`) via Anthropic/OpenAI embeddings API
- pgvector storage and similarity search (`lib/rag/retrieval.ts`)
- `POST /api/embeddings/sync` — re-embed a knowledge page
- MW extension hook: on knowledge page save → call sync endpoint
- At chat time: parse agent's knowledge dependencies → retrieve relevant chunks → inject into LLM context
- Drizzle schema for `knowledge_embeddings`

**Deliverable:** When chatting with an agent, responses are informed by its declared knowledge pages.

### Phase 5: Recognition & Stats (Days 11-12)

**Goal:** Contribution recognition and chat stats visible in the wiki.

- Agent stats tracking (`agent_stats` table, updated on each chat)
- Stats API endpoint consumed by MW templates
- Cargo-based leaderboard queries on wiki pages
- Create leaderboard wiki page using Cargo queries
- Configure Thanks extension (one-click edit appreciation)
- Configure PageAssessment for maturity levels
- Create badge templates (visual barnstars on user talk pages — MW convention)
- Agent page infobox shows chat count + helpfulness rating (pulled from stats API via Lua)

**Deliverable:** Agent pages show chat stats, contributor leaderboards are visible, and editors can earn recognition.

### Phase 6: Polish & Deploy (Days 13-14)

**Goal:** Production-ready.

- Rate limiting on chat API endpoints
- Error handling in chat widget (connection lost, API errors, graceful degradation)
- Chat widget responsive design
- MediaWiki security hardening (AbuseFilter rules, CAPTCHA for anonymous edits)
- Seed more content: 10+ agents across diverse domains
- Create help pages: "How to create an agent", "Template guide", "Contributing guidelines"
- Create MentiSphere:Five Pillars page (founding principles)
- Backup automation (daily MariaDB + PostgreSQL dumps)
- Monitoring setup (Uptime Kuma)
- Final deployment and smoke test

**Deliverable:** MentiSphere MVP live in production.

---

## Security Considerations

- **MediaWiki handles user security:** password hashing, session management, CSRF protection, permission checks — all battle-tested
- **Chat service auth:** Validates every request against MW API. Never trusts client-supplied user IDs.
- **Rate limiting:** Chat service rate-limits per user (e.g., 30 messages/hour) to prevent LLM API abuse
- **Content sanitization:** MediaWiki sanitizes all wiki content. Chat widget renders Markdown through a sanitizer (no raw HTML).
- **Agent prompt transparency:** All system prompts are public wiki pages. Nothing to exfiltrate.
- **Elasticsearch:** Internal only (not exposed to internet), accessible only via MediaWiki
- **PostgreSQL:** Internal only, accessible only via chat service
- **Nginx:** TLS termination, no direct access to backend services
- **Environment secrets:** All API keys and passwords in `.env` file, never in Docker images or git
- **AbuseFilter:** MediaWiki's built-in rule engine catches spam and vandalism patterns

---

## Cost Estimate

| Service | Option A: VPS | Option B: Managed |
|---------|--------------|-------------------|
| **Server** | Hetzner CX32 (4 vCPU, 8GB RAM): **$7/mo** | DigitalOcean Droplet: $24/mo |
| **MariaDB** | Included in VPS (Docker) | Managed: ~$15/mo |
| **PostgreSQL + pgvector** | Included in VPS (Docker) | Supabase Pro: $25/mo |
| **Elasticsearch** | Included in VPS (Docker) | Bonsai.io: $10/mo |
| **Anthropic API** | ~$50-200/mo (est. 1K chats/week) | Same |
| **Embeddings API** | ~$5-10/mo | Same |
| **Domain** | $12/yr | Same |
| **TLS** | Free (Let's Encrypt) | Free |
| **Backups** | Hetzner Storage Box: $4/mo | Included in managed |
| | | |
| **Total (lean VPS)** | **~$62-212/mo** | |
| **Total (managed)** | | **~$120-280/mo** |

**Recommendation:** Start with Option A (single VPS). MediaWiki + MariaDB + Elasticsearch + PostgreSQL + chat service all fit comfortably on a 4-core/8GB machine at MVP scale. Move to managed services if operational burden becomes too high.

---

## Environment Variables

```bash
# .env

# MariaDB (MediaWiki)
MYSQL_ROOT_PASSWORD=
MEDIAWIKI_DB_USER=
MEDIAWIKI_DB_PASSWORD=

# PostgreSQL (Chat Service)
PG_PASSWORD=
DATABASE_URL=postgresql://mentisphere:${PG_PASSWORD}@postgres:5432/mentisphere_chat

# Anthropic
ANTHROPIC_API_KEY=

# Embeddings (if using OpenAI for embeddings)
OPENAI_API_KEY=

# MediaWiki
MEDIAWIKI_SECRET_KEY=
MEDIAWIKI_API_URL=http://mediawiki:80/api.php

# Chat Service
CHAT_SERVICE_URL=https://mentisphere.org/chat-api
CHAT_SERVICE_SECRET=          # For internal webhook calls (embedding sync)
```

---

## Comparison: What Changed from Custom Build

| Aspect | Custom Build (v1) | MediaWiki + Chat (v2) |
|--------|-------------------|----------------------|
| Wiki features | Build from scratch (~10 days) | Day 1 (install + configure) |
| Chat + RAG | ~3 days | ~5 days (separate service + extension) |
| **Total estimated time** | **~17 days** | **~14 days** |
| Wiki maturity | New, untested | 20 years battle-tested |
| UI flexibility | Full control | Citizen skin (good, not unlimited) |
| Hosting | Vercel (simple) | VPS + Docker (more ops) |
| Single codebase | Yes | No (wiki + chat service) |
| Future flexibility | Unlimited | Constrained by MW for wiki features |
| Governance features | Basic (hand-built) | Rich (extensions, AbuseFilter, permissions) |
