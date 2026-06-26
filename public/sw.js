// Self-unregistering service worker.
//
// The previous next-pwa/workbox service worker precached the login page and
// rewrote redirect responses (opaqueredirect -> 200), which broke the auth
// redirect + session-cookie hand-off (login succeeded but /home bounced back
// to /login). This replacement immediately unregisters itself and clears all
// caches, cleaning up any browser that already installed the old SW.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch (e) {
        // ignore
      }
      try {
        await self.registration.unregister()
      } catch (e) {
        // ignore
      }
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((client) => client.navigate(client.url))
    })()
  )
})

// Never intercept fetches — everything goes straight to the network.
