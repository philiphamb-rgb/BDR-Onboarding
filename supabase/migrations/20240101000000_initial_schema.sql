-- ============================================================
-- BDR OS v2 — Complete Database Schema
-- Supabase PostgreSQL
-- All tables, indexes, RLS policies, triggers, helper functions
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get current user's role from their record
-- SECURITY DEFINER bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.users
    WHERE id = auth.uid();
    RETURN COALESCE(v_role, 'rep');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's team_id
CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS UUID AS $$
DECLARE
    v_team_id UUID;
BEGIN
    SELECT team_id INTO v_team_id
    FROM public.users
    WHERE id = auth.uid();
    RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is a manager or owner
CREATE OR REPLACE FUNCTION is_manager_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_my_role() IN ('manager', 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user manages a specific user
CREATE OR REPLACE FUNCTION manages_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_my_team UUID;
    v_target_team UUID;
BEGIN
    IF NOT is_manager_or_owner() THEN
        RETURN FALSE;
    END IF;
    v_my_team := get_my_team_id();
    SELECT team_id INTO v_target_team
    FROM public.users
    WHERE id = target_user_id;
    RETURN v_my_team = v_target_team AND v_my_team IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Calculate belt rank from start_date
CREATE OR REPLACE FUNCTION calculate_belt_rank(p_start_date DATE)
RETURNS TEXT AS $$
DECLARE
    v_days INTEGER;
BEGIN
    v_days := CURRENT_DATE - p_start_date;
    RETURN CASE
        WHEN v_days >= 90 THEN 'Black Belt'
        WHEN v_days >= 70 THEN 'Purple Belt'
        WHEN v_days >= 50 THEN 'Blue Belt'
        WHEN v_days >= 30 THEN 'Green Belt'
        WHEN v_days >= 14 THEN 'Orange Belt'
        WHEN v_days >= 7  THEN 'Yellow Belt'
        ELSE 'White Belt'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- TABLES
-- (created in dependency order)
-- ============================================================

-- 1. TEAMS
CREATE TABLE public.teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    manager_id      UUID,                           -- FK added after users
    logo_url        TEXT,
    primary_color   TEXT DEFAULT '#003087',
    welcome_message TEXT,
    gamification_rules JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_manager ON public.teams(manager_id);

-- 2. USERS (extends auth.users)
CREATE TABLE public.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    role            TEXT DEFAULT 'rep' CHECK (role IN ('rep', 'manager', 'owner')),
    avatar_url      TEXT,
    team_id         UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    start_date      DATE DEFAULT CURRENT_DATE,
    last_active     TIMESTAMPTZ,
    settings        JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{
        "push_enabled": true,
        "email_enabled": true,
        "quiet_hours_start": "21:00",
        "quiet_hours_end": "07:00",
        "habit_reminder": true,
        "streak_alert": true,
        "belt_advance": true,
        "leaderboard": true,
        "new_resource": true,
        "manager_message": true,
        "weekly_digest": true
    }',
    theme           TEXT DEFAULT 'light',
    accent_color    TEXT DEFAULT '#00C2B2',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_team ON public.users(team_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- Add FK from teams to users now that users table exists
ALTER TABLE public.teams
    ADD CONSTRAINT fk_teams_manager
    FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. TEAM_MEMBERS
CREATE TABLE public.team_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invited_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status      TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);

-- 4. USER_PROGRESS
CREATE TABLE public.user_progress (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    belt_rank           TEXT DEFAULT 'White Belt',
    belt_day            INTEGER DEFAULT 0,
    total_xp            INTEGER DEFAULT 0,
    current_streak      INTEGER DEFAULT 0,
    longest_streak      INTEGER DEFAULT 0,
    last_streak_date    DATE,
    total_calls         INTEGER DEFAULT 0,
    total_demos         INTEGER DEFAULT 0,
    total_deals         INTEGER DEFAULT 0,
    completed_lessons   TEXT[] DEFAULT '{}',
    quiz_scores         JSONB DEFAULT '{}',
    wins_summary        JSONB DEFAULT '{"calls":0,"demos":0,"deals":0,"posts":0,"clients":0}',
    milestones_done     TEXT[] DEFAULT '{}',
    learning_done       TEXT[] DEFAULT '{}',
    last_belt_name      TEXT DEFAULT 'White Belt',
    habits_completed_today INTEGER DEFAULT 0,
    last_habit_date     DATE,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_xp ON public.user_progress(total_xp DESC);
CREATE INDEX idx_user_progress_streak ON public.user_progress(current_streak DESC);

-- 5. MODULES
CREATE TABLE public.modules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_index     INTEGER NOT NULL,
    title           TEXT NOT NULL,
    subtitle        TEXT,
    icon_name       TEXT,
    is_published    BOOLEAN DEFAULT TRUE,
    is_new          BOOLEAN DEFAULT FALSE,
    required_day    INTEGER DEFAULT 0,
    xp_lessons      INTEGER DEFAULT 25,
    xp_quiz         INTEGER DEFAULT 75,
    created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modules_order ON public.modules(order_index);
CREATE INDEX idx_modules_published ON public.modules(is_published);

-- 6. LESSONS
CREATE TABLE public.lessons (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id           UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    order_index         INTEGER NOT NULL,
    title               TEXT NOT NULL,
    duration_minutes    INTEGER DEFAULT 5,
    difficulty          TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    content             JSONB NOT NULL DEFAULT '[]',
    sources             JSONB DEFAULT '[]',
    is_published        BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_module ON public.lessons(module_id);
CREATE INDEX idx_lessons_order ON public.lessons(module_id, order_index);

-- 7. QUIZ_QUESTIONS
CREATE TABLE public.quiz_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    order_index     INTEGER NOT NULL,
    question        TEXT NOT NULL,
    question_type   TEXT DEFAULT 'scenario' CHECK (question_type IN ('scenario', 'concept')),
    options         JSONB NOT NULL,        -- array of 4 strings
    correct_answer  INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
    explanation     TEXT NOT NULL,
    source          JSONB NOT NULL,        -- {document, page, section, url}
    difficulty      TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_module ON public.quiz_questions(module_id);

-- 8. QUIZ_ATTEMPTS
CREATE TABLE public.quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    module_id       UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    score           INTEGER NOT NULL,
    percentage      INTEGER NOT NULL,
    answers         JSONB NOT NULL,        -- array of {question_id, selected, correct}
    xp_earned       INTEGER DEFAULT 0,
    is_first_attempt BOOLEAN DEFAULT TRUE,
    attempted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_module ON public.quiz_attempts(user_id, module_id);

-- 9. WINS
CREATE TABLE public.wins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('call', 'demo', 'deal', 'post', 'client')),
    description     TEXT NOT NULL CHECK (LENGTH(description) >= 10),
    hubspot_id      TEXT,
    belt_at_time    TEXT,
    xp_earned       INTEGER DEFAULT 0,
    posted_to_slack BOOLEAN DEFAULT FALSE,
    date            DATE DEFAULT CURRENT_DATE,
    logged_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wins_user ON public.wins(user_id);
CREATE INDEX idx_wins_date ON public.wins(user_id, date DESC);
CREATE INDEX idx_wins_type ON public.wins(user_id, type);

-- 10. HABITS
CREATE TABLE public.habits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    description     TEXT,
    category        TEXT DEFAULT 'sales',
    time_of_day     TEXT,
    is_system       BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    order_index     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habits_user ON public.habits(user_id);
CREATE INDEX idx_habits_active ON public.habits(user_id, is_active);

-- 11. HABIT_LOGS
CREATE TABLE public.habit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    habit_id        UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    date            DATE DEFAULT CURRENT_DATE,
    completed_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, habit_id, date)         -- Cheat-proof: one log per habit per day
);

