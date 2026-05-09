# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MentiSphere is a collectively-built AI intelligence platform — "Wikipedia for AI." Domain experts contribute knowledge, agent behaviors, and executable skills through wiki-style governance. The platform uses a two-system architecture: **MediaWiki** for all wiki functionality, and a **Next.js Chat Service** for LLM-powered agent conversations.

## Architecture

```
MediaWiki (PHP 8.2, Citizen skin)     Chat Service (Next.js 15)
├── Agent/Knowledge/Skill pages       ├── /chat unified UI (sidebar, conversations)
├── Revisions, talk pages, voting     ├── LangGraph router (pgvector → LLM picker)
├── User accounts, watchlists         ├── Multi-provider LLM (Anthropic/OpenAI/Gemini, BYOK)
├── Search (CirrusSearch/ES)          ├── RAG pipeline (pgvector)
└── MariaDB                           ├── Chat history (PostgreSQL)
                                      └── Per-Agent widget (MentiSphereChat extension)
```

Two chat surfaces:
- **Unified `/chat` page** — served directly by chat-service. Question → LangGraph router picks an agent (auto-route) or user picks via agent search modal → agent node responds. Conversation history in sidebar.
- **Per-Agent embedded widget** — `chat-widget/` micro-app, embedded into MW Agent pages via the MentiSphereChat extension. Scoped to one agent.

- **MediaWiki** handles pages, governance, users, search, notifications
- **Chat Service** handles LLM calls, RAG retrieval, agent routing (LangGraph), conversation history, message ratings, and serves the unified `/chat` UI
- **Nginx** reverse proxies both: `/` → MediaWiki, `/chat-api/` → Chat Service
- **Auth bridge:** Chat service validates users by calling MW API with the user's session cookie

### Custom MediaWiki Namespaces

| Namespace | NS ID | Purpose |
|-----------|-------|---------|
| Agent: | 3000 | Expert AI agent prompts |
| Knowledge: | 3010 | RAG reference material |
| Skill: | 3020 | Executable capabilities |
| Orchestrator: | 3030 | Wiki-editable routing rules (future — runtime routing currently lives in `chat-service/src/graph/`) |

### Key MediaWiki Extensions

CirrusSearch (Elasticsearch search), Cargo (structured data/queries), Scribunto (Lua templates), VisualEditor, Echo (notifications), Thanks, PageAssessment (maturity levels), AbuseFilter, **MentiSphereChat** (custom — embeds chat widget on Agent pages).

## Tech Stack

- **Wiki:** MediaWiki 1.42 LTS, PHP 8.2, MariaDB 10.6, Elasticsearch 7.x
- **Chat Service:** Next.js 15 (UI + API routes), Node.js 20+, Drizzle ORM, Zod, LangGraph
- **Chat DB:** PostgreSQL 16 + pgvector
- **Chat Widget:** React micro-app built with Vite, bundled as single JS/CSS
- **LLM:** Multi-provider — Anthropic, OpenAI, Google Gemini — behind `lib/llm/provider.ts` abstraction. BYOK pattern (user supplies keys via `X-LLM-Provider` / `X-LLM-Key` / `X-LLM-Model` headers)
- **Infrastructure:** Docker Compose, Nginx, Let's Encrypt

## Project Structure

