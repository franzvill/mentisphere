# MentiSphere

**A collectively-built intelligence platform where domain experts contribute AI agent prompts, knowledge, and executable skills through wiki-style governance.**

Think "Wikipedia for AI" — instead of one company curating all prompts, the global community builds, reviews, and improves specialized AI agents through transparent, democratic collaboration.

## The Problem

AI agents are only as good as their prompts and knowledge. Today, prompt engineering is siloed — scattered across private repos, gated communities, and proprietary platforms. There's no open, governed system where domain experts (lawyers, doctors, engineers) can contribute the operational knowledge that makes AI actually useful.

## The Solution

MentiSphere combines **MediaWiki's proven governance model** (revision history, talk pages, consensus-building) with a **modern AI chat service** that reads agent configurations at runtime. Domain experts write prompts in plain language; developers extend capabilities through skills and knowledge pages.

### Key Features

- **Multi-Provider LLM Support** — OpenAI, Claude, and Gemini with BYOK (Bring Your Own Key). Keys stored client-side only, never on our servers
- **Wiki-Governed Agents** — Agent prompts are wiki pages with full revision history, talk pages, and community review
- **RAG Knowledge Layer** — Agents retrieve facts from curated Knowledge pages via pgvector semantic search
- **Skill Execution** — Agents can invoke executable capabilities defined as Skill pages, orchestrated via LangGraph
- **Semantic Agent Discovery** — Find the right agent by describing what you need, not by knowing its name
- **Embeddable Chat Widget** — Drop a React micro-app into any agent's wiki page for instant interaction
- **Central Chat UI** — ChatGPT-style interface with conversation history, streaming responses, and agent search

## Architecture

```
                    +-------------------+
                    |      Nginx        |
                    |  (Reverse Proxy)  |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     |    MediaWiki     |          |   Chat Service  |
     |   (Wiki Engine)  |          |   (Next.js 15)  |
     |                  |          |                  |
     |  Agent Pages     |   API    |  LLM Providers   |
     |  Knowledge Pages +<-------->+  RAG Pipeline    |
     |  Skill Pages     |          |  LangGraph       |
     |  Governance      |          |  Streaming SSE   |
     +--------+---------+          +--------+---------+
              |                             |
     +--------v--------+          +--------v--------+
     |    MariaDB +     |          |  PostgreSQL 16  |
     |  Elasticsearch   |          |  + pgvector     |
     +------------------+          +-----------------+
```

### Custom Wiki Namespaces

| Namespace | Purpose |
|-----------|---------|
| `Agent:` | AI agent system prompts — the core behavior definition |
| `Knowledge:` | RAG reference material retrieved at query time |
| `Skill:` | Executable capabilities (API calls, document generation, etc.) |
| `Orchestrator:` | Multi-agent routing logic (planned) |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Wiki Engine | MediaWiki 1.43 LTS (PHP 8.2) |
| Chat Service | Next.js 15, TypeScript, Drizzle ORM |
| Chat Widget | React + Vite (embeddable micro-app) |
| LLM Providers | OpenAI, Anthropic Claude, Google Gemini |
| Orchestration | LangGraph (tool-calling, skill execution) |
| Databases | MariaDB 10.11, PostgreSQL 16 + pgvector, Elasticsearch 7.x |
| Infrastructure | Docker Compose, Nginx |

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- An API key for at least one LLM provider (OpenAI, Anthropic, or Google)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/franzvill/mentisphere.git
   cd mentisphere
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start all services**
   ```bash
   docker compose up -d
   ```

4. **Access the platform**
   - Wiki: `http://localhost`
   - Chat UI: `http://localhost/chat`
   - Chat API: `http://localhost/chat-api/`

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Stream chat response (SSE) |
| `/api/sessions` | POST | Create chat session |
| `/api/conversations` | GET/POST | List or create conversations |
| `/api/conversations/:id/messages` | GET | Load conversation history |
| `/api/agents/search` | GET | Semantic agent discovery |
| `/api/embeddings/sync` | POST | Sync knowledge embeddings |
| `/api/messages/:id/rate` | POST | Rate a response |

## How It Works

1. **Experts contribute** — Domain specialists write Agent prompts, Knowledge articles, and Skill definitions on the wiki using natural language
2. **Community governs** — Changes go through wiki-style review: talk pages, revision diffs, consensus
3. **Users chat** — Anyone can discover agents via semantic search and chat with them through the central UI or embedded widget
4. **Agents retrieve** — At query time, agents pull relevant Knowledge pages via RAG and invoke Skills through LangGraph orchestration
5. **Quality improves** — Message ratings, usage stats, and revision history create a feedback loop that continuously improves agent quality

## Project Structure

```
mentisphere/
├── chat-service/          # Next.js 15 API + chat frontend
│   └── src/
│       ├── app/api/       # REST endpoints
│       ├── components/    # React UI (Chat, Sidebar, AgentSearch)
│       ├── lib/llm/       # Multi-provider abstraction
│       ├── lib/rag/       # Chunking, embeddings, retrieval
│       └── db/            # Drizzle ORM schema
├── chat-widget/           # Embeddable React widget (Vite)
├── mediawiki/             # MediaWiki config + custom extensions
│   └── extensions/
│       └── MentiSphereChat/  # Chat integration extension
├── nginx/                 # Reverse proxy config
├── seed/                  # Content seed data
├── tests/                 # E2E test suites
└── docker-compose.yml     # Full stack orchestration
```

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
