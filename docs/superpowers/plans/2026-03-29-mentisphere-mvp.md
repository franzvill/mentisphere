# MentiSphere MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship MentiSphere MVP — a MediaWiki-based platform where users create community-authored AI agents and chat with them via an embedded widget powered by a Next.js chat service.

**Architecture:** Two-system design. MediaWiki (PHP, MariaDB, Elasticsearch) handles all wiki features — pages, revisions, talk pages, search, user accounts. A separate Next.js chat service (PostgreSQL + pgvector) handles LLM streaming, RAG retrieval, and chat history. An embedded React chat widget connects the two. Nginx reverse-proxies everything on one domain.

**Tech Stack:** MediaWiki 1.42 (Citizen skin), Next.js 15 (API-only), PostgreSQL 16 + pgvector, MariaDB 10.11, Elasticsearch 7.x, Drizzle ORM, Anthropic Claude SDK, Vite (chat widget), Docker Compose, Nginx.

**Reference docs:**
- `tasks/tdd-mentisphere-mvp.md` — full technical design
- `tasks/prd-mentisphere-mvp.md` — product requirements
- `VISION.md` — project vision

---

## File Structure Overview

```
mentisphere/
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
├── nginx/
│   └── nginx.conf
├── mediawiki/
│   ├── LocalSettings.php
│   └── extensions/
│       └── MentiSphereChat/
│           ├── extension.json
│           ├── includes/
│           │   └── MentiSphereChatHooks.php
│           ├── modules/
│           │   └── ext.mentisphere.chat/
│           │       ├── chat-loader.js
│           │       └── chat-loader.css
│           └── i18n/
│               └── en.json
├── chat-service/
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── app/
│       │   └── api/
│       │       ├── health/
│       │       │   └── route.ts
│       │       ├── sessions/
│       │       │   ├── route.ts
│       │       │   └── [id]/
│       │       │       └── messages/
│       │       │           └── route.ts
│       │       ├── messages/
│       │       │   └── [id]/
│       │       │       └── rate/
│       │       │           └── route.ts
│       │       ├── embeddings/
│       │       │   └── sync/
│       │       │       └── route.ts
│       │       └── stats/
│       │           └── [agentPageTitle]/
│       │               └── route.ts
│       ├── lib/
│       │   ├── mediawiki/
│       │   │   ├── client.ts
│       │   │   └── types.ts
│       │   ├── llm/
│       │   │   ├── provider.ts
│       │   │   ├── anthropic.ts
│       │   │   └── types.ts
│       │   ├── rag/
│       │   │   ├── chunker.ts
│       │   │   ├── embeddings.ts
│       │   │   └── retrieval.ts
│       │   ├── auth.ts
│       │   ├── rate-limit.ts
│       │   └── utils.ts
│       ├── db/
│       │   ├── schema.ts
│       │   ├── index.ts
│       │   └── migrations/
│       └── types/
│           └── index.ts
├── chat-widget/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── index.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── ChatWidget.tsx
│       │   ├── MessageList.tsx
│       │   ├── ChatMessage.tsx
│       │   ├── ChatInput.tsx
│       │   ├── AgentInfoBar.tsx
│       │   └── StreamingIndicator.tsx
│       ├── hooks/
│       │   └── use-chat.ts
│       ├── lib/
│       │   ├── api.ts
│       │   └── markdown.ts
│       ├── types.ts
│       └── styles.css
└── seed/
    ├── agents/
    │   ├── medical-triage.wikitext
    │   ├── italian-tax-law.wikitext
    │   ├── kubernetes-debugging.wikitext
    │   ├── recipe-advisor.wikitext
    │   └── python-code-reviewer.wikitext
    ├── knowledge/
    │   ├── pharmacology-basics.wikitext
    │   ├── italian-tax-brackets.wikitext
    │   └── kubernetes-error-codes.wikitext
    └── skills/
        ├── pdf-generation.wikitext
        └── sql-query-builder.wikitext
```

---

## Task 1: Git Repository and Project Scaffolding

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml` (skeleton — services added in later tasks)

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/francescovillano/Projects/mentisphere
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
# Environment
.env
*.env.local

# Docker
docker-compose.override.yml

# Node
node_modules/
dist/
.next/

# MediaWiki
mediawiki/images/
mediawiki/cache/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

- [ ] **Step 3: Create .env.example**

```bash
# MariaDB
MYSQL_ROOT_PASSWORD=changeme
MEDIAWIKI_DB_NAME=mentisphere_wiki

# PostgreSQL (Chat Service)
PG_PASSWORD=changeme
DATABASE_URL=postgresql://mentisphere:changeme@postgres:5432/mentisphere_chat

# Anthropic (LLM chat)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (embeddings for RAG)
OPENAI_API_KEY=sk-...

# MediaWiki
MEDIAWIKI_SECRET_KEY=changeme_long_random_string
MEDIAWIKI_API_URL=http://mediawiki:80/api.php

# Chat Service
CHAT_SERVICE_URL=http://localhost:3000
CHAT_SERVICE_SECRET=changeme_internal_secret
```

- [ ] **Step 4: Create .env from example**

```bash
cp .env.example .env
# Edit .env with real values (at minimum ANTHROPIC_API_KEY)
```

- [ ] **Step 5: Create empty directory structure**

```bash
mkdir -p mediawiki/extensions/MentiSphereChat/{includes,modules/ext.mentisphere.chat,i18n}
mkdir -p chat-service/src/{app/api,lib,db,types}
mkdir -p chat-widget/src/{components,hooks,lib}
mkdir -p nginx
mkdir -p seed/{agents,knowledge,skills}
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore .env.example CLAUDE.md VISION.md tasks/
git commit -m "chore: initialize repo with vision, PRD, TDD, and project scaffolding"
```

---

## Task 2: Docker Compose — MediaWiki + MariaDB

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write docker-compose.yml with MediaWiki and MariaDB services**

```yaml
services:
  mariadb:
    image: mariadb:10.11
    restart: unless-stopped
    volumes:
      - mariadb-data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MEDIAWIKI_DB_NAME}
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: elasticsearch:7.17.18
    restart: unless-stopped
    volumes:
      - es-data:/usr/share/elasticsearch/data
    environment:
      discovery.type: single-node
      ES_JAVA_OPTS: "-Xms256m -Xmx256m"
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200/_cluster/health | grep -q '\"status\":\"green\\|yellow\"'"]
      interval: 10s
      timeout: 5s
      retries: 10

  mediawiki:
    image: mediawiki:1.42
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - wiki-images:/var/www/html/images
    depends_on:
      mariadb:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy
    environment:
      MEDIAWIKI_DB_HOST: mariadb
      MEDIAWIKI_DB_NAME: ${MEDIAWIKI_DB_NAME}
      MEDIAWIKI_DB_USER: root
      MEDIAWIKI_DB_PASSWORD: ${MYSQL_ROOT_PASSWORD}

volumes:
  mariadb-data:
  es-data:
  wiki-images:
```

- [ ] **Step 2: Start the services**

```bash
docker compose up -d
```

Expected: Both containers running. MediaWiki shows install wizard at http://localhost:8080.

- [ ] **Step 3: Run MediaWiki installer via browser**

Navigate to http://localhost:8080 and complete the installation wizard:
- Database host: `mariadb`
- Database name: value from `MEDIAWIKI_DB_NAME` in `.env`
- Database user: `root`
- Database password: value from `MYSQL_ROOT_PASSWORD` in `.env`
- Wiki name: `MentiSphere`
- Admin username: `Admin`
- Admin password: (choose one)

Download the generated `LocalSettings.php`.

- [ ] **Step 4: Copy LocalSettings.php into the project**

```bash
# Move downloaded LocalSettings.php to project
mv ~/Downloads/LocalSettings.php mediawiki/LocalSettings.php
```

- [ ] **Step 5: Mount LocalSettings.php in docker-compose.yml**

Add to mediawiki service volumes:

```yaml
    volumes:
      - ./mediawiki/LocalSettings.php:/var/www/html/LocalSettings.php
      - wiki-images:/var/www/html/images
```

- [ ] **Step 6: Restart MediaWiki with config**

```bash
docker compose restart mediawiki
```

Expected: http://localhost:8080 shows a working wiki with "MentiSphere" as the title.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml mediawiki/LocalSettings.php
git commit -m "feat: add Docker Compose with MediaWiki + MariaDB"
```

---

## Task 3: Install Citizen Skin

**Files:**
- Modify: `mediawiki/LocalSettings.php`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Download Citizen skin into mediawiki directory**

```bash
cd /Users/francescovillano/Projects/mentisphere
git clone https://github.com/StarCitizenTools/mediawiki-skins-citizen.git mediawiki/skins/citizen --branch v2.x --depth 1
```

- [ ] **Step 2: Mount skin in docker-compose.yml**

Add to mediawiki volumes:

```yaml
      - ./mediawiki/skins/citizen:/var/www/html/skins/citizen
```

- [ ] **Step 3: Enable Citizen skin in LocalSettings.php**

Append to `mediawiki/LocalSettings.php`:

```php
# Citizen Skin
wfLoadSkin( 'citizen' );
$wgDefaultSkin = 'citizen';
```

- [ ] **Step 4: Restart and verify**

```bash
docker compose restart mediawiki
```

Expected: http://localhost:8080 shows the modern Citizen skin.

- [ ] **Step 5: Commit**

```bash
git add mediawiki/skins/citizen docker-compose.yml mediawiki/LocalSettings.php
git commit -m "feat: install and enable Citizen skin for modern UI"
```