CREATE INDEX idx_habit_logs_user_date ON public.habit_logs(user_id, date DESC);

-- 12. RESOURCES
CREATE TABLE public.resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    type            TEXT DEFAULT 'document' CHECK (type IN ('pdf', 'video', 'doc', 'link', 'course')),
    url             TEXT,
    description     TEXT,
    module_ids      UUID[] DEFAULT '{}',
    is_featured     BOOLEAN DEFAULT FALSE,
    is_published    BOOLEAN DEFAULT TRUE,
    added_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
    team_id         UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    view_count      INTEGER DEFAULT 0,
    version         INTEGER DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resources_team ON public.resources(team_id);
CREATE INDEX idx_resources_published ON public.resources(is_published);

-- 13. NOTIFICATIONS
CREATE TABLE public.notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    action_url      TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    tier            INTEGER DEFAULT 3 CHECK (tier BETWEEN 1 AND 4),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE is_read = FALSE;

-- 14. AUDIT_LOGS
CREATE TABLE public.audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,
    target_type     TEXT,
    target_id       UUID,
    xp_delta        INTEGER DEFAULT 0,
    metadata        JSONB DEFAULT '{}',
    ip_address      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- 15. GAMIFICATION_RULES
CREATE TABLE public.gamification_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    rule_key    TEXT NOT NULL,
    xp_value    INTEGER NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    updated_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, rule_key)
);

