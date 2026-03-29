# Collective Intelligence Platform: Vision Document

## The Core Idea

A collectively-built AI intelligence platform where the entire world contributes knowledge, agent behaviors, and improvements through a Wikipedia-style governance model. The system becomes smarter than any single AI product because it captures the operational wisdom of domain experts globally — not just training data, but executable knowledge that instructs machines how to reason about specific domains.

**The fundamental insight:** No single AI lab can capture the full breadth of human expertise. A nurse in Naples, a logistics engineer in Singapore, and a farmer in Iowa each hold specialized knowledge that current AI systems lack. This platform gives them a way to embed that knowledge directly into AI behavior — without writing code.

**The key reframe:** Wikipedia articles teach humans. Our pages teach AI. Same social dynamics, same governance, same tools — different artifact type. The unit of contribution is natural language. The contribution is executable.

---

## Architecture: Four Types of Wiki Pages

### 1. Agent Pages
Each page is a complete prompt defining an expert in a specific domain.

- **Examples:** "Medical Triage Agent," "Italian Tax Law Agent," "Kubernetes Debugging Agent"
- The community writes, refines, and votes on these prompts
- Each agent page declares its knowledge dependencies
- Associated eval test suites (also community-contributed) measure quality
- Users can interact with agents directly (like going to a Wikipedia article by URL) or through the orchestrator

### 2. Orchestrator Pages
Meta-prompts that receive a user query and route to the best agent(s).

- Community-maintained routing logic that improves collectively over time
- Hierarchical: top-level router picks a domain, domain-level orchestrators pick specific agents
- Supports multi-agent collaboration (e.g., "tax implications of medical expenses in Switzerland" activates tax + medical + Swiss-specific agents)
- Handles planning, not just classification
- Disambiguation pages (community-maintained) resolve ambiguous queries

### 3. Knowledge Pages
Persistent reference material available via RAG to any active agent.

- Closest to traditional Wikipedia articles
- Not agents — they're facts, procedures, domain data
- Relevance mappings are community-curated (each agent declares its knowledge dependencies)
- Prevents context window explosion through selective retrieval

### 4. Skill Pages
Executable capabilities that define *how* the AI does things — tool use, file creation, API interactions, output formatting, data transformations.

- **The key distinction:** An Agent knows how to *reason* about a domain. A Skill knows how to *do* something specific. A chef knows how to think about flavor (agent) and knows how to julienne (skill). Different types of knowledge, different wiki pages, composable at runtime.
- **Examples:** "DICOM Image Analysis Skill," "PDF Generation Skill," "SQL Query Builder Skill," "REST API Integration Skill," "Excel Formatting Skill"
- Agents *use* skills — the Medical Triage Agent might invoke the DICOM Skill when a user asks about a cardiac MRI
- Like Claude's built-in skills (docx, pptx, xlsx creation), but community-authored, community-improved, and community-governed instead of locked inside a single AI provider
- Dramatically lowers the contribution barrier for developers — many developers would contribute a skill page describing how to interact with a specific API or parse a file format, even if they don't want to write agent prompts
- Each skill page includes: capability description, input/output specification, tool/API requirements, usage examples, and eval test cases

**The composability example:** A cardiologist contributes a better Medical Agent prompt. A radiology technician contributes a DICOM parsing skill. A hospital IT person contributes a knowledge page about HL7 integration standards. The orchestrator combines all three when someone asks about analyzing a cardiac MRI. Three different people, three different expertise levels, three different page types — one intelligent response.

### Page Structure
```
/orchestrator/main              ← top-level routing prompt
/orchestrator/medical           ← medical domain sub-router
/agents/medical-triage          ← agent prompt
/agents/medical-triage/eval     ← test cases for this agent
/agents/medical-triage/deps     ← declares knowledge + skill dependencies
/agents/swiss-tax               ← agent prompt
/knowledge/swiss-tax-law        ← RAG content
/knowledge/pharmacology         ← RAG content
/skills/dicom-analysis          ← how to parse/analyze DICOM files
/skills/pdf-generation          ← how to create formatted PDFs
/skills/sql-query-builder       ← how to construct and execute SQL
/skills/rest-api-integration    ← how to call external APIs
```

