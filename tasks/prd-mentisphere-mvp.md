# PRD: MentiSphere MVP

## Introduction

MentiSphere is a collectively-built AI intelligence platform where anyone in the world contributes knowledge, agent behaviors, and executable skills through Wikipedia-style governance. The platform becomes smarter than any single AI product because it captures the operational wisdom of domain experts globally — not just training data, but executable knowledge that instructs machines how to reason about specific domains.

The MVP delivers the core wiki + chat loop: users can discover community-authored AI agents, chat with them, and contribute improvements — all governed by transparent, collaborative processes.

## Goals

- Launch a domain-agnostic platform where anyone can create, edit, and use AI agents
- Establish the Wikipedia-style contribution and governance model from day one
- Prove that community-authored agents outperform general-purpose AI in contributor domains
- Build a self-reinforcing contribution funnel: user → contributor → prompt engineer
- Achieve meaningful community traction: agents created, active contributors, and users chatting

## User Personas

### Persona 1: The Domain Expert (Contributor)

- **Who:** A nurse, tax accountant, chef, logistics engineer — anyone with deep knowledge in a specific field
- **Goal:** Embed their expertise into an AI agent that helps others, even when they're not around
- **Pain Point:** Current AI gives generic answers in their domain. They know better but have no way to improve it
- **Journey:** Uses an agent in their field → notices gaps → clicks "View Source" → edits the agent prompt → sees their improvement go live

### Persona 2: The Knowledge Seeker (User)

- **Who:** Anyone needing expert-level AI assistance in a specific domain
- **Goal:** Get precise, domain-specific answers instead of generic AI responses
- **Pain Point:** General-purpose AI lacks the depth of a human specialist
- **Journey:** Searches for an agent → chats with it → gets a high-quality answer → bookmarks it or shares it

### Persona 3: The Developer (Skill Contributor)

- **Who:** A developer who wants to contribute executable capabilities (API integrations, file parsers, output formatters)
- **Goal:** Make agents more capable by giving them concrete skills
- **Pain Point:** Wants to contribute to open-source AI but doesn't want to write agent prompts
- **Journey:** Browses agents → notices a skill gap → authors a Skill Page → sees agents using their skill

## User Flows

### Flow 1: Discover and Chat with an Agent

1. User lands on MentiSphere homepage
2. Browses featured/popular agents or searches by keyword/domain
3. Selects an agent (e.g., "Italian Tax Law Agent")
4. Reads agent description, community rating, and maturity level
5. Opens chat interface and asks a question
6. Receives a response informed by the agent's prompt + linked knowledge pages
7. Can rate the response or continue the conversation

- **Alternative path:** User arrives via shared link directly to an agent's chat
- **Error state:** No agent matches search → show "No agents found" with prompt to create one

### Flow 2: Create or Edit an Agent Page

1. User clicks "Create Agent" or "Edit" on an existing agent page
2. Fills in structured template: system prompt, dependencies, I/O spec, known limitations
3. Submits the edit with an edit summary (explaining the change)
4. Edit appears in revision history and is visible to page watchers
5. Community can discuss on the talk page, vote, or revert
6. Change goes live (no automated eval gate in MVP)

- **Alternative path:** User forks an existing agent to create a variant
- **Error state:** Edit conflicts → show diff and ask user to resolve

### Flow 3: First-Time Contributor

1. User chats with an agent and gets a subpar answer
2. Clicks "View Source" to see the agent's community-authored prompt
3. Clicks "Edit" and improves the prompt based on their domain expertise
4. Submits with edit summary
5. Sees their username in the revision history
6. Receives recognition (first contribution badge)
7. Gets notified when others discuss or build on their edit

## User Stories

### US-001: Agent Page Creation

**Description:** As a domain expert, I want to create a new Agent Page so that my expertise is available as an interactive AI agent.

**Acceptance Criteria:**

