-- ============================================================
-- BDR OS v2 — Migration 002
-- Add columns needed by the application
-- ============================================================

-- Add first_name, last_name, phone, onboarding_completed to users
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name  TEXT,
    ADD COLUMN IF NOT EXISTS phone      TEXT,
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Backfill first_name / last_name from name column
UPDATE public.users
SET
    first_name = SPLIT_PART(name, ' ', 1),
    last_name  = NULLIF(TRIM(SUBSTRING(name FROM POSITION(' ' IN name) + 1)), '')
WHERE first_name IS NULL;

-- Add last_active_date and days_active alias to user_progress
ALTER TABLE public.user_progress
    ADD COLUMN IF NOT EXISTS last_active_date DATE,
    ADD COLUMN IF NOT EXISTS days_active      INTEGER DEFAULT 0;

-- days_active tracks the same metric as belt_day; keep in sync via trigger
CREATE OR REPLACE FUNCTION sync_days_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.days_active = NEW.belt_day;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_days_active ON public.user_progress;
CREATE TRIGGER trg_sync_days_active
    BEFORE INSERT OR UPDATE ON public.user_progress
    FOR EACH ROW EXECUTE FUNCTION sync_days_active();

-- Update existing rows
UPDATE public.user_progress SET days_active = belt_day;

-- Add calls_this_week, demos_this_week, deals_this_month to user_progress
ALTER TABLE public.user_progress
    ADD COLUMN IF NOT EXISTS calls_this_week  INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS demos_this_week  INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deals_this_month INTEGER DEFAULT 0;

-- Add lesson_id to quiz_attempts so quiz can be per-lesson as well
ALTER TABLE public.quiz_attempts
    ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS passed    BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS answers_given JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMPTZ DEFAULT NOW();

-- Backfill passed from percentage
UPDATE public.quiz_attempts SET passed = (percentage >= 70) WHERE passed IS NULL;

-- Add amount to wins for deal tracking
ALTER TABLE public.wins
    ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);

-- Add resource_type alias for resources.type
ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS resource_type TEXT
    GENERATED ALWAYS AS (type) STORED;

-- Add lesson_type alias for lessons
ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS lesson_type TEXT DEFAULT 'lesson',
    ADD COLUMN IF NOT EXISTS pass_threshold INTEGER DEFAULT 70,
    ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;

-- Add message alias for notifications (body is the primary field)
-- notifications already has title + body

-- Add win_type alias  
ALTER TABLE public.wins
    ADD COLUMN IF NOT EXISTS win_type TEXT
    GENERATED ALWAYS AS (type) STORED;

-- Add habit name alias (label is the primary field)
-- We'll just use label in code

-- Add notification_type alias
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS notification_type TEXT
    GENERATED ALWAYS AS (type) STORED;

-- Add message field as generated alias for notifications
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS message TEXT
    GENERATED ALWAYS AS (body) STORED;

-- Ensure modules have is_active alias for is_published
ALTER TABLE public.modules
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;

-- Sync is_active with is_published
UPDATE public.modules SET is_active = is_published;

CREATE OR REPLACE FUNCTION sync_module_is_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_active = NEW.is_published;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_module_is_active ON public.modules;
CREATE TRIGGER trg_module_is_active
    BEFORE INSERT OR UPDATE ON public.modules
    FOR EACH ROW EXECUTE FUNCTION sync_module_is_active();

-- Add habit logged_date alias
ALTER TABLE public.habit_logs
    ADD COLUMN IF NOT EXISTS logged_date DATE
    GENERATED ALWAYS AS (date) STORED;
