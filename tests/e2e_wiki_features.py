"""
MentiSphere E2E Tests — MediaWiki Features
Tests wiki functionality: pages, templates, namespaces, editing, search, talk pages, history.
Ignores AI/chat features.
"""

import sys
import re
import traceback
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:8080"
ADMIN_USER = "Admin"
ADMIN_PASS = "Admin12345!"

results = []


def test(name):
    """Decorator to register and run tests."""
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
                # Take screenshot on failure
                safe_name = name.replace(" ", "_").replace("/", "_")
                page.screenshot(path=f"/tmp/fail_{safe_name}.png")
        wrapper._test_name = name
        return wrapper
    return decorator


# ─── TESTS ───────────────────────────────────────────────────


@test("Homepage loads with Citizen skin")
def test_homepage(page):
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    # Citizen skin adds citizen classes to the HTML element
    html_el = page.locator("html")
    expect(html_el).to_have_class(re.compile(r"citizen"))
    # Page title should be MentiSphere
    expect(page).to_have_title(re.compile(r"MentiSphere"))


@test("Main Page shows featured agents")
def test_main_page_content(page):
    page.goto(BASE_URL + "/index.php?title=Main_Page")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text")
    expect(content).to_contain_text("Medical Triage Agent")
    expect(content).to_contain_text("Recipe Advisor")
    expect(content).to_contain_text("Wikipedia")


