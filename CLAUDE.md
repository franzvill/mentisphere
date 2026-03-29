# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MentiSphere is a collectively-built AI intelligence platform — "Wikipedia for AI." Domain experts contribute knowledge, agent behaviors, and executable skills through wiki-style governance. The platform uses a two-system architecture: **MediaWiki** for all wiki functionality, and a **Next.js Chat Service** for LLM-powered agent conversations.

## Architecture

```
MediaWiki (PHP 8.2, Citizen skin)     Chat Service (Next.js 15, API-only)
├── Agent/Knowledge/Skill pages       ├── LLM streaming (Anthropic Claude)
├── Revisions, talk pages, voting     ├── RAG pipeline (pgvector)
├── User accounts, watchlists         ├── Chat history (PostgreSQL)
├── Search (CirrusSearch/ES)          └── Embedded via MentiSphereChat extension
└── MariaDB
```

- **MediaWiki** handles pages, governance, users, search, notifications
- **Chat Service** handles LLM calls, RAG retrieval, chat sessions, message ratings
- **Nginx** reverse proxies both: `/` → MediaWiki, `/chat-api/` → Chat Service
- **Auth bridge:** Chat service validates users by calling MW API with the user's session cookie

### Custom MediaWiki Namespaces

| Namespace | NS ID | Purpose |
|-----------|-------|---------|
| Agent: | 3000 | Expert AI agent prompts |
| Knowledge: | 3010 | RAG reference material |
| Skill: | 3020 | Executable capabilities |
| Orchestrator: | 3030 | Routing logic (future) |

### Key MediaWiki Extensions

CirrusSearch (Elasticsearch search), Cargo (structured data/queries), Scribunto (Lua templates), VisualEditor, Echo (notifications), Thanks, PageAssessment (maturity levels), AbuseFilter, **MentiSphereChat** (custom — embeds chat widget on Agent pages).

## Tech Stack

- **Wiki:** MediaWiki 1.42 LTS, PHP 8.2, MariaDB 10.6, Elasticsearch 7.x
- **Chat Service:** Next.js 15 (API routes only), Node.js 20+, Drizzle ORM, Zod
- **Chat DB:** PostgreSQL 16 + pgvector
- **Chat Widget:** React micro-app built with Vite, bundled as single JS/CSS
- **LLM:** Anthropic Claude SDK (behind `lib/llm/provider.ts` abstraction)
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
├── chat-service/                # Next.js API service
│   └── src/
│       ├── app/api/             # API routes (sessions, messages, embeddings, stats)
│       ├── lib/
│       │   ├── mediawiki/       # MW API client (fetch pages, validate sessions)
│       │   ├── llm/             # LLM provider abstraction + Anthropic impl
│       │   └── rag/             # Chunker, embeddings, pgvector retrieval
│       └── db/schema.ts         # Drizzle schema (chat_sessions, chat_messages, etc.)
├── chat-widget/                 # React micro-app (Vite)
│   └── src/components/          # ChatWidget, MessageList, ChatMessage, ChatInput
├── nginx/nginx.conf             # Reverse proxy config
├── docker-compose.yml           # Full stack orchestration
└── .env                         # Secrets (never committed)
```

## Commands

No code exists yet. Once infrastructure is set up:

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
- **LLM provider is abstracted.** All LLM calls go through `lib/llm/provider.ts`. Never call Anthropic SDK directly from route handlers.
- **Chat service reads agent prompts from MediaWiki API at runtime.** It does not store copies of prompts. Source of truth is always the wiki.
- **MVP excludes:** orchestrator auto-routing, eval pipeline, graduated trust, monetization, multi-agent collaboration.

## Chat Service API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sessions` | POST | Create chat session with an agent |
| `/api/sessions/[id]/messages` | POST | Send message, receive SSE stream |
| `/api/messages/[id]/rate` | POST | Rate a response (helpful/not helpful) |
| `/api/embeddings/sync` | POST | Re-embed knowledge page (internal) |
| `/api/stats/[agentPageTitle]` | GET | Chat stats for an agent |

## Chat Service Database Tables

`chat_sessions`, `chat_messages`, `knowledge_embeddings` (pgvector), `agent_stats`. Schema defined in `chat-service/src/db/schema.ts` using Drizzle.
