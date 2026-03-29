import { NextRequest } from 'next/server';
import { validateSession } from './mediawiki/client';
import type { MWUserInfo } from './mediawiki/types';

export async function authenticateRequest(request: NextRequest): Promise<MWUserInfo | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  return validateSession(cookie);
}
