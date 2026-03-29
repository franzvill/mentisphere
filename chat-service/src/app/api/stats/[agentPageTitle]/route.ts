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
