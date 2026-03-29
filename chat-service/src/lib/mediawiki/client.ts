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