---

## Task 4: Register Custom Namespaces

**Files:**
- Modify: `mediawiki/LocalSettings.php`

- [ ] **Step 1: Add namespace constants and registration to LocalSettings.php**

Append to `mediawiki/LocalSettings.php`:

```php
# Custom Namespaces
define( 'NS_AGENT', 3000 );
define( 'NS_AGENT_TALK', 3001 );
define( 'NS_KNOWLEDGE', 3010 );
define( 'NS_KNOWLEDGE_TALK', 3011 );
define( 'NS_SKILL', 3020 );
define( 'NS_SKILL_TALK', 3021 );
define( 'NS_ORCHESTRATOR', 3030 );
define( 'NS_ORCHESTRATOR_TALK', 3031 );

$wgExtraNamespaces[NS_AGENT] = 'Agent';
$wgExtraNamespaces[NS_AGENT_TALK] = 'Agent_talk';
$wgExtraNamespaces[NS_KNOWLEDGE] = 'Knowledge';
$wgExtraNamespaces[NS_KNOWLEDGE_TALK] = 'Knowledge_talk';
$wgExtraNamespaces[NS_SKILL] = 'Skill';
$wgExtraNamespaces[NS_SKILL_TALK] = 'Skill_talk';
$wgExtraNamespaces[NS_ORCHESTRATOR] = 'Orchestrator';
$wgExtraNamespaces[NS_ORCHESTRATOR_TALK] = 'Orchestrator_talk';

# Enable subpages in custom namespaces
$wgNamespacesWithSubpages[NS_AGENT] = true;
$wgNamespacesWithSubpages[NS_KNOWLEDGE] = true;
$wgNamespacesWithSubpages[NS_SKILL] = true;
$wgNamespacesWithSubpages[NS_ORCHESTRATOR] = true;

# Enable content namespaces for search
$wgContentNamespaces[] = NS_AGENT;
$wgContentNamespaces[] = NS_KNOWLEDGE;
$wgContentNamespaces[] = NS_SKILL;
```

- [ ] **Step 2: Run MediaWiki update script**

```bash
docker compose exec mediawiki php maintenance/run.php update --quick
```

Expected: No errors. Namespaces registered.

- [ ] **Step 3: Verify namespaces work**

Navigate to http://localhost:8080/wiki/Agent:Test — should show "create this page" option. Navigate to http://localhost:8080/wiki/Special:AllPages and check the namespace dropdown includes Agent, Knowledge, Skill.

- [ ] **Step 4: Commit**

```bash
git add mediawiki/LocalSettings.php
git commit -m "feat: register Agent, Knowledge, Skill, Orchestrator namespaces"
```

---

## Task 5: Install Core MediaWiki Extensions

**Files:**
- Modify: `docker-compose.yml`
- Modify: `mediawiki/LocalSettings.php`

MediaWiki 1.42 ships with some extensions bundled (VisualEditor, Echo, Thanks, AbuseFilter). We need to enable them and install Cargo and Scribunto separately.

- [ ] **Step 1: Download Cargo and Scribunto extensions**

```bash
cd /Users/francescovillano/Projects/mentisphere
git clone https://github.com/wikimedia/mediawiki-extensions-Cargo.git mediawiki/extensions/Cargo --branch REL1_42 --depth 1
git clone https://github.com/wikimedia/mediawiki-extensions-Scribunto.git mediawiki/extensions/Scribunto --branch REL1_42 --depth 1
```

- [ ] **Step 2: Mount extensions in docker-compose.yml**

Add to mediawiki volumes:

```yaml
      - ./mediawiki/extensions/Cargo:/var/www/html/extensions/Cargo
      - ./mediawiki/extensions/Scribunto:/var/www/html/extensions/Scribunto
      - ./mediawiki/extensions/MentiSphereChat:/var/www/html/extensions/MentiSphereChat
```

- [ ] **Step 3: Enable extensions in LocalSettings.php**

Append to `mediawiki/LocalSettings.php`:

```php
# Extensions
wfLoadExtension( 'VisualEditor' );
wfLoadExtension( 'Echo' );
wfLoadExtension( 'Thanks' );
wfLoadExtension( 'AbuseFilter' );
wfLoadExtension( 'Cargo' );
wfLoadExtension( 'Scribunto' );
wfLoadExtension( 'CirrusSearch' );
wfLoadExtension( 'Elastica' );

# CirrusSearch config
$wgCirrusSearchServers = [ 'elasticsearch' ];
$wgSearchType = 'CirrusSearch';
$wgCirrusSearchExtraIndexSettings['index.mapping.total_fields.limit'] = 5000;

# Scribunto config — use Lua standalone engine
$wgScribuntoDefaultEngine = 'luastandalone';

# VisualEditor config — enable for custom namespaces
$wgVisualEditorAvailableNamespaces[NS_AGENT] = true;
$wgVisualEditorAvailableNamespaces[NS_KNOWLEDGE] = true;
$wgVisualEditorAvailableNamespaces[NS_SKILL] = true;
```

- [ ] **Step 4: Restart and run update**

```bash
docker compose restart mediawiki
docker compose exec mediawiki php maintenance/run.php update --quick
```

Expected: No errors. Extensions loaded.

- [ ] **Step 5: Verify extensions**

Navigate to http://localhost:8080/wiki/Special:Version — should list all enabled extensions (Cargo, Scribunto, VisualEditor, Echo, Thanks, AbuseFilter).

- [ ] **Step 6: Commit**

```bash
git add mediawiki/extensions/Cargo mediawiki/extensions/Scribunto docker-compose.yml mediawiki/LocalSettings.php
git commit -m "feat: install Cargo, Scribunto, VisualEditor, Echo, Thanks, AbuseFilter extensions"
```

---

## Task 6: Create Agent Page Lua Template

**Files:**
- This is wiki content — created via the MediaWiki UI or API, not files on disk

- [ ] **Step 1: Create the Lua module for AgentPage template**

Navigate to http://localhost:8080/wiki/Module:AgentPage and create with this content:

```lua
local p = {}

function p.render(frame)
    local args = frame:getParent().args
    local name = args.name or 'Unnamed Agent'
    local domain = args.domain or 'General'
    local maturity = args.maturity or 'stub'
    local description = args.description or ''
    local knowledge_deps = args.knowledge_deps or ''
    local skill_deps = args.skill_deps or ''
    local known_limitations = args.known_limitations or ''

    -- Maturity badge colors
    local maturityColors = {
        stub = '#9e9e9e',
        start = '#2196f3',
        c = '#4caf50',
        b = '#9c27b0',
        ga = '#ff9800',
        featured = '#f44336'
    }
    local badgeColor = maturityColors[maturity] or '#9e9e9e'

    local html = mw.html.create('div')
        :addClass('agent-infobox')
        :css('border', '1px solid #ddd')
        :css('border-radius', '8px')
        :css('padding', '16px')
        :css('margin-bottom', '16px')
        :css('background', '#fafafa')

    -- Header
    html:tag('div')
        :css('display', 'flex')
        :css('justify-content', 'space-between')
        :css('align-items', 'center')
        :css('margin-bottom', '12px')
        :tag('h2')
            :css('margin', '0')
            :wikitext(name)
            :done()
        :tag('span')
            :css('background', badgeColor)
            :css('color', 'white')
            :css('padding', '2px 8px')
            :css('border-radius', '4px')
            :css('font-size', '0.85em')
            :wikitext(string.upper(maturity))

    -- Domain
    html:tag('div')
        :css('margin-bottom', '8px')
        :tag('strong'):wikitext('Domain: '):done()
        :wikitext('[[:Category:' .. domain .. '|' .. domain .. ']]')

    -- Description
    if description ~= '' then
        html:tag('div')
            :css('margin-bottom', '8px')
            :css('font-style', 'italic')
            :wikitext(description)
    end

    -- Knowledge Dependencies
    if knowledge_deps ~= '' then
        local depDiv = html:tag('div'):css('margin-bottom', '8px')
        depDiv:tag('strong'):wikitext('Knowledge: ')
        for dep in mw.text.gsplit(knowledge_deps, '%s*,%s*') do
            if dep ~= '' then
                depDiv:wikitext('[[' .. dep .. ']] ')
            end
        end
    end

    -- Skill Dependencies
    if skill_deps ~= '' then
        local depDiv = html:tag('div'):css('margin-bottom', '8px')
        depDiv:tag('strong'):wikitext('Skills: ')
        for dep in mw.text.gsplit(skill_deps, '%s*,%s*') do
            if dep ~= '' then
                depDiv:wikitext('[[' .. dep .. ']] ')
            end
        end
    end

    -- Limitations
    if known_limitations ~= '' then
        html:tag('div')
            :css('margin-top', '12px')
            :css('padding', '8px')
            :css('background', '#fff3e0')
            :css('border-radius', '4px')
            :tag('strong'):wikitext('Known Limitations: '):done()
            :wikitext(known_limitations)
    end

    -- Cargo store (structured data for queries)
    local cargoStore = '{{#cargo_store:_table=agent_data'
        .. '|name=' .. name
        .. '|domain=' .. domain
        .. '|maturity=' .. maturity
        .. '|description=' .. description
        .. '|knowledge_deps=' .. knowledge_deps
        .. '|skill_deps=' .. skill_deps
        .. '}}'
    frame:preprocess(cargoStore)

    -- Add category
    local categoryText = '[[Category:' .. domain .. ']][[Category:Agents]][[Category:Maturity ' .. maturity .. ']]'

    return tostring(html) .. categoryText
end

return p
```

