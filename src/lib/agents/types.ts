// Agentic CRM OS — agent registry types. Mirrors the `agent_roles` + `agents`
// tables seeded in 20240211000000_agent_registry.sql. Kept strictly typed (this
// is a plain .ts lib, not a @ts-nocheck client file) so the registry is a
// reliable contract for the Agent Office, the run loop, and the coach.

export type AgentTier = 1 | 2 | 3 // 1 exec | 2 manager | 3 worker
export type HitlTier = 'in-the-loop' | 'on-the-loop' | 'autonomous'
export type ModelTier = 'worker' | 'manager' | 'exec'
export type AgentStatus = 'live' | 'setup' | 'paused'
export type Department =
  | 'exec' | 'marketing' | 'funnel' | 'partner' | 'ops' | 'compliance' | 'memory'

// The org/function half of an agent (from agent_roles).
export interface AgentRole {
  id: string
  tier: AgentTier
  department: Department
  title: string
  mission: string | null
  jobDescription: string | null
  commsStyle: string | null
  kpi: string | null
  roiLogic: string | null
  inputs: string[]
  outputs: string[]
  tools: string[]
  reportsTo: string[]
  handoffTo: string[]
  reviewedBy: string[]
  escalationPath: string[]
}

// The identity/behavior half of an agent (from agents).
export interface Agent {
  id: string
  roleId: string
  firstName: string
  lastName: string
  personality: string | null
  morningGreeting: string | null
  brandVoiceOverride: string | null
  roiMinPerRun: number | null
  roiRunsPerMo: number | null
  roiNote: string | null
  hitlTier: HitlTier
  modelTier: ModelTier
  defaultStatus: AgentStatus
  systemPrompt: string | null
  editableSettings: Record<string, unknown>
}

// Calculated ROI for an agent: minutes/run × runs/month → hours → dollars at the
// team hourly rate. One transparent formula, shown in the UI so the number is
// never a black box.
export interface AgentRoi {
  minPerRun: number
  runsPerMo: number
  hoursPerMo: number
  dollarsPerMo: number
  hourlyRate: number
}
export function computeAgentRoi(a: { roiMinPerRun: number | null; roiRunsPerMo: number | null }, hourlyRate = 50): AgentRoi {
  const minPerRun = a.roiMinPerRun ?? 0
  const runsPerMo = a.roiRunsPerMo ?? 0
  const hoursPerMo = Math.round(((minPerRun * runsPerMo) / 60) * 10) / 10
  return { minPerRun, runsPerMo, hoursPerMo, dollarsPerMo: Math.round(hoursPerMo * hourlyRate), hourlyRate }
}

// The two halves joined — what the app actually consumes.
export interface RegistryAgent extends Agent {
  role: AgentRole | null
  fullName: string
}

// Model routing per decision B5 (docs/architecture/08-decisions.md): mechanical
// worker agents run cheap+fast; managers get stronger reasoning; exec + coach +
// (elevated) compliance/legal get the best judgment.
export const MODEL_FOR_TIER: Record<ModelTier, string> = {
  worker: 'claude-haiku-4-5-20251001',
  manager: 'claude-sonnet-5',
  exec: 'claude-opus-4-8',
}

// Plain-English labels for the HITL tiers, reused in the Agent Office UI.
export const HITL_LABEL: Record<HitlTier, string> = {
  'in-the-loop': 'You approve before it acts',
  'on-the-loop': 'It acts; you can override',
  autonomous: 'Runs on its own',
}

export const TIER_LABEL: Record<AgentTier, string> = {
  1: 'Executive',
  2: 'Manager',
  3: 'Specialist',
}
