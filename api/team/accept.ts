import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────────────────
// ENV (Vercel → Project → Settings → Environment Variables)
// ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ──────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method not allowed' });
    }

    const { token, userId } = (req.body || {}) as { token?: string; userId?: string };
    if (!token || !userId) {
      return res.status(400).json({ error: 'missing token or userId' });
    }

    console.log('[accept] incoming', { token, userId });

    // 1) Find valid (pending, not expired) invite
    const nowIso = new Date().toISOString();
    const { data: invite, error: inviteErr } = await supabase
      .from('team_invites')
      .select('id, team_id, email, role, status, expires_at')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .single();

    if (inviteErr || !invite) {
      console.error('[accept] invalid/expired invite', inviteErr);
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    // 2) Load team & seat limit
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('id, seat_limit')
      .eq('id', invite.team_id)
      .single();

    if (teamErr || !team) {
      console.error('[accept] team fetch error', teamErr);
      return res.status(400).json({ error: 'Team not found' });
    }

    // 3) Seat check: count current members vs seat_limit
    if (typeof team.seat_limit === 'number' && team.seat_limit >= 0) {
      const { count, error: cntErr } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', invite.team_id);

      if (cntErr) {
        console.error('[accept] seat count error', cntErr);
        return res.status(400).json({ error: 'Failed to get seat usage' });
      }
      const used = count ?? 0;
      if (used >= team.seat_limit) {
        return res.status(402).json({ error: 'Seat limit reached' });
      }
    }

    // 4) Add user to team_members (idempotent upsert on (team_id, user_id))
    // Ensure you have a unique constraint on (team_id, user_id) for true idempotency.
    const { error: upsertErr } = await supabase
      .from('team_members')
      .upsert(
        {
          team_id: invite.team_id,
          user_id: userId,
          role: invite.role,            // 'owner' | 'admin' | 'member' | 'viewer'
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'team_id,user_id' }
      );

    if (upsertErr) {
      console.error('[accept] upsert member error', upsertErr);
      return res.status(400).json({ error: upsertErr.message || 'Failed to add member' });
    }

    // 5) Mark invite as accepted
    const { error: updErr } = await supabase
      .from('team_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('id', invite.id);

    if (updErr) {
      console.warn('[accept] invite status update warn', updErr);
      // Not a hard failure since user is already a member, but report back for visibility
    }

    // 6) Done
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[accept] fatal', e);
    return res.status(500).json({ error: e?.message || 'internal' });
  }
}
