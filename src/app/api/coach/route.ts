// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, userId, history = [] } = await request.json()

    // Fetch user context for personalized coaching
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name, start_date')
      .eq('id', userId)
      .single()

    const { data: progress } = await supabase
      .from('user_progress')
      .select('total_xp, current_streak, days_active, calls_this_week, demos_this_week, deals_this_month')
      .eq('user_id', userId)
      .single()

    const { data: recentWins } = await supabase
      .from('wins')
      .select('win_type, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: moduleProgress } = await supabase
      .from('quiz_attempts')
      .select('lesson_id, score, passed')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Build context
    const days = progress?.days_active ?? 0
    const belt = days >= 90 ? 'Black' : days >= 70 ? 'Purple' : days >= 50 ? 'Blue' :
      days >= 30 ? 'Green' : days >= 14 ? 'Orange' : days >= 7 ? 'Yellow' : 'White'

    const systemPrompt = `You are an expert sales coach at ConsumerDirect, a mortgage company. You provide concise, actionable advice to BDRs (Business Development Representatives).

ABOUT THIS BDR:
- Name: ${userData?.first_name ?? 'BDR'} ${userData?.last_name ?? ''}
- Belt rank: ${belt} Belt (Day ${days})
- Total XP: ${progress?.total_xp ?? 0}
- Current streak: ${progress?.current_streak ?? 0} days
- Calls this week: ${progress?.calls_this_week ?? 0}
- Demos this week: ${progress?.demos_this_week ?? 0}
- Deals this month: ${progress?.deals_this_month ?? 0}
${recentWins?.length ? `\nRECENT WINS:\n${recentWins.map(w => `- ${w.win_type}: ${w.description}`).join('\n')}` : ''}

COACHING STYLE:
- Be direct, practical, and encouraging
- Give specific, actionable tips (not generic advice)
- Reference their metrics when relevant to personalize advice
- Keep responses concise (2-4 short paragraphs max)
- Use bullet points for lists of tips
- Focus on mortgage/lending sales context
- Celebrate wins when relevant
- Be a motivating but honest coach

ConsumerDirect sells mortgage products. BDRs call leads, run demos, and close deals.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...history.map((h: { role: string; content: string }) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user', content: message },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    const responseText = textContent?.text ?? "I couldn't generate a response. Please try again."

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('Coach API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