- [ ] **Step 2: Create the Template:AgentPage wrapper**

Navigate to http://localhost:8080/wiki/Template:AgentPage and create:

```wikitext
{{#invoke:AgentPage|render}}
```

- [ ] **Step 3: Create the Cargo table declaration**

Navigate to http://localhost:8080/wiki/Template:AgentPage/CargoDeclare and create:

```wikitext
{{#cargo_declare:_table=agent_data
|name=String
|domain=String
|maturity=String
|description=Text
|knowledge_deps=String
|skill_deps=String
|chat_count=Integer
}}
```

Then visit the page and click "Create this table" (or navigate to Special:CargoTables and recreate).

- [ ] **Step 4: Create a test agent page to verify**

Navigate to http://localhost:8080/wiki/Agent:Test_Agent and create:

```wikitext
{{AgentPage
| name = Test Agent
| domain = General
| maturity = stub
| description = A test agent to verify templates work.
| knowledge_deps =
| skill_deps =
| known_limitations = This is just a test.
}}

== Identity and Purpose ==
You are a helpful test agent.

== Steps ==
1. Listen to the user's question
2. Provide a helpful answer

== Output ==
Respond clearly and concisely.
```

Expected: Page renders with an infobox showing name, domain, maturity badge, and categories.

- [ ] **Step 5: Commit any local file changes (LocalSettings.php if modified)**

```bash
git add -A
git commit -m "feat: create AgentPage Lua template with Cargo structured data"
```

---

## Task 7: Create Knowledge and Skill Page Templates

**Files:**
- Wiki content (created via MediaWiki UI)

- [ ] **Step 1: Create Module:KnowledgePage**

Navigate to http://localhost:8080/wiki/Module:KnowledgePage and create:

```lua
local p = {}

function p.render(frame)
    local args = frame:getParent().args
    local title = args.title or mw.title.getCurrentTitle().text
    local domain = args.domain or 'General'
    local summary = args.summary or ''
    local related_agents = args.related_agents or ''

    local html = mw.html.create('div')
        :addClass('knowledge-infobox')
        :css('border', '1px solid #c8e6c9')
        :css('border-radius', '8px')
        :css('padding', '16px')
        :css('margin-bottom', '16px')
        :css('background', '#e8f5e9')

    html:tag('div')
        :css('display', 'flex')
        :css('justify-content', 'space-between')
        :css('align-items', 'center')
        :css('margin-bottom', '12px')
        :tag('h2'):css('margin', '0'):wikitext(title):done()
        :tag('span')
            :css('background', '#4caf50')
            :css('color', 'white')
            :css('padding', '2px 8px')
            :css('border-radius', '4px')
            :css('font-size', '0.85em')
            :wikitext('KNOWLEDGE')

    html:tag('div')
        :css('margin-bottom', '8px')
        :tag('strong'):wikitext('Domain: '):done()
        :wikitext('[[:Category:' .. domain .. '|' .. domain .. ']]')

    if summary ~= '' then
        html:tag('div')
            :css('font-style', 'italic')
            :css('margin-bottom', '8px')
            :wikitext(summary)
    end

    if related_agents ~= '' then
        local agentDiv = html:tag('div'):css('margin-bottom', '8px')
        agentDiv:tag('strong'):wikitext('Used by: ')
        for agent in mw.text.gsplit(related_agents, '%s*,%s*') do
            if agent ~= '' then
                agentDiv:wikitext('[[' .. agent .. ']] ')
            end
        end
    end

    local categoryText = '[[Category:' .. domain .. ']][[Category:Knowledge Pages]]'
    return tostring(html) .. categoryText
end

return p
```

- [ ] **Step 2: Create Template:KnowledgePage**

Navigate to http://localhost:8080/wiki/Template:KnowledgePage:

```wikitext
{{#invoke:KnowledgePage|render}}
```

- [ ] **Step 3: Create Module:SkillPage**

Navigate to http://localhost:8080/wiki/Module:SkillPage and create:

```lua
local p = {}

function p.render(frame)
    local args = frame:getParent().args
    local title = args.title or mw.title.getCurrentTitle().text
    local capability = args.capability or ''
    local input_spec = args.input_spec or ''
    local output_spec = args.output_spec or ''
    local tools_required = args.tools_required or ''
    local related_agents = args.related_agents or ''

    local html = mw.html.create('div')
        :addClass('skill-infobox')
        :css('border', '1px solid #bbdefb')
        :css('border-radius', '8px')
        :css('padding', '16px')
        :css('margin-bottom', '16px')
        :css('background', '#e3f2fd')

    html:tag('div')
        :css('display', 'flex')
        :css('justify-content', 'space-between')
        :css('align-items', 'center')
        :css('margin-bottom', '12px')
        :tag('h2'):css('margin', '0'):wikitext(title):done()
        :tag('span')
            :css('background', '#2196f3')
            :css('color', 'white')
            :css('padding', '2px 8px')
            :css('border-radius', '4px')
            :css('font-size', '0.85em')
            :wikitext('SKILL')

    if capability ~= '' then
        html:tag('div')
            :css('font-style', 'italic')
            :css('margin-bottom', '8px')
            :wikitext(capability)
    end

    if input_spec ~= '' then
        html:tag('div'):css('margin-bottom', '4px')
            :tag('strong'):wikitext('Input: '):done()
            :wikitext(input_spec)
    end

    if output_spec ~= '' then
        html:tag('div'):css('margin-bottom', '4px')
            :tag('strong'):wikitext('Output: '):done()
            :wikitext(output_spec)
    end

    if tools_required ~= '' then
        html:tag('div'):css('margin-bottom', '4px')
            :tag('strong'):wikitext('Tools: '):done()
            :wikitext(tools_required)
    end

    if related_agents ~= '' then
        local agentDiv = html:tag('div'):css('margin-bottom', '8px')
        agentDiv:tag('strong'):wikitext('Used by: ')
        for agent in mw.text.gsplit(related_agents, '%s*,%s*') do
            if agent ~= '' then
                agentDiv:wikitext('[[' .. agent .. ']] ')
            end
        end
    end

    local categoryText = '[[Category:Skills]]'
    return tostring(html) .. categoryText
end

return p
```

- [ ] **Step 4: Create Template:SkillPage**

Navigate to http://localhost:8080/wiki/Template:SkillPage:

```wikitext
{{#invoke:SkillPage|render}}
```

- [ ] **Step 5: Test both templates with sample pages**

Create http://localhost:8080/wiki/Knowledge:Test_Knowledge:

```wikitext
{{KnowledgePage
| title = Test Knowledge
| domain = General
| summary = A test knowledge page.
| related_agents = Agent:Test_Agent
}}

== Content ==
This is test knowledge content that agents can reference.
```

Create http://localhost:8080/wiki/Skill:Test_Skill:

```wikitext
{{SkillPage
| title = Test Skill
| capability = Generates formatted output.
| input_spec = Raw text
| output_spec = Formatted markdown
| tools_required = None
| related_agents = Agent:Test_Agent
}}

== Usage ==
This skill formats raw text into clean markdown output.

== Examples ==
Input: "hello world"
Output: "**Hello World**"
```

