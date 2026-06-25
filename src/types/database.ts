// BDR OS v2 — Supabase Database Types
// Generated from DATABASE_SCHEMA.md
// Keep in sync with supabase/migrations/20240101000000_initial_schema.sql

export type UserRole = 'rep' | 'manager' | 'owner'
export type TeamMemberStatus = 'pending' | 'active' | 'inactive'
export type WinType = 'call' | 'demo' | 'deal' | 'post' | 'client'
export type ResourceType = 'pdf' | 'video' | 'doc' | 'link' | 'course'
export type QuestionType = 'scenario' | 'concept'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type QuizDifficulty = 'easy' | 'medium' | 'hard'
export type NotificationTier = 1 | 2 | 3 | 4

export type BeltRank =
  | 'White Belt'
  | 'Yellow Belt'
  | 'Orange Belt'
  | 'Green Belt'
  | 'Blue Belt'
  | 'Purple Belt'
  | 'Black Belt'

export interface Belt {
  rank: BeltRank
  color: string
  tagline: string
  day: number
}

export const BELT_DEFINITIONS: Belt[] = [
  { rank: 'White Belt',  color: '#9CA3AF', tagline: 'New Recruit',       day: 0  },
  { rank: 'Yellow Belt', color: '#CA8A04', tagline: 'Finding Your Voice', day: 7  },
  { rank: 'Orange Belt', color: '#C2410C', tagline: 'First Closings',     day: 14 },
  { rank: 'Green Belt',  color: '#059669', tagline: 'Building Momentum',  day: 30 },
  { rank: 'Blue Belt',   color: '#1D4ED8', tagline: 'Consistent Closer',  day: 50 },
  { rank: 'Purple Belt', color: '#6D28D9', tagline: 'Top Performer',      day: 70 },
  { rank: 'Black Belt',  color: '#111827', tagline: 'Elite BDR',          day: 90 },
]

export function getBeltForDays(days: number): Belt {
  let belt = BELT_DEFINITIONS[0]
  for (const b of BELT_DEFINITIONS) {
    if (days >= b.day) belt = b
  }
  return belt
}

export function getDaysUntilNextBelt(days: number): { belt: Belt; daysRemaining: number } | null {
  for (let i = BELT_DEFINITIONS.length - 1; i >= 0; i--) {
    if (days < BELT_DEFINITIONS[i].day) {
      return {
        belt: BELT_DEFINITIONS[i],
        daysRemaining: BELT_DEFINITIONS[i].day - days,
      }
    }
  }
  return null // Black Belt achieved
}

// ─── Table Row Types ──────────────────────────────────────────────────────────

export interface Team {
  id: string
  name: string
  manager_id: string | null
  logo_url: string | null
  primary_color: string
  welcome_message: string | null
  gamification_rules: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url: string | null
  team_id: string | null
  start_date: string
  last_active: string | null
  settings: Record<string, unknown>
  notification_preferences: NotificationPreferences
  theme: 'light' | 'dark'
  accent_color: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  push_enabled: boolean
  email_enabled: boolean
  quiet_hours_start: string     // "21:00"
  quiet_hours_end: string       // "07:00"
  habit_reminder: boolean
  streak_alert: boolean
  belt_advance: boolean
  leaderboard: boolean
  new_resource: boolean
  manager_message: boolean
  weekly_digest: boolean
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  invited_by: string | null
  status: TeamMemberStatus
  joined_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  belt_rank: BeltRank
  belt_day: number
  total_xp: number
  current_streak: number
  longest_streak: number
  last_streak_date: string | null
  total_calls: number
  total_demos: number
  total_deals: number
  completed_lessons: string[]
  quiz_scores: Record<string, number>     // module_id → best percentage
  wins_summary: {
    calls: number
    demos: number
    deals: number
    posts: number
    clients: number
  }
  milestones_done: string[]
  learning_done: string[]
  last_belt_name: BeltRank
  habits_completed_today: number
  last_habit_date: string | null
  updated_at: string
}

export interface Module {
  id: string
  order_index: number
  title: string
  subtitle: string | null
  icon_name: string | null
  is_published: boolean
  is_new: boolean
  required_day: number
  xp_lessons: number
  xp_quiz: number
  created_by: string | null
  created_at: string
  updated_at: string
  // Computed client-side
  lesson_count?: number
  completed_lessons?: number
  quiz_passed?: boolean
}

export interface LessonContentBlock {
  type: 'intro' | 'list' | 'tip' | 'warn' | 'screenshot' | 'quote'
  content: string
  items?: LessonListItem[]
  image_url?: string
  caption?: string
  alt?: string
  source?: LessonSource
}

export interface LessonListItem {
  text: string
  source?: LessonSource
}

export interface LessonSource {
  document: string
  page: number | string
  section?: string
  url?: string
}

