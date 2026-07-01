// admin-set-role — privileged role assignment. RLS deliberately forbids users
// from writing other users' rows, so role changes / invites run here with the
// service role behind strict checks:
//   • the CALLER must be an owner (admin) — verified server-side, never trusted
//     from the client;
//   • the TARGET is joined to the caller's team;
//   • only 'rep' or 'manager' can be assigned — 'owner' is never grantable here,
//     so this endpoint can't be used for privilege escalation.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })

  const { data: { user }, error: authErr } = await asUser.auth.getUser()
  if (authErr || !user) return json({ error: 'Invalid token' }, 401)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const targetId = typeof body.target_user_id === 'string' ? body.target_user_id : null
  const role = body.role                        // expected: 'rep' | 'manager'
  if (!targetId) return json({ error: 'target_user_id required' }, 400)
  if (role !== 'rep' && role !== 'manager') return json({ error: "role must be 'rep' or 'manager'" }, 400)

  // Verify the caller is an owner (admin), server-side.
  const { data: caller } = await admin.from('users').select('id, role, team_id').eq('id', user.id).single()
  if (!caller || caller.role !== 'owner') return json({ error: 'Only an admin can assign roles' }, 403)
  if (!caller.team_id) return json({ error: 'You are not on a team' }, 400)

  // Don't let an admin change their own role (avoid locking themselves out).
  if (targetId === user.id) return json({ error: 'You cannot change your own role' }, 400)

  const { data: target } = await admin.from('users').select('id, role, team_id').eq('id', targetId).single()
  if (!target) return json({ error: 'User not found' }, 404)
  // Never touch another owner via this endpoint.
  if (target.role === 'owner') return json({ error: 'Cannot change an owner via this endpoint' }, 403)

  const { error: updErr } = await admin.from('users').update({ role, team_id: caller.team_id }).eq('id', targetId)
  if (updErr) return json({ error: 'Update failed' }, 500)

  await admin.from('team_members').upsert({ team_id: caller.team_id, user_id: targetId, status: 'active' }, { onConflict: 'team_id,user_id' })
  return json({ ok: true, role })
})