Expected: Both pages render with colored infoboxes and correct categories.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: create KnowledgePage and SkillPage Lua templates"
```

---

## Task 8: Seed Content — Sample Agent, Knowledge, and Skill Pages

**Files:**
- Create: `seed/agents/*.wikitext` (reference copies)
- Wiki content created via MediaWiki UI

- [ ] **Step 1: Create seed wikitext files as reference**

Create `seed/agents/medical-triage.wikitext`:

```wikitext
{{AgentPage
| name = Medical Triage Agent
| domain = Medical
| maturity = start
| description = Helps assess symptoms and recommend appropriate next steps. Not a replacement for professional medical advice.
| knowledge_deps = Knowledge:Pharmacology_Basics, Knowledge:Emergency_Protocols
| skill_deps =
| known_limitations = Not a replacement for professional medical advice. Does not handle pediatric cases. Cannot diagnose conditions.
}}

== Identity and Purpose ==
You are a medical triage specialist. Your role is to help users understand their symptoms, assess urgency, and recommend appropriate next steps (self-care, doctor visit, urgent care, or emergency room).

You are NOT a doctor and cannot diagnose conditions. Always remind users to seek professional medical advice for serious concerns.

== Steps ==
1. Ask the user to describe their primary symptom or concern
2. Ask clarifying questions: duration, severity (1-10), any associated symptoms
3. Assess urgency based on the information provided
4. Recommend one of: self-care with monitoring, schedule a doctor visit, go to urgent care, call emergency services
5. Provide relevant general health information from your knowledge base

== Output ==
Structure your response as:
- **Assessment:** Brief summary of what you understand
- **Urgency Level:** Low / Moderate / High / Emergency
- **Recommendation:** What the user should do next
- **General Information:** Relevant health context (not medical advice)
- **Disclaimer:** Remind that this is not medical advice
```

Create `seed/agents/recipe-advisor.wikitext`:

```wikitext
{{AgentPage
| name = Recipe Advisor
| domain = Cooking
| maturity = start
| description = Suggests recipes based on available ingredients, dietary preferences, and skill level.
| knowledge_deps = Knowledge:Common_Ingredient_Substitutions
| skill_deps =
| known_limitations = Cannot account for specific allergies beyond what the user tells me. Recipes are suggestions, not guaranteed to work perfectly.
}}

== Identity and Purpose ==
You are a friendly, experienced home cook who helps people figure out what to make for dinner. You're practical — you work with what people have on hand, respect their dietary needs, and adjust complexity to their skill level.

== Steps ==
1. Ask what ingredients the user has available (or what they're craving)
2. Ask about dietary restrictions or preferences
3. Ask about their cooking skill level and available time
4. Suggest 2-3 recipe options that match their constraints
5. Provide step-by-step instructions for the chosen recipe

== Output ==
For each recipe suggestion:
- **Recipe Name**
- **Time:** Prep + cooking time
- **Difficulty:** Easy / Medium / Advanced
- **Ingredients:** What they need (flag anything they might not have)
- **Steps:** Numbered, clear instructions

Keep the tone warm and encouraging. If they're missing an ingredient, suggest substitutions.
```

- [ ] **Step 2: Create these pages in MediaWiki**

Navigate to the wiki and create each page by pasting the wikitext content. Create at minimum:

1. `Agent:Medical_Triage` — from medical-triage.wikitext
2. `Agent:Recipe_Advisor` — from recipe-advisor.wikitext
3. `Knowledge:Pharmacology_Basics` — basic pharmacology knowledge page
4. `Knowledge:Common_Ingredient_Substitutions` — cooking substitutions knowledge page

- [ ] **Step 3: Create the MentiSphere Main Page**

Edit http://localhost:8080/wiki/Main_Page:

```wikitext
Welcome to '''MentiSphere''' — the collectively-built AI intelligence platform.

MentiSphere is where domain experts create AI agents that anyone can chat with. Think of it as Wikipedia, but instead of articles that teach humans, we build pages that teach AI.

== Featured Agents ==
* [[Agent:Medical_Triage|Medical Triage Agent]] — Symptom assessment and next-step recommendations
* [[Agent:Recipe_Advisor|Recipe Advisor]] — Recipe suggestions based on what you have on hand

== How It Works ==
# '''Browse''' agents in your area of interest
# '''Chat''' with an agent to get expert-level AI assistance
# '''Contribute''' by editing agent prompts, adding knowledge pages, or creating new agents

== Page Types ==
* '''[[Special:AllPages?namespace=3000|Agent Pages]]''' — AI expert personas maintained by the community
* '''[[Special:AllPages?namespace=3010|Knowledge Pages]]''' — Reference material that agents can access
* '''[[Special:AllPages?namespace=3020|Skill Pages]]''' — Executable capabilities for agents

== Get Involved ==
* [[MentiSphere:Contributing|How to Contribute]]
* [[MentiSphere:Five_Pillars|Our Five Pillars]]
* [[Special:RecentChanges|Recent Changes]]
```

- [ ] **Step 4: Commit seed files**

```bash
git add seed/
git commit -m "feat: add seed content — sample agents, knowledge pages, and main page"
```

---

## Task 9: Docker Compose — Add PostgreSQL + pgvector

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add postgres service to docker-compose.yml**

Add to services section:

```yaml
  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: mentisphere_chat
      POSTGRES_USER: mentisphere
      POSTGRES_PASSWORD: ${PG_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mentisphere -d mentisphere_chat"]
      interval: 10s
      timeout: 5s
      retries: 5
```

Add `postgres-data:` to the volumes section.

- [ ] **Step 2: Start postgres**

```bash
docker compose up -d postgres
```

Expected: postgres container running, pgvector extension available.

- [ ] **Step 3: Verify pgvector is available**

```bash
docker compose exec postgres psql -U mentisphere -d mentisphere_chat -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extversion FROM pg_extension WHERE extname = 'vector';"
```

Expected: Shows vector extension version (e.g., 0.7.x).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add PostgreSQL with pgvector to Docker Compose"
```

---

## Task 10: Chat Service — Project Setup + DB Schema

**Files:**
- Create: `chat-service/package.json`
- Create: `chat-service/tsconfig.json`
- Create: `chat-service/drizzle.config.ts`
- Create: `chat-service/.env.example`
- Create: `chat-service/Dockerfile`
- Create: `chat-service/src/db/schema.ts`
- Create: `chat-service/src/db/index.ts`
- Create: `chat-service/src/types/index.ts`
- Create: `chat-service/next.config.ts`

Note: After running `drizzle-kit push`, run this raw SQL to create the HNSW index for vector search:

```sql
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);
```

- [ ] **Step 1: Initialize the Next.js project**

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-service
npx create-next-app@latest . --typescript --eslint --tailwind --src-dir --app --no-import-alias --no-turbopack
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-service
npm install drizzle-orm postgres @anthropic-ai/sdk zod
npm install -D drizzle-kit @types/node
```

- [ ] **Step 3: Create drizzle.config.ts**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Create src/db/schema.ts**

```typescript
import { pgTable, uuid, text, integer, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  mwUserId: integer('mw_user_id').notNull(),
  mwUsername: text('mw_username').notNull(),
  agentPageTitle: text('agent_page_title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_sessions_user').on(table.mwUserId),
  index('idx_sessions_agent').on(table.agentPageTitle),
]);

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  rating: text('rating', { enum: ['helpful', 'not_helpful'] }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_messages_session').on(table.sessionId),
]);

// Custom pgvector column type for Drizzle
import { customType } from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string) {
    return JSON.parse(value);
  },
});

export const knowledgeEmbeddings = pgTable('knowledge_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  pageTitle: text('page_title').notNull(),
  pageRevisionId: integer('page_revision_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: vector('embedding').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_embeddings_page').on(table.pageTitle),
  unique('uq_embeddings_chunk').on(table.pageTitle, table.pageRevisionId, table.chunkIndex),
]);

export const agentStats = pgTable('agent_stats', {
  agentPageTitle: text('agent_page_title').primaryKey(),
  totalSessions: integer('total_sessions').default(0).notNull(),
  totalMessages: integer('total_messages').default(0).notNull(),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  notHelpfulCount: integer('not_helpful_count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 5: Create src/db/index.ts**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

- [ ] **Step 6: Create .env.example**

```bash
DATABASE_URL=postgresql://mentisphere:changeme@localhost:5432/mentisphere_chat
MEDIAWIKI_API_URL=http://localhost:8080/api.php
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
CHAT_SERVICE_SECRET=changeme_internal_secret
```

- [ ] **Step 7: Create next.config.ts with standalone output**

`chat-service/next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 8: Create .env.local for development**

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-service
cp .env.example .env.local
# Edit with real values — DATABASE_URL should use docker host or localhost with port mapping
```

- [ ] **Step 9: Generate and run migration**

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-service
# Add postgres port mapping to docker-compose.yml first: "5433:5432"
DATABASE_URL=postgresql://mentisphere:${PG_PASSWORD}@localhost:5433/mentisphere_chat npx drizzle-kit push
```

Then create the HNSW index for vector search:

```bash
docker compose exec postgres psql -U mentisphere -d mentisphere_chat -c "CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);"
```

Expected: Tables created in PostgreSQL with vector index.

- [ ] **Step 10: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 11: Create a health check route**

Create `chat-service/src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'mentisphere-chat' });
}
```

- [ ] **Step 12: Verify the service starts**

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-service
npm run dev
```

Expected: http://localhost:3000/api/health returns `{"status":"ok","service":"mentisphere-chat"}`.

- [ ] **Step 13: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add chat-service/
git commit -m "feat: scaffold chat service with Next.js, Drizzle schema, and PostgreSQL"
```

---

## Task 11: Chat Service — MediaWiki API Client

**Files:**
- Create: `chat-service/src/lib/mediawiki/types.ts`
- Create: `chat-service/src/lib/mediawiki/client.ts`

- [ ] **Step 1: Create types**

`chat-service/src/lib/mediawiki/types.ts`:

```typescript
export interface MWUserInfo {
  id: number;
  name: string;
  anon?: boolean;
}

export interface MWPageContent {
  title: string;
  revisionId: number;
  wikitext: string;
}

export interface MWParseResult {
  title: string;
  revisionId: number;
  text: string; // HTML
  wikitext: string;
}
```

- [ ] **Step 2: Create MediaWiki API client**

`chat-service/src/lib/mediawiki/client.ts`:

```typescript
import type { MWUserInfo, MWPageContent } from './types';

const MW_API_URL = process.env.MEDIAWIKI_API_URL!;

async function mwApiFetch(params: Record<string, string>, cookie?: string): Promise<any> {
  const url = new URL(MW_API_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {};
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const res = await fetch(url.toString(), { headers, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`MediaWiki API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function validateSession(cookie: string): Promise<MWUserInfo | null> {
  try {
    const data = await mwApiFetch({ action: 'query', meta: 'userinfo' }, cookie);
    const userinfo = data.query?.userinfo;
    if (!userinfo || userinfo.anon) {
      return null;
    }
    return { id: userinfo.id, name: userinfo.name };
  } catch {
    return null;
  }
}

export async function getPageContent(pageTitle: string): Promise<MWPageContent | null> {
  try {
    const data = await mwApiFetch({
      action: 'query',
      titles: pageTitle,
      prop: 'revisions',
      rvprop: 'content|ids',
      rvslots: 'main',
    });

    const pages = data.query?.pages;
    if (!pages || pages.length === 0 || pages[0].missing) {
      return null;
    }

    const page = pages[0];
    const revision = page.revisions?.[0];
    if (!revision) return null;

    return {
      title: page.title,
      revisionId: revision.revid,
      wikitext: revision.slots.main.content,
    };
  } catch {
    return null;
  }
}

export function extractSystemPrompt(wikitext: string): string {
  // Extract everything after the template call (the actual prompt content)
  // Remove the {{AgentPage ...}} template block
  const templateEnd = wikitext.indexOf('}}');
  if (templateEnd === -1) return wikitext;

  const promptContent = wikitext.slice(templateEnd + 2).trim();

  // Convert wikitext headers to plain text
  return promptContent
    .replace(/^==\s*(.+?)\s*==$/gm, '$1:')
    .replace(/^===\s*(.+?)\s*===$/gm, '$1:')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1') // [[link|text]] → text
    .replace(/'''(.+?)'''/g, '$1') // bold
    .replace(/''(.+?)''/g, '$1') // italic
    .trim();
}
```

- [ ] **Step 3: Test by fetching a page manually (verify MW API is accessible)**

Add a temporary test to the health route or run via Node REPL:

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-service
# Quick manual test
curl "http://localhost:8080/api.php?action=query&titles=Agent:Medical_Triage&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2"
```

Expected: Returns JSON with the agent page's wikitext content.

- [ ] **Step 4: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add chat-service/src/lib/mediawiki/
git commit -m "feat: add MediaWiki API client — session validation and page content fetching"
```

---

## Task 12: Chat Service — LLM Abstraction + Anthropic Implementation

**Files:**
- Create: `chat-service/src/lib/llm/types.ts`
- Create: `chat-service/src/lib/llm/provider.ts`
- Create: `chat-service/src/lib/llm/anthropic.ts`

- [ ] **Step 1: Create LLM types**

`chat-service/src/lib/llm/types.ts`:

```typescript
export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMStreamEvent {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface LLMProvider {
  stream(params: {
    systemPrompt: string;
    messages: LLMMessage[];
    knowledgeContext?: string;
  }): AsyncIterable<LLMStreamEvent>;
}
```

- [ ] **Step 2: Create Anthropic implementation**

`chat-service/src/lib/llm/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMStreamEvent } from './types';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async *stream(params: {
    systemPrompt: string;
    messages: LLMMessage[];
    knowledgeContext?: string;
  }): AsyncIterable<LLMStreamEvent> {
    let system = params.systemPrompt;
    if (params.knowledgeContext) {
      system += '\n\n---\nRelevant Knowledge:\n' + params.knowledgeContext;
    }

    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages: params.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', text: event.delta.text };
      }
    }

    yield { type: 'done' };
  }
}
```

- [ ] **Step 3: Create provider factory**

`chat-service/src/lib/llm/provider.ts`:

```typescript
import type { LLMProvider } from './types';
import { AnthropicProvider } from './anthropic';

let provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!provider) {
    provider = new AnthropicProvider();
  }
  return provider;
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add chat-service/src/lib/llm/
git commit -m "feat: add LLM abstraction layer with Anthropic Claude implementation"
```

---

## Task 13: Chat Service — Auth Middleware

**Files:**
- Create: `chat-service/src/lib/auth.ts`

- [ ] **Step 1: Create auth helper**

`chat-service/src/lib/auth.ts`:

```typescript
import { NextRequest } from 'next/server';
import { validateSession } from './mediawiki/client';
import type { MWUserInfo } from './mediawiki/types';

export async function authenticateRequest(request: NextRequest): Promise<MWUserInfo | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  return validateSession(cookie);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add chat-service/src/lib/auth.ts
git commit -m "feat: add auth middleware — validates MediaWiki session cookies"
```

---

## Task 14: Chat Service — Sessions + Streaming Messages API

**Files:**
- Create: `chat-service/src/app/api/sessions/route.ts`
- Create: `chat-service/src/app/api/sessions/[id]/messages/route.ts`

- [ ] **Step 1: Create sessions route (POST create, GET list)**

`chat-service/src/app/api/sessions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { getPageContent } from '@/lib/mediawiki/client';
import { agentStats } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const createSessionSchema = z.object({
  agent_page_title: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const page = await getPageContent(parsed.data.agent_page_title);
  if (!page) {
    return NextResponse.json({ error: 'Agent page not found' }, { status: 404 });
  }

  const [session] = await db.insert(chatSessions).values({
    mwUserId: user.id,
    mwUsername: user.name,
    agentPageTitle: parsed.data.agent_page_title,
  }).returning();

  // Increment totalSessions in agent stats
  await db.insert(agentStats).values({
    agentPageTitle: parsed.data.agent_page_title,
    totalSessions: 1,
  }).onConflictDoUpdate({
    target: agentStats.agentPageTitle,
    set: {
      totalSessions: sql`${agentStats.totalSessions} + 1`,
      updatedAt: sql`now()`,
    },
  });

  return NextResponse.json({
    session_id: session.id,
    agent_name: page.title,
  }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agentFilter = request.nextUrl.searchParams.get('agent');

  const conditions = [eq(chatSessions.mwUserId, user.id)];
  if (agentFilter) {
    conditions.push(eq(chatSessions.agentPageTitle, agentFilter));
  }

  const sessions = await db.query.chatSessions.findMany({
    where: (table, { and, eq: e }) => {
      const conds = [e(table.mwUserId, user.id)];
      if (agentFilter) conds.push(e(table.agentPageTitle, agentFilter));
      return and(...conds);
    },
    orderBy: [desc(chatSessions.createdAt)],
  });

  return NextResponse.json({ sessions });
}
```

- [ ] **Step 2: Create streaming messages route**

`chat-service/src/app/api/sessions/[id]/messages/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions, chatMessages, agentStats } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { getPageContent, extractSystemPrompt } from '@/lib/mediawiki/client';
import { getLLMProvider } from '@/lib/llm/provider';
import { eq, asc, sql } from 'drizzle-orm';
import { z } from 'zod';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Load session
  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
  });
  if (!session || session.mwUserId !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Load agent prompt from MediaWiki
  const page = await getPageContent(session.agentPageTitle);
  if (!page) {
    return NextResponse.json({ error: 'Agent page not found' }, { status: 404 });
  }
  const systemPrompt = extractSystemPrompt(page.wikitext);

  // Load conversation history
  const history = await db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: [asc(chatMessages.createdAt)],
  });

  // Save user message
  await db.insert(chatMessages).values({
    sessionId,
    role: 'user',
    content: parsed.data.content,
  });

  // Build message list for LLM
  const llmMessages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: parsed.data.content },
  ];

  // Stream response
  const provider = getLLMProvider();
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.stream({ systemPrompt, messages: llmMessages })) {
          if (event.type === 'text' && event.text) {
            fullResponse += event.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: event.text })}\n\n`));
          } else if (event.type === 'done') {
            // Save assistant message
            const [saved] = await db.insert(chatMessages).values({
              sessionId,
              role: 'assistant',
              content: fullResponse,
            }).returning();

            // Update agent stats
            await db.insert(agentStats).values({
              agentPageTitle: session.agentPageTitle,
              totalSessions: 0,
              totalMessages: 1,
            }).onConflictDoUpdate({
              target: agentStats.agentPageTitle,
              set: {
                totalMessages: sql`${agentStats.totalMessages} + 1`,
                updatedAt: sql`now()`,
              },
            });

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', message_id: saved.id })}\n\n`));
            controller.close();
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
  });
  if (!session || session.mwUserId !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: [asc(chatMessages.createdAt)],
  });

  return NextResponse.json({ messages });
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-service
npm run build
```

Expected: Builds without type errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add chat-service/src/app/api/sessions/
git commit -m "feat: add sessions API — create session, send streaming messages, get history"
```

---

## Task 15: Chat Service — Rate + Stats API

**Files:**
- Create: `chat-service/src/app/api/messages/[id]/rate/route.ts`
- Create: `chat-service/src/app/api/stats/[agentPageTitle]/route.ts`

- [ ] **Step 1: Create rate route**

`chat-service/src/app/api/messages/[id]/rate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages, chatSessions, agentStats } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const rateSchema = z.object({
  rating: z.enum(['helpful', 'not_helpful']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params;

  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Verify message exists and belongs to user's session
  const message = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, message.sessionId),
  });
  if (!session || session.mwUserId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Update rating
  const previousRating = message.rating;
  await db.update(chatMessages)
    .set({ rating: parsed.data.rating })
    .where(eq(chatMessages.id, messageId));

  // Update agent stats
  const increment = parsed.data.rating === 'helpful' ? 'helpful_count' : 'not_helpful_count';
  const decrement = parsed.data.rating === 'helpful' ? 'not_helpful_count' : 'helpful_count';

  if (previousRating === null) {
    // New rating
    await db.update(agentStats)
      .set({
        [increment === 'helpful_count' ? 'helpfulCount' : 'notHelpfulCount']:
          sql`${increment === 'helpful_count' ? agentStats.helpfulCount : agentStats.notHelpfulCount} + 1`,
      })
      .where(eq(agentStats.agentPageTitle, session.agentPageTitle));
  } else if (previousRating !== parsed.data.rating) {
    // Changed rating
    await db.update(agentStats)
      .set({
        helpfulCount: parsed.data.rating === 'helpful'
          ? sql`${agentStats.helpfulCount} + 1`
          : sql`${agentStats.helpfulCount} - 1`,
        notHelpfulCount: parsed.data.rating === 'not_helpful'
          ? sql`${agentStats.notHelpfulCount} + 1`
          : sql`${agentStats.notHelpfulCount} - 1`,
      })
      .where(eq(agentStats.agentPageTitle, session.agentPageTitle));
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create stats route**

`chat-service/src/app/api/stats/[agentPageTitle]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agentStats } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentPageTitle: string }> }
) {
  const { agentPageTitle } = await params;
  const decoded = decodeURIComponent(agentPageTitle);

  const stats = await db.query.agentStats.findFirst({
    where: eq(agentStats.agentPageTitle, decoded),
  });

  if (!stats) {
    return NextResponse.json({
      total_sessions: 0,
      total_messages: 0,
      helpful_count: 0,
      not_helpful_count: 0,
    });
  }

  return NextResponse.json({
    total_sessions: stats.totalSessions,
    total_messages: stats.totalMessages,
    helpful_count: stats.helpfulCount,
    not_helpful_count: stats.notHelpfulCount,
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add chat-service/src/app/api/messages/ chat-service/src/app/api/stats/
git commit -m "feat: add message rating and agent stats API endpoints"
```

---

## Task 16: Chat Widget — Project Setup + Core Components

**Files:**
- Create: `chat-widget/package.json`
- Create: `chat-widget/tsconfig.json`
- Create: `chat-widget/vite.config.ts`
- Create: `chat-widget/src/index.tsx`
- Create: `chat-widget/src/types.ts`
- Create: `chat-widget/src/lib/api.ts`
- Create: `chat-widget/src/hooks/use-chat.ts`
- Create: `chat-widget/src/styles.css`
- Create: `chat-widget/src/App.tsx`
- Create: `chat-widget/src/components/ChatWidget.tsx`
- Create: `chat-widget/src/components/MessageList.tsx`
- Create: `chat-widget/src/components/ChatMessage.tsx`
- Create: `chat-widget/src/components/ChatInput.tsx`
- Create: `chat-widget/src/components/AgentInfoBar.tsx`
- Create: `chat-widget/src/components/StreamingIndicator.tsx`

- [ ] **Step 1: Initialize project**

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-widget
npm init -y
npm install react react-dom marked dompurify
npm install -D typescript @types/react @types/react-dom @types/dompurify vite @vitejs/plugin-react
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'MentiSphereChat',
      fileName: () => 'chat-widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'chat-widget.[ext]',
      },
    },
    cssCodeSplit: false,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
```

- [ ] **Step 4: Create src/types.ts**

```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rating?: 'helpful' | 'not_helpful' | null;
  createdAt: string;
}

export interface ChatSession {
  session_id: string;
  agent_name: string;
}

export interface StreamEvent {
  type: 'text' | 'done' | 'error';
  text?: string;
  message_id?: string;
  error?: string;
}
```

- [ ] **Step 5: Create src/lib/api.ts**

```typescript
import type { ChatSession, ChatMessage } from '../types';

let chatServiceUrl = '';

export function configure(url: string) {
  chatServiceUrl = url.replace(/\/$/, '');
}

export async function createSession(agentPageTitle: string): Promise<ChatSession> {
  const res = await fetch(`${chatServiceUrl}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ agent_page_title: agentPageTitle }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function sendMessage(sessionId: string, content: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${chatServiceUrl}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  if (!res.body) throw new Error('No response body');
  return res.body;
}

export async function rateMessage(messageId: string, rating: 'helpful' | 'not_helpful'): Promise<void> {
  await fetch(`${chatServiceUrl}/messages/${messageId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rating }),
  });
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${chatServiceUrl}/sessions/${sessionId}/messages`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to get messages: ${res.status}`);
  const data = await res.json();
  return data.messages;
}
```

- [ ] **Step 6: Create src/hooks/use-chat.ts**

```typescript
import { useState, useCallback, useRef } from 'react';
import { createSession, sendMessage as apiSendMessage } from '../lib/api';
import type { ChatMessage, StreamEvent } from '../types';

export function useChat(agentPageTitle: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (!sessionIdRef.current) {
      const session = await createSession(agentPageTitle);
      sessionIdRef.current = session.session_id;
    }
    return sessionIdRef.current;
  }, [agentPageTitle]);

  const sendMessage = useCallback(async (content: string) => {
    setError(null);
    setIsStreaming(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Add empty assistant message (will be filled by streaming)
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }]);

    try {
      const sessionId = await ensureSession();
      const stream = await apiSendMessage(sessionId, content);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6)) as StreamEvent;

          if (data.type === 'text' && data.text) {
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + data.text }
                : m
            ));
          } else if (data.type === 'done' && data.message_id) {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, id: data.message_id! } : m
            ));
          } else if (data.type === 'error') {
            setError(data.error || 'Unknown error');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsStreaming(false);
    }
  }, [ensureSession]);

  return { messages, isStreaming, error, sendMessage };
}
```

- [ ] **Step 7: Create src/lib/markdown.ts**

```typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(html);
}
```

- [ ] **Step 8: Create component files**

`chat-widget/src/components/StreamingIndicator.tsx`:

```tsx
export function StreamingIndicator() {
  return (
    <div className="ms-streaming">
      <span></span><span></span><span></span>
    </div>
  );
}
```

`chat-widget/src/components/AgentInfoBar.tsx`:

```tsx
interface Props {
  agentName: string;
  agentPageTitle: string;
}

export function AgentInfoBar({ agentName, agentPageTitle }: Props) {
  const wikiUrl = `/wiki/${agentPageTitle}`;
  return (
    <div className="ms-agent-bar">
      <strong>{agentName}</strong>
      <a href={wikiUrl} target="_top">View Source</a>
    </div>
  );
}
```

`chat-widget/src/components/ChatMessage.tsx`:

```tsx
import { renderMarkdown } from '../lib/markdown';
import { rateMessage } from '../lib/api';
import type { ChatMessage as MessageType } from '../types';
import { useState } from 'react';

interface Props {
  message: MessageType;
}

export function ChatMessage({ message }: Props) {
  const [currentRating, setCurrentRating] = useState(message.rating);

  const handleRate = async (rating: 'helpful' | 'not_helpful') => {
    await rateMessage(message.id, rating);
    setCurrentRating(rating);
  };

  return (
    <div className={`ms-message ms-message-${message.role}`}>
      <div
        className="ms-message-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
      />
      {message.role === 'assistant' && message.content && (
        <div className="ms-message-actions">
          <button
            onClick={() => handleRate('helpful')}
            className={currentRating === 'helpful' ? 'active' : ''}
            title="Helpful"
          >
            &#x1F44D;
          </button>
          <button
            onClick={() => handleRate('not_helpful')}
            className={currentRating === 'not_helpful' ? 'active' : ''}
            title="Not helpful"
          >
            &#x1F44E;
          </button>
        </div>
      )}
    </div>
  );
}
```

`chat-widget/src/components/MessageList.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { StreamingIndicator } from './StreamingIndicator';
import type { ChatMessage as MessageType } from '../types';

interface Props {
  messages: MessageType[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="ms-message-list">
      {messages.length === 0 && (
        <div className="ms-empty">Ask this agent anything.</div>
      )}
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {isStreaming && <StreamingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
```

`chat-widget/src/components/ChatInput.tsx`:

```tsx
import { useState, type FormEvent } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <form className="ms-chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !value.trim()}>Send</button>
    </form>
  );
}
```

`chat-widget/src/components/ChatWidget.tsx`:

```tsx
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { AgentInfoBar } from './AgentInfoBar';
import { useChat } from '../hooks/use-chat';

interface Props {
  agentPageTitle: string;
  agentName: string;
}

export function ChatWidget({ agentPageTitle, agentName }: Props) {
  const { messages, isStreaming, error, sendMessage } = useChat(agentPageTitle);

  return (
    <div className="ms-chat-widget">
      <AgentInfoBar agentName={agentName} agentPageTitle={agentPageTitle} />
      <MessageList messages={messages} isStreaming={isStreaming} />
      {error && <div className="ms-error">{error}</div>}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
```

- [ ] **Step 9: Create src/App.tsx**

```tsx
import { ChatWidget } from './components/ChatWidget';
import { configure } from './lib/api';

interface Props {
  chatServiceUrl: string;
  agentPageTitle: string;
  agentName: string;
}

export function App({ chatServiceUrl, agentPageTitle, agentName }: Props) {
  configure(chatServiceUrl);
  return <ChatWidget agentPageTitle={agentPageTitle} agentName={agentName} />;
}
```

- [ ] **Step 10: Create src/index.tsx (entry point for MW)**

```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Read config from MediaWiki's mw.config
function init() {
  const container = document.getElementById('mentisphere-chat');
  if (!container) return;

  // These are set by the MentiSphereChat extension
  const chatServiceUrl = (window as any).mw?.config?.get('wgMentiSphereChatServiceUrl') || '/chat-api';
  const agentPageTitle = (window as any).mw?.config?.get('wgMentiSphereAgentPage') || '';
  const agentName = agentPageTitle.replace(/^Agent:/, '').replace(/_/g, ' ');

  const root = createRoot(container);
  root.render(<App chatServiceUrl={chatServiceUrl} agentPageTitle={agentPageTitle} agentName={agentName} />);
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 11: Create src/styles.css**

```css
.ms-chat-widget {
  display: flex;
  flex-direction: column;
  height: 500px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #fff;
}

.ms-agent-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
}

.ms-agent-bar a {
  font-size: 12px;
  color: #666;
}

.ms-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.ms-empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.ms-message {
  margin-bottom: 12px;
  max-width: 80%;
}

.ms-message-user {
  margin-left: auto;
}

.ms-message-user .ms-message-content {
  background: #e3f2fd;
  border-radius: 12px 12px 0 12px;
  padding: 8px 14px;
}

.ms-message-assistant .ms-message-content {
  background: #f5f5f5;
  border-radius: 12px 12px 12px 0;
  padding: 8px 14px;
}

.ms-message-content p:first-child { margin-top: 0; }
.ms-message-content p:last-child { margin-bottom: 0; }
.ms-message-content code {
  background: #e8e8e8;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}
.ms-message-content pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
}

.ms-message-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.ms-message-actions button {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  opacity: 0.5;
}

.ms-message-actions button:hover { opacity: 1; }
.ms-message-actions button.active {
  opacity: 1;
  border-color: #ddd;
  background: #f0f0f0;
}

.ms-streaming span {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 2px;
  background: #999;
  border-radius: 50%;
  animation: ms-bounce 1.4s infinite ease-in-out;
}
.ms-streaming span:nth-child(1) { animation-delay: -0.32s; }
.ms-streaming span:nth-child(2) { animation-delay: -0.16s; }

@keyframes ms-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.ms-error {
  padding: 8px 14px;
  background: #ffebee;
  color: #c62828;
  font-size: 13px;
}

.ms-chat-input {
  display: flex;
  border-top: 1px solid #ddd;
  padding: 10px;
}

.ms-chat-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
  font-size: 14px;
}

.ms-chat-input input:focus { border-color: #2196f3; }

.ms-chat-input button {
  margin-left: 8px;
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
}

.ms-chat-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

- [ ] **Step 12: Build the widget**

```bash
cd /Users/francescovillano/Projects/mentisphere/chat-widget
npx vite build
```

Expected: `dist/chat-widget.js` and `dist/chat-widget.css` generated.

- [ ] **Step 13: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add chat-widget/
git commit -m "feat: build chat widget — React micro-app with streaming, markdown, and ratings"
```

---

## Task 17: MentiSphereChat MediaWiki Extension

**Files:**
- Create: `mediawiki/extensions/MentiSphereChat/extension.json`
- Create: `mediawiki/extensions/MentiSphereChat/includes/MentiSphereChatHooks.php`
- Create: `mediawiki/extensions/MentiSphereChat/modules/ext.mentisphere.chat/chat-loader.js`
- Create: `mediawiki/extensions/MentiSphereChat/modules/ext.mentisphere.chat/chat-loader.css`
- Create: `mediawiki/extensions/MentiSphereChat/i18n/en.json`
- Modify: `mediawiki/LocalSettings.php`

- [ ] **Step 1: Create extension.json**

`mediawiki/extensions/MentiSphereChat/extension.json`:

```json
{
	"name": "MentiSphereChat",
	"version": "0.1.0",
	"author": ["MentiSphere Contributors"],
	"url": "https://github.com/mentisphere",
	"descriptionmsg": "mentispherechat-desc",
	"license-name": "MIT",
	"type": "other",
	"requires": {
		"MediaWiki": ">= 1.42"
	},
	"AutoloadClasses": {
		"MentiSphereChatHooks": "includes/MentiSphereChatHooks.php"
	},
	"Hooks": {
		"SkinTemplateNavigation::Universal": "MentiSphereChatHooks::onSkinTemplateNavigation",
		"BeforePageDisplay": "MentiSphereChatHooks::onBeforePageDisplay",
		"PageSaveComplete": "MentiSphereChatHooks::onPageSaveComplete"
	},
	"config": {
		"MentiSphereChatServiceUrl": {
			"value": "/chat-api",
			"description": "URL of the MentiSphere chat service API"
		},
		"MentiSphereChatAssetsUrl": {
			"value": "/chat-assets",
			"description": "URL where chat widget JS/CSS are served"
		},
		"MentiSphereChatServiceSecret": {
			"value": "",
			"description": "Shared secret for internal chat service API calls"
		}
	},
	"ResourceModules": {
		"ext.mentisphere.chat": {
			"scripts": ["modules/ext.mentisphere.chat/chat-loader.js"],
			"styles": ["modules/ext.mentisphere.chat/chat-loader.css"]
		}
	},
	"ResourceFileModulePaths": {
		"localBasePath": "",
		"remoteExtPath": "MentiSphereChat"
	},
	"MessagesDirs": {
		"MentiSphereChat": ["i18n"]
	},
	"manifest_version": 2
}
```

- [ ] **Step 2: Create MentiSphereChatHooks.php**

`mediawiki/extensions/MentiSphereChat/includes/MentiSphereChatHooks.php`:

```php
<?php

class MentiSphereChatHooks {

	/**
	 * Add "Chat" tab to Agent pages
	 */
	public static function onSkinTemplateNavigation( $skinTemplate, &$links ) {
		$title = $skinTemplate->getTitle();
		if ( $title->getNamespace() === NS_AGENT ) {
			$links['namespaces']['chat'] = [
				'text' => wfMessage( 'mentispherechat-tab' )->text(),
				'href' => $title->getLocalURL() . '#mentisphere-chat',
				'class' => '',
			];
		}
	}

	/**
	 * Trigger embedding sync when Knowledge pages are saved
	 */
	public static function onPageSaveComplete( $wikiPage, $user, $summary, $flags, $revisionRecord, $editResult ) {
		$title = $wikiPage->getTitle();
		if ( $title->getNamespace() !== NS_KNOWLEDGE ) {
			return;
		}

		$config = MediaWiki\MediaWikiServices::getInstance()->getMainConfig();
		$chatServiceUrl = $config->get( 'MentiSphereChatServiceUrl' );
		$secret = $config->get( 'MentiSphereChatServiceSecret' );

		// Fire and forget — don't block the page save
		$url = $chatServiceUrl . '/embeddings/sync';
		$data = json_encode( [ 'page_title' => $title->getPrefixedText() ] );

		$options = [
			'method' => 'POST',
			'timeout' => 5,
			'postData' => $data,
		];
		$req = MediaWiki\Http\HttpRequestFactory::singleton()->create( $url, $options );
		$req->setHeader( 'Content-Type', 'application/json' );
		$req->setHeader( 'X-Service-Secret', $secret );
		$req->execute();
	}

	/**
	 * Inject chat widget on Agent pages
	 */
	public static function onBeforePageDisplay( $out, $skin ) {
		$title = $out->getTitle();
		if ( $title->getNamespace() !== NS_AGENT ) {
			return;
		}

		$config = $out->getConfig();
		$chatServiceUrl = $config->get( 'MentiSphereChatServiceUrl' );
		$chatAssetsUrl = $config->get( 'MentiSphereChatAssetsUrl' );

		$out->addJsConfigVars( [
			'wgMentiSphereChatServiceUrl' => $chatServiceUrl,
			'wgMentiSphereAgentPage' => $title->getPrefixedText(),
			'wgMentiSphereChatAssetsUrl' => $chatAssetsUrl,
		] );

		$out->addModules( 'ext.mentisphere.chat' );
	}
}
```

- [ ] **Step 3: Create chat-loader.js**

This script loads the external chat widget bundle into the page.

`mediawiki/extensions/MentiSphereChat/modules/ext.mentisphere.chat/chat-loader.js`:

```javascript
( function () {
	'use strict';

	var assetsUrl = mw.config.get( 'wgMentiSphereChatAssetsUrl' );
	if ( !assetsUrl ) return;

	// Create chat container
	var container = document.createElement( 'div' );
	container.id = 'mentisphere-chat';
	var content = document.getElementById( 'mw-content-text' );
	if ( content ) {
		content.appendChild( container );
	}

	// Load chat widget CSS
	var link = document.createElement( 'link' );
	link.rel = 'stylesheet';
	link.href = assetsUrl + '/chat-widget.css';
	document.head.appendChild( link );

	// Load chat widget JS
	var script = document.createElement( 'script' );
	script.src = assetsUrl + '/chat-widget.js';
	document.body.appendChild( script );
}() );
```

- [ ] **Step 4: Create chat-loader.css**

`mediawiki/extensions/MentiSphereChat/modules/ext.mentisphere.chat/chat-loader.css`:

```css
#mentisphere-chat {
	margin-top: 20px;
}
```

- [ ] **Step 5: Create i18n/en.json**

`mediawiki/extensions/MentiSphereChat/i18n/en.json`:

```json
{
	"@metadata": {
		"authors": ["MentiSphere Contributors"]
	},
	"mentispherechat-desc": "Embeds the MentiSphere AI chat widget on Agent pages",
	"mentispherechat-tab": "Chat"
}
```

- [ ] **Step 6: Enable extension in LocalSettings.php**

Append to `mediawiki/LocalSettings.php`:

```php
# MentiSphere Chat Extension
wfLoadExtension( 'MentiSphereChat' );
$wgMentiSphereChatServiceUrl = '/chat-api';
$wgMentiSphereChatAssetsUrl = '/chat-assets';
$wgMentiSphereChatServiceSecret = getenv( 'CHAT_SERVICE_SECRET' ) ?: '';
```

- [ ] **Step 7: Restart MediaWiki and verify**

```bash
docker compose restart mediawiki
```

Navigate to an Agent page (e.g., http://localhost:8080/wiki/Agent:Medical_Triage). Should see a "Chat" tab and the chat container div at the bottom.

- [ ] **Step 8: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add mediawiki/extensions/MentiSphereChat/ mediawiki/LocalSettings.php
git commit -m "feat: add MentiSphereChat MediaWiki extension — Chat tab and widget embedding"
```

