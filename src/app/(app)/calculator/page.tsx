import { redirect } from 'next/navigation'

// The Income Calculator now lives inside Analytics (one Goals & Analytics home).
// Keep this route as a redirect so existing links/bookmarks still land correctly.
export default function CalculatorPage() {
  redirect('/analytics')
}
