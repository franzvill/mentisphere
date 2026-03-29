import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions, agentStats } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { getPageContent } from '@/lib/mediawiki/client';
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
