/**
 * Returns a Supabase client with `any` types to avoid TypeScript `never` errors
 * when querying tables not in the local Database type.
 * Use only where needed; prefer the typed client everywhere else.
 */
import { createClient as createBrowserClient } from './client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createUntypedClient(): any {
  return createBrowserClient() as any
}