---

## Task 18: Nginx Reverse Proxy + Wire Everything Together

**Files:**
- Create: `nginx/nginx.conf`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Create nginx.conf**

`nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream mediawiki {
        server mediawiki:80;
    }

    upstream chat_service {
        server chat-service:3000;
    }

    server {
        listen 80;
        server_name localhost;

        client_max_body_size 10m;

        # Chat service API
        location /chat-api/ {
            proxy_pass http://chat_service/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Connection '';
            proxy_buffering off;
            proxy_cache off;
            chunked_transfer_encoding off;
        }

        # Chat widget static assets
        location /chat-assets/ {
            proxy_pass http://chat_service/assets/;
            proxy_set_header Host $host;
            expires 1h;
        }

        # MediaWiki — everything else
        location / {
            proxy_pass http://mediawiki;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

- [ ] **Step 2: Add nginx and chat-service to docker-compose.yml**

Add to services:

```yaml
  chat-service:
    build: ./chat-service
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://mentisphere:${PG_PASSWORD}@postgres:5432/mentisphere_chat
      MEDIAWIKI_API_URL: http://mediawiki:80/api.php
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      CHAT_SERVICE_SECRET: ${CHAT_SERVICE_SECRET}

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - mediawiki
      - chat-service
```

Update mediawiki service to remove the direct port mapping (nginx handles it now):

```yaml
  mediawiki:
    # Remove: ports: - "8080:80"
    # Keep everything else
