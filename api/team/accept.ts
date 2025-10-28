import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Nota: este endpoint requiere `userId` desde el cliente
 * (obténlo con supabase.auth.getUser()).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

    const { token, userId } = (req.body || {}) as { token?: string; userId?: string };
    if (!token || !userId) return res.status(400).json({ error: 'missing token or userId' });

    // 1) Buscar invitación válida
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();
    if (error || !invite) return res.status(400).json({ error: 'Invalid or expired invite' });

    // 2) Seat check de nuevo (evitar carrera)
    const { data: usage } = await supabase
      .from('team_seat_usage')
      .select('*')
      .eq('team_id', invite.team_id)
      .single();
    if (usage && usage.seats_used >= usage.seat_limit)
      return res.status(402).json({ error: 'Seat limit reached' });

    // 3) Transacción RPC (ya creada en SQL)
    const { error: txErr } = await supabase.rpc('accept_invite_tx', {
      p_team_id: invite.team_id,
      p_user_id: userId,
      p_role: invite.role,
      p_invite_id: invite.id
    });
    if (txErr) return res.status(400).json({ error: txErr.message });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'internal' });
  }
}
