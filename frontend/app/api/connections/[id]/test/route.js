import { NextResponse } from 'next/server';
import { currentUserId } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { withUserKeys } from '../../../../../lib/keycontext';
import { secretForCredential } from '../../../../../lib/credentials';
import { testInstagramConnection } from '../../../../../lib/zernio';

export const runtime = 'nodejs';

// POST /api/connections/[id]/test
// Tests an existing connection's live status against its provider.
export async function POST(request, { params }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

  const { rows } = await query(
    `SELECT id, platform, provider, account_id, credential_id, extra
       FROM social_connections
      WHERE id = $1 AND user_id = $2`,
    [params.id, userId]
  );

  const conn = rows[0];
  if (!conn) {
    return NextResponse.json({ error: 'connection not found' }, { status: 404 });
  }

  if (conn.provider === 'zernio') {
    const accountId = conn.extra?.zernio_account_id || conn.account_id;
    const secret = await secretForCredential(conn.credential_id, 'zernio', userId);

    return withUserKeys(userId, async () => {
      try {
        const result = await testInstagramConnection(accountId);
        await query(
          `UPDATE social_connections
              SET checked_at = now(),
                  status = $1,
                  last_error = $2,
                  updated_at = now()
            WHERE id = $3`,
          [result.ok ? 'connected' : 'disconnected', result.ok ? null : result.message, conn.id]
        );
        return NextResponse.json(result);
      } catch (e) {
        await query(
          `UPDATE social_connections
              SET checked_at = now(),
                  last_error = $1,
                  updated_at = now()
            WHERE id = $2`,
          [e.message, conn.id]
        );
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
      }
    }, secret ? { zernio: secret } : {});
  }

  return NextResponse.json({ ok: true, message: `Connection for ${conn.platform} is stored.` });
}
