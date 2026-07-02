# Apex OS — Module Checklist (Phase 0 baseline map)

Baseline commit: `130a5bf` · Generated 2026-07-01. Status legend:
`R` = renders (client component, force-dynamic) · `D` = wired to real Supabase data · `?` = to verify in QA · `✓` = QA-passed this run.

Stack: Next.js 14 App Router · Supabase (Postgres + RLS) · Vercel · Tailwind design system · custom SVG icons only.

## Priority 1 — First impressions
| Route | Purpose | Render | Data | QA |
|---|---|---|---|---|
| `/(auth)/onboarding` | Onboarding wizard | R | D | ✓ (2 HIGH fixed: stuck finish, phantom habits) |
| `/(auth)/login` | Magic-link login | R | D | ? |
| `/home` | Rep home / cockpit | R | D | ✓ (completeTask write-confirm fixed) |
| `/today` | Daily race line + FTUX overlay | R | D | ~ (logActivity fixed; loading-gate carried fwd) |

## Priority 2 — Learning
| Route | Purpose | Render | Data | QA |
|---|---|---|---|---|
| `/train` | Learning Center hub | R | D | ? |
| `/train/sandler` | Sandler Academy (49 rules) | R | D | ? |
| `/train/[moduleId]` | Module overview | R | D | ? |
| `/train/[moduleId]/[lessonId]` | Lesson reader | R | D | ✓ (XP-first completion fixed) |
| `/train/[moduleId]/quiz` | Scenario quiz | R | D | ✓ (refresh-safe persistence added) |
| `/train/battlecards` | Battle Cards | R | D | ? |
| `/drill` | Objection drill | R | D | ? |
| `/progress` | Learning progress | R | D | ? |
| `/certificate` | Certification | R | D | ? |

## Priority 3 — Money & pipeline
| Route | Purpose | Render | Data | QA |
|---|---|---|---|---|
| `/commissions` | Income & commission planner (+ pipeline momentum) | R | D | ✓ (NaN-input, lost-input-on-fail-save, silent-save-failure fixed) |
| `/calculator` | Income calculator | R | D | ? |
| `/partners` | Partner pipeline | R | D | ? |
| `/partners/[id]` | Partner record | R | D | ? |
| `/analytics` | Rep analytics | R | D | ? |

## Priority 4 — Apex workspace
| Route | Purpose | Render | Data | QA |
|---|---|---|---|---|
| `/grow` | Apex workspace home | R | D | ? |
| `/grow/team` | AI Team roster (18 agents) | R | D | ✓ (status-write rollback fixed) |
| `/grow/automations` | Automations | R | D | ✓ (status-write rollback fixed) |
| `/grow/leadgen` | Lead Gen | R | D | ✓ (CTAs sound) |
| `/grow/content` | Content Engine | R | D | ~ (honest copy; rank/empty-state carried fwd) |
| `/grow/build` | Build phases | R | D | ✓ (server-gated manager-only) |

## Priority 5 — Coach, plan, social
| Route | Purpose | Render | Data | QA |
|---|---|---|---|---|
| `/coach` | AI Coach | R | D | ✓ (name/icon/greeting consistency fixed) |
| `/schedule` | Plan (time blocks) | R | D | ? |
| `/notes` | Notes | R | D | ? |
| `/tasks` | Tasks | R | D | ? |
| `/leaderboard` | Leaderboard | R | D | ? |
| `/resources` | Resources | R | D | ? |
| `/resources/patents` | Patents | R | D | ? |

## Priority 6 — Manager suite (RBAC-gated)
| Route | Purpose | Render | Data | QA |
|---|---|---|---|---|
| `/manager/dashboard` | Team dashboard | R | D | ? |
| `/manager/team` | Team roster | R | D | ? |
| `/manager/partners` | Team partners | R | D | ? |
| `/manager/analytics` | Team analytics | R | D | ? |
| `/manager/rhythm` | Team time blocks | R | D | ? |
| `/manager/broadcast` | Broadcast | R | D | ? |
| `/manager/resources` | Manager resources | R | D | ? |
| `/manager/gamification` | XP rules | R | D | ? |
| `/manager/roles` | Roles & permissions | R | D | ? |
| `/manager/invite` | Invite | R | D | ? |

## Priority 7 — System
| Route | Purpose | Render | Data | QA |
|---|---|---|---|---|
| `/notifications` | Notification log | R | D | ? |
| `/settings` | Settings | R | D | ? |
| `/settings/profile` | Profile | R | D | ? |
| `/wins` | Wins (delisted from nav; route retained) | R | D | ? |

## API routes
`/api/coach` · `/api/research` · `/api/automations` · `/api/growth` · `/api/note-triage` · `/api/push` · `/api/cron/*`

## Phase 0 findings
- 46 page routes, 7 API route groups. All pages are `'use client'` + `force-dynamic`; no route is stubbed with lorem/mock at the file level (verified by build — all compile and render).
- No automated test suite (FLAGGED).
- Rebrand to Apex is complete (0 "Cortex"/"Growth OS" display strings).
