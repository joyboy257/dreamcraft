const CACHE_PREFIX = "dreamcraft-";
const CACHE_VERSION = "v1";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const CURRENT_CACHES = new Set([SHELL_CACHE, RUNTIME_CACHE]);
const SHELL_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/dreamcraft-192.svg",
  "/icons/dreamcraft-512.svg",
];

async function discoverBuiltAssets() {
  const response = await globalThis.fetch("/index.html");
  if (!response.ok) return [];
  const html = await response.text();
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], globalThis.location.origin))
    .filter((url) => url.origin === globalThis.location.origin && url.pathname.startsWith("/assets/"))
    .map((url) => url.pathname);
}

globalThis.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await globalThis.caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_URLS);
    const builtAssets = await discoverBuiltAssets();
    if (builtAssets.length > 0) await cache.addAll(builtAssets);
    await globalThis.skipWaiting();
  })());
});

globalThis.addEventListener("activate", (event) => {
  event.waitUntil(
    globalThis.caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.has(key))
          .map((key) => globalThis.caches.delete(key)),
      ))
      .then(() => globalThis.clients.claim()),
  );
});

async function cacheSuccessfulResponse(cacheName, request, response) {
  if (response.ok && (response.type === "basic" || response.type === "default")) {
    const cache = await globalThis.caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await globalThis.fetch(request);
    return await cacheSuccessfulResponse(RUNTIME_CACHE, request, response);
  } catch {
    return await globalThis.caches.match(request, { ignoreVary: true })
      ?? await globalThis.caches.match("/", { ignoreVary: true })
      ?? await globalThis.caches.match("/offline.html", { ignoreVary: true })
      ?? new Response("DreamCraft is offline.", { status: 503 });
  }
}

async function cacheFirstAsset(request) {
  // Vite preview and several CDNs emit `Vary: Origin`; install-time fetches do
  // not carry the same Origin header as module/style requests. The worker only
  // handles same-origin URLs, so ignoring that header variance is safe here.
  const cached = await globalThis.caches.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await globalThis.fetch(request);
  return cacheSuccessfulResponse(RUNTIME_CACHE, request, response);
}

globalThis.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== globalThis.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});
