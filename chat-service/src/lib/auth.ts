import { NextRequest } from 'next/server';
import { validateSession } from './mediawiki/client';
import type { MWUserInfo } from './mediawiki/types';

export async function authenticateRequest(request: NextRequest): Promise<MWUserInfo | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  // Forward the original client IP so MW session validation sees the same IP
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || undefined;
  return validateSession(cookie, clientIp);
}
