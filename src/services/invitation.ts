// src/services/invitation.ts
// Uses serverless endpoints instead of direct DB writes.
// Safer with RLS and keeps logic centralized on the server.

export async function checkInvitation(token: string) {
  try {
    const r = await fetch(`/api/team/check?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
    const j = await r.json();
    return j; // { valid: boolean, invitation?: { email, role, team_id, team_name, token }, error?: string }
  } catch (e: any) {
    return { valid: false, error: e?.message || 'fetch_failed' };
  }
}

export async function acceptInvitation(token: string, userId: string) {
  const r = await fetch('/api/team/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, userId }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'accept_failed');
  return j; // { ok: true }
}
