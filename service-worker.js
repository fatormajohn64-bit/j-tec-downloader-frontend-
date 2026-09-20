"use strict";

/* =========================================================
   J TEC DOWNLOADER
   Minimal service worker.

   Its only real job is to satisfy Chrome's "installable"
   requirement. It does NOT cache API calls or downloaded
   media -- those always go straight to the network.

   IMPORTANT: this uses a network-first strategy for the app
   shell. Always try the real network first; only fall back
   to a cached copy if the network request fails (e.g. no
   connection). This means every fresh page load picks up
   whatever is actually deployed -- no stale "the app won't
   update" behavior, and no manual uninstall/reinstall dance
   needed after a deploy.
   ========================================================= */

// Bump this string any time you want to force every installed
// copy to drop its old cache on next load.
const CACHE_NAME = "jtec-shell-v2";

const SHELL_FILES = [
    "./",
    "./index.html",
    "./css/style.css",
    "./js/config.js",
    "./js/i18n.js",
    "./js/app.js",
    "./js/panel.js",
    "./js/share.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            cache.addAll(SHELL_FILES).catch(() => {
                /* Best effort -- an offline fallback is a bonus,
                   never block installation over it. */
            })
        )
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

    // Only handle simple GETs for the app shell -- everything
    // else (like a share-target navigation with query params)
    // should just go straight to the network untouched.
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) =>
                    cache.put(event.request, copy)
                );
                return response;
            })
            .catch(() =>
                caches.match(event.request)
            )
    );
});