- [ ] Structured creation form with fields: name, domain, system prompt, description, knowledge dependencies, known limitations
- [ ] Agent page follows mandatory template (based on Fabric's IDENTITY AND PURPOSE / STEPS / OUTPUT structure)
- [ ] Page is immediately visible in search after creation
- [ ] Creator is listed as primary author
- [ ] Typecheck/lint passes

### US-002: Agent Page Editing

**Description:** As a contributor, I want to edit an existing Agent Page so that I can improve its prompt based on my expertise.

**Acceptance Criteria:**

- [ ] Edit button accessible on any agent page
- [ ] Edit form pre-populated with current content
- [ ] Edit summary field required before submission
- [ ] Change saved to revision history with author, timestamp, and summary
- [ ] Page watchers notified of the edit

### US-003: Chat with an Agent

**Description:** As a user, I want to chat with an agent so that I get domain-specific AI assistance.

**Acceptance Criteria:**

- [ ] Chat interface opens from any agent page
- [ ] Agent responds using its community-authored system prompt
- [ ] Agent has access to its declared Knowledge Page dependencies via RAG
- [ ] Agent can invoke its declared Skill Page capabilities
- [ ] Conversation persists within the session
- [ ] User can rate individual responses (helpful / not helpful)

### US-004: Knowledge Page Creation and Editing

**Description:** As a contributor, I want to create and edit Knowledge Pages so that agents have accurate reference material.

**Acceptance Criteria:**

- [ ] Structured creation form with fields: title, domain, content, related agents
- [ ] Supports Markdown formatting
- [ ] Agents can declare knowledge dependencies linking to these pages
- [ ] Revision history with author attribution
- [ ] Searchable and browsable independently of agents

### US-005: Skill Page Creation and Editing

**Description:** As a developer, I want to create Skill Pages that define executable capabilities so that agents can perform specific actions.

**Acceptance Criteria:**

- [ ] Structured template with fields: capability description, input/output specification, tool/API requirements, usage examples
- [ ] Agents can declare skill dependencies linking to these pages
- [ ] Revision history with author attribution
- [ ] Clear distinction from Agent Pages (skills do things, agents reason about things)

### US-006: Revision History and Rollback

**Description:** As a contributor, I want to view the full history of changes to any page and revert to a previous version if needed.

**Acceptance Criteria:**

- [ ] Every page type (agent, knowledge, skill) has a "History" tab
- [ ] Each revision shows: author, timestamp, edit summary, diff from previous version
- [ ] Side-by-side diff view for comparing any two revisions
- [ ] One-click rollback to any previous revision
- [ ] Rollback creates a new revision entry (not destructive)

### US-007: Talk Pages

**Description:** As a contributor, I want to discuss changes and propose improvements on a page's talk page so that decisions are evidence-based and transparent.

**Acceptance Criteria:**

- [ ] Every page type has an associated talk page
- [ ] Threaded discussion format
- [ ] Contributors can reference specific revisions in discussions
- [ ] Talk page activity visible to page watchers

### US-008: Voting on Changes

**Description:** As a community member, I want to vote on proposed changes so that quality is maintained through collective judgment.

**Acceptance Criteria:**

- [ ] Support/Oppose/Neutral voting on proposed edits or talk page proposals
- [ ] Vote counts visible to all users
- [ ] Voting period has a defined duration
- [ ] Results are advisory (no automated enforcement in MVP)

### US-009: Search and Discovery

**Description:** As a user, I want to search and browse agents by keyword, domain, or popularity so that I can find the right agent for my question.

**Acceptance Criteria:**

- [ ] Full-text search across agent names, descriptions, and domains
- [ ] Filter by page type (agent, knowledge, skill)
- [ ] Sort by: popularity, recent activity, community rating, maturity level
- [ ] Agent maturity badges visible in search results (Stub → Start → C → B → GA → Featured)
- [ ] Featured agents highlighted on homepage

### US-010: Contributor Profiles and Recognition

**Description:** As a contributor, I want a public profile showing my contributions and recognition so that my expertise is visible and I'm motivated to keep contributing.

**Acceptance Criteria:**

- [ ] User profile page showing: contributions, domains of activity, badges earned
- [ ] Contribution leaderboard (global and per-domain)
- [ ] Barnstar/badge system for milestones (first edit, 10 edits, featured agent contributor, etc.)
- [ ] Visible impact metrics: how many users interacted with agents you contributed to
- [ ] Watchlist: pages the user is monitoring for changes

### US-011: Page Watchlists and Notifications

**Description:** As a contributor, I want to watch pages and get notified of changes so that I can maintain quality in my areas of expertise.

**Acceptance Criteria:**

- [ ] "Watch" button on any page
- [ ] Notifications for: edits, talk page activity, votes on watched pages
- [ ] Notification center accessible from any page
- [ ] Option to receive email notifications

## Functional Requirements

- FR-1: The system must support four page types: Agent Pages, Knowledge Pages, Skill Pages, and Orchestrator Pages (Orchestrator pages exist structurally but auto-routing is out of scope for MVP)
- FR-2: Every page must have: revision history, talk page, watch button, and edit capability
- FR-3: Agent Pages must follow a mandatory template: name, domain, system prompt (IDENTITY AND PURPOSE / STEPS / OUTPUT), knowledge dependencies, skill dependencies, known limitations, performance infobox
- FR-4: Users must be able to chat with any agent directly from its page
- FR-5: Chat responses must incorporate the agent's system prompt and declared knowledge dependencies via RAG
- FR-6: Chat responses must leverage declared skill page capabilities when relevant
- FR-7: All edits must require an edit summary and be attributed to the author
- FR-8: Any revision of any page must be reversible via one-click rollback
- FR-9: Search must index all page types and support filtering and sorting
- FR-10: Agent pages must display a maturity level badge (Stub → Start → C → B → GA → Featured)
- FR-11: The system must maintain contributor profiles with edit history, badges, and impact metrics
- FR-12: The system must provide a global and per-domain contribution leaderboard
- FR-13: Users must be able to register, log in, and manage their profile
- FR-14: Talk pages must support threaded discussions
- FR-15: The system must support voting (Support/Oppose/Neutral) on proposals

## Non-Functional Requirements

### Performance

- Page load time: < 2 seconds for any wiki page
- Chat response: first token within 3 seconds
- Search results: < 1 second
- Support 100 concurrent users at launch, scalable to 1,000+

### Security

- Authentication via email + password and OAuth (GitHub, Google)
- All user-generated content sanitized to prevent XSS
- Agent system prompts are public by design (transparency is the architecture)
- Rate limiting on chat and edit endpoints
- HTTPS everywhere

### Compatibility

- Desktop browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Responsive design for tablet viewing
- Mobile: responsive web (no native app)

## Non-Goals (Out of Scope)

- **Orchestrator auto-routing** — users discover and select agents manually via search. Hierarchical routing deferred to Phase 2
- **Eval pipeline / automated testing** — no automated quality gates on edits in MVP. Quality is community-governed through talk pages and voting
- **Graduated trust / permission tiers** — all registered users can edit all page types in MVP. Privilege tiering deferred to Phase 2
- **Monetization / payments** — no commercial features, subscriptions, or marketplace
- **AgentC integration** — removed from scope entirely. MentiSphere is a standalone platform
- **Commercial marketplace for premium skills** — all contributions are free and open
- **Multi-agent collaboration** — no combining multiple agents for a single query
- **Mobile native app** — responsive web only
- **Shadow deployment / canary monitoring** — deferred to Phase 2 with eval pipeline
- **Sybil-resistant voting** — simple voting in MVP, advanced mechanisms in Phase 2

## Design Considerations

- **Visual identity:** Wiki aesthetic — clean, content-first, information-dense. Not a flashy SaaS dashboard
- **"View Source" moment:** The path from chatting with an agent to seeing and editing its prompt must be frictionless (one click)
- **Agent page template:** Build on Fabric's proven structure (IDENTITY AND PURPOSE / STEPS / OUTPUT) with additional wiki metadata
- **Contribution UX:** Heavy scaffolding for first-time contributors — guided editor, templates, helpful defaults. The unit of contribution is natural language, not code
- **Homepage:** Featured agents, recent activity feed, contribution leaderboard, search bar prominently placed

## Technical Considerations

- **Wiki platform:** Custom-built with Git-backed storage for versioning (not a MediaWiki fork — need tight integration with AI chat)
- **RAG pipeline:** Knowledge pages indexed and retrievable by agents at chat time. Relevance mappings defined by agent dependency declarations
- **LLM integration:** Model-agnostic architecture — support multiple LLM providers (start with one, design for swapping)
- **Page structure:** Markdown-based pages with YAML frontmatter for metadata (dependencies, maturity level, page type)
- **Search:** Full-text search engine (e.g., Meilisearch, Typesense) indexing all page content and metadata
- **Real-time notifications:** WebSocket or SSE for edit notifications and watchlist updates
- **Authentication:** OAuth 2.0 with GitHub and Google providers + email/password fallback

### Data Model (Key Entities)

- **User:** id, username, email, auth_provider, created_at, reputation_score
- **Page:** id, type (agent|knowledge|skill|orchestrator), title, slug, current_revision_id, maturity_level, created_by, created_at
- **Revision:** id, page_id, content (Markdown + YAML frontmatter), author_id, edit_summary, created_at, parent_revision_id
- **TalkThread:** id, page_id, title, created_by, created_at
- **TalkMessage:** id, thread_id, author_id, content, referenced_revision_id, created_at
- **Vote:** id, page_id, revision_id, user_id, vote_type (support|oppose|neutral), created_at
- **Watch:** id, user_id, page_id
- **Badge:** id, user_id, badge_type, awarded_at
- **Dependency:** id, source_page_id, target_page_id, dependency_type (knowledge|skill)
- **ChatSession:** id, user_id, agent_page_id, created_at
- **ChatMessage:** id, session_id, role (user|assistant), content, rating (helpful|not_helpful|null), created_at

## Success Metrics

- **Agents created:** 50+ community-authored agents within first month
- **Active contributors:** 20+ users making edits per week within first month
- **Users chatting:** 200+ unique users chatting with agents per week within first month
- **Contribution funnel conversion:** 10% of chat users click "View Source," 5% of those make an edit
- **Retention:** 30% of first-week contributors return in week two

## Milestones

- **Phase 1: Core Wiki + Chat (MVP)** — Agent Pages, Knowledge Pages, Skill Pages, chat interface, revision history, search, user profiles and recognition, talk pages, voting. *This PRD.*
- **Phase 2: Automated Governance and Trust** — Eval pipeline (LLM-as-judge + benchmarks), graduated trust / permission tiers, orchestrator auto-routing, shadow deployment, WikiProject formation
- **Phase 3: Scaling the Executable Commons** — Multi-domain orchestration, multi-agent collaboration, advanced eval metrics (convergence score, span/trace), Sybil-resistant voting, API access for programmatic use

## Open Questions

- What wiki platform approach? Custom-built vs. headless CMS with Git backend vs. something else?
- Which LLM provider(s) to support at launch?
- How to handle RAG indexing at scale — vector database choice?
- Should maturity levels be self-assessed or community-voted?
- How to seed initial content? Import Fabric patterns? Recruit founding contributors?
- Hosting and infrastructure — cloud provider, estimated costs for LLM API usage?
- Legal entity structure — open-source foundation model?
- Naming finalized? "MentiSphere" confirmed?