CREATE INDEX idx_gamification_team ON public.gamification_rules(team_id);

-- 16. TEAM_CHALLENGES
CREATE TABLE public.team_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    challenge_type  TEXT,
    target_value    INTEGER,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    prize_description TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_team ON public.team_challenges(team_id, is_active);

-- 17. PUSH_SUBSCRIPTIONS (for PWA push notifications)
CREATE TABLE public.push_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint        TEXT NOT NULL,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    device_info     JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_user ON public.push_subscriptions(user_id, is_active);

-- 18. XP_LEDGER (immutable record of every XP transaction)
CREATE TABLE public.xp_ledger (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,
    xp_amount       INTEGER NOT NULL,
    reference_id    UUID,       -- ID of the win/lesson/quiz/habit that triggered this
    reference_type  TEXT,
    verified        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_ledger_user ON public.xp_ledger(user_id, created_at DESC);

-- ============================================================
-- TRIGGERS (auto-update updated_at)
-- ============================================================

CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_progress_updated_at BEFORE UPDATE ON public.user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_modules_updated_at BEFORE UPDATE ON public.modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE USER PROGRESS ON NEW USER
-- ============================================================

CREATE OR REPLACE FUNCTION create_user_progress_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_progress (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_user_progress
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION create_user_progress_on_signup();

-- ============================================================
-- DEFAULT GAMIFICATION RULES SEEDER
-- Called after creating a team
-- ============================================================

CREATE OR REPLACE FUNCTION seed_gamification_rules(p_team_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.gamification_rules (team_id, rule_key, xp_value) VALUES
        (p_team_id, 'lesson_complete', 25),
        (p_team_id, 'quiz_pass_60', 45),
        (p_team_id, 'quiz_pass_80', 65),
        (p_team_id, 'quiz_pass_90', 75),
        (p_team_id, 'call_logged', 10),
        (p_team_id, 'demo_logged', 25),
        (p_team_id, 'deal_closed', 100),
        (p_team_id, 'win_logged', 15),
        (p_team_id, 'habit_complete', 5),
        (p_team_id, 'streak_7_day_bonus', 10),
        (p_team_id, 'streak_14_day_bonus', 20),
        (p_team_id, 'streak_30_day_bonus', 35),
        (p_team_id, 'streak_60_day_bonus', 50),
        (p_team_id, 'belt_advance', 200),
        (p_team_id, 'first_deal', 250),
        (p_team_id, 'tenth_deal', 500),
        (p_team_id, 'module_complete', 100),
        (p_team_id, 'day_30_checkin', 150),
        (p_team_id, 'black_belt_complete', 1000),
        (p_team_id, 'resource_viewed', 10)
    ON CONFLICT (team_id, rule_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION seed_rules_on_team_create()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM seed_gamification_rules(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_seed_gamification
    AFTER INSERT ON public.teams
    FOR EACH ROW EXECUTE FUNCTION seed_rules_on_team_create();

-- ============================================================
-- DEFAULT SYSTEM HABITS SEEDER
-- Called when a user is created
-- ============================================================

CREATE OR REPLACE FUNCTION seed_default_habits(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.habits (user_id, label, description, category, time_of_day, is_system, order_index) VALUES
        (p_user_id, 'Review HubSpot pipeline', 'Check all open deals and update stages', 'sales', 'morning', TRUE, 1),
        (p_user_id, 'Make 10 calls', 'Log outbound calls in HubSpot', 'sales', 'morning', TRUE, 2),
        (p_user_id, 'Send 5 follow-up emails', 'Follow up on yesterday contacts', 'sales', 'morning', TRUE, 3),
        (p_user_id, 'Complete one lesson', 'Finish a training module lesson', 'learning', 'morning', TRUE, 4),
        (p_user_id, 'Update deal notes', 'Add notes to all active deals', 'sales', 'afternoon', TRUE, 5),
        (p_user_id, 'Log wins', 'Record any calls, demos, or deals', 'sales', 'afternoon', TRUE, 6),
        (p_user_id, 'Review next day plan', 'Prepare your HubSpot tasks for tomorrow', 'sales', 'evening', TRUE, 7)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION seed_habits_on_user_create()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM seed_default_habits(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_seed_habits
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION seed_habits_on_user_create();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_challenges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger           ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- TEAMS
-- -------------------------------------------------------
CREATE POLICY "teams_members_can_read" ON public.teams
    FOR SELECT USING (
        id = get_my_team_id()
        OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid())
    );

CREATE POLICY "managers_can_update_own_team" ON public.teams
    FOR UPDATE USING (
        manager_id = auth.uid() OR get_my_role() = 'owner'
    );

CREATE POLICY "owners_can_create_teams" ON public.teams
    FOR INSERT WITH CHECK (TRUE); -- handled via Edge Function with service role

-- -------------------------------------------------------
-- USERS
-- -------------------------------------------------------
CREATE POLICY "users_read_own" ON public.users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "managers_read_team_members" ON public.users
    FOR SELECT USING (
        is_manager_or_owner() AND team_id = get_my_team_id()
    );

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (id = auth.uid());

-- -------------------------------------------------------
-- TEAM_MEMBERS
-- -------------------------------------------------------
CREATE POLICY "team_members_read_own_team" ON public.team_members
    FOR SELECT USING (team_id = get_my_team_id());

CREATE POLICY "managers_manage_team_members" ON public.team_members
    FOR ALL USING (is_manager_or_owner() AND team_id = get_my_team_id());

-- -------------------------------------------------------
-- USER_PROGRESS
-- -------------------------------------------------------
CREATE POLICY "users_read_own_progress" ON public.user_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own_progress" ON public.user_progress
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "managers_read_team_progress" ON public.user_progress
    FOR SELECT USING (manages_user(user_id));

-- -------------------------------------------------------
-- MODULES
-- -------------------------------------------------------
CREATE POLICY "all_can_read_published_modules" ON public.modules
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "managers_manage_modules" ON public.modules
    FOR ALL USING (is_manager_or_owner());

-- -------------------------------------------------------
-- LESSONS
-- -------------------------------------------------------
CREATE POLICY "all_can_read_published_lessons" ON public.lessons
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "managers_manage_lessons" ON public.lessons
    FOR ALL USING (is_manager_or_owner());

-- -------------------------------------------------------
-- QUIZ_QUESTIONS
-- -------------------------------------------------------
CREATE POLICY "all_can_read_quiz_questions" ON public.quiz_questions
    FOR SELECT USING (TRUE); -- filtered by module which has its own RLS

CREATE POLICY "managers_manage_quiz_questions" ON public.quiz_questions
    FOR ALL USING (is_manager_or_owner());

-- -------------------------------------------------------
-- QUIZ_ATTEMPTS
-- -------------------------------------------------------
CREATE POLICY "users_read_own_attempts" ON public.quiz_attempts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_attempts" ON public.quiz_attempts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "managers_read_team_attempts" ON public.quiz_attempts
    FOR SELECT USING (manages_user(user_id));

-- -------------------------------------------------------
-- WINS
-- -------------------------------------------------------
CREATE POLICY "users_manage_own_wins" ON public.wins
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "managers_read_team_wins" ON public.wins
    FOR SELECT USING (manages_user(user_id));

-- -------------------------------------------------------
-- HABITS
-- -------------------------------------------------------
CREATE POLICY "users_manage_own_habits" ON public.habits
    FOR ALL USING (user_id = auth.uid());

-- -------------------------------------------------------
-- HABIT_LOGS
-- -------------------------------------------------------
CREATE POLICY "users_manage_own_habit_logs" ON public.habit_logs
    FOR ALL USING (user_id = auth.uid());

-- -------------------------------------------------------
-- RESOURCES
-- -------------------------------------------------------
CREATE POLICY "team_members_read_published_resources" ON public.resources
    FOR SELECT USING (
        is_published = TRUE AND team_id = get_my_team_id()
    );

CREATE POLICY "managers_manage_resources" ON public.resources
    FOR ALL USING (
        is_manager_or_owner() AND team_id = get_my_team_id()
    );

-- -------------------------------------------------------
-- NOTIFICATIONS
-- -------------------------------------------------------
CREATE POLICY "users_manage_own_notifications" ON public.notifications
    FOR ALL USING (user_id = auth.uid());

-- -------------------------------------------------------
-- AUDIT_LOGS
-- -------------------------------------------------------
CREATE POLICY "managers_read_team_audit" ON public.audit_logs
    FOR SELECT USING (manages_user(user_id) OR user_id = auth.uid());

-- No INSERT from client — audit logs written only via Edge Functions

-- -------------------------------------------------------
-- GAMIFICATION_RULES
-- -------------------------------------------------------
CREATE POLICY "team_members_read_rules" ON public.gamification_rules
    FOR SELECT USING (team_id = get_my_team_id());

CREATE POLICY "managers_manage_rules" ON public.gamification_rules
    FOR ALL USING (
        is_manager_or_owner() AND team_id = get_my_team_id()
    );

-- -------------------------------------------------------
-- TEAM_CHALLENGES
-- -------------------------------------------------------
CREATE POLICY "team_members_read_challenges" ON public.team_challenges
    FOR SELECT USING (team_id = get_my_team_id());

CREATE POLICY "managers_manage_challenges" ON public.team_challenges
    FOR ALL USING (
        is_manager_or_owner() AND team_id = get_my_team_id()
    );

-- -------------------------------------------------------
-- PUSH_SUBSCRIPTIONS
-- -------------------------------------------------------
CREATE POLICY "users_manage_own_subscriptions" ON public.push_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- -------------------------------------------------------
-- XP_LEDGER
-- -------------------------------------------------------
CREATE POLICY "users_read_own_xp" ON public.xp_ledger
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "managers_read_team_xp" ON public.xp_ledger
    FOR SELECT USING (manages_user(user_id));

-- XP ledger is INSERT-only from server, no client writes

-- ============================================================
-- LEADERBOARD VIEWS (for query performance)
-- ============================================================

CREATE OR REPLACE VIEW public.leaderboard_calls_weekly AS
SELECT
    u.id,
    u.name,
    u.avatar_url,
    up.belt_rank,
    COUNT(w.id) AS call_count,
    DATE_TRUNC('week', NOW()) AS week_start
FROM public.users u
JOIN public.user_progress up ON up.user_id = u.id
LEFT JOIN public.wins w ON
    w.user_id = u.id AND
    w.type = 'call' AND
    w.date >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY u.id, u.name, u.avatar_url, up.belt_rank
ORDER BY call_count DESC;

CREATE OR REPLACE VIEW public.leaderboard_deals_weekly AS
SELECT
    u.id,
    u.name,
    u.avatar_url,
    up.belt_rank,
    COUNT(w.id) AS deal_count,
    DATE_TRUNC('week', NOW()) AS week_start
FROM public.users u
JOIN public.user_progress up ON up.user_id = u.id
LEFT JOIN public.wins w ON
    w.user_id = u.id AND
    w.type = 'deal' AND
    w.date >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY u.id, u.name, u.avatar_url, up.belt_rank
ORDER BY deal_count DESC;

-- ============================================================
-- SEED: Module content structure (titles and metadata)
-- Full content populated via manager after launch
-- ============================================================

INSERT INTO public.modules (order_index, title, subtitle, icon_name, required_day, xp_lessons, xp_quiz) VALUES
    (1,  'HubSpot Fundamentals',          'Master your primary sales tool',          'database',     0,  25, 75),
    (2,  'Lead Scoring and Engagement',   'Understand how engagement scores work',    'chart-rising', 0,  25, 75),
    (3,  'The Sales Pipeline',            '5 stages from new lead to won deal',       'pipeline',     7,  25, 75),
    (4,  'Deal Teams and Handoffs',        'Know your role in the deal ecosystem',    'handshake',    7,  25, 75),
    (5,  'Order Forms and Agreements',     'ONIT execution and signing workflows',    'document-sign',14, 25, 75),
    (6,  'PartnerHub and Partner Mgmt',   'Tools and resources for partners',         'hub',          14, 25, 75),
    (7,  'Commissions, Pricing, Promos',  'Licensing fees, bonuses, approvals',       'coin',         14, 25, 75),
    (8,  'Nextiva and Field Sales',       'Integrated calling and SMS',               'phone',        0,  25, 75),
    (9,  'ONIT Order Form Execution',     'Step-by-step order form workflow',         'checklist',    14, 25, 75),
    (10, 'Integrations and Partner API',  'Six-stage integration pipeline',           'integration',  30, 25, 75),
    (11, 'The Full Product Suite',        'SmartCredit, ScoreMaster, and more',       'products',     7,  25, 75),
    (12, 'Your ConsumerDirect Team',      'Roles, responsibilities, and who to call', 'org-chart',    0,  25, 75),
    (13, 'Competitive Positioning',       'Win against Array, IDIQ, and others',      'target',       30, 25, 75)
ON CONFLICT DO NOTHING;
