import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

    const token = String(req.query.token || '');
    if (!token) return res.status(400).json({ valid: false, error: 'missing token' });

    const nowIso = new Date().toISOString();
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select('team_id, email, role, status, expires_at')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return res.status(200).json({ valid: false, error: 'Invitation not found' });
    }
    if (invite.status !== 'pending') {
      return res.status(200).json({ valid: false, error: 'This invitation is not pending' });
    }
    if (invite.expires_at <= nowIso) {
      return res.status(200).json({ valid: false, error: 'This invitation has expired' });
    }

    const { data: team } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', invite.team_id)
      .single();

    return res.status(200).json({
      valid: true,
      invitation: {
        email: invite.email,
        role: invite.role,
        team_id: invite.team_id,
        team_name: team?.name || '—',
        token,
        expires_at: invite.expires_at,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ valid: false, error: e?.message || 'internal' });
  }
}
