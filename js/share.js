"use strict";

/* =========================================================
   J TEC DOWNLOADER
   Share Target handling + clipboard auto-paste.
   ========================================================= */

(function () {

    function extractUrl(...candidates) {
        for (const candidate of candidates) {
            if (!candidate) continue;
            const match = candidate.match(/https?:\/\/\S+/);
            if (match) return match[0];
        }
        return null;
    }

    function init() {
        registerServiceWorker();
        handleShareTarget();
        bindPasteButton();
        tryAutoPasteFromClipboard();
    }

    /* -----------------------------------------------------
       SERVICE WORKER (required for installability)
    ----------------------------------------------------- */

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return;

        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("./service-worker.js")
                .catch(() => {
                    /* Installability is a bonus, never block the app. */
                });
        });
    }

    /* -----------------------------------------------------
       SHARE TARGET
       Someone tapped "Share" in TikTok/IG/YouTube/etc and
       picked J TEC Downloader. Auto-fill the link and go
       straight to downloading it -- no extra taps.
    ----------------------------------------------------- */

    function handleShareTarget() {
        const params = new URLSearchParams(window.location.search);

        const url = extractUrl(
            params.get("shared_url"),
            params.get("text"),
            params.get("title")
        );

        if (!url) return;

        // Clean the share params out of the address bar.
        window.history.replaceState({}, "", window.location.pathname);

        window.addEventListener("load", () => {
            setTimeout(() => runSharedDownload(url), 300);
        });
    }

    async function runSharedDownload(url) {
        const input = document.getElementById("media-url");
        const errorBox = document.getElementById("error-message");

        if (!input) return;

        input.value = url;
        input.dispatchEvent(new Event("input"));

        document.getElementById("top")?.scrollIntoView();

        await JTEC.getMedia();

        // getMedia() shows an error box on failure -- if that
        // happened, stop here and let the user see why instead
        // of trying to download nothing.
        if (errorBox && !errorBox.hidden) return;

        JTEC.download();
    }

    /* -----------------------------------------------------
       PASTE BUTTON (reliable, works inside a click handler
       even where silent clipboard reads are blocked)
    ----------------------------------------------------- */

    function bindPasteButton() {
        const button = document.getElementById("paste-url-button");
        const input = document.getElementById("media-url");

        if (!button || !input) return;

        button.addEventListener("click", async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    input.value = text.trim();
                    input.dispatchEvent(new Event("input"));
                }
            } catch {
                input.focus();
            }
        });
    }

    /* -----------------------------------------------------
       BEST-EFFORT AUTO-PASTE ON OPEN
       Browsers block silent clipboard reads without a user
       gesture, so this quietly does nothing when blocked --
       the Paste button above always works as a fallback.
    ----------------------------------------------------- */

    async function tryAutoPasteFromClipboard() {
        if (!navigator.clipboard?.readText) return;

        const input = document.getElementById("media-url");
        if (!input || input.value) return;

        try {
            const text = await navigator.clipboard.readText();
            const url = extractUrl(text);

            if (url) {
                input.value = url;
                input.dispatchEvent(new Event("input"));
            }
        } catch {
            /* No permission yet -- that's fine, ignore. */
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
