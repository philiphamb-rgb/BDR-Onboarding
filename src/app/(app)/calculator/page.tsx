import { redirect } from 'next/navigation'

// The income calculator is now the native /commissions planner. Keep this route
// as a redirect so existing links/bookmarks still land correctly.
export default function CalculatorPage() {
  redirect('/commissions')
}
