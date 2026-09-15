"use strict";

/* =========================================================
   J TEC DOWNLOADER
   Minimal service worker.

   Its only job is to make the app installable and load the
   shell instantly. It does NOT cache API calls or downloaded
   media -- those always go straight to the network.
   ========================================================= */

const CACHE_NAME = "jtec-shell-v1";

const SHELL_FILES = [
    "./",
    "./index.html",
    "./css/style.css",
    "./js/config.js",
    "./js/i18n.js",
    "./js/app.js",
    "./js/panel.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(
                names
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Never intercept API calls -- info/download requests must
    // always hit the real backend, never a cached response.
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            return (
                cached ||
                fetch(event.request).catch(() => cached)
            );
        })
    );
});