---

## Wikipedia Features We Inherit

### Governance & Quality

| Wikipedia Feature | Platform Equivalent |
|---|---|
| **Featured / Good Article status** | Agent maturity ladder: Stub → Start → C → B → GA → Featured. Featured Agents are preferred by the orchestrator when multiple agents could handle a query. |
| **Categories & Portals** | Agent taxonomies and curated domain landing pages showing best agents, performance metrics, and open issues. |
| **WikiProjects** | Self-organized communities (e.g., WikiProject Medical Agents) who own domain agents, set evaluation standards, and review changes. |
| **Templates & Infoboxes** | Mandatory agent page sections: system prompt, dependencies, I/O spec, eval criteria, known limitations, performance infobox (eval scores, query volume, community rating). |
| **NPOV (Neutral Point of View)** | Neutral Behavioral Point of View (NBPOV) — agents must not embed political, commercial, or ideological bias. Enforceable through community reversion and policy citation. |
| **Notability criteria** | Not every niche use case deserves its own agent. Minimum query volume or domain breadth required. Prevents fragmentation. |
| **Merge / Split discussions** | Community-governed structural decisions: "These two agents overlap 70% — merge?" or "This agent is too broad — split into three." |
| **Redirects & Disambiguation** | Routing intelligence built by the community. "Python" → programming or veterinary? These mappings are wiki pages themselves. |

### Community & Contribution

| Wikipedia Feature | Platform Equivalent |
|---|---|
| **Talk pages** | Where contributors debate why a prompt works or doesn't. Evidence-based discussion with eval results. Over time, these become a collective textbook on prompt engineering. |
| **Watchlists** | Domain experts watch relevant agent/knowledge pages and get notified of proposed changes. |
| **Barnstars & recognition** | Visible recognition for top prompt engineers, knowledge contributors, reliable reviewers. Drives sustained contribution without financial rewards. |
| **Graduated trust** | New contributors submit knowledge entries. Modifying core agent behaviors or system prompts requires demonstrated track record. Same permission ladder as Wikipedia. |
| **Vandalism detection** | Automated eval pipelines are the bot layer — changes that degrade benchmarks get auto-flagged. Human patrollers review what passes automated checks. |
| **Revision history & rollback** | Every change is versioned, diffable, and reversible. A/B testing between prompt versions with objective eval scores. |
| **Interwiki links** | Dense linking between agent pages, knowledge dependencies, and orchestrators. The link graph becomes machine-readable — the orchestrator can discover agent combinations the authors didn't anticipate. |

---

## Dual-Layer Contribution Model (Wiki + GitHub)

### The Wiki Layer (Intelligence)
- Agent prompts, knowledge pages, orchestrator logic, eval test cases
- Non-technical contributors work here
- Domain experts write and refine prompts based on their expertise
- Wiki governance: versioning, talk pages, voting, protection levels

### The GitHub Layer (Engine)
- Orchestration runtime, RAG pipeline, eval framework, wiki-to-agent compilation
- Developers contribute here via standard open-source workflow
- GitHub Actions run eval suites on every wiki page edit
- Results post back to wiki talk pages as objective evidence

### Why the Symbiosis Works
Neither layer is useful without the other. Developers need great prompts to showcase the engine. Domain experts need a great engine to make their prompts useful. Each community recruits the other.

### GitHub Gives You for Free
- **Stars as social proof** — "Wikipedia for AI" narrative attracts visibility
- **Issues as recruitment** — "The Medical Agent doesn't handle pediatric cases" is both a bug report and a signal to pediatricians
- **GitHub Actions as eval pipeline** — free, battle-tested CI/CD
- **Forks as experimentation** — disagreements resolved through demonstrable results
- **Sponsorship** — GitHub Sponsors, Open Collective for infrastructure costs

