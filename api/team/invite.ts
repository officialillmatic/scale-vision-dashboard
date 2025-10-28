import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = process.env.RESEND_FROM || 'no-reply@example.com';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

    const { teamId, email, role } = (req.body || {}) as {
      teamId?: string; email?: string; role?: 'admin'|'member'|'viewer';
    };
    if (!teamId || !email || !role) return res.status(400).json({ error: 'missing fields' });

    // 1) Seat check
    const { data: usage, error: usageErr } = await supabase
      .from('team_seat_usage').select('*').eq('team_id', teamId).single();
    if (usageErr) return res.status(400).json({ error: usageErr.message });
    if (usage && usage.seats_used >= usage.seat_limit)
      return res.status(402).json({ error: 'Seat limit reached' });

    // 2) Crear invitación con token
    const token = randomUUID();
    const { data: invite, error: insErr } = await supabase
      .from('team_invites')
      .insert({ team_id: teamId, email: email.toLowerCase(), role, token })
      .select('id, token')
      .single();
    if (insErr) return res.status(400).json({ error: insErr.message });

    // 3) Compose link
    const { data: team } = await supabase.from('teams').select('name').eq('id', teamId).single();
    const base = process.env.PUBLIC_APP_URL || 'https://example.com';
    const inviteLink = `${base}/accept?token=${invite.token}`;

    // 4) Send email (soft-fail)
    let warn: string | undefined;
    try {
      const { data: sent } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: `Invitación a ${team?.name ?? 'tu equipo'} en Dr. Scale AI`,
        html: `
          <h2>Te invitaron a ${team?.name ?? 'tu equipo'}</h2>
          <p>Haz clic para unirte: <a href="${inviteLink}">${inviteLink}</a></p>
          <p>Este enlace expira en 7 días.</p>
        `,
      });
      await supabase.from('team_invites')
        .update({ email_message_id: sent?.id ?? null, email_sent_at: new Date().toISOString() })
        .eq('id', invite.id);
    } catch (e: any) {
      warn = e?.message || 'failed to send';
    }

    return res.status(200).json({ ok: true, link: inviteLink, warn });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'internal' });
  }
}