```

- [ ] **Step 3: Configure chat service to serve widget assets**

Add a static file route in the chat service to serve the built chat widget from `chat-widget/dist/`. The simplest approach: mount the dist folder and serve via Next.js `public/` or a custom route.

Add to chat-service in docker-compose.yml volumes:

```yaml
    volumes:
      - ./chat-widget/dist:/app/public/assets
```

- [ ] **Step 4: Rebuild and start everything**

```bash
cd /Users/francescovillano/Projects/mentisphere
cd chat-widget && npx vite build && cd ..
docker compose up -d --build
```

- [ ] **Step 5: Verify end-to-end**

1. http://localhost — should show MediaWiki
2. http://localhost/chat-api/health — should return `{"status":"ok"}`
3. http://localhost/chat-assets/chat-widget.js — should serve the widget JS
4. Navigate to an Agent page — should see chat widget embedded

- [ ] **Step 6: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add nginx/ docker-compose.yml
git commit -m "feat: add Nginx reverse proxy, wire MediaWiki + chat service + widget together"
```

---

## Task 19: RAG Pipeline — Embeddings Sync

**Files:**
- Create: `chat-service/src/lib/rag/chunker.ts`
- Create: `chat-service/src/lib/rag/embeddings.ts`
- Create: `chat-service/src/lib/rag/retrieval.ts`
- Create: `chat-service/src/app/api/embeddings/sync/route.ts`
- Modify: `chat-service/src/app/api/sessions/[id]/messages/route.ts` (add RAG retrieval)

