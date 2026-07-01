// @ts-nocheck
// Apex — the multi-model AI routing engine. Each task type is routed to the model
// best suited to it, with a graceful fall-through to Claude when a provider's key
// isn't configured — so nothing breaks before the keys are set.
//
//   coach / creative  → ChatGPT (OpenAI)      conversational + visual/creative
//   operational       → Claude (Anthropic)    code, logic, synthesis, structure
//   research          → Perplexity            search-augmented, up-to-date facts
//
// Providers are resolved at call time from env keys (OPENAI_API_KEY,
// ANTHROPIC_API_KEY, PERPLEXITY_API_KEY). Both a streaming and a non-streaming
// entrypoint are exposed; the streaming one preserves the coach's token-by-token
// UX regardless of which provider serves the request.

import Anthropic from '@anthropic-ai/sdk'

export type AiTask = 'coach' | 'creative' | 'operational' | 'research'
type Provider = 'openai' | 'anthropic' | 'perplexity'

const KEYS: Record<Provider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  perplexity: process.env.PERPLEXITY_API_KEY,
}
const MODEL: Record<Provider, string> = {
  openai: process.env.OPENAI_MODEL || 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  perplexity: process.env.PERPLEXITY_MODEL || 'sonar',
}
const BASE: Record<Provider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: '',                 // uses the SDK
  perplexity: 'https://api.perplexity.ai',
}

// Ordered preference per task; first provider with a key wins, else Claude.
const ROUTES: Record<AiTask, Provider[]> = {
  coach: ['openai', 'anthropic'],
  creative: ['openai', 'anthropic'],
  operational: ['anthropic', 'openai'],
  research: ['perplexity', 'anthropic'],
}

export function hasProvider(p: Provider) { return !!KEYS[p] }

export function resolveProvider(task: AiTask): { provider: Provider; model: string } {
  for (const p of ROUTES[task]) if (KEYS[p]) return { provider: p, model: MODEL[p] }
  return { provider: 'anthropic', model: MODEL.anthropic }   // base assumption: Claude key present
}

// Lazy, guarded Anthropic client. Constructed only when a key exists, so the
// module never throws at import time if ANTHROPIC_API_KEY is somehow absent.
let _anthropic: Anthropic | null = null
function anthropicClient(): Anthropic | null {
  if (!KEYS.anthropic) return null
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: KEYS.anthropic })
  return _anthropic
}
const enc = new TextEncoder()
const downStream = () => new ReadableStream<Uint8Array>({ start(c) { c.enqueue(enc.encode("I'm having trouble connecting right now. Try again in a moment.")); c.close() } })

// Parse one SSE line; enqueue its token if present. Returns 'done' on the
// terminal sentinel so the caller can close the stream.
function emit(line: string, controller: ReadableStreamDefaultController<Uint8Array>): 'done' | void {
  const t = line.trim()
  if (!t.startsWith('data:')) return
  const data = t.slice(5).trim()
  if (data === '[DONE]') return 'done'
  if (!data) return
  try { const tok = JSON.parse(data).choices?.[0]?.delta?.content; if (tok) controller.enqueue(enc.encode(tok)) } catch { /* keepalive / partial */ }
}

// ── Streaming: returns a plain-text token stream regardless of provider ──────
export async function streamText({ task, system, messages, maxTokens = 500 }: { task: AiTask; system: string; messages: { role: string; content: string }[]; maxTokens?: number }): Promise<ReadableStream<Uint8Array>> {
  const { provider, model } = resolveProvider(task)
  // OpenAI + Perplexity are OpenAI-compatible SSE. If the provider is keyed but
  // the request fails at runtime (bad key, rate limit, network), fall back to
  // Claude rather than surfacing a dead stream — provided a Claude key exists.
  if (provider !== 'anthropic') {
    const res = await openaiCompatFetch(provider, model, system, messages, maxTokens).catch(() => null)
    if (res && res.ok && res.body) return openaiCompatStreamFrom(res)
    return anthropicStream(MODEL.anthropic, system, messages, maxTokens)   // graceful fall-through
  }
  return anthropicStream(model, system, messages, maxTokens)
}

async function anthropicStream(model: string, system: string, messages: any[], maxTokens: number): Promise<ReadableStream<Uint8Array>> {
  const client = anthropicClient()
  if (!client) return downStream()   // no key anywhere — surface a friendly line, don't throw
  const stream = await client.messages.create({ model, max_tokens: maxTokens, system, stream: true, messages: messages.map(m => ({ role: m.role, content: m.content })) })
  return new ReadableStream({
    async start(controller) {
      try { for await (const ev of stream) { if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') controller.enqueue(enc.encode(ev.delta.text)) } }
      catch { controller.enqueue(enc.encode('\n\n(Connection interrupted — please try again.)')) }
      finally { controller.close() }
    },
  })
}

function openaiCompatFetch(provider: Provider, model: string, system: string, messages: any[], maxTokens: number) {
  return fetch(`${BASE[provider]}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEYS[provider]}` },
    body: JSON.stringify({ model, stream: true, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
  })
}

function openaiCompatStreamFrom(res: Response): ReadableStream<Uint8Array> {
  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        // Flush a final data: line that arrived without a trailing newline
        // (legal SSE) — otherwise the last token(s) get silently dropped.
        emit(buf, controller); controller.close(); return
      }
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) if (emit(line, controller) === 'done') { controller.close(); return }
    },
  })
}

// ── Non-streaming: one string back, for backend tasks (synthesis, suggestions) ──
export async function complete({ task, system, messages, maxTokens = 800 }: { task: AiTask; system: string; messages: { role: string; content: string }[]; maxTokens?: number }): Promise<string> {
  const { provider, model } = resolveProvider(task)
  // Try a keyed OpenAI/Perplexity provider first; if it errors or returns empty,
  // fall through to Claude rather than silently masking the failure as "no result".
  if (provider !== 'anthropic' && KEYS[provider]) {
    try {
      const res = await fetch(`${BASE[provider]}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEYS[provider]}` },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
      })
      if (res.ok) {
        const d = await res.json()
        const txt = d.choices?.[0]?.message?.content ?? ''
        if (txt) return txt
      } else {
        console.error('router complete: provider error', provider, res.status)
      }
    } catch (e) { console.error('router complete: provider fetch failed', provider, e) }
  }
  // Claude — the base provider (and the fallback).
  const client = anthropicClient()
  if (!client) return ''
  try {
    const r = await client.messages.create({ model: MODEL.anthropic, max_tokens: maxTokens, system, messages })
    return r.content.find(c => c.type === 'text')?.text ?? ''
  } catch (e) { console.error('router complete: anthropic failed', e); return '' }
}

// Which model actually served a task — handy for a small "routed to X" UI badge.
export function routedLabel(task: AiTask) {
  const { provider } = resolveProvider(task)
  return { openai: 'ChatGPT', anthropic: 'Claude', perplexity: 'Perplexity' }[provider]
}