```
mentisphere/
├── VISION.md                    # Full vision document and research
├── tasks/
│   ├── prd-mentisphere-mvp.md   # Product Requirements Document
│   └── tdd-mentisphere-mvp.md   # Technical Design Document
├── mediawiki/
│   ├── LocalSettings.php        # MediaWiki configuration
│   ├── extensions/
│   │   └── MentiSphereChat/     # Custom extension (Chat tab + widget embed)
│   └── skins/citizen/           # Citizen skin
├── chat-service/                # Next.js service (UI + API)
│   ├── AGENTS.md                # ⚠ Next.js 15 has breaking changes vs training data — read first
│   └── src/
│       ├── app/
│       │   ├── chat/            # Unified /chat page (sidebar + conversations)
│       │   └── api/             # Routes: chat, conversations, sessions, messages, agents/search, embeddings, stats
│       ├── components/          # Chat UI: Chat, Sidebar, MessageList, AgentSearch, LLMSettings, ...
│       ├── graph/               # LangGraph orchestrator: router → agent
│       ├── lib/
│       │   ├── mediawiki/       # MW API client (fetch pages, validate sessions)
│       │   ├── llm/             # Multi-provider abstraction (Anthropic / OpenAI / Gemini)
│       │   └── rag/             # Chunker, embeddings, pgvector retrieval
│       └── db/schema.ts         # Drizzle schema (conversations, chat_messages, agent_embeddings, ...)
├── chat-widget/                 # React micro-app (Vite)
│   └── src/components/          # ChatWidget, MessageList, ChatMessage, ChatInput
├── nginx/nginx.conf             # Reverse proxy config
├── docker-compose.yml           # Full stack orchestration
└── .env                         # Secrets (never committed)
```

## Commands

Common commands:

```bash
# Start full stack locally
docker compose up -d

# Chat service development
cd chat-service && npm run dev

# Chat widget development
cd chat-widget && npm run dev

# Chat service database migrations
cd chat-service && npx drizzle-kit push

# Build chat widget for production
cd chat-widget && npm run build

# MediaWiki maintenance
docker compose exec mediawiki php maintenance/update.php
```

## Key Design Decisions

- **AgentC integration is removed entirely.** MentiSphere is standalone. Never reference AgentC.
- **Domain-agnostic from day one.** No single "launch domain." All features must work across any domain.
- **Agent prompts are public by design.** Transparency is the architecture — nothing to exfiltrate.
- **LLM provider is abstracted.** Chat LLM calls go through `lib/llm/provider.ts` (Anthropic / OpenAI / Gemini). Never call provider SDKs directly from API route handlers. The router (`src/graph/router.ts`) calls SDKs directly with cheap/fast models for agent picking — that's an intentional exception, not a precedent for other code.
- **Chat service reads agent prompts from MediaWiki API at runtime.** It does not store copies of prompts. Source of truth is always the wiki.
- **Orchestrator auto-routing IS shipped.** Runtime router lives in `chat-service/src/graph/` (pgvector top-K agent search → cheap LLM picks one → agent node responds). The MW `Orchestrator:` namespace for community-editable routing rules is still future.
- **MVP still excludes:** eval pipeline, graduated trust, monetization, multi-agent collaboration.

## Chat Service API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Unified chat — LangGraph auto-routes, streams SSE |
| `/api/conversations` | GET, POST | List/create user conversations (unified chat) |
| `/api/conversations/[id]/messages` | GET | Fetch messages for a conversation |
| `/api/agents/search` | GET | Semantic search over agents (picker UI + router input) |
| `/api/sessions` | POST | Per-Agent chat session (used by embedded widget) |
| `/api/sessions/[id]/messages` | POST | Send message in per-Agent session, SSE stream |
| `/api/messages/[id]/rate` | POST | Rate a response (helpful/not helpful) |
| `/api/embeddings/sync` | POST | Re-embed knowledge page (internal) |
| `/api/stats/[agentPageTitle]` | GET | Chat stats for an agent |
| `/api/health` | GET | Health check |

## Chat Service Database Tables

- `conversations` — unified `/chat` threads
- `chat_sessions` — per-Agent embedded widget threads
- `chat_messages` — linked to either conversation or session, with optional `agent_page_title` (attribution from router) and `rating`
- `knowledge_embeddings` (pgvector) — RAG chunks of Knowledge pages
- `agent_embeddings` (pgvector) — one row per agent, powers `/api/agents/search` and the router's top-K candidate lookup
- `skill_registry` — pointers to Skill pages
- `agent_stats` — usage/rating rollups per agent

Schema in `chat-service/src/db/schema.ts` (Drizzle).