- [ ] **Step 1: Create chunker**

`chat-service/src/lib/rag/chunker.ts`:

```typescript
export interface TextChunk {
  index: number;
  text: string;
}

export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): TextChunk[] {
  const chunks: TextChunk[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  let index = 0;

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length > maxChunkSize && current.length > 0) {
      chunks.push({ index, text: current.trim() });
      index++;
      // Keep overlap from end of current chunk
      const words = current.split(' ');
      const overlapWords = [];
      let overlapLen = 0;
      for (let i = words.length - 1; i >= 0 && overlapLen < overlap; i--) {
        overlapWords.unshift(words[i]);
        overlapLen += words[i].length + 1;
      }
      current = overlapWords.join(' ') + '\n\n' + paragraph;
    } else {
      current += (current ? '\n\n' : '') + paragraph;
    }
  }

  if (current.trim()) {
    chunks.push({ index, text: current.trim() });
  }

  return chunks;
}
```

- [ ] **Step 2: Create embeddings generator**

`chat-service/src/lib/rag/embeddings.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function generateEmbedding(text: string): Promise<number[]> {
  // Using OpenAI's text-embedding-3-small (1536 dimensions, matches our vector(1536) schema)
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
```

- [ ] **Step 3: Create retrieval**

`chat-service/src/lib/rag/retrieval.ts`:

