const CACHE_NAME = "halolaba-v2.1"
const STATIC_CACHE = "halolaba-static-v2.1"
const DYNAMIC_CACHE = "halolaba-dynamic-v2.1"

// Static assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/pos",
  "/reports",
  "/inventory",
  "/debts",
  "/expenses",
  "/restock",
  "/operational",
  "/guide",
  "/manifest.json",
  "/offline.html",
  "/_next/static/css/app/layout.css",
  "/_next/static/chunks/webpack.js",
  "/_next/static/chunks/main.js",
  "/_next/static/chunks/pages/_app.js",
]

// Dynamic assets patterns
const DYNAMIC_PATTERNS = [
  /\/_next\/static\/.*/,
  /\/api\/.*/,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:js|css|woff2|woff|ttf)$/,
]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("SW: Installing service worker...")

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("SW: Caching static assets")
        return cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: "reload" })))
      }),
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ]),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("SW: Activating service worker...")

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                console.log("SW: Deleting old cache:", cacheName)
                return caches.delete(cacheName)
              }
            }),
          )
        }),
      // Take control of all clients
      self.clients.claim(),
    ]),
  )
})

// Fetch event - serve from cache with network fallback
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") return

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith("http")) return

  event.respondWith(handleFetch(request))
})

async function handleFetch(request) {
  const url = new URL(request.url)

  try {
    // Strategy 1: Static assets - Cache First
    if (
      STATIC_ASSETS.some((asset) => url.pathname === asset) ||
      DYNAMIC_PATTERNS.some((pattern) => pattern.test(url.pathname))
    ) {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        // Update cache in background
        updateCache(request)
        return cachedResponse
      }

      // Fetch and cache
      const networkResponse = await fetch(request)
      if (networkResponse.ok) {
        const cache = await caches.open(STATIC_ASSETS.includes(url.pathname) ? STATIC_CACHE : DYNAMIC_CACHE)
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    }

    // Strategy 2: API calls - Network First with cache fallback
    if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) {
      try {
        const networkResponse = await fetch(request)

        // Cache successful responses
        if (networkResponse.ok && request.method === "GET") {
          const cache = await caches.open(DYNAMIC_CACHE)
          cache.put(request, networkResponse.clone())
        }

        return networkResponse
      } catch (error) {
        // Fallback to cache for GET requests
        if (request.method === "GET") {
          const cachedResponse = await caches.match(request)
          if (cachedResponse) {
            return cachedResponse
          }
        }
        throw error
      }
    }

    // Strategy 3: Navigation requests - Cache First with network fallback
    if (request.mode === "navigate") {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        // Update cache in background
        updateCache(request)
        return cachedResponse
      }

      try {
        const networkResponse = await fetch(request)
        if (networkResponse.ok) {
          const cache = await caches.open(STATIC_CACHE)
          cache.put(request, networkResponse.clone())
        }
        return networkResponse
      } catch (error) {
        // Return offline page for navigation failures
        return caches.match("/offline.html")
      }
    }

    // Default: Network first
    return await fetch(request)
  } catch (error) {
    console.log("SW: Fetch failed:", error)

    // Return cached version if available
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      return caches.match("/offline.html")
    }

    // Return a basic offline response
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" },
    })
  }
}

// Background cache update
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const url = new URL(request.url)
      const cacheName = STATIC_ASSETS.includes(url.pathname) ? STATIC_CACHE : DYNAMIC_CACHE
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse)
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("SW: Background sync triggered:", event.tag)

  if (event.tag === "sync-offline-data") {
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  try {
    // Sync any queued offline operations
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({ type: "SYNC_OFFLINE_DATA" })
    })
  } catch (error) {
    console.log("SW: Sync failed:", error)
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }

      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    }),
  )
})

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-stock-levels") {
    event.waitUntil(checkStockLevels())
  }
})

async function checkStockLevels() {
  try {
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({ type: "CHECK_STOCK_LEVELS" })
    })
  } catch (error) {
    console.log("SW: Stock check failed:", error)
  }
}
