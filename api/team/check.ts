import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET or POST:
 *  - GET: /api/team/check?token=...
 *  - POST: { token }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.method === 'GET'
      ? (req.query.token as string)
      : (req.body?.token as string);

    if (!token) return res.status(400).json({ valid: false, error: 'missing token' });

    // 1) Invite exists and not expired
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !invite) {
      return res.status(200).json({ valid: false, error: 'invalid_or_expired' });
    }

    // 2) Join to get team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', invite.team_id)
      .single();

    return res.status(200).json({
      valid: true,
      invitation: {
        email: invite.email,
        role: invite.role,
        team_id: invite.team_id,
        team_name: team?.name ?? 'Equipo',
        token: invite.token,
      }
    });
  } catch (e: any) {
    return res.status(500).json({ valid: false, error: e.message || 'internal' });
  }
}
