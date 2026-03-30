"""
MentiSphere Full Platform E2E Tests
Tests all features: wiki pages, templates, search, editing, chat widget, AI streaming, and RAG.
Run via: source /tmp/pw-venv/bin/activate && python tests/e2e_full_platform.py
"""

import sys
import re
import json
import urllib.request
import urllib.parse
import http.cookiejar
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:8080"
NGINX_URL = "http://localhost"
CHAT_API = "http://localhost/chat-api"
ADMIN_USER = "Admin"
ADMIN_PASS = "Admin12345!"

results = []


def test(name):
    def decorator(func):
        def wrapper(page):
            try:
                func(page)
                results.append(("PASS", name))
                print(f"  PASS  {name}")
            except Exception as e:
                results.append(("FAIL", name, str(e)))
                print(f"  FAIL  {name}")
                print(f"        {e}")
                safe = name.replace(" ", "_").replace("/", "_")[:50]
                try:
                    page.screenshot(path=f"/tmp/fail_{safe}.png")
                except:
                    pass
        wrapper._test_name = name
        return wrapper
    return decorator


# ─── HELPER: MW API client ───────────────────────────────────

class MWClient:
    def __init__(self):
        self.cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        self.csrf = None

    def login(self):
        data = json.loads(self.opener.open(f"{BASE_URL}/api.php?action=query&meta=tokens&type=login&format=json").read())
        token = data["query"]["tokens"]["logintoken"]
        post = urllib.parse.urlencode({"action": "login", "lgname": ADMIN_USER, "lgpassword": ADMIN_PASS, "lgtoken": token, "format": "json"}).encode()
        json.loads(self.opener.open(f"{BASE_URL}/api.php", post).read())
        data = json.loads(self.opener.open(f"{BASE_URL}/api.php?action=query&meta=tokens&format=json").read())
        self.csrf = data["query"]["tokens"]["csrftoken"]

    def edit_page(self, title, text, summary="test"):
        if not self.csrf:
            self.login()
        post = urllib.parse.urlencode({"action": "edit", "title": title, "text": text, "summary": summary, "token": self.csrf, "format": "json"}).encode()
        result = json.loads(self.opener.open(f"{BASE_URL}/api.php", post).read())
        return result.get("edit", {}).get("result") == "Success"

    def get_cookies_string(self):
        return "; ".join(f"{c.name}={c.value}" for c in self.cj)


mw = MWClient()


# ═══════════════════════════════════════════════════════════════
# SECTION 1: WIKI CORE
# ═══════════════════════════════════════════════════════════════

@test("1.1 Homepage loads — no PHP errors, Citizen skin active")
def test_homepage(page):
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    expect(page.locator("html")).to_have_class(re.compile(r"citizen"))
    expect(page).to_have_title(re.compile(r"MentiSphere"))
    content = page.content()
    assert "Warning:" not in content, "PHP warning found on homepage"
    assert "Fatal" not in content, "PHP fatal error on homepage"


@test("1.2 Main Page shows featured agents and working links")
def test_main_page(page):
    page.goto(BASE_URL + "/index.php?title=Main_Page")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text")
    expect(content).to_contain_text("Medical Triage Agent")
    expect(content).to_contain_text("Recipe Advisor")
    expect(content).to_contain_text("Agent Pages")
    expect(content).to_contain_text("Knowledge Pages")
    expect(content).to_contain_text("Skill Pages")


@test("1.3 Main Page 'Agent Pages' link works")
def test_main_page_agent_link(page):
    page.goto(BASE_URL + "/index.php?title=Main_Page")
    page.wait_for_load_state("networkidle")
    page.locator("a", has_text="Agent Pages").click()
    page.wait_for_load_state("networkidle")
    expect(page).to_have_title(re.compile(r"All pages.*Agent"))
    content = page.locator("#mw-content-text")
    expect(content).to_contain_text("Medical Triage")


@test("1.4 Main Page 'Knowledge Pages' link works")
def test_main_page_knowledge_link(page):
    page.goto(BASE_URL + "/index.php?title=Main_Page")
    page.wait_for_load_state("networkidle")
    page.locator("a", has_text="Knowledge Pages").click()
    page.wait_for_load_state("networkidle")
    expect(page).to_have_title(re.compile(r"All pages.*Knowledge"))