---

## The Contribution Funnel

```
┌─────────────────────────────────────────┐
│           USERS (outer ring)            │
│  Just use the system. Every interaction │
│  generates implicit signal: which       │
│  agents get used, where dissatisfaction │
│  occurs, what queries have no agent.    │
├─────────────────────────────────────────┤
│     KNOWLEDGE CONTRIBUTORS (middle)     │
│  Edit wiki pages. A teacher improves    │
│  the Education Agent. A mechanic adds   │
│  diesel engine knowledge. No code.      │
├─────────────────────────────────────────┤
│      SKILL CONTRIBUTORS (mid-inner)     │
│  Developers who contribute executable   │
│  capabilities: API integrations, file   │
│  parsers, output formatters. Code-      │
│  adjacent but still wiki-governed.      │
├─────────────────────────────────────────┤
│      PROMPT ENGINEERS (inner ring)      │
│  Work on orchestration, agent           │
│  composition, eval design. Bridge       │
│  wiki and GitHub worlds.                │
├─────────────────────────────────────────┤
│      PLATFORM DEVELOPERS (core)         │
│  Build/maintain runtime, eval           │
│  framework, wiki platform, API.         │
│  Pure GitHub contributors.              │
└─────────────────────────────────────────┘
```

Each ring recruits from the one outside it. A user who notices a bad answer becomes a knowledge contributor. A knowledge contributor curious about routing becomes a prompt engineer. The funnel is self-reinforcing.

---

## The Hidden Moat

**Talk pages and edit histories become training data.** Thousands of domain experts debating why a prompt works or doesn't, proposing improvements with reasoning, showing eval results — this is a dataset of human prompt engineering wisdom that doesn't exist anywhere else.

Over time, this corpus could train models that are better at self-improvement. The community's collective reasoning about how to instruct AI becomes a flywheel for making AI better at being instructed.

Not the prompts (anyone can copy those). Not the engine (open source). The living, evolving, searchable archive of human deliberation about how to make AI think well. **Nobody else has that.**

---

## Competitive Landscape

### Fabric (Daniel Miessler)
The closest existing project. Open-source framework with crowdsourced prompt "Patterns" in Markdown.

**What Fabric got right:**
- Unit of contribution is a Markdown file (zero learning curve)
- Structured templates without rigidity (IDENTITY AND PURPOSE / STEPS / OUTPUT)
- Composability through piping (primitive orchestration)
- "Patterns" framing makes contributions feel durable, not throwaway

**What Fabric lacks (our differentiation):**
- Single gatekeeper bottleneck (no distributed governance)
- No evaluation pipeline (quality is vibes-based)
- No orchestration layer (toolkit, not product)
- No knowledge/RAG layer (relies entirely on LLM training data)
- Developer-only audience (CLI/Go, never reaches non-technical experts)
- No community identity (no profiles, reputation, visible impact)

**Strategic relationship:** Fabric's 200+ patterns could seed our initial agent pages. Fabric's community could be early adopters. Position as "where Fabric patterns come to life."

### Other Adjacent Tools
- **Agenta, Latitude, Pezzo** — Enterprise prompt management. "Jira for prompts," not "Wikipedia for AI."
- **CrewAI, LangGraph, AutoGen** — Agent orchestration frameworks. No community contribution model.
- **Collective Intelligence Project (CIP)** — Philosophically aligned (community-defined AI constitutions) but focused on alignment/values, not building executable agents.

### The Gap We Fill
Nobody combines: wiki-style open governance + agent orchestration with community-maintained routing + automated evaluation as quality immune system. Each existing tool has one piece. We have the intersection.

---

## Viral Potential Assessment

