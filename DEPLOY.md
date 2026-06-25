# BDR OS v2 — One-Command Deploy

## Supabase: ALREADY DONE ✅
- Project: zbgimoasdqqprymbykqb
- URL: https://zbgimoasdqqprymbykqb.supabase.co
- 18 tables with RLS, 13 modules seeded, 2 edge functions live
- Edge functions: calculate-xp ✅, send-notification ✅

## Vercel: One command needed

### Step 1 — Add your Anthropic API key
Edit `.env.local` and replace `your-anthropic-api-key-here` with your real key from:
https://console.anthropic.com/settings/api-keys

### Step 2 — Install Vercel CLI (if needed)
```
npm install -g vercel
```

### Step 3 — Deploy (run this from the bdr-os folder)
```
vercel --prod --yes \
  -e ANTHROPIC_API_KEY="sk-ant-XXXX" \
  -e NEXT_PUBLIC_SUPABASE_URL="https://zbgimoasdqqprymbykqb.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZ2ltb2FzZHFxcHJ5bWJ5a3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTM2NjIsImV4cCI6MjA5NzkyOTY2Mn0.s0A0qj0NbYUkUattSNxJMbwnuC2tdTLa2FVXGtIXNqs"
```

Replace `sk-ant-XXXX` with your Anthropic key. That's it — live in 2 minutes.

## After Deploy

### Make Philip a manager
In Supabase dashboard → Table Editor → users
Find Philip's row → change `role` from `rep` to `manager`

### Set Philip's team
1. Insert a row in `teams`: `{ name: "ConsumerDirect BDR Team" }`
2. Update Philip's `team_id` to the new team's UUID
3. Gamification rules seed automatically on team creation

### Add your first BDR
Sign in at your Vercel URL → completes onboarding → 
In Supabase: set their `team_id` to your team's UUID

## URLs
- Supabase Dashboard: https://app.supabase.com/project/zbgimoasdqqprymbykqb
- Edge Functions: https://app.supabase.com/project/zbgimoasdqqprymbykqb/functions
