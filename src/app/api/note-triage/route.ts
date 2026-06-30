// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Turn a free-form note into structure: a category, tags, and extracted action
// items (each with an estimate + priority). Returns strict JSON. The client
// falls back to its deterministic triage if this fails, so it's best-effort.
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text } = await request.json()
    const clean = String(text ?? '').slice(0, 6000).trim()
    if (!clean) return NextResponse.json({ category: 'General', tags: [], tasks: [] })

    const sys = `You organize a BDR's (sales rep's) raw notes into structure. Reply with ONLY valid minified JSON, no prose, matching exactly:
{"category":"Selling|Admin|Planning|Learning|Personal|General","tags":["short-tag", ...up to 5],"tasks":[{"title":"actionable task","estimate":<minutes int>,"priority":<true|false>}]}
Rules:
- category: the single best fit for the note overall.
- tags: short lowercase keywords (no #).
- tasks: ONLY genuine action items the rep should do; rewrite each as a crisp imperative. estimate = realistic minutes (10/15/20/30/45/60/90). priority true only if urgent/time-sensitive. If there are no real action items, return [].`

    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: sys,
      messages: [{ role: 'user', content: `Note:\n\n${clean}` }],
    })
    const raw = resp.content.find(c => c.type === 'text')?.text ?? '{}'
    const jsonStr = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    let parsed: any = {}
    try { parsed = JSON.parse(jsonStr) } catch { parsed = {} }
    return NextResponse.json({
      category: typeof parsed.category === 'string' ? parsed.category : 'General',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(t => typeof t === 'string').slice(0, 5) : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.filter(t => t && typeof t.title === 'string').slice(0, 12).map(t => ({
        title: String(t.title).slice(0, 200),
        estimate: Math.min(180, Math.max(5, parseInt(t.estimate, 10) || 30)),
        priority: !!t.priority,
      })) : [],
    })
  } catch (e) {
    console.error('note-triage error', e)
    return NextResponse.json({ category: 'General', tags: [], tasks: [] })
  }
}