### Why It Could Go Viral
- **Zero contribution barrier** — the unit is natural language, not code
- **Identity and expertise hook** — "I made the AI smarter about my field"
- **Executable output is shareable** — people share what impresses them
- **Clear narrative** — "Big Tech controls AI, we're democratizing it"

### Why It Won't Go Viral by Default
- **Cold start problem** — worse than ChatGPT at everything on day one
- **Quality perception** — one bad first impression and users leave forever
- **Prompt writing isn't intuitive yet** — contribution UX needs heavy scaffolding
- **Governance friction** — slow review kills contributor momentum

### The Viral Sequence
1. **Start with one killer domain** (medical, legal, cooking, or coding in a specific framework)
2. **Make contributions instantly visible** — shareable links: "I just made this agent better, try it"
3. **Leaderboards and recognition from day one**
4. **Developer-first, then expand** — devs build initial quality, domain experts arrive second, general users third
5. **Design for the moment** — someone uses the system, gets a great answer, clicks "view source," sees the community prompt, thinks "I could make this better"

### The Analogy
Not Wikipedia — **Linux.** Started as one person's project, attracted technical contributors, built quality through collective effort, eventually became the substrate running most of the internet. Ideology attracts early contributors, but quality retains users.

---

## Lessons from Fabric (Tactical)

1. **Study Fabric's pattern structure** — IDENTITY AND PURPOSE / STEPS / OUTPUT is a good starting template for agent pages
2. **Absorb their pattern library as seed content** — MIT licensed, 200+ patterns ready to improve
3. **Learn from their GitHub issues** — feature requests = roadmap of unmet needs (orchestration, evaluation, web interface)
4. **Partner or differentiate, don't compete** — Fabric's community are potential early adopters
5. **The appetite exists, the infrastructure doesn't** — Fabric proved demand; we build the city where Fabric built a campsite

---

## Key Design Decisions (To Be Made)