```typescript
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { generateEmbedding } from './embeddings';

export interface RetrievedChunk {
  pageTitle: string;
  chunkText: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  query: string,
  pageTitles: string[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (pageTitles.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Use parameterized query for page titles to prevent SQL injection
  const result = await db.execute(
    sql`SELECT page_title, chunk_text,
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM knowledge_embeddings
        WHERE page_title = ANY(${pageTitles})
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${topK}`
  );

  return (result.rows as any[]).map(row => ({
    pageTitle: row.page_title,
    chunkText: row.chunk_text,
    similarity: row.similarity,
  }));
}
```

- [ ] **Step 4: Create embeddings sync endpoint**

`chat-service/src/app/api/embeddings/sync/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { knowledgeEmbeddings } from '@/db/schema';
import { getPageContent } from '@/lib/mediawiki/client';
import { chunkText } from '@/lib/rag/chunker';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const syncSchema = z.object({
  page_title: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // Validate internal secret
  const secret = request.headers.get('x-service-secret');
  if (secret !== process.env.CHAT_SERVICE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const page = await getPageContent(parsed.data.page_title);
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // Remove old embeddings for this page
  await db.delete(knowledgeEmbeddings)
    .where(eq(knowledgeEmbeddings.pageTitle, parsed.data.page_title));

  // Chunk and embed
  const chunks = chunkText(page.wikitext);

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);

    await db.insert(knowledgeEmbeddings).values({
      pageTitle: parsed.data.page_title,
      pageRevisionId: page.revisionId,
      chunkIndex: chunk.index,
      chunkText: chunk.text,
      embedding: `[${embedding.join(',')}]`,
    });
  }

  return NextResponse.json({
    success: true,
    chunks_embedded: chunks.length,
    revision_id: page.revisionId,
  });
}
```

- [ ] **Step 5: Integrate RAG into the chat streaming route**

Modify `chat-service/src/app/api/sessions/[id]/messages/route.ts` — in the POST handler, after loading the agent page and before calling the LLM, add knowledge retrieval:

```typescript
// After: const systemPrompt = extractSystemPrompt(page.wikitext);
// Add:

// Extract knowledge dependencies from agent page template
import { retrieveRelevantChunks } from '@/lib/rag/retrieval';

// Parse knowledge_deps from wikitext (e.g., "Knowledge:Pharmacology, Knowledge:Emergency_Protocols")
function extractKnowledgeDeps(wikitext: string): string[] {
  const match = wikitext.match(/\|\s*knowledge_deps\s*=\s*([^\n|]+)/);
  if (!match) return [];
  return match[1].split(',').map(d => d.trim()).filter(Boolean);
}

const knowledgeDeps = extractKnowledgeDeps(page.wikitext);
let knowledgeContext: string | undefined;

if (knowledgeDeps.length > 0) {
  const chunks = await retrieveRelevantChunks(parsed.data.content, knowledgeDeps);
  if (chunks.length > 0) {
    knowledgeContext = chunks.map(c => `[${c.pageTitle}]\n${c.chunkText}`).join('\n\n---\n\n');
  }
}

// Then pass knowledgeContext to the LLM:
// provider.stream({ systemPrompt, messages: llmMessages, knowledgeContext })
```

- [ ] **Step 6: Commit**

```bash
cd /Users/francescovillano/Projects/mentisphere
git add chat-service/src/lib/rag/ chat-service/src/app/api/embeddings/
git commit -m "feat: add RAG pipeline — chunking, embeddings, retrieval, and sync endpoint"
```

---

## Task 20: End-to-End Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Ensure all services are running**

```bash
cd /Users/francescovillano/Projects/mentisphere
docker compose up -d --build
docker compose ps
```

Expected: All services (nginx, mediawiki, mariadb, postgres, chat-service) running.

- [ ] **Step 2: Verify MediaWiki**

Navigate to http://localhost — should show MentiSphere wiki with Citizen skin. Check:
- Main Page renders
- Agent:Medical_Triage page exists with template infobox
- "Chat" tab visible on agent pages
- Search works
- Can create an account and edit a page

- [ ] **Step 3: Verify chat service health**

```bash
curl http://localhost/chat-api/health
```

Expected: `{"status":"ok","service":"mentisphere-chat"}`

- [ ] **Step 4: Test chat end-to-end**

Log into MediaWiki, navigate to an agent page, and use the chat widget. Verify:
- Chat session creates
- Message sends
- Response streams back
- Rating buttons work

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end smoke test fixes"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Git repo + scaffolding | None |
| 2 | Docker Compose — MediaWiki + MariaDB | 1 |
| 3 | Install Citizen skin | 2 |
| 4 | Register custom namespaces | 2 |
| 5 | Install core extensions | 3, 4 |
| 6 | Agent page Lua template | 5 |
| 7 | Knowledge + Skill page templates | 5 |
| 8 | Seed content | 6, 7 |
| 9 | Docker Compose — PostgreSQL + pgvector | 2 |
| 10 | Chat service — project setup + DB schema | 9 |
| 11 | Chat service — MediaWiki API client | 10 |
| 12 | Chat service — LLM abstraction | 10 |
| 13 | Chat service — auth middleware | 11 |
| 14 | Chat service — sessions + streaming API | 11, 12, 13 |
| 15 | Chat service — rate + stats API | 14 |
| 16 | Chat widget — all components | None (independent) |
| 17 | MentiSphereChat MW extension | 4 |
| 18 | Nginx + wire everything | 14, 16, 17 |
| 19 | RAG pipeline | 14 |
| 20 | End-to-end smoke test | All |

**Parallelizable:** Tasks 3+4 together, 6+7 together, 11+12 together, 16 independent of 10-15.