export interface Lesson {
  id: string
  module_id: string
  order_index: number
  title: string
  duration_minutes: number
  difficulty: Difficulty
  content: LessonContentBlock[]
  sources: LessonSource[]
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface QuizOption {
  text: string
}

export interface QuizQuestion {
  id: string
  module_id: string
  order_index: number
  question: string
  question_type: QuestionType
  options: string[]
  correct_answer: number
  explanation: string
  source: {
    document: string
    page: number | string
    section: string
    url: string
  }
  difficulty: QuizDifficulty
  created_at: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  module_id: string
  score: number
  percentage: number
  answers: Array<{
    question_id: string
    selected: number
    correct: boolean
  }>
  xp_earned: number
  is_first_attempt: boolean
  attempted_at: string
}

export interface Win {
  id: string
  user_id: string
  type: WinType
  description: string
  hubspot_id: string | null
  belt_at_time: string | null
  xp_earned: number
  posted_to_slack: boolean
  date: string
  logged_at: string
}

export interface Habit {
  id: string
  user_id: string
  label: string
  description: string | null
  category: string
  time_of_day: string | null
  is_system: boolean
  is_active: boolean
  order_index: number
  created_at: string
  // Client-side
  completed_today?: boolean
}

export interface HabitLog {
  id: string
  user_id: string
  habit_id: string
  date: string
  completed_at: string
}

export interface Resource {
  id: string
  title: string
  type: ResourceType
  url: string | null
  description: string | null
  module_ids: string[]
  is_featured: boolean
  is_published: boolean
  added_by: string | null
  team_id: string | null
  view_count: number
  version: number
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  action_url: string | null
  is_read: boolean
  tier: NotificationTier
  created_at: string
  expires_at: string | null
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  target_type: string | null
  target_id: string | null
  xp_delta: number
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface GamificationRule {
  id: string
  team_id: string
  rule_key: string
  xp_value: number
  is_active: boolean
  updated_by: string | null
  updated_at: string
}

export interface TeamChallenge {
  id: string
  team_id: string
  title: string
  description: string | null
  challenge_type: string | null
  target_value: number | null
  start_date: string
  end_date: string
  prize_description: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  device_info: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface XpLedgerEntry {
  id: string
  user_id: string
  action: string
  xp_amount: number
  reference_id: string | null
  reference_type: string | null
  verified: boolean
  created_at: string
}

// ─── Response types from Edge Functions ───────────────────────────────────────

export interface XpAwardResult {
  awarded: boolean
  xp_earned: number
  belt_bonus: number
  total_xp: number
  belt: Belt
  belt_advanced: boolean
  previous_belt: BeltRank | null
  reason?: string
}

// ─── Derived / computed types ──────────────────────────────────────────────────

export interface TeamMemberSummary {
  user: User
  progress: UserProgress
  belt: Belt
  days_active: number
  habits_today: number
  total_habits_required: number
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  avatar_url: string | null
  belt_rank: BeltRank
  value: number
  delta?: number
}

// ─── Database type helper for Supabase ───────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      teams:              { Row: Team;           Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Team> }
      users:              { Row: User;           Insert: Omit<User, 'created_at' | 'updated_at'>;         Update: Partial<User> }
      team_members:       { Row: TeamMember;     Insert: Omit<TeamMember, 'id' | 'joined_at'>;            Update: Partial<TeamMember> }
      user_progress:      { Row: UserProgress;   Insert: Omit<UserProgress, 'id' | 'updated_at'>;         Update: Partial<UserProgress> }
      modules:            { Row: Module;         Insert: Omit<Module, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Module> }
      lessons:            { Row: Lesson;         Insert: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Lesson> }
      quiz_questions:     { Row: QuizQuestion;   Insert: Omit<QuizQuestion, 'id' | 'created_at'>;         Update: Partial<QuizQuestion> }
      quiz_attempts:      { Row: QuizAttempt;    Insert: Omit<QuizAttempt, 'id' | 'attempted_at'>;        Update: Partial<QuizAttempt> }
      wins:               { Row: Win;            Insert: Omit<Win, 'id' | 'logged_at'>;                   Update: Partial<Win> }
      habits:             { Row: Habit;          Insert: Omit<Habit, 'id' | 'created_at'>;                Update: Partial<Habit> }
      habit_logs:         { Row: HabitLog;       Insert: Omit<HabitLog, 'id' | 'completed_at'>;          Update: never }
      resources:          { Row: Resource;       Insert: Omit<Resource, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Resource> }
      notifications:      { Row: Notification;   Insert: Omit<Notification, 'id' | 'created_at'>;        Update: Partial<Notification> }
      audit_logs:         { Row: AuditLog;       Insert: Omit<AuditLog, 'id' | 'created_at'>;            Update: never }
      gamification_rules: { Row: GamificationRule; Insert: Omit<GamificationRule, 'id' | 'updated_at'>; Update: Partial<GamificationRule> }
      team_challenges:    { Row: TeamChallenge;  Insert: Omit<TeamChallenge, 'id' | 'created_at'>;       Update: Partial<TeamChallenge> }
    }
  }
}