- [ ] **Starting domain:** Which single domain to launch with and prove the model
- [ ] **Agent page template:** Final structure (building on Fabric's pattern format)
- [ ] **Eval framework design:** What benchmarks, how test suites are contributed and run
- [ ] **Orchestrator architecture:** Single vs. hierarchical routing, multi-agent composition rules
- [ ] **Knowledge page granularity:** How to manage RAG retrieval without context window explosion
- [ ] **Wiki platform choice:** MediaWiki fork vs. custom vs. Git-based with wiki frontend
- [ ] **Naming:** Something as iconic as "Wikipedia" that communicates collective + executable intelligence
- [ ] **Founding principles:** The equivalent of Wikipedia's Five Pillars
- [ ] **Relationship with AgentC:** Is this an evolution of AgentC (wiki as source, AgentC as runtime) or a separate venture?
- [ ] **Commercial model:** Open-source wiki + commercial hosting? Donations? Sponsorship?
- [ ] **Legal entity structure:** Capped-returns foundation vs. traditional startup vs. hybrid
- [ ] **Voting mechanism:** Probabilistic Quadratic Voting vs. simple consensus vs. conviction voting
- [ ] **Liability framework:** Clear chain of responsibility for AI-generated advice

---

## Deep Research Findings

### The Framing: "Executable Digital Commons"

The platform represents a shift from AI as a static binary to AI as a **living, community-maintained knowledge base**. The term "Executable Digital Commons" captures this: the traditional "black box" of AI agency is replaced by modular, human-readable components that are collectively owned and governed. This is not just open-source software — it's open-source *intelligence*.

### Expanded Competitive Analysis (from research)

| Project | Core Concept | Successes | Gaps |
|---|---|---|---|
| **Fabric** | Modular task-specific Patterns | High readability; task decomposition; community collection | No executable governance; no formal validation pipeline |
| **PAI (Kai)** | Seven-layer scaffolding and "Universal Algorithm" | Focus on "scaffolding > model"; rigorous lifecycle hooks | Primarily individual/private use; limited collective authoring |
| **GPT Store** | Marketplace for custom agents | Low barrier to entry; vast diversity | Security vulnerabilities; centralized control; "black box" logic; no collaborative editing |
| **Hugging Face** | Repository for models and datasets | "GitHub of ML"; promotes open-source infrastructure | Focused on static artifacts rather than executable agent logic |
| **CIP** | Democratic governance and Alignment Assemblies | Scalable value elicitation; representative constitution setting | Research-focused; lacks a unified technical runtime |

**Key insight from PAI:** The assertion that "scaffolding > model" — while a neural network may remain static, the technical layers surrounding it (skills, hooks, steering rules) should evolve daily. This is exactly our thesis: the community maintains the scaffolding, not the model.

**Key insight from GPT Store:** Research by ThreatCanary found that featured GPTs were frequently vulnerable to "Sensitive Information Disclosure" and "Model Theft" through simple adversarial prompting. Our wiki model solves this by making all instructions public by design — there's nothing to steal because transparency is the architecture.

**Key insight from CIP:** Their "Collective Constitutional AI" approach — where representative citizens co-design constitutions governing AI behavior — validates our governance model. But CIP focuses on *values and alignment*. We focus on *operational intelligence*. They're complementary.

### Wikipedia Governance: Deeper Analysis

#### Featured Article Review — Lessons and Warnings

Wikipedia's FAR process reveals a critical warning: **bureaucratic ossification**. Longitudinal studies show that as the number of featured articles grew, the percentage being systematically reviewed declined, leading to degradation of quality standards. The "bronze star" lost value because maintenance didn't scale with growth.

**Implication for us:** Manual human review alone is insufficient. We need a "Phased FAR for Agents" — human-authored Agent Pages must pass an automated evaluation pipeline *before* community review. The human layer validates intent and domain correctness; the automated layer validates behavioral quality. Neither alone is enough.

#### Neutrality Becomes "Behavioral Neutrality"

NPOV translates to **Instructional Neutrality** — an agent's system prompt must avoid biased or unverified claims. The risk is real: the Greenlandic Wikipedia edition was flooded with error-ridden AI content in 2025, demonstrating how small communities can be overwhelmed by low-quality contributions.

**Enforcement mechanism:** Verification hooks and bias-detection judges (LLM-as-judge evaluating agent outputs for bias markers).

#### Notability as Context Window Economics

This is a profound reframe from the research: **notability criteria serve the "Context Window Economy."** LLMs face hard limits on context length, attention decay ("lost in the middle" effect), and latency costs. Just as a Wikipedia article must meet notability to exist, a Skill Page must demonstrate unique utility and community demand to be included in the orchestrator's routing table. This prevents "context window bloat" — a failure mode unique to executable wikis that traditional Wikipedia never faces.

#### Graduated Trust Becomes Execution Privilege Tiering

| Trust Level | Wikipedia Equivalent | Platform Capability |
|---|---|---|
| New contributor | Anonymous editor | Propose knowledge page edits only (recommendation mode) |
| Confirmed | Autoconfirmed (threshold of contributions) | Edit agent prompts; submit skill pages for review |
| Trusted | Extended confirmed (500+ edits) | Modify orchestrator routing; approve agent changes |
| Administrator | Admin (community elected via RfA) | Modify skill pages with system-level tool access; manage security-critical components |

This follows the principle of **least privilege** — a single compromised account cannot catastrophically damage the system.

### Technical Architecture: PromptOps Pipeline

The research introduces the concept of **PromptOps** — applying CI/CD principles to prompt management. When an editor modifies a wiki page:

```
Edit submitted
    → Syntax/format validation (automated)
    → Eval suite triggered (automated benchmarks)
    → Shadow deployment (parallel execution alongside current production)
    → Results posted to talk page (transparent)
    → Community review with evidence
    → Merge or reject
    → Canary monitoring post-merge (detect regression in production)
```

This is more sophisticated than our initial "GitHub Actions run evals" concept. The shadow deployment and canary monitoring stages are critical for catching issues that benchmarks miss.

### Multi-Agent Orchestration Patterns

| Pattern | Mechanism | Use Case |
|---|---|---|
| **Sequential** | Agents work in step-by-step chain | Structured processes like compliance checks |
| **Parallel Audit** | N agents work simultaneously on partitions | Catching contradictions across large datasets |
| **Hierarchical Routing** | Master agent delegates to sub-agents | Reduces context window pressure on the "brain" |
| **Reflective Loop** | Agents assess own results and adjust | Self-correcting, continuous improvement |

The **Sub-agent Pattern** is key: sub-agents operate in isolation with their own context, preventing the "bloated history" problem. Each agent page is invoked with only its declared knowledge dependencies, not the full conversation history.

### Automated Evaluation: The Immune System (Detailed)

#### LLM-as-Judge

Standard benchmarks fail to capture agentic behavior nuance. The platform employs frontier models as judges, prompted with Chain-of-Thought reasoning to explain scores before outputting labels. This creates an auditable evaluation trail.

#### Convergence Score

A critical metric for executable AI — measures the efficiency of an agent's problem-solving path:

```
Convergence Score = Minimum possible steps / Actual steps taken
```

A low score indicates "wandering" or "loops." This metric is unique to agentic systems and doesn't exist in traditional LLM evaluation.

#### Span-Level vs. Trace-Level Evaluation

- **Span Level:** Evaluates individual steps (did the agent call the right tool? did it parse the response correctly?)
- **Trace Level:** Evaluates the entire chain (did the overall sequence produce the right outcome?)

Both are needed — an agent can make correct individual steps but arrive at the wrong conclusion, or vice versa.

#### Shadow Mode and Canary Prompts

Proposed changes are deployed in **Shadow Mode** — generating outputs in parallel with production but not serving them to users. A panel of judge models performs **Pairwise Evaluation** (current vs. proposed). Only changes that demonstrably improve performance graduate to production. Post-merge, **canary prompts** (test probes) continuously monitor for behavioral drift or model collapse.

### Community Dynamics: Deeper Insights

#### The AI Substitution Effect

Critical finding: research shows a "heterogeneous substitution effect" where Wikipedia articles overlapping with AI-generated content see **declining editing and viewership**. If users can get information from a chatbot, they contribute less to the platforms that train those chatbots.

**Our counter-strategy:** Transform the contributor role from "Knowledge Provider" to **"Agent Architect."** The incentive isn't providing information (which AI can now do) — it's building an executable persona that acts on the contributor's behalf and carries their expertise into the world. This is **"Agentic Altruism"** — the contributor's knowledge becomes a living agent that helps others even when the contributor isn't present.

#### Mitigating Editor Burnout

Wikipedia suffers from declining editorship and bureaucratic stagnation. Strategies for mitigation:

- **Automated maintenance:** Eval pipelines catch quality degradation without requiring human patrol
- **Rotation of review responsibilities** within WikiProjects to prevent burnout
- **Visible impact metrics** — contributors see how many queries their agent handled, how many users it helped
- **"Gardening" tools** — automated suggestions for pages that need attention, reducing the cognitive load of finding work to do

### Risks and Failure Modes (Expanded)

#### Agent Skill Supply Chain Vulnerabilities

The research draws a powerful analogy: the **"Agent Skill Supply Chain"** reproduces the trust pathologies of software package ecosystems (npm, PyPI) but with amplified risk because skills execute with system privileges. A malicious contributor could inject "Symbolic Attackers" that intercept or replay sensitive skill messages.

**Mitigation — SkillFortify framework:**
- Formal verification of skill page safety properties
- Sandboxed execution environments for skill testing
- Dependency scanning (skill pages that import other skills create chains of trust)
- Signed contributions with revocation capability

#### Sybil Attacks on Voting

Decentralized voting is vulnerable to Sybil attacks (one actor creating many identities to hijack governance).

**Mitigation strategies:**
- **Probabilistic Quadratic Voting (PQV):** Makes Sybil attacks "always a loss" by ensuring expected voting power decreases when split across identities
- **Temporal Conviction:** Recomputes vote weights based on how long a conviction was held, favoring long-term community members over transient activity spikes
- **Proof of expertise:** Domain-specific credentialing that's hard to fake (e.g., verifiable professional credentials for medical agent governance)

#### Legal Liability for AI-Generated Advice

Hallucinations create critical liability concerns — legal professionals are already being sanctioned for failing to verify AI-generated citations.

**Clear Chain of Responsibility:**
- The platform provides the commons (not liable for individual outputs, similar to Wikipedia's Section 230 protections)
- Agent page maintainers are responsible for accuracy claims within their domain
- Users are clearly informed that outputs are community-authored, not professionally certified
- High-stakes domains (medical, legal, financial) require explicit disclaimers and cannot claim authority

### Commercial and Sustainability Models (Expanded)

#### The Two Paradigms

| Model | Example | Approach |
|---|---|---|
| **Red Hat model** | Red Hat / RHEL | Open-source core, commercial support and managed hosting |
| **Hugging Face model** | Hugging Face | Open-source community platform, commercial compute and enterprise features |

#### Revenue Structures for the Platform

| Model | Mechanism | Fit |
|---|---|---|
| **Usage-Based (API)** | Per-token or per-call pricing | Occasional users, specialized tasks |
| **Subscription (SaaS)** | Flat monthly for unlimited access | Heavy users, predictable revenue |
| **Price per Outcome** | Charging for successful "Actions" or "Results" | Future "results-based" agent models |
| **Marketplace** | Transaction fees on premium Skill Pages | Rewards expert contributors |

#### The Capped-Returns Foundation

To maintain its status as a Digital Commons, the platform could be structured as a **"Capped-Returns" entity** — similar to CIP's model. This prioritizes steady returns and public good over exponential growth, ensuring the primary goal remains human augmentation and AI democratization rather than profit extraction.

**The dual structure:** Open-source foundation owns the wiki and governance. Commercial entity (AgentC) provides the runtime and enterprise features. Revenue from the commercial entity funds the foundation. Neither can exist without the other.

### Implementation Roadmap (from research)

#### Phase 1: Foundation and Scaffolding
- Core wiki platform with versioned Markdown pages
- Basic agent, knowledge, skill, and orchestrator page types
- GitHub-based contribution workflow
- Initial eval framework (LLM-as-judge + basic benchmarks)
- Single domain launch (prove the model works)

#### Phase 2: Automated Governance and Trust
- Full PromptOps pipeline (shadow deployment, canary monitoring)
- Graduated trust system with execution privilege tiering
- WikiProject formation for domain stewardship
- Advanced eval metrics (convergence score, span/trace evaluation)
- Sybil-resistant voting mechanisms

#### Phase 3: Scaling the Executable Commons
- Multi-domain expansion
- Marketplace for premium skills
- Commercial runtime (AgentC integration)
- Foundation entity formation
- Cross-platform interoperability (agents usable across different LLM providers)

---

## Connection to Existing Work

This platform could serve as the open-source community layer for **AgentC** (multi-tenant conversational AI platform). The wiki is the "source code" — collectively authored agent behaviors, knowledge, and orchestration logic. AgentC is the "compiler and runtime" — consuming the wiki's output and serving it to end users. Open-source the wiki, commercialize the runtime. The governance layer is the moat.

---

*Document generated from brainstorming sessions and deep research. All ideas are at concept stage. No code has been written.*

*Next step: Let it breathe. Return in two weeks with fresh eyes.*