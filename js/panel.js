"use strict";

/* =========================================================
   J TEC DOWNLOADER
   Sidebar + page panel (Downloads, Favorites, Supported
   Sites, How to Use, Settings).
   ========================================================= */

const JTecPanel = (() => {

    const STORAGE = {
        settings: "jtec_settings",
        history: "jtec_history",
        favorites: "jtec_favorites"
    };

    const DEFAULT_SETTINGS = {
        quality: "best",
        saveThumbnail: true,
        resumeOnError: true,
        notifications: false,
        theme: "dark",
        accent: "gold"
    };

    const ACCENTS = {
        gold:  { accent: "#f5c542", hover: "#ffd866" },
        blue:  { accent: "#4da3ff", hover: "#7ebcff" },
        green: { accent: "#34d399", hover: "#5fe3b3" },
        rose:  { accent: "#f5556b", hover: "#ff7d8f" }
    };

    let els = {};

    /* -----------------------------------------------------
       STORAGE HELPERS
    ----------------------------------------------------- */

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getSettings() {
        return { ...DEFAULT_SETTINGS, ...readJSON(STORAGE.settings, {}) };
    }

    function saveSettings(partial) {
        const merged = { ...getSettings(), ...partial };
        writeJSON(STORAGE.settings, merged);
        return merged;
    }

    function getHistory() {
        return readJSON(STORAGE.history, []);
    }

    function getFavorites() {
        return readJSON(STORAGE.favorites, []);
    }

    /* -----------------------------------------------------
       INIT
    ----------------------------------------------------- */

    function init() {
        cacheElements();
        bindSidebar();
        bindPanel();
        applySettings(getSettings());
        updateCounts();
    }

    function cacheElements() {
        els = {
            menuToggle: document.getElementById("menu-toggle"),
            settingsToggle: document.getElementById("settings-toggle"),

            sideDrawer: document.getElementById("side-drawer"),
            sideOverlay: document.getElementById("side-overlay"),
            sideClose: document.getElementById("side-close"),
            darkModeToggle: document.getElementById("dark-mode-toggle"),

            panel: document.getElementById("page-panel"),
            panelOverlay: document.getElementById("panel-overlay"),
            panelClose: document.getElementById("panel-close"),
            panelTitle: document.getElementById("panel-title"),
            panelBody: document.getElementById("panel-body"),

            downloadsCount: document.getElementById("downloads-count"),
            favoritesCount: document.getElementById("favorites-count"),

            favoriteButton: document.getElementById("favorite-button"),
            urlInput: document.getElementById("media-url"),
            thumbnailWrapper: document.getElementById("thumbnail-wrapper")
        };
    }

    /* -----------------------------------------------------
       SIDEBAR
    ----------------------------------------------------- */

    function bindSidebar() {
        const open = () => {
            els.sideDrawer.classList.add("open");
            els.sideOverlay.classList.add("visible");
            els.sideDrawer.setAttribute("aria-hidden", "false");
        };
        const close = () => {
            els.sideDrawer.classList.remove("open");
            els.sideOverlay.classList.remove("visible");
            els.sideDrawer.setAttribute("aria-hidden", "true");
        };

        els.menuToggle?.addEventListener("click", open);
        els.sideClose?.addEventListener("click", close);
        els.sideOverlay?.addEventListener("click", close);

        els.sideDrawer?.addEventListener("click", (event) => {
            const link = event.target.closest(".side-link");
            if (!link) return;
            event.preventDefault();

            if (link.dataset.action === "home") {
                close();
                document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
                return;
            }

            if (link.dataset.action === "video-to-mp3") {
                close();
                const typeSelect = document.getElementById("download-type");
                if (typeSelect) {
                    typeSelect.value = "audio";
                    JTEC.handleTypeChange();
                }
                els.urlInput?.focus();
                els.urlInput?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }

            if (link.dataset.panel) {
                close();
                openPanel(link.dataset.panel);
            }
        });

        els.darkModeToggle?.addEventListener("change", () => {
            const theme = els.darkModeToggle.checked ? "dark" : "light";
            applySettings(saveSettings({ theme }));
        });

        els.settingsToggle?.addEventListener("click", () => openPanel("settings"));
    }

    /* -----------------------------------------------------
       PAGE PANEL
    ----------------------------------------------------- */

    function bindPanel() {
        const close = () => {
            els.panel.classList.remove("open");
            els.panelOverlay.classList.remove("visible");
            els.panel.setAttribute("aria-hidden", "true");
        };

        els.panelClose?.addEventListener("click", close);
        els.panelOverlay?.addEventListener("click", close);
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") close();
        });

        // Event delegation: panel body content is replaced each
        // time a page opens, so bind once at the container level.
        els.panelBody.addEventListener("click", handlePanelClick);
        els.panelBody.addEventListener("change", handlePanelChange);

        els.favoriteButton?.addEventListener("click", toggleFavoriteFromResult);
    }

    function openPanel(pageId) {
        const { title, html } = renderPage(pageId);
        els.panelTitle.textContent = title;
        els.panelBody.innerHTML = html;
        els.panelBody.dataset.page = pageId;

        els.panel.classList.add("open");
        els.panelOverlay.classList.add("visible");
        els.panel.setAttribute("aria-hidden", "false");
    }

    function reopenCurrentPage() {
        const page = els.panelBody.dataset.page;
        if (page) openPanel(page);
    }

    /* -----------------------------------------------------
       PAGE TEMPLATES
    ----------------------------------------------------- */

    function renderPage(pageId) {
        switch (pageId) {
            case "downloads": return { title: "Downloads", html: historyListHtml(getHistory(), "downloads") };
            case "favorites": return { title: "Favorites", html: historyListHtml(getFavorites(), "favorites") };
            case "platforms": return { title: "Supported Sites", html: platformsHtml() };
            case "how-to-use": return { title: "How to Use", html: howToUseHtml() };
            case "settings": return { title: "Settings", html: settingsHtml() };
            default: return { title: "", html: "" };
        }
    }

    function historyListHtml(items, kind) {
        if (!items.length) {
            const message = kind === "favorites"
                ? "No favorites yet. Tap the heart on a result to save it here."
                : "No downloads yet. Fetched links show up here.";
            return `<p class="panel-empty">${message}</p>`;
        }

        return `<div class="panel-list">` + items.map((item, index) => `
            <div class="panel-list-item">
                <div class="panel-list-thumb">
                    ${item.thumbnail ? `<img src="${escapeAttr(item.thumbnail)}" alt="">` : ""}
                </div>
                <div class="panel-list-info">
                    <p class="panel-list-title">${escapeHtml(item.title || item.url)}</p>
                    <p class="panel-list-sub">${new Date(item.ts).toLocaleDateString()}</p>
                </div>
                <div class="panel-list-actions">
                    <button class="text-btn" data-use-index="${index}" data-use-kind="${kind}">Use again</button>
                    <button class="icon-btn small" data-remove-index="${index}" data-remove-kind="${kind}" aria-label="Remove">&times;</button>
                </div>
            </div>
        `).join("") + `</div>`;
    }

    function platformsHtml() {
        const platforms = [
            ["T", "bubble-tiktok", "TikTok"],
            ["Y", "bubble-youtube", "YouTube"],
            ["IG", "bubble-instagram", "Instagram"],
            ["f", "bubble-facebook", "Facebook"]
        ];

        return `
            <div class="panel-platforms">
                ${platforms.map(([letter, cls, name]) => `
                    <div class="panel-platform-row">
                        <span class="platform-icon ${cls}">${letter}</span>
                        <span>${name}</span>
                    </div>
                `).join("")}
            </div>
            <p class="panel-note">Plus most other sites yt-dlp supports \u2014 paste any supported link and J TEC will try to fetch it.</p>
        `;
    }

    function howToUseHtml() {
        return `
            <ol class="panel-steps">
                <li>Copy the link to the video or audio you want.</li>
                <li>Paste it into the Media URL field and tap <strong>Get Media</strong>.</li>
                <li>Choose Video + Audio or Audio Only, and a quality.</li>
                <li>Tap <strong>Download</strong> and wait for it to finish.</li>
            </ol>
            <p class="panel-note">Only download content you have permission to save.</p>
        `;
    }

    function settingsHtml() {
        const s = getSettings();
        const lang = I18N.current();

        return `
            <p class="panel-group-label">General</p>

            <div class="panel-row">
                <div class="panel-row-copy">
                    <p class="panel-row-label">Default Quality</p>
                    <p class="panel-row-sub">Used unless you change it per download</p>
                </div>
                <select id="setting-quality" class="panel-select">
                    <option value="best" ${s.quality === "best" ? "selected" : ""}>Best Available</option>
                    <option value="1080" ${s.quality === "1080" ? "selected" : ""}>Up to 1080p</option>
                    <option value="720" ${s.quality === "720" ? "selected" : ""}>Up to 720p</option>
                    <option value="480" ${s.quality === "480" ? "selected" : ""}>Up to 480p</option>
                </select>
            </div>

            <div class="panel-row">
                <div class="panel-row-copy">
                    <p class="panel-row-label">Show Video Thumbnail</p>
                    <p class="panel-row-sub">Display the thumbnail preview on results</p>
                </div>
                ${toggleHtml("setting-thumbnail", s.saveThumbnail)}
            </div>

            <p class="panel-group-label">Download</p>

            <div class="panel-row">
                <div class="panel-row-copy">
                    <p class="panel-row-label">Resume Interrupted Downloads</p>
                    <p class="panel-row-sub">Automatically retry once if a download fails</p>
                </div>
                ${toggleHtml("setting-resume", s.resumeOnError)}
            </div>

            <div class="panel-row">
                <div class="panel-row-copy">
                    <p class="panel-row-label">Show Download Notification</p>
                    <p class="panel-row-sub">Notify you when a download finishes</p>
                </div>
                ${toggleHtml("setting-notifications", s.notifications)}
            </div>

            <p class="panel-group-label">Appearance</p>

            <div class="panel-row">
                <div class="panel-row-copy">
                    <p class="panel-row-label">Theme</p>
                </div>
                <select id="setting-theme" class="panel-select">
                    <option value="dark" ${s.theme === "dark" ? "selected" : ""}>Dark</option>
                    <option value="light" ${s.theme === "light" ? "selected" : ""}>Light</option>
                </select>
            </div>

            <div class="panel-row">
                <div class="panel-row-copy">
                    <p class="panel-row-label">Accent Color</p>
                </div>
                <div class="panel-swatches">
                    ${Object.keys(ACCENTS).map((key) => `
                        <button
                            type="button"
                            class="swatch ${s.accent === key ? "active" : ""}"
                            data-accent="${key}"
                            style="background:${ACCENTS[key].accent}"
                            aria-label="${key} accent"
                        ></button>
                    `).join("")}
                </div>
            </div>

            <div class="panel-row">
                <div class="panel-row-copy">
                    <p class="panel-row-label">Language</p>
                </div>
                <select id="setting-language" class="panel-select">
                    ${Object.keys(I18N.TRANSLATIONS).map((code) => `
                        <option value="${code}" ${lang === code ? "selected" : ""}>${I18N.TRANSLATIONS[code].label}</option>
                    `).join("")}
                </select>
            </div>

            <p class="panel-group-label">About</p>

            <div class="panel-row panel-row-stack">
                <p class="panel-row-label">${escapeHtml(CONFIG.APP_NAME)}</p>
                <p class="panel-row-sub">Version ${escapeHtml(CONFIG.APP_VERSION)}</p>
                <button class="text-btn" id="check-status">Check Server Status</button>
                <p class="panel-status" id="server-status"></p>
            </div>

            <div class="panel-row panel-row-single">
                <button class="text-btn" id="send-feedback">Send Feedback</button>
            </div>

            <div class="panel-row panel-row-single">
                <button class="text-btn" id="share-app">Share App</button>
            </div>

            <div class="panel-row panel-row-single">
                <button class="text-btn danger" id="clear-cache">Clear Cache <span id="cache-size"></span></button>
            </div>
        `;
    }

    function toggleHtml(id, checked) {
        return `
            <label class="toggle">
                <input type="checkbox" id="${id}" ${checked ? "checked" : ""}>
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
        `;
    }

    /* -----------------------------------------------------
       PANEL EVENT HANDLERS (delegated)
    ----------------------------------------------------- */

    function handlePanelClick(event) {
        const useBtn = event.target.closest("[data-use-index]");
        if (useBtn) {
            const kind = useBtn.dataset.useKind;
            const items = kind === "favorites" ? getFavorites() : getHistory();
            const item = items[Number(useBtn.dataset.useIndex)];
            if (item) {
                els.urlInput.value = item.url;
                els.urlInput.dispatchEvent(new Event("input"));
                closePanelFully();
                document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
                JTEC.getMedia();
            }
            return;
        }

        const removeBtn = event.target.closest("[data-remove-index]");
        if (removeBtn) {
            const kind = removeBtn.dataset.removeKind;
            const key = kind === "favorites" ? STORAGE.favorites : STORAGE.history;
            const items = kind === "favorites" ? getFavorites() : getHistory();
            items.splice(Number(removeBtn.dataset.removeIndex), 1);
            writeJSON(key, items);
            updateCounts();
            reopenCurrentPage();
            return;
        }

        const swatch = event.target.closest("[data-accent]");
        if (swatch) {
            applySettings(saveSettings({ accent: swatch.dataset.accent }));
            reopenCurrentPage();
            return;
        }

        if (event.target.id === "check-status") {
            checkServerStatus();
            return;
        }

        if (event.target.id === "send-feedback") {
            const subject = encodeURIComponent(`${CONFIG.APP_NAME} feedback`);
            window.location.href = `mailto:${CONFIG.SUPPORT_EMAIL}?subject=${subject}`;
            return;
        }

        if (event.target.id === "share-app") {
            shareApp();
            return;
        }

        if (event.target.id === "clear-cache") {
            clearCache();
            return;
        }
    }

    function handlePanelChange(event) {
        if (event.target.id === "setting-quality") {
            const value = event.target.value;
            applySettings(saveSettings({ quality: value }));
            const quality = document.getElementById("quality");
            if (quality) quality.value = value;
            return;
        }

        if (event.target.id === "setting-thumbnail") {
            applySettings(saveSettings({ saveThumbnail: event.target.checked }));
            return;
        }

        if (event.target.id === "setting-resume") {
            saveSettings({ resumeOnError: event.target.checked });
            return;
        }

        if (event.target.id === "setting-notifications") {
            if (event.target.checked && "Notification" in window && Notification.permission === "default") {
                Notification.requestPermission().then((permission) => {
                    saveSettings({ notifications: permission === "granted" });
                    if (permission !== "granted") reopenCurrentPage();
                });
            } else {
                saveSettings({ notifications: event.target.checked });
            }
            return;
        }

        if (event.target.id === "setting-theme") {
            applySettings(saveSettings({ theme: event.target.value }));
            return;
        }

        if (event.target.id === "setting-language") {
            I18N.apply(event.target.value);
            reopenCurrentPage();
            return;
        }
    }

    function closePanelFully() {
        els.panel.classList.remove("open");
        els.panelOverlay.classList.remove("visible");
        els.panel.setAttribute("aria-hidden", "true");
    }

    /* -----------------------------------------------------
       APPLYING SETTINGS TO THE PAGE
    ----------------------------------------------------- */

    function applySettings(settings) {
        document.documentElement.setAttribute("data-theme", settings.theme);

        const accent = ACCENTS[settings.accent] || ACCENTS.gold;
        document.documentElement.style.setProperty("--accent", accent.accent);
        document.documentElement.style.setProperty("--accent-hover", accent.hover);

        if (els.darkModeToggle) els.darkModeToggle.checked = settings.theme === "dark";

        if (els.thumbnailWrapper) {
            els.thumbnailWrapper.classList.toggle("thumb-hidden", !settings.saveThumbnail);
        }

        const qualitySelect = document.getElementById("quality");
        if (qualitySelect) qualitySelect.value = settings.quality;

        JTEC?.handleTypeChange?.();
    }

    /* -----------------------------------------------------
       HISTORY / FAVORITES
    ----------------------------------------------------- */

    function saveHistory(url, media) {
        if (!url) return;

        const history = getHistory().filter((item) => item.url !== url);

        history.unshift({
            url,
            title: media?.title || url,
            thumbnail: media?.thumbnail || "",
            ts: Date.now()
        });

        writeJSON(STORAGE.history, history.slice(0, 50));
        updateCounts();
    }

    function isFavorite(url) {
        return getFavorites().some((item) => item.url === url);
    }

    function refreshFavoriteButton(url, media) {
        if (!els.favoriteButton) return;

        els.favoriteButton.dataset.url = url || "";
        els.favoriteButton.dataset.title = media?.title || "";
        els.favoriteButton.dataset.thumbnail = media?.thumbnail || "";

        setFavoriteButtonState(isFavorite(url));
    }

    function setFavoriteButtonState(active) {
        if (!els.favoriteButton) return;

        els.favoriteButton.classList.toggle("active", active);
        els.favoriteButton.setAttribute("aria-pressed", active ? "true" : "false");

        const icon = els.favoriteButton.querySelector(".favorite-icon");
        const text = els.favoriteButton.querySelector(".favorite-text");

        if (icon) icon.textContent = active ? "\u2665" : "\u2661";
        if (text) text.textContent = active ? "Saved to Favorites" : "Save to Favorites";
    }

    function toggleFavoriteFromResult() {
        const url = els.favoriteButton.dataset.url;
        if (!url) return;

        const favorites = getFavorites();
        const existingIndex = favorites.findIndex((item) => item.url === url);

        if (existingIndex >= 0) {
            favorites.splice(existingIndex, 1);
            setFavoriteButtonState(false);
        } else {
            favorites.unshift({
                url,
                title: els.favoriteButton.dataset.title || url,
                thumbnail: els.favoriteButton.dataset.thumbnail || "",
                ts: Date.now()
            });
            setFavoriteButtonState(true);
        }

        writeJSON(STORAGE.favorites, favorites);
        updateCounts();
    }

    function updateCounts() {
        const historyCount = getHistory().length;
        const favoritesCount = getFavorites().length;

        if (els.downloadsCount) {
            els.downloadsCount.textContent = String(historyCount);
            els.downloadsCount.hidden = historyCount === 0;
        }

        if (els.favoritesCount) {
            els.favoritesCount.textContent = String(favoritesCount);
            els.favoritesCount.hidden = favoritesCount === 0;
        }
    }

    /* -----------------------------------------------------
       SERVER STATUS (real call to your backend's /health)
    ----------------------------------------------------- */

    async function checkServerStatus() {
        const statusEl = document.getElementById("server-status");
        if (!statusEl) return;

        statusEl.textContent = "Checking...";
        statusEl.className = "panel-status";

        try {
            const response = await fetch(CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.HEALTH);

            if (!response.ok) throw new Error();

            const data = await response.json();
            statusEl.textContent = `Online \u2014 ${data.service || "J TEC API"}`;
            statusEl.classList.add("ok");
        } catch {
            statusEl.textContent = "Unable to reach the server.";
            statusEl.classList.add("bad");
        }
    }

    /* -----------------------------------------------------
       SHARE / NOTIFICATIONS / RETRY / CACHE
    ----------------------------------------------------- */

    function shareApp() {
        const shareData = {
            title: CONFIG.APP_NAME,
            text: `Download video and audio with ${CONFIG.APP_NAME}`,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(() => {});
        } else {
            navigator.clipboard?.writeText(window.location.href);
            notify("Link copied to clipboard.");
        }
    }

    function shouldAutoRetry() {
        return getSettings().resumeOnError;
    }

    function notify(message) {
        const statusEl = document.getElementById("server-status");
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = "panel-status";
        }
    }

    function notifyDownloadComplete(title) {
        const settings = getSettings();

        if (!settings.notifications) return;
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        try {
            new Notification(`${CONFIG.APP_NAME}`, {
                body: `${title || "Your file"} is ready.`
            });
        } catch {
            /* Notifications are best-effort; never break the download. */
        }
    }

    function clearCache() {
        const bytesBefore =
            (localStorage.getItem(STORAGE.history)?.length || 0) +
            (localStorage.getItem(STORAGE.favorites)?.length || 0);

        localStorage.removeItem(STORAGE.history);
        localStorage.removeItem(STORAGE.favorites);

        updateCounts();

        const sizeEl = document.getElementById("cache-size");
        if (sizeEl) {
            sizeEl.textContent = `(cleared ${(bytesBefore / 1024).toFixed(1)} KB)`;
        }
    }

    /* -----------------------------------------------------
       HTML ESCAPING
    ----------------------------------------------------- */

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/"/g, "&quot;");
    }

    document.addEventListener("DOMContentLoaded", init);

    const publicApi = {
        saveHistory,
        isFavorite,
        refreshFavoriteButton,
        shouldAutoRetry,
        notify,
        notifyDownloadComplete
    };

    window.JTecPanel = publicApi;
    return publicApi;
})();
