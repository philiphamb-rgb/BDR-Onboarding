// @ts-nocheck
// Apex - search-augmented research. Routes to Perplexity when PERPLEXITY_API_KEY
// is set (up-to-date, internet-grounded), and falls back to Claude otherwise.
// Auth-gated; the query is sanitized and length-capped before it reaches a model.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { complete, routedLabel } from '@/lib/ai/router'

const SYS = `You are a research analyst for a ConsumerDirect Co-Brand PLUS+ BDR. Answer the research question concisely and factually. When you have up-to-date, sourced information use it; when you don't, say so plainly rather than guessing. End with ONE concrete angle the BDR could use in a partnership conversation. No preamble, no markdown headers.`

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const raw = typeof body.query === 'string' ? body.query : ''
    const query = raw.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 600)
    if (!query) return NextResponse.json({ error: 'Empty query' }, { status: 400 })

    const text = await complete({ task: 'research', system: SYS, messages: [{ role: 'user', content: query }], maxTokens: 700 })
    return NextResponse.json({ text: text || 'No result - try again.', model: routedLabel('research') })
  } catch (e) {
    console.error('research error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
