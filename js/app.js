"use strict";

/* =========================================================
   J TEC DOWNLOADER
   Main frontend application
   ========================================================= */

const JTEC = {

    state: {
        mediaInfo: null,
        loadingInfo: false,
        downloading: false,
        currentJobId: null,
        progressTimer: null
    },

    elements: {},

    init() {
        this.cacheElements();
        this.createProgressUI();
        this.bindEvents();
    },

    cacheElements() {
        this.elements.url = document.getElementById("media-url");
        this.elements.clear = document.getElementById("clear-url");
        this.elements.getMedia = document.getElementById("get-media-button");
        this.elements.download = document.getElementById("download-button");
        this.elements.result = document.getElementById("media-result");
        this.elements.error = document.getElementById("error-message");
        this.elements.thumbnail = document.getElementById("media-thumbnail");
        this.elements.title = document.getElementById("media-title");
        this.elements.uploader = document.getElementById("media-uploader");
        this.elements.duration = document.getElementById("media-duration");
        this.elements.type = document.getElementById("download-type");
        this.elements.quality = document.getElementById("quality");
    },

    bindEvents() {
        this.elements.url.addEventListener("input", () => this.handleUrlInput());
        this.elements.clear.addEventListener("click", () => this.clearUrl());
        this.elements.getMedia.addEventListener("click", () => this.getMedia());
        this.elements.download.addEventListener("click", () => this.download());
        this.elements.type.addEventListener("change", () => this.handleTypeChange());
    },

    handleUrlInput() {
        const hasValue = this.elements.url.value.trim().length > 0;
        this.elements.clear.hidden = !hasValue;
        this.hideError();
    },

    clearUrl() {
        this.stopProgressPolling();
        this.elements.url.value = "";
        this.elements.clear.hidden = true;
        this.elements.result.hidden = true;
        this.state.mediaInfo = null;
        this.state.currentJobId = null;
        this.state.downloading = false;
        this.hideProgress();
        this.hideError();
        this.elements.url.focus();
    },

    async getMedia() {
        const url = this.elements.url.value.trim();

        if (!url) {
            this.showError("Please paste a media URL first.");
            this.elements.url.focus();
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showError("Please enter a valid URL.");
            return;
        }

        this.state.loadingInfo = true;
        this.setButtonLoading(this.elements.getMedia, true);
        this.elements.result.hidden = true;
        this.hideProgress();
        this.hideError();

        try {
            const response = await this.request(CONFIG.ENDPOINTS.INFO, {
                method: "POST",
                body: JSON.stringify({
                    url: url,
                    type: "video",
                    quality: "best"
                })
            });

            if (!response.ok) {
                const message = await this.extractError(response);
                throw new Error(message);
            }

            const data = await response.json();
            this.state.mediaInfo = data;
            this.renderMedia(data);

        } catch (error) {
            console.error("J TEC info error:", error);
            this.showError(this.getFriendlyError(error));

        } finally {
            this.state.loadingInfo = false;
            this.setButtonLoading(this.elements.getMedia, false);
        }
    },

    renderMedia(data) {
        const media = data?.data || data;

        this.elements.title.textContent = media?.title || "Media Ready";

        this.elements.uploader.textContent =
            media?.uploader ? `By ${media.uploader}` : "";

        this.elements.duration.textContent =
            this.formatDuration(media?.duration);

        if (media?.thumbnail) {
            this.elements.thumbnail.src = media.thumbnail;
            this.elements.thumbnail.alt =
                media.title || "Media thumbnail";
        } else {
            this.elements.thumbnail.removeAttribute("src");
            this.elements.thumbnail.alt = "";
        }

        this.elements.result.hidden = false;

        this.elements.result.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    },

    async download() {
        if (this.state.downloading) {
            return;
        }

        const url = this.elements.url.value.trim();

        if (!url) {
            this.showError("Please enter a media URL.");
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showError("Please enter a valid URL.");
            return;
        }

        const type = this.elements.type.value;
        const quality = this.elements.quality.value;

        this.state.downloading = true;
        this.state.currentJobId = null;

        this.setDownloadState("preparing");
        this.showProgress();
        this.resetProgress();
        this.hideError();

        try {
            const response = await this.request(
                CONFIG.ENDPOINTS.DOWNLOAD,
                {
                    method: "POST",
                    body: JSON.stringify({
                        url: url,
                        type: type,
                        quality: quality
                    })
                }
            );

            if (!response.ok) {
                const message = await this.extractError(response);
                throw new Error(message);
            }

            const data = await response.json();

            const jobId =
                data?.job_id ||
                data?.data?.job_id;

            if (!jobId) {
                throw new Error(
                    data?.detail ||
                    data?.message ||
                    "The server did not create a download job."
                );
            }

            this.state.currentJobId = jobId;

            this.setDownloadState("downloading");
            this.updateProgressStatus("Starting download...");

            await this.pollDownload(jobId);

        } catch (error) {
            console.error("J TEC download error:", error);
            this.showError(this.getFriendlyError(error));
            this.setDownloadState("error");
            this.updateProgressStatus("Download failed");

        } finally {
            this.state.downloading = false;
            this.stopProgressPolling();
        }
    },

    async pollDownload(jobId) {
        const maxAttempts =
            Math.ceil(CONFIG.REQUEST_TIMEOUT / 2000) || 60;

        let attempts = 0;

        while (
            this.state.downloading &&
            this.state.currentJobId === jobId
        ) {
            attempts++;

            if (attempts > maxAttempts) {
                throw new Error(
                    "The download is taking too long. Please try again."
                );
            }

            const response = await this.request(
                `/download/${encodeURIComponent(jobId)}`,
                {
                    method: "GET"
                }
            );

            if (!response.ok) {
                const message = await this.extractError(response);
                throw new Error(message);
            }

            const result = await response.json();
            const job = result?.data || result;

            this.updateProgress(job);

            if (
                job?.status === "finished" ||
                job?.ready === true
            ) {
                await this.completeDownload(jobId);
                return;
            }

            if (job?.status === "error") {
                throw new Error(
                    job?.error ||
                    "The media download failed."
                );
            }

            await this.delay(1000);
        }
    },

    updateProgress(job) {
        const progress = this.normalizeProgress(job?.progress);
        const downloaded = Number(job?.downloaded_bytes) || 0;
        const total = Number(job?.total_bytes) || 0;
        const speed = Number(job?.speed) || 0;
        const eta = Number(job?.eta);

        this.setProgress(progress);

        if (job?.status === "queued") {
            this.updateProgressStatus("Waiting...");
        } else if (job?.status === "downloading") {
            this.updateProgressStatus("Downloading...");
        }

        if (total > 0) {
            this.elements.progressSize.textContent =
                `${this.formatBytes(downloaded)} / ${this.formatBytes(total)}`;
        } else {
            this.elements.progressSize.textContent =
                this.formatBytes(downloaded);
        }

        this.elements.progressSpeed.textContent =
            speed > 0 ? `${this.formatBytes(speed)}/s` : "--";

        this.elements.progressEta.textContent =
            Number.isFinite(eta) && eta >= 0
                ? `ETA ${this.formatEta(eta)}`
                : "--";
    },

    async completeDownload(jobId) {
        this.setProgress(100);
        this.updateProgressStatus("Download complete ✓");
        this.elements.progressSpeed.textContent = "Complete";
        this.elements.progressEta.textContent = "Ready";

        this.setDownloadState("complete");

        await this.delay(350);

        const fileUrl =
            CONFIG.API_BASE_URL +
            `/download/${encodeURIComponent(jobId)}/file`;

        window.location.href = fileUrl;
    },

    createProgressUI() {
        if (document.getElementById("download-progress")) {
            return;
        }

        if (!this.elements.download) {
            return;
        }

        const progress = document.createElement("div");

        progress.id = "download-progress";
        progress.hidden = true;

        progress.innerHTML = `
            <div class="progress-header">
                <span id="progress-status">Preparing download...</span>
                <strong id="progress-percent">0%</strong>
            </div>

            <div
                class="progress-track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="0"
                aria-label="Download progress"
            >
                <div id="progress-bar" class="progress-bar"></div>
            </div>

            <div class="progress-details">
                <span id="progress-size">0 B</span>
                <span id="progress-speed">--</span>
                <span id="progress-eta">--</span>
            </div>
        `;

        this.elements.download.insertAdjacentElement(
            "afterend",
            progress
        );

        this.elements.progress = progress;
        this.elements.progressStatus =
            document.getElementById("progress-status");
        this.elements.progressPercent =
            document.getElementById("progress-percent");
        this.elements.progressBar =
            document.getElementById("progress-bar");
        this.elements.progressTrack =
            progress.querySelector(".progress-track");
        this.elements.progressSize =
            document.getElementById("progress-size");
        this.elements.progressSpeed =
            document.getElementById("progress-speed");
        this.elements.progressEta =
            document.getElementById("progress-eta");
    },

    showProgress() {
        if (!this.elements.progress) {
            this.createProgressUI();
        }

        if (this.elements.progress) {
            this.elements.progress.hidden = false;
        }
    },

    hideProgress() {
        if (this.elements.progress) {
            this.elements.progress.hidden = true;
        }
    },

    resetProgress() {
        this.setProgress(0);
        this.updateProgressStatus("Preparing download...");

        if (this.elements.progressSize) {
            this.elements.progressSize.textContent = "0 B";
        }

        if (this.elements.progressSpeed) {
            this.elements.progressSpeed.textContent = "--";
        }

        if (this.elements.progressEta) {
            this.elements.progressEta.textContent = "--";
        }
    },

    setProgress(value) {
        const progress = this.normalizeProgress(value);

        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent =
                `${progress}%`;
        }

        if (this.elements.progressBar) {
            this.elements.progressBar.style.width =
                `${progress}%`;
        }

        if (this.elements.progressTrack) {
            this.elements.progressTrack.setAttribute(
                "aria-valuenow",
                String(progress)
            );
        }
    },

    normalizeProgress(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                Math.round(number * 10) / 10
            )
        );
    },

    updateProgressStatus(text) {
        if (this.elements.progressStatus) {
            this.elements.progressStatus.textContent = text;
        }
    },

    stopProgressPolling() {
        if (this.state.progressTimer) {
            clearTimeout(this.state.progressTimer);
            this.state.progressTimer = null;
        }
    },

    setDownloadState(state) {
        const button = this.elements.download;
        const text = button.querySelector(".button-text");
        const loader = button.querySelector(".button-loader");

        if (!text) {
            return;
        }

        switch (state) {
            case "preparing":
                button.disabled = true;
                text.hidden = false;
                text.textContent = "Preparing...";
                if (loader) loader.hidden = false;
                break;

            case "downloading":
                button.disabled = true;
                text.hidden = false;
                text.textContent = "Downloading...";
                if (loader) loader.hidden = false;
                break;

            case "complete":
                button.disabled = false;
                text.hidden = false;
                text.textContent = "Download Complete ✓";
                if (loader) loader.hidden = true;

                setTimeout(() => {
                    if (!this.state.downloading) {
                        text.textContent = "Download";
                    }
                }, 3000);
                break;

            case "error":
                button.disabled = false;
                text.hidden = false;
                text.textContent = "Try Again";
                if (loader) loader.hidden = true;

                setTimeout(() => {
                    if (!this.state.downloading) {
                        text.textContent = "Download";
                    }
                }, 3000);
                break;

            default:
                button.disabled = false;
                text.hidden = false;
                text.textContent = "Download";
                if (loader) loader.hidden = true;
        }
    },

    handleTypeChange() {
        const isAudio =
            this.elements.type.value === "audio";

        this.elements.quality.disabled = isAudio;

        if (isAudio) {
            this.elements.quality.value = "best";
        }
    },

    async request(endpoint, options = {}) {
        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            CONFIG.REQUEST_TIMEOUT
        );

        try {
            return await fetch(
                CONFIG.API_BASE_URL + endpoint,
                {
                    ...options,
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        ...(options.headers || {})
                    },
                    signal: controller.signal
                }
            );
        } finally {
            clearTimeout(timeout);
        }
    },

    isValidUrl(value) {
        try {
            const url = new URL(value);

            return (
                url.protocol === "http:" ||
                url.protocol === "https:"
            );
        } catch {
            return false;
        }
    },

    formatDuration(seconds) {
        if (
            seconds === null ||
            seconds === undefined ||
            !Number.isFinite(Number(seconds))
        ) {
            return "";
        }

        const total = Math.max(
            0,
            Math.floor(Number(seconds))
        );

        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;

        if (hours > 0) {
            return (
                `${hours}:` +
                `${String(minutes).padStart(2, "0")}:` +
                `${String(secs).padStart(2, "0")}`
            );
        }

        return (
            `${minutes}:` +
            `${String(secs).padStart(2, "0")}`
        );
    },

    formatBytes(bytes) {
        const value = Number(bytes);

        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {
            return "0 B";
        }

        const units = [
            "B",
            "KB",
            "MB",
            "GB",
            "TB"
        ];

        let size = value;
        let index = 0;

        while (
            size >= 1024 &&
            index < units.length - 1
        ) {
            size /= 1024;
            index++;
        }

        if (index === 0) {
            return `${Math.round(size)} ${units[index]}`;
        }

        return `${size.toFixed(1)} ${units[index]}`;
    },

    formatEta(seconds) {
        const value = Math.max(
            0,
            Math.floor(Number(seconds) || 0)
        );

        if (value < 60) {
            return `${value}s`;
        }

        const minutes = Math.floor(value / 60);
        const remaining = value % 60;

        if (minutes < 60) {
            return `${minutes}m ${remaining}s`;
        }

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        return `${hours}h ${mins}m`;
    },

    createFilename(type) {
        const media =
            this.state.mediaInfo?.data ||
            this.state.mediaInfo;

        const title =
            media?.title ||
            "j-tec-download";

        const cleanTitle =
            title
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
                .trim()
                .slice(0, 100);

        const extension =
            type === "audio"
                ? "mp3"
                : "mp4";

        return (
            `${cleanTitle || "j-tec-download"}.` +
            extension
        );
    },

    saveBlob(blob, filename) {
        const objectUrl =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = objectUrl;
        link.download = filename;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(
            () => URL.revokeObjectURL(objectUrl),
            1000
        );
    },

    setButtonLoading(button, loading) {
        const text =
            button.querySelector(".button-text");

        const loader =
            button.querySelector(".button-loader");

        button.disabled = loading;

        if (text) {
            text.hidden = loading;
        }

        if (loader) {
            loader.hidden = !loading;
        }
    },

    async extractError(response) {
        try {
            const data =
                await response.json();

            return (
                data?.detail ||
                data?.message ||
                `Request failed (${response.status}).`
            );
        } catch {
            return `Request failed (${response.status}).`;
        }
    },

    getFriendlyError(error) {
        if (error?.name === "AbortError") {
            return (
                "The request took too long. " +
                "Please try again."
            );
        }

        if (error instanceof TypeError) {
            return (
                "Unable to connect to the J TEC server. " +
                "Please check your connection and try again."
            );
        }

        return (
            error?.message ||
            "Something went wrong. Please try again."
        );
    },

    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.hidden = false;
    },

    hideError() {
        this.elements.error.hidden = true;
        this.elements.error.textContent = "";
    },

    delay(milliseconds) {
        return new Promise(
            resolve => setTimeout(resolve, milliseconds)
        );
    }
};

document.addEventListener(
    "DOMContentLoaded",
    () => JTEC.init()
);
