// Agentic CRM OS — agent registry data-access. Loads the DB-backed company
// (agent_roles + agents) and joins the two halves into RegistryAgents, with the
// org-graph helpers the Agent Office and orchestrator need. Works with any
// Supabase client (server or browser); the registry is world-readable (RLS
// `using(true)` for select), so the browser client can read it directly.
//
// The new tables aren't in the generated Database type yet, so this module maps
// rows explicitly and takes the client as `SupabaseLike` — keeping the rest of
// the app strictly typed against these clean interfaces.

import type { Agent, AgentRole, AgentStatus, RegistryAgent } from './types'

// Minimal shape we rely on — avoids depending on the generated Database type
// for tables that post-date it.
type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => Promise<{ data: unknown[] | null; error: unknown }>
  }
}

interface RoleRow {
  id: string; tier: number; department: string; title: string
  mission: string | null; job_description: string | null; comms_style: string | null
  kpi: string | null; roi_logic: string | null
  inputs: string[] | null; outputs: string[] | null; tools: string[] | null
  reports_to: string[] | null; handoff_to: string[] | null
  reviewed_by: string[] | null; escalation_path: string[] | null
}
interface AgentRow {
  id: string; role_id: string; first_name: string; last_name: string
  personality: string | null; morning_greeting: string | null
  brand_voice_override: string | null
  roi_min_per_run: number | null; roi_runs_per_mo: number | null; roi_note: string | null
  hitl_tier: string; model_tier: string; default_status: string
  system_prompt: string | null; editable_settings: Record<string, unknown> | null
}

function mapRole(r: RoleRow): AgentRole {
  return {
    id: r.id,
    tier: (r.tier as AgentRole['tier']),
    department: (r.department as AgentRole['department']),
    title: r.title,
    mission: r.mission,
    jobDescription: r.job_description,
    commsStyle: r.comms_style,
    kpi: r.kpi,
    roiLogic: r.roi_logic,
    inputs: r.inputs ?? [],
    outputs: r.outputs ?? [],
    tools: r.tools ?? [],
    reportsTo: r.reports_to ?? [],
    handoffTo: r.handoff_to ?? [],
    reviewedBy: r.reviewed_by ?? [],
    escalationPath: r.escalation_path ?? [],
  }
}

function mapAgent(a: AgentRow): Agent {
  return {
    id: a.id,
    roleId: a.role_id,
    firstName: a.first_name,
    lastName: a.last_name,
    personality: a.personality,
    morningGreeting: a.morning_greeting,
    brandVoiceOverride: a.brand_voice_override,
    roiMinPerRun: a.roi_min_per_run,
    roiRunsPerMo: a.roi_runs_per_mo,
    roiNote: a.roi_note,
    hitlTier: (a.hitl_tier as Agent['hitlTier']),
    modelTier: (a.model_tier as Agent['modelTier']),
    defaultStatus: (a.default_status as AgentStatus),
    systemPrompt: a.system_prompt,
    editableSettings: a.editable_settings ?? {},
  }
}

export interface Registry {
  roles: AgentRole[]
  agents: RegistryAgent[]
  byId: Record<string, RegistryAgent>
  /** Agents that report directly to the given agent id. */
  directReports: (id: string) => RegistryAgent[]
  /** Agents the given agent hands work to. */
  handoffs: (id: string) => RegistryAgent[]
  /** Agents at a given tier (1 exec, 2 manager, 3 worker). */
  byTier: (tier: 1 | 2 | 3) => RegistryAgent[]
}

export async function loadRegistry(supabase: SupabaseLike): Promise<Registry> {
  const [rolesRes, agentsRes] = await Promise.all([
    supabase.from('agent_roles').select('*'),
    supabase.from('agents').select('*'),
  ])
  const roles = ((rolesRes.data ?? []) as RoleRow[]).map(mapRole)
  const rolesById: Record<string, AgentRole> = Object.fromEntries(roles.map(r => [r.id, r]))
  const agents: RegistryAgent[] = ((agentsRes.data ?? []) as AgentRow[]).map(row => {
    const a = mapAgent(row)
    return { ...a, role: rolesById[a.roleId] ?? null, fullName: `${a.firstName} ${a.lastName}` }
  })
  const byId: Record<string, RegistryAgent> = Object.fromEntries(agents.map(a => [a.id, a]))

  const resolve = (ids: string[] | undefined): RegistryAgent[] =>
    (ids ?? []).map(id => byId[id]).filter((a): a is RegistryAgent => Boolean(a))

  return {
    roles,
    agents,
    byId,
    directReports: id => agents.filter(a => a.role?.reportsTo.includes(id)),
    handoffs: id => resolve(byId[id]?.role?.handoffTo),
    byTier: tier => agents.filter(a => a.role?.tier === tier),
  }
}
