"use strict";

/* =========================================================
   J TEC DOWNLOADER
   Main frontend application
   ========================================================= */

const JTEC = {

    /* -----------------------------------------------------
       STATE
    ----------------------------------------------------- */

    state: {
        mediaInfo: null,
        loadingInfo: false,
        downloading: false
    },


    /* -----------------------------------------------------
       DOM
    ----------------------------------------------------- */

    elements: {},


    /* -----------------------------------------------------
       INIT
    ----------------------------------------------------- */

    init() {

        this.cacheElements();
        this.bindEvents();

    },


    /* -----------------------------------------------------
       CACHE ELEMENTS
    ----------------------------------------------------- */

    cacheElements() {

        this.elements.url =
            document.getElementById("media-url");

        this.elements.clear =
            document.getElementById("clear-url");

        this.elements.getMedia =
            document.getElementById("get-media-button");

        this.elements.download =
            document.getElementById("download-button");

        this.elements.result =
            document.getElementById("media-result");

        this.elements.error =
            document.getElementById("error-message");

        this.elements.thumbnail =
            document.getElementById("media-thumbnail");

        this.elements.title =
            document.getElementById("media-title");

        this.elements.uploader =
            document.getElementById("media-uploader");

        this.elements.duration =
            document.getElementById("media-duration");

        this.elements.type =
            document.getElementById("download-type");

        this.elements.quality =
            document.getElementById("quality");

    },


    /* -----------------------------------------------------
       EVENTS
    ----------------------------------------------------- */

    bindEvents() {

        this.elements.url.addEventListener(
            "input",
            () => this.handleUrlInput()
        );

        this.elements.clear.addEventListener(
            "click",
            () => this.clearUrl()
        );

        this.elements.getMedia.addEventListener(
            "click",
            () => this.getMedia()
        );

        this.elements.download.addEventListener(
            "click",
            () => this.download()
        );

        this.elements.type.addEventListener(
            "change",
            () => this.handleTypeChange()
        );

    },


    /* -----------------------------------------------------
       URL INPUT
    ----------------------------------------------------- */

    handleUrlInput() {

        const hasValue =
            this.elements.url.value.trim().length > 0;

        this.elements.clear.hidden = !hasValue;

        this.hideError();

    },


    /* -----------------------------------------------------
       CLEAR URL
    ----------------------------------------------------- */

    clearUrl() {

        this.elements.url.value = "";

        this.elements.clear.hidden = true;

        this.elements.result.hidden = true;

        this.state.mediaInfo = null;

        this.hideError();

        this.elements.url.focus();

    },


    /* -----------------------------------------------------
       GET MEDIA
    ----------------------------------------------------- */

    async getMedia() {

        const url =
            this.elements.url.value.trim();

        if (!url) {

            this.showError(
                "Please paste a media URL first."
            );

            this.elements.url.focus();

            return;
        }


        if (!this.isValidUrl(url)) {

            this.showError(
                "Please enter a valid URL."
            );

            return;
        }


        this.state.loadingInfo = true;

        this.setButtonLoading(
            this.elements.getMedia,
            true
        );

        this.elements.result.hidden = true;

        this.hideError();


        try {

            const response =
                await this.request(
                    CONFIG.ENDPOINTS.INFO,
                    {
                        method: "POST",

                        body: JSON.stringify({
                            url: url,
                            type: "video",
                            quality: "best"
                        })
                    }
                );


            if (!response.ok) {

                const message =
                    await this.extractError(
                        response
                    );

                throw new Error(message);
            }


            const data =
                await response.json();


            this.state.mediaInfo = data;

            this.renderMedia(data);


        } catch (error) {

            console.error(
                "J TEC info error:",
                error
            );

            this.showError(
                this.getFriendlyError(error)
            );

        } finally {

            this.state.loadingInfo = false;

            this.setButtonLoading(
                this.elements.getMedia,
                false
            );

        }

    },


    /* -----------------------------------------------------
       RENDER MEDIA
    ----------------------------------------------------- */

    renderMedia(data) {

        const media =
            data?.data || data;


        this.elements.title.textContent =
            media?.title ||
            "Media Ready";


        this.elements.uploader.textContent =
            media?.uploader
                ? `By ${media.uploader}`
                : "";


        this.elements.duration.textContent =
            this.formatDuration(
                media?.duration
            );


        if (media?.thumbnail) {

            this.elements.thumbnail.src =
                media.thumbnail;

            this.elements.thumbnail.alt =
                media.title || "Media thumbnail";

        } else {

            this.elements.thumbnail.removeAttribute(
                "src"
            );

            this.elements.thumbnail.alt =
                "";

        }


        this.elements.result.hidden = false;

        this.elements.result.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    },


    /* -----------------------------------------------------
       DOWNLOAD
    ----------------------------------------------------- */

    async download() {

        if (this.state.downloading) {
            return;
        }


        const url =
            this.elements.url.value.trim();


        if (!url) {

            this.showError(
                "Please enter a media URL."
            );

            return;
        }


        const type =
            this.elements.type.value;


        const quality =
            this.elements.quality.value;


        this.state.downloading = true;

        this.setButtonLoading(
            this.elements.download,
            true
        );

        this.hideError();


        try {

            const response =
                await this.request(
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

                const message =
                    await this.extractError(
                        response
                    );

                throw new Error(message);
            }


            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            /*
             * If the backend returns JSON,
             * display the API message instead
             * of trying to download it as a file.
             */

            if (
                contentType.includes(
                    "application/json"
                )
            ) {

                const data =
                    await response.json();

                if (data?.url) {

                    window.location.href =
                        data.url;

                    return;
                }

                if (data?.download_url) {

                    window.location.href =
                        data.download_url;

                    return;
                }

                throw new Error(
                    data?.detail ||
                    data?.message ||
                    "The server did not return a downloadable file."
                );
            }


            const blob =
                await response.blob();


            if (!blob.size) {

                throw new Error(
                    "The server returned an empty file."
                );
            }


            this.saveBlob(
                blob,
                this.createFilename(
                    type
                )
            );


        } catch (error) {

            console.error(
                "J TEC download error:",
                error
            );

            this.showError(
                this.getFriendlyError(error)
            );

        } finally {

            this.state.downloading = false;

            this.setButtonLoading(
                this.elements.download,
                false
            );

        }

    },


    /* -----------------------------------------------------
       TYPE CHANGE
    ----------------------------------------------------- */

    handleTypeChange() {

        const isAudio =
            this.elements.type.value === "audio";


        this.elements.quality.disabled =
            isAudio;


        if (isAudio) {

            this.elements.quality.value =
                "best";

        }

    },


    /* -----------------------------------------------------
       REQUEST
    ----------------------------------------------------- */

    async request(endpoint, options = {}) {

        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () => controller.abort(),
                CONFIG.REQUEST_TIMEOUT
            );


        try {

            return await fetch(
                CONFIG.API_BASE_URL + endpoint,
                {
                    ...options,

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        ...(options.headers || {})
                    },

                    signal:
                        controller.signal
                }
            );

        } finally {

            clearTimeout(timeout);

        }

    },


    /* -----------------------------------------------------
       URL VALIDATION
    ----------------------------------------------------- */

    isValidUrl(value) {

        try {

            const url =
                new URL(value);

            return (
                url.protocol === "http:" ||
                url.protocol === "https:"
            );

        } catch {

            return false;

        }

    },


    /* -----------------------------------------------------
       DURATION
    ----------------------------------------------------- */

    formatDuration(seconds) {

        if (
            seconds === null ||
            seconds === undefined ||
            !Number.isFinite(
                Number(seconds)
            )
        ) {

            return "";

        }


        const total =
            Math.max(
                0,
                Math.floor(
                    Number(seconds)
                )
            );


        const hours =
            Math.floor(
                total / 3600
            );


        const minutes =
            Math.floor(
                (total % 3600) / 60
            );


        const secs =
            total % 60;


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


    /* -----------------------------------------------------
       FILE NAME
    ----------------------------------------------------- */

    createFilename(type) {

        const title =
            this.state.mediaInfo?.title ||
            "j-tec-download";


        const cleanTitle =
            title
                .replace(
                    /[<>:"/\\|?*\x00-\x1F]/g,
                    ""
                )
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


    /* -----------------------------------------------------
       SAVE BLOB
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       BUTTON LOADING
    ----------------------------------------------------- */

    setButtonLoading(button, loading) {

        const text =
            button.querySelector(
                ".button-text"
            );


        const loader =
            button.querySelector(
                ".button-loader"
            );


        button.disabled = loading;


        if (text) {

            text.hidden = loading;

        }


        if (loader) {

            loader.hidden = !loading;

        }

    },


    /* -----------------------------------------------------
       ERROR HANDLING
    ----------------------------------------------------- */

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

            return (
                `Request failed (${response.status}).`
            );

        }

    },


    getFriendlyError(error) {

        if (
            error?.name ===
            "AbortError"
        ) {

            return (
                "The request took too long. " +
                "Please try again."
            );

        }


        if (
            error instanceof TypeError
        ) {

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

        this.elements.error.textContent =
            message;

        this.elements.error.hidden =
            false;

    },


    hideError() {

        this.elements.error.hidden =
            true;

        this.elements.error.textContent =
            "";

    }

};


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => JTEC.init()
);
