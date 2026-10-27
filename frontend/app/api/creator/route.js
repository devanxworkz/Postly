// app/api/creator/route.js
// Handles GET (current user's page), POST (create), PUT (update)

import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { currentUserId } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ensure table exists (idempotent)
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS creator_pages (
      user_id BIGINT PRIMARY KEY,
      username TEXT UNIQUE,
      brand_name TEXT,
      bio TEXT,
      photo_url TEXT,
      theme TEXT,
      color TEXT,
      links JSONB DEFAULT '[]'::jsonb,
      cards JSONB DEFAULT '[]'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  await ensureTable();
  const { rows } = await query('SELECT * FROM creator_pages WHERE user_id = $1', [userId]);
  return NextResponse.json({ page: rows[0] || null });
}

export async function POST(request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  await ensureTable();
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const { username, brand_name, bio, photo_url, theme, color, links, cards } = body;
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });
  // Validate username pattern
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) return NextResponse.json({ error: 'invalid username' }, { status: 400 });
  // Ensure unique username
  const existing = await query('SELECT user_id FROM creator_pages WHERE username = $1', [username]);
  if (existing.rows.length && existing.rows[0].user_id !== userId) {
    return NextResponse.json({ error: 'username already taken' }, { status: 409 });
  }
  await query(
    `INSERT INTO creator_pages (user_id, username, brand_name, bio, photo_url, theme, color, links, cards)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id) DO UPDATE SET
       username = EXCLUDED.username,
       brand_name = EXCLUDED.brand_name,
       bio = EXCLUDED.bio,
       photo_url = EXCLUDED.photo_url,
       theme = EXCLUDED.theme,
       color = EXCLUDED.color,
       links = EXCLUDED.links,
       cards = EXCLUDED.cards,
       updated_at = now()
    `,
    [userId, username, brand_name, bio, photo_url, theme, color, JSON.stringify(links||[]), JSON.stringify(cards||[])]
  );
  return NextResponse.json({ success: true });
}

export async function PUT(request) {
  // Alias to POST for idempotent update
  return POST(request);
}
