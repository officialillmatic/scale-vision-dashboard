import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { randomUUID } from 'node:crypto';

// ──────────────────────────────────────────────────────────
// ENV (must be set in Vercel → Project → Settings → Env Vars)
// ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const RESEND_FROM = process.env.RESEND_FROM || 'Dr. Scale AI <onboarding@resend.dev>';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'https://example.com';

// ──────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

// Basic email validator
function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method not allowed' });
    }

    const { teamId, email, role } = (req.body || {}) as {
      teamId?: string;
      email?: string;
      role?: 'owner' | 'admin' | 'member' | 'viewer';
    };

    // ── Validate payload
    if (!teamId || !email || !role) {
      return res.status(400).json({ error: 'missing fields: teamId, email, role' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'invalid role' });
    }

    console.log('[invite] incoming', { teamId, email, role });

    // ── Fetch team & seat limit
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('id, name, seat_limit')
      .eq('id', teamId)
      .single();

    if (teamErr || !team) {
      console.error('[invite] team fetch error', teamErr);
      return res.status(400).json({ error: 'team not found' });
    }

    // ── Seat check: count current members vs seat_limit
    if (typeof team.seat_limit === 'number' && team.seat_limit >= 0) {
      const { count, error: cntErr } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (cntErr) {
        console.error('[invite] seat count error', cntErr);
        return res.status(400).json({ error: 'failed to get seat usage' });
      }
      const used = count ?? 0;
      if (used >= team.seat_limit) {
        return res.status(402).json({ error: 'Seat limit reached' });
      }
    }

    // ── Create invite
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // +7 days

    const { data: invite, error: insErr } = await supabase
      .from('team_invites')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        token,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, token')
      .single();

    if (insErr || !invite) {
      console.error('[invite] insert error', insErr);
      return res.status(400).json({ error: insErr?.message || 'failed to create invite' });
    }

    const inviteLink = `${PUBLIC_APP_URL}/accept-invitation?token=${invite.token}`;
    console.log('[invite] link', inviteLink);

    // ── Send email (soft-fail)
    let warn: string | undefined;
    try {
      const subject = `Invitación a ${team.name ?? 'tu equipo'} en Dr. Scale AI`;
      const html = `
        <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial;">
          <h2>Te invitaron a <strong>${team.name ?? 'tu equipo'}</strong></h2>
          <p>Haz clic para unirte:</p>
          <p><a href="${inviteLink}">${inviteLink}</a></p>
          <p style="color:#666">Este enlace expira en 7 días.</p>
        </div>
      `;

      const { data: sent } = await resend.emails.send({
        from: RESEND_FROM,
        to: [email],
        subject,
        html,
      });

      // store message id & timestamp if you have those columns
      await supabase
        .from('team_invites')
        .update({
          email_message_id: (sent as any)?.id ?? null,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', invite.id);
    } catch (e: any) {
      console.warn('[invite] email warn', e?.message || e);
      warn = e?.message || 'failed to send email';
    }

    // ── Done
    return res.status(200).json({ ok: true, link: inviteLink, warn });
  } catch (e: any) {
    console.error('[invite] fatal', e);
    return res.status(500).json({ error: e?.message || 'internal' });
  }
}
