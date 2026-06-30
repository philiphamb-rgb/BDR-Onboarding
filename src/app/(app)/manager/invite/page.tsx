import { redirect } from 'next/navigation'

// Inviting teammates now lives inside Roles & Permissions (role is required at
// invite), so the standalone invite screen is retired. Keep the route alive as
// a redirect so old links and bookmarks still land in the right place.
export default function InviteRedirect() {
  redirect('/manager/roles')
}