@test("1.5 Main Page 'Skill Pages' link works")
def test_main_page_skill_link(page):
    page.goto(BASE_URL + "/index.php?title=Main_Page")
    page.wait_for_load_state("networkidle")
    page.locator("a", has_text="Skill Pages").click()
    page.wait_for_load_state("networkidle")
    expect(page).to_have_title(re.compile(r"All pages.*Skill"))


# ═══════════════════════════════════════════════════════════════
# SECTION 2: AGENT PAGES
# ═══════════════════════════════════════════════════════════════

@test("2.1 Agent:Medical_Triage loads with Lua infobox")
def test_agent_medical(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    infobox = page.locator(".agent-infobox")
    expect(infobox).to_be_visible()
    expect(infobox).to_contain_text("Medical Triage Agent")
    expect(infobox).to_contain_text("START")
    expect(infobox).to_contain_text("Domain:")
    expect(infobox).to_contain_text("Medical")


@test("2.2 Agent infobox shows knowledge dependency link")
def test_agent_knowledge_dep(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    infobox = page.locator(".agent-infobox")
    expect(infobox).to_contain_text("Knowledge:Pharmacology_Basics")


@test("2.3 Agent infobox shows known limitations")
def test_agent_limitations(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    expect(page.locator(".agent-infobox")).to_contain_text("Known Limitations:")


@test("2.4 Agent page has Identity/Steps/Output sections")
def test_agent_sections(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text")
    expect(content).to_contain_text("Identity and Purpose")
    expect(content).to_contain_text("Steps")
    expect(content).to_contain_text("Output")


@test("2.5 Agent:Recipe_Advisor loads with correct domain")
def test_agent_recipe(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Recipe_Advisor")
    page.wait_for_load_state("networkidle")
    infobox = page.locator(".agent-infobox")
    expect(infobox).to_be_visible()
    expect(infobox).to_contain_text("Recipe Advisor")
    expect(infobox).to_contain_text("Cooking")


@test("2.6 Agent page has Chat tab in navigation")
def test_agent_chat_tab(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    assert "Chat" in page.content(), "Chat tab not found on agent page"


@test("2.7 Agent page has Edit, View history, Discussion tabs")
def test_agent_tabs(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "Edit" in content, "Edit tab not found"
    assert "View history" in content or "history" in content.lower(), "View history not found"
    assert "Discussion" in content or "Talk" in content, "Discussion tab not found"


# ═══════════════════════════════════════════════════════════════
# SECTION 3: KNOWLEDGE PAGES
# ═══════════════════════════════════════════════════════════════

@test("3.1 Knowledge:Pharmacology_Basics loads with green infobox")
def test_knowledge_page(page):
    page.goto(BASE_URL + "/index.php?title=Knowledge:Pharmacology_Basics")
    page.wait_for_load_state("networkidle")
    infobox = page.locator(".knowledge-infobox")
    expect(infobox).to_be_visible()
    expect(infobox).to_contain_text("KNOWLEDGE")
    expect(infobox).to_contain_text("Pharmacology Basics")
    expect(infobox).to_contain_text("Medical")


@test("3.2 Knowledge page has drug categories content")
def test_knowledge_content(page):
    page.goto(BASE_URL + "/index.php?title=Knowledge:Pharmacology_Basics")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text")
    expect(content).to_contain_text("Analgesics")
    expect(content).to_contain_text("Antihistamines")
    expect(content).to_contain_text("Acetaminophen")


# ═══════════════════════════════════════════════════════════════
# SECTION 4: NAMESPACES & CATEGORIES
# ═══════════════════════════════════════════════════════════════

@test("4.1 Custom namespaces in AllPages dropdown")
def test_namespaces(page):
    page.goto(BASE_URL + "/index.php?title=Special:AllPages")
    page.wait_for_load_state("networkidle")
    ns_select = page.locator("select").first
    options = ns_select.inner_text()
    assert "Agent" in options, f"Agent not in namespace dropdown"
    assert "Knowledge" in options, f"Knowledge not in namespace dropdown"
    assert "Skill" in options, f"Skill not in namespace dropdown"


@test("4.2 Category:Agents lists all agents")
def test_category_agents(page):
    page.goto(BASE_URL + "/index.php?title=Category:Agents")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text").inner_text()
    assert "Medical Triage" in content, "Medical Triage not in Agents category"
    assert "Recipe Advisor" in content, "Recipe Advisor not in Agents category"


@test("4.3 Category:Medical lists medical pages")
def test_category_medical(page):
    page.goto(BASE_URL + "/index.php?title=Category:Medical")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text").inner_text()
    assert "Medical Triage" in content, "Medical Triage not in Medical category"


@test("4.4 Missing agent page shows create option")
def test_missing_page(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Does_Not_Exist")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "noarticletext" in content or "create" in content.lower(), "No create option for missing page"


# ═══════════════════════════════════════════════════════════════
# SECTION 5: SEARCH
# ═══════════════════════════════════════════════════════════════

@test("5.1 Search works — no 500 error")
def test_search_works(page):
    page.goto(BASE_URL + "/index.php?title=Special:Search&search=Medical&fulltext=1")
    page.wait_for_load_state("networkidle")
    assert "Internal error" not in page.content(), "Search returned internal error"
    assert "Fatal" not in page.content(), "Search returned fatal error"
    expect(page).to_have_title(re.compile(r"Search"))


@test("5.2 Search finds Agent pages in default results")
def test_search_finds_agents(page):
    page.goto(BASE_URL + "/index.php?title=Special:Search&search=Medical+Triage&fulltext=1")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "Agent:Medical Triage" in content or "Agent:Medical_Triage" in content, \
        "Agent:Medical_Triage not found in search results"


@test("5.3 Search finds Knowledge pages")
def test_search_finds_knowledge(page):
    page.goto(BASE_URL + "/index.php?title=Special:Search&search=Pharmacology&fulltext=1")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "Pharmacology" in content, "Pharmacology not found in search results"


@test("5.4 Search autocomplete suggests agent pages")
def test_search_autocomplete(page):
    page.goto(BASE_URL + "/index.php?title=Main_Page")
    page.wait_for_load_state("networkidle")
    page.locator(".citizen-header__logo").click()
    page.wait_for_timeout(500)
    # Click search icon
    page.locator(".citizen-search-toggle, [class*=search]").first.click()
    page.wait_for_timeout(500)
    page.keyboard.type("recipe")
    page.wait_for_timeout(1000)
    content = page.content()
    assert "Recipe" in content, "Recipe not found in autocomplete suggestions"


# ═══════════════════════════════════════════════════════════════
# SECTION 6: USER AUTH & EDITING
# ═══════════════════════════════════════════════════════════════

@test("6.1 Login page loads")
def test_login_page(page):
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    expect(page.locator("#wpName1")).to_be_visible()
    expect(page.locator("#wpPassword1")).to_be_visible()


@test("6.2 Login works for Admin")
def test_login(page):
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")
    assert "Admin" in page.content(), "Login failed — Admin not found in page"


@test("6.3 Edit page shows source editor with wikitext")
def test_edit_page(page):
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage&action=edit")
    page.wait_for_load_state("networkidle")
    textarea = page.locator("#wpTextbox1")
    expect(textarea).to_be_visible()
    assert "AgentPage" in textarea.input_value(), "Template not found in edit textarea"


@test("6.4 Page history shows revisions")
def test_history(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage&action=history")
    page.wait_for_load_state("networkidle")
    expect(page.locator("#mw-content-text")).to_contain_text("Admin")


@test("6.5 Create agent page via API and verify rendering")
def test_create_agent(page):
    wikitext = """{{AgentPage
| name = E2E Full Test Agent
| domain = Testing
| maturity = stub
| description = Created by full E2E test suite.
| knowledge_deps =
| skill_deps =
| known_limitations = Test only.
}}

== Identity and Purpose ==
You are a test agent.

== Steps ==
1. Respond to queries.

== Output ==
Respond clearly.
"""
    assert mw.edit_page("Agent:E2E_Full_Test", wikitext, "E2E full test"), "Failed to create page via API"
    page.goto(BASE_URL + "/index.php?title=Agent:E2E_Full_Test")
    page.wait_for_load_state("networkidle")
    infobox = page.locator(".agent-infobox")
    expect(infobox).to_be_visible()
    expect(infobox).to_contain_text("E2E Full Test Agent")
    expect(infobox).to_contain_text("STUB")


@test("6.6 Talk page accessible for agent pages")
def test_talk_page(page):
    page.goto(BASE_URL + "/index.php?title=Agent_talk:Medical_Triage")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "Agent talk" in content or "noarticletext" in content or "create" in content.lower(), \
        "Talk page did not load"


@test("6.7 Watchlist page loads for logged-in user")
def test_watchlist(page):
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")
    page.goto(BASE_URL + "/index.php?title=Special:Watchlist")
    page.wait_for_load_state("networkidle")
    assert "Watchlist" in page.content() or "watchlist" in page.content(), "Watchlist didn't load"


@test("6.8 Recent changes shows activity")
def test_recent_changes(page):
    page.goto(BASE_URL + "/index.php?title=Special:RecentChanges")
    page.wait_for_load_state("networkidle")
    assert "Recent changes" in page.content(), "Recent changes page didn't load"


@test("6.9 User contributions page works")
def test_contributions(page):
    page.goto(BASE_URL + "/index.php?title=Special:Contributions/Admin")
    page.wait_for_load_state("networkidle")
    assert "Contributions" in page.content() or "Admin" in page.content(), "Contributions page didn't load"


# ═══════════════════════════════════════════════════════════════
# SECTION 7: CHAT WIDGET (via Nginx)
# ═══════════════════════════════════════════════════════════════

@test("7.1 Chat widget container injected on agent page (via nginx)")
def test_chat_container(page):
    page.goto(NGINX_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)
    container = page.locator("#mentisphere-chat")
    expect(container).to_be_attached()


@test("7.2 Chat widget renders input and send button")
def test_chat_widget_ui(page):
    page.goto(NGINX_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)
    expect(page.locator(".ms-chat-widget")).to_be_visible()
    expect(page.locator(".ms-chat-input input")).to_be_visible()
    expect(page.locator(".ms-chat-input button")).to_be_visible()


@test("7.3 Chat widget shows agent name and View Source link")
def test_chat_agent_bar(page):
    page.goto(NGINX_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)
    agent_bar = page.locator(".ms-agent-bar")
    expect(agent_bar).to_be_visible()
    expect(agent_bar).to_contain_text("Medical Triage")
    expect(agent_bar.locator("a")).to_have_attribute("href", re.compile(r"Agent.Medical.Triage"))


@test("7.4 Chat widget not injected on non-agent pages")
def test_chat_not_on_knowledge(page):
    page.goto(NGINX_URL + "/index.php?title=Knowledge:Pharmacology_Basics")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    assert page.locator("#mentisphere-chat").count() == 0, "Chat widget should not appear on Knowledge pages"


# ═══════════════════════════════════════════════════════════════
# SECTION 8: CHAT SERVICE API
# ═══════════════════════════════════════════════════════════════

@test("8.1 Chat API health endpoint responds")
def test_chat_health(page):
    page.goto(CHAT_API + "/health")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "mentisphere-chat" in content, f"Health check failed: {content[:200]}"


@test("8.2 Chat API stats endpoint returns valid JSON")
def test_chat_stats(page):
    page.goto(CHAT_API + "/stats/Agent%3AMedical_Triage")
    page.wait_for_load_state("networkidle")
    content = page.locator("body").inner_text()
    data = json.loads(content)
    assert "total_sessions" in data, f"Stats missing total_sessions: {data}"
    assert "total_messages" in data, f"Stats missing total_messages: {data}"


@test("8.3 Chat API sessions endpoint requires auth (returns 401 without cookies)")
def test_chat_auth_required(page):
    # Use a fresh context without MW cookies
    import urllib.request as ur
    req = ur.Request(CHAT_API + "/sessions", data=json.dumps({"agent_page_title": "Agent:Medical_Triage"}).encode(), headers={"Content-Type": "application/json"}, method="POST")
    try:
        resp = ur.urlopen(req)
        assert False, f"Expected 401, got {resp.status}"
    except ur.HTTPError as e:
        assert e.code == 401, f"Expected 401, got {e.code}"


# ═══════════════════════════════════════════════════════════════
# SECTION 9: AI CHAT (end-to-end with OpenAI)
# ═══════════════════════════════════════════════════════════════

@test("9.1 Create chat session via API (authenticated)")
def test_create_session(page):
    # Login to MediaWiki first to get session cookies
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")

    # Now create session through nginx (cookies forwarded)
    resp = page.request.post(CHAT_API + "/sessions", data=json.dumps({"agent_page_title": "Agent:Medical_Triage"}), headers={"Content-Type": "application/json"})
    assert resp.status == 201, f"Expected 201, got {resp.status}: {resp.text()}"
    data = resp.json()
    assert "session_id" in data, f"No session_id in response: {data}"
    assert "agent_name" in data, f"No agent_name in response: {data}"
    # Store for next test
    page.evaluate(f"window.__testSessionId = '{data['session_id']}'")


@test("9.2 Send message and receive AI streaming response")
def test_send_message(page):
    # Login
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")

    # Create session
    resp = page.request.post(CHAT_API + "/sessions", data=json.dumps({"agent_page_title": "Agent:Medical_Triage"}), headers={"Content-Type": "application/json"})
    session_id = resp.json()["session_id"]

    # Send message (this returns SSE stream — use fetch to get raw text)
    resp = page.request.post(
        f"{CHAT_API}/sessions/{session_id}/messages",
        data=json.dumps({"content": "Hello, what can you help me with?"}),
        headers={"Content-Type": "application/json"}
    )
    assert resp.status == 200, f"Expected 200, got {resp.status}: {resp.text()[:500]}"
    body = resp.text()
    # SSE format: data: {"type":"text","text":"..."}\n\n
    assert "data:" in body, f"Response not in SSE format: {body[:500]}"
    assert '"type":"text"' in body or '"type": "text"' in body, f"No text events in stream: {body[:500]}"
    assert '"type":"done"' in body or '"type": "done"' in body, f"No done event in stream: {body[:500]}"


@test("9.3 AI response contains relevant medical content")
def test_ai_response_quality(page):
    # Login
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")

    # Create session and send medical question
    resp = page.request.post(CHAT_API + "/sessions", data=json.dumps({"agent_page_title": "Agent:Medical_Triage"}), headers={"Content-Type": "application/json"})
    session_id = resp.json()["session_id"]

    resp = page.request.post(
        f"{CHAT_API}/sessions/{session_id}/messages",
        data=json.dumps({"content": "I have a headache and mild fever"}),
        headers={"Content-Type": "application/json"}
    )
    body = resp.text()
    # Extract all text chunks from SSE
    full_response = ""
    for line in body.split("\n"):
        if line.startswith("data: "):
            try:
                event = json.loads(line[6:])
                if event.get("type") == "text" and event.get("text"):
                    full_response += event["text"]
            except json.JSONDecodeError:
                pass

    response_lower = full_response.lower()
    # The agent should respond about medical topics since it uses the Medical Triage system prompt
    assert len(full_response) > 50, f"Response too short ({len(full_response)} chars): {full_response}"
    # Check it's not a generic refusal — it should engage with the symptoms
    assert any(word in response_lower for word in ["headache", "fever", "symptom", "pain", "recommend", "assessment", "doctor", "rest", "hydrat"]), \
        f"Response doesn't seem medically relevant: {full_response[:300]}"


@test("9.4 Rate a message")
def test_rate_message(page):
    # Login
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")

    # Create session and get a response
    resp = page.request.post(CHAT_API + "/sessions", data=json.dumps({"agent_page_title": "Agent:Medical_Triage"}), headers={"Content-Type": "application/json"})
    session_id = resp.json()["session_id"]

    resp = page.request.post(
        f"{CHAT_API}/sessions/{session_id}/messages",
        data=json.dumps({"content": "test"}),
        headers={"Content-Type": "application/json"}
    )
    body = resp.text()
    # Find message_id from done event
    message_id = None
    for line in body.split("\n"):
        if line.startswith("data: "):
            try:
                event = json.loads(line[6:])
                if event.get("type") == "done" and event.get("message_id"):
                    message_id = event["message_id"]
            except json.JSONDecodeError:
                pass

    assert message_id, f"No message_id in done event. Body: {body[:500]}"

    # Rate the message
    resp = page.request.post(
        f"{CHAT_API}/messages/{message_id}/rate",
        data=json.dumps({"rating": "helpful"}),
        headers={"Content-Type": "application/json"}
    )
    assert resp.status == 200, f"Rating failed: {resp.status} {resp.text()}"
    data = resp.json()
    assert data.get("success") == True, f"Rating response: {data}"


@test("9.5 Agent stats update after chat")
def test_stats_updated(page):
    resp = page.request.get(CHAT_API + "/stats/Agent%3AMedical_Triage")
    data = resp.json()
    assert data["total_sessions"] > 0, f"total_sessions should be > 0, got {data['total_sessions']}"
    assert data["total_messages"] > 0, f"total_messages should be > 0, got {data['total_messages']}"


@test("9.6 Chat via widget UI — type message and see response")
def test_chat_widget_interaction(page):
    # Login via nginx
    page.goto(NGINX_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")

    # Go to agent page
    page.goto(NGINX_URL + "/index.php?title=Agent:Recipe_Advisor")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    # Type in chat input
    chat_input = page.locator(".ms-chat-input input")
    expect(chat_input).to_be_visible()
    chat_input.fill("What can I make with eggs and cheese?")
    page.locator(".ms-chat-input button").click()

    # Wait for user message to appear
    page.wait_for_timeout(2000)
    user_msg = page.locator(".ms-message-user")
    expect(user_msg.first).to_be_visible()

    # Wait for AI response (streaming — give it up to 30s)
    page.wait_for_timeout(15000)
    assistant_msgs = page.locator(".ms-message-assistant")
    expect(assistant_msgs.first).to_be_visible()

    # Check response has some content
    response_text = assistant_msgs.first.inner_text()
    assert len(response_text) > 20, f"AI response too short: {response_text}"

    # Take a screenshot of the chat in action
    page.screenshot(path="/tmp/chat_working.png", full_page=True)


# ═══════════════════════════════════════════════════════════════
# SECTION 10: INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════

@test("10.1 Nginx proxies MediaWiki correctly")
def test_nginx_wiki(page):
    page.goto(NGINX_URL + "/index.php?title=Main_Page")
    page.wait_for_load_state("networkidle")
    expect(page).to_have_title(re.compile(r"MentiSphere"))


@test("10.2 Nginx proxies chat API correctly")
def test_nginx_chat(page):
    resp = page.request.get(CHAT_API + "/health")
    assert resp.status == 200
    assert "mentisphere-chat" in resp.text()


@test("10.3 Chat widget assets served via nginx")
def test_nginx_assets(page):
    resp = page.request.get(NGINX_URL + "/chat-assets/chat-widget.js")
    assert resp.status == 200, f"Widget JS not served: {resp.status}"
    assert len(resp.body()) > 1000, "Widget JS too small — likely not the real bundle"


@test("10.4 Chat widget CSS served via nginx")
def test_nginx_css(page):
    resp = page.request.get(NGINX_URL + "/chat-assets/chat-widget.css")
    assert resp.status == 200, f"Widget CSS not served: {resp.status}"
    assert "ms-chat-widget" in resp.text(), "CSS doesn't contain expected styles"


# ─── RUNNER ──────────────────────────────────────────────────

def main():
    print("\n" + "=" * 60)
    print("MentiSphere Full Platform E2E Tests")
    print("=" * 60 + "\n")

    # Pre-login the MW API client
    mw.login()

    all_tests = [v for v in globals().values() if callable(v) and hasattr(v, '_test_name')]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        current_section = ""
        for test_func in all_tests:
            name = test_func._test_name
            section = name.split(" ")[0].split(".")[0]
            if section != current_section:
                current_section = section
                section_names = {
                    "1": "WIKI CORE",
                    "2": "AGENT PAGES",
                    "3": "KNOWLEDGE PAGES",
                    "4": "NAMESPACES & CATEGORIES",
                    "5": "SEARCH",
                    "6": "USER AUTH & EDITING",
                    "7": "CHAT WIDGET",
                    "8": "CHAT SERVICE API",
                    "9": "AI CHAT (OpenAI)",
                    "10": "INFRASTRUCTURE",
                }
                print(f"\n--- {section_names.get(section, section)} ---")

            test_func(page)

        browser.close()

    # Summary
    passed = sum(1 for r in results if r[0] == "PASS")
    failed = sum(1 for r in results if r[0] == "FAIL")
    total = len(results)

    print(f"\n{'=' * 60}")
    print(f"Results: {passed}/{total} passed, {failed} failed")

    if failed:
        print(f"\nFailed tests:")
        for r in results:
            if r[0] == "FAIL":
                print(f"  - {r[1]}")
                print(f"    {r[2][:200]}")
        print(f"\nScreenshots: /tmp/fail_*.png")
        if any("9.6" in r[1] for r in results if r[0] == "PASS"):
            print(f"Chat screenshot: /tmp/chat_working.png")
    else:
        print("\nAll tests passed!")
        print(f"Chat screenshot: /tmp/chat_working.png")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
