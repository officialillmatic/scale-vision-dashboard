import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// Create an admin client (server-side only).
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function sameOriginAllowed(req: NextApiRequest) {
  const origin = req.headers.origin || ''
  const referer = (req.headers.referer || '') as string
  // Allow same-origin and known preview/prod hosts.
  const allowedHosts = [
    'vercel.app',
    'drscaleai.com',
  ]
  return allowedHosts.some(h => origin?.includes(h) || referer?.includes(h))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Server not configured with SUPABASE credentials' })
  }
  if (!sameOriginAllowed(req)) {
    return res.status(403).json({ error: 'Forbidden: cross-origin' })
  }

  try {
    const body = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body
    const { retell_agent_id, name, rate_per_minute, description } = body || {}

    if (!retell_agent_id || !name) {
      return res.status(400).json({ error: 'retell_agent_id and name are required' })
    }

    // Upsert into agents keyed on retell_agent_id
    const { data, error } = await supabaseAdmin
      .from('agents')
      .upsert({ retell_agent_id, name, rate_per_minute, description }, { onConflict: 'retell_agent_id' })
      .select('*')
      .single()

    if (error) throw error

    return res.status(200).json({ agent: data })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unknown error' })
  }
}
