import { redirect } from 'next/navigation'

// Certificate now lives inside the Progress hub (belt journey + certificate +
// stats). Keep this route as a redirect so existing links/bookmarks still work.
export default function CertificatePage() {
  redirect('/progress')
}