@test("Agent namespace exists — Agent:Medical_Triage loads")
def test_agent_page_loads(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    # Should not be a "missing page" — should have content
    content = page.locator("#mw-content-text")
    expect(content).to_contain_text("Medical Triage")
    expect(content).to_contain_text("Identity and Purpose")


@test("Agent page renders Lua template infobox")
def test_agent_template(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    # The AgentPage Lua module renders a div with class 'agent-infobox'
    infobox = page.locator(".agent-infobox")
    expect(infobox).to_be_visible()
    # Maturity badge should be visible
    expect(infobox).to_contain_text("START")
    # Domain should be linked
    expect(infobox).to_contain_text("Domain:")
    expect(infobox).to_contain_text("Medical")


@test("Knowledge namespace exists — Knowledge:Pharmacology_Basics loads")
def test_knowledge_page(page):
    page.goto(BASE_URL + "/index.php?title=Knowledge:Pharmacology_Basics")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text")
    expect(content).to_contain_text("Pharmacology Basics")
    # Knowledge template infobox
    infobox = page.locator(".knowledge-infobox")
    expect(infobox).to_be_visible()
    expect(infobox).to_contain_text("KNOWLEDGE")


@test("Agent:Recipe_Advisor loads with correct template")
def test_recipe_advisor(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Recipe_Advisor")
    page.wait_for_load_state("networkidle")
    infobox = page.locator(".agent-infobox")
    expect(infobox).to_be_visible()
    expect(infobox).to_contain_text("Recipe Advisor")
    expect(infobox).to_contain_text("Cooking")


@test("Nonexistent agent page shows create option")
def test_missing_agent_page(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Nonexistent_Test_Agent")
    page.wait_for_load_state("networkidle")
    # MediaWiki shows "create" link for missing pages
    content = page.content()
    assert "noarticletext" in content or "create" in content.lower() or "does not exist" in content.lower(), \
        "Expected missing page indicator"


@test("Special:AllPages shows Agent namespace in dropdown")
def test_namespace_in_allpages(page):
    page.goto(BASE_URL + "/index.php?title=Special:AllPages")
    page.wait_for_load_state("networkidle")
    # The namespace dropdown should contain our custom namespaces
    ns_select = page.locator("select[name='namespace']")
    if ns_select.count() == 0:
        # Citizen skin may use a different selector
        ns_select = page.locator("select").first
    options_text = ns_select.inner_text()
    assert "Agent" in options_text, f"Agent namespace not in dropdown. Options: {options_text[:500]}"
    assert "Knowledge" in options_text, f"Knowledge namespace not in dropdown"
    assert "Skill" in options_text, f"Skill namespace not in dropdown"


@test("Search finds agent pages")
def test_search(page):
    page.goto(BASE_URL + "/index.php?title=Special:Search?search=Medical+Triage&ns3000=1")
    page.wait_for_load_state("networkidle")
    content = page.content()
    # Should find the Medical Triage agent
    assert "Medical" in content and "Triage" in content, "Search did not find Medical Triage agent"


@test("Login works for Admin user")
def test_login(page):
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")
    # Should redirect to main page or show logged-in state
    # Check for user menu or personal tools with admin name
    content = page.content()
    assert "Admin" in content, "Login did not succeed — Admin not found in page"


@test("Logged-in user can access edit page")
def test_edit_access(page):
    # Login first
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")

    # Go to edit page
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage&action=edit")
    page.wait_for_load_state("networkidle")
    # Should have a textarea with wikitext content
    textarea = page.locator("#wpTextbox1")
    expect(textarea).to_be_visible()
    text_content = textarea.input_value()
    assert "AgentPage" in text_content, f"Edit textarea doesn't contain template. Content: {text_content[:200]}"


@test("Page history shows revisions")
def test_page_history(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage&action=history")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text")
    # History page should have at least one revision entry
    expect(content).to_contain_text("Admin")


@test("Talk page is accessible for Agent pages")
def test_talk_page(page):
    page.goto(BASE_URL + "/index.php?title=Agent_talk:Medical_Triage")
    page.wait_for_load_state("networkidle")
    # Talk page should load (either with content or "create" option)
    content = page.content()
    assert "Agent talk" in content or "Agent_talk" in content or "noarticletext" in content or "create" in content.lower(), \
        "Talk page did not load correctly"


@test("Categories are created by templates")
def test_categories(page):
    page.goto(BASE_URL + "/index.php?title=Category:Medical")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text")
    # The Medical Triage agent should be in the Medical category
    page_content = content.inner_text()
    assert "Medical Triage" in page_content, f"Medical Triage not in Medical category. Content: {page_content[:500]}"


@test("Category:Agents lists agent pages")
def test_agents_category(page):
    page.goto(BASE_URL + "/index.php?title=Category:Agents")
    page.wait_for_load_state("networkidle")
    content = page.locator("#mw-content-text")
    page_content = content.inner_text()
    assert "Medical Triage" in page_content, "Medical Triage not in Agents category"
    assert "Recipe Advisor" in page_content, "Recipe Advisor not in Agents category"


@test("Create and edit a new agent page via API + verify rendering")
def test_create_agent(page):
    import urllib.request, urllib.parse, json, http.cookiejar

    # Use MW API to create the page (avoids VisualEditor UI issues)
    api = BASE_URL + "/api.php"
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # Get login token
    data = json.loads(opener.open(api + "?action=query&meta=tokens&type=login&format=json").read())
    login_token = data["query"]["tokens"]["logintoken"]

    # Login
    post = urllib.parse.urlencode({"action": "login", "lgname": ADMIN_USER, "lgpassword": ADMIN_PASS, "lgtoken": login_token, "format": "json"}).encode()
    opener.open(api, post)

    # Get CSRF token
    data = json.loads(opener.open(api + "?action=query&meta=tokens&format=json").read())
    csrf = data["query"]["tokens"]["csrftoken"]

    # Create the page
    wikitext = """{{AgentPage
| name = E2E Test Agent
| domain = Testing
| maturity = stub
| description = An agent created by E2E tests.
| knowledge_deps =
| skill_deps =
| known_limitations = This is a test agent.
}}

== Identity and Purpose ==
You are a test agent created by automated E2E tests.

== Steps ==
1. Respond to test queries

== Output ==
Respond with test data.
"""
    post = urllib.parse.urlencode({"action": "edit", "title": "Agent:E2E_Test_Agent", "text": wikitext, "summary": "E2E test", "token": csrf, "format": "json"}).encode()
    result = json.loads(opener.open(api, post).read())
    assert result.get("edit", {}).get("result") == "Success", f"API edit failed: {result}"

    # Now verify in browser
    page.goto(BASE_URL + "/index.php?title=Agent:E2E_Test_Agent")
    page.wait_for_load_state("networkidle")

    infobox = page.locator(".agent-infobox")
    expect(infobox).to_be_visible()
    expect(infobox).to_contain_text("E2E Test Agent")
    expect(infobox).to_contain_text("STUB")
    expect(infobox).to_contain_text("Testing")


@test("MentiSphereChat extension adds Chat tab on agent pages")
def test_chat_tab(page):
    page.goto(BASE_URL + "/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    # The extension should add a "Chat" link/tab
    content = page.content()
    assert "Chat" in content, "Chat tab not found on agent page"


@test("Chat widget container is injected on agent pages (via nginx)")
def test_chat_container(page):
    # Must go through nginx (port 80) so /chat-assets/ resolves
    page.goto("http://localhost/index.php?title=Agent:Medical_Triage")
    page.wait_for_load_state("networkidle")
    # Wait for JS modules to load the widget
    page.wait_for_timeout(3000)
    container = page.locator("#mentisphere-chat")
    expect(container).to_be_attached()


@test("Recent changes page works")
def test_recent_changes(page):
    page.goto(BASE_URL + "/index.php?title=Special:RecentChanges")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "Recent changes" in content or "RecentChanges" in content, "Recent changes page did not load"


@test("User contributions page works")
def test_user_contributions(page):
    page.goto(BASE_URL + "/index.php?title=Special:Contributions/Admin")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "Contributions" in content or "Admin" in content, "User contributions page did not load"


@test("Watchlist page loads for logged-in user")
def test_watchlist(page):
    # Login
    page.goto(BASE_URL + "/index.php?title=Special:UserLogin")
    page.wait_for_load_state("networkidle")
    page.fill("#wpName1", ADMIN_USER)
    page.fill("#wpPassword1", ADMIN_PASS)
    page.click("#wpLoginAttempt")
    page.wait_for_load_state("networkidle")

    page.goto(BASE_URL + "/index.php?title=Special:Watchlist")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "Watchlist" in content or "watchlist" in content, "Watchlist page did not load"


# ─── RUNNER ──────────────────────────────────────────────────


def main():
    print("\nMentiSphere E2E Tests — MediaWiki Features\n" + "=" * 50)

    all_tests = [v for v in globals().values() if callable(v) and hasattr(v, '_test_name')]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        for test_func in all_tests:
            test_func(page)

        browser.close()

    # Summary
    passed = sum(1 for r in results if r[0] == "PASS")
    failed = sum(1 for r in results if r[0] == "FAIL")
    total = len(results)

    print(f"\n{'=' * 50}")
    print(f"Results: {passed}/{total} passed, {failed} failed")

    if failed:
        print(f"\nFailed tests:")
        for r in results:
            if r[0] == "FAIL":
                print(f"  - {r[1]}: {r[2]}")
        print(f"\nScreenshots saved to /tmp/fail_*.png")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
