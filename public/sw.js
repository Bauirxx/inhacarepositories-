/* INHACA CONNECT — Service Worker (PWA)
 * Estratégias:
 *  - Assets estáticos (_next/static, ícones, imagens locais): cache-first.
 *  - Páginas públicas (navegações GET): network-first com fallback ao cache
 *    e, em último caso, à página /offline.
 *  - Nunca faz cache de pedidos à API do Supabase, de rotas autenticadas
 *    (dashboard, admin, chat) nem de métodos diferentes de GET.
 */
const VERSION = "v1";
const STATIC_CACHE = `inhaca-static-${VERSION}`;
const PAGES_CACHE = `inhaca-pages-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

const NEVER_CACHE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/comunidade/chat",
  "/comunidade/mensagens",
  "/notificacoes",
  "/entrar",
  "/registar",
  "/recuperar",
  "/auth/",
  "/api/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("inhaca-") && !k.endsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    /\.(?:png|jpg|jpeg|webp|avif|svg|gif|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, tiles do mapa, etc.

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  const isNavigation = request.mode === "navigate";
  if (!isNavigation) return;
  if (NEVER_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        const offline = await caches.match(OFFLINE_URL);
        return offline || new Response("Sem ligação à Internet.", { status: 503 });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
