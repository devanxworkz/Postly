import { NextResponse } from 'next/server';
import { currentUserId } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { withUserKeys } from '../../../../lib/keycontext';
import {
  listInstagramAccounts,
  testInstagramConnection,
  zernioEnabled,
} from '../../../../lib/zernio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/zernio/instagram
// Secure server-side endpoint to list connected Instagram accounts from Zernio and local DB.
export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  return withUserKeys(userId, async () => {
    if (!zernioEnabled()) {
      return NextResponse.json({
        ok: false,
        enabled: false,
        error: 'ZERNIO_API_KEY is not configured',
        accounts: [],
        connections: [],
      });
    }

    try {
      const zernioAccounts = await listInstagramAccounts();
      const { rows: localConnections } = await query(
        `SELECT id, platform, account_name, account_id, status, last_error, checked_at, updated_at
           FROM social_connections
          WHERE user_id = $1 AND platform = 'instagram'
          ORDER BY updated_at DESC`,
        [userId]
      );

      return NextResponse.json({
        ok: true,
        enabled: true,
        accounts: zernioAccounts,
        connections: localConnections,
      });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e.message || 'Failed to list Instagram accounts from Zernio' },
        { status: 500 }
      );
    }
  });
}

// POST /api/zernio/instagram
// Secure server-side endpoint to test the connection to Zernio or a specific Instagram account.
export async function POST(request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  return withUserKeys(userId, async () => {
    if (!zernioEnabled()) {
      return NextResponse.json(
        { ok: false, error: 'ZERNIO_API_KEY is not configured' },
        { status: 400 }
      );
    }

    try {
      const accountId = body.accountId || null;
      const result = await testInstagramConnection(accountId);

      // If an account was tested, update the local social_connections status
      if (accountId) {
        await query(
          `UPDATE social_connections
              SET checked_at = now(),
                  last_error = $1,
                  status = $2,
                  updated_at = now()
            WHERE user_id = $3 AND platform = 'instagram'
              AND (account_id = $4 OR extra->>'zernio_account_id' = $4)`,
          [result.ok ? null : result.message, result.ok ? 'connected' : 'disconnected', userId, accountId]
        ).catch(() => {});
      }

      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e.message || 'Connection test failed' },
        { status: 500 }
      );
    }
  });
}
