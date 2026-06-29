// Push-only service worker for BDR Hub.
//
// IMPORTANT: this SW intentionally has NO `fetch` handler. A previous
// next-pwa/workbox SW precached pages and rewrote redirect responses
// (opaqueredirect -> 200), which broke the auth redirect + session-cookie
// hand-off. By never intercepting fetches, this SW cannot affect navigation or
// auth — it only handles Web Push (notifications), nothing else.

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up any caches left by the old workbox SW.
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch (e) { /* ignore */ }
      await self.clients.claim()
    })()
  )
})

// Show a notification when a push arrives.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} }
  catch { data = { body: event.data && event.data.text ? event.data.text() : '' } }

  const title = data.title || 'BDR Hub'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: data.tag || data.type || undefined,
    data: { url: data.url || '/home' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Focus an existing tab (or open one) on the target URL when tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/home'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of all) {
        if (c.url.includes(url) && 'focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })()
  )
})
