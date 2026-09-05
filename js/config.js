"use strict";

/* =========================================================
   J TEC DOWNLOADER
   Frontend configuration
   ========================================================= */

const CONFIG = Object.freeze({

    /* -----------------------------------------------------
       APPLICATION
    ----------------------------------------------------- */

    APP_NAME: "J TEC Downloader",

    APP_VERSION: "1.0.0",

    APP_TAGLINE: "Fast \u2022 Simple \u2022 Quality",

    // TODO: replace with a real inbox you check, used by the
    // "Send Feedback" button in Settings > About.
    SUPPORT_EMAIL: "fatormajohn911@gmail.com",


    /* -----------------------------------------------------
       BACKEND
    ----------------------------------------------------- */

    API_BASE_URL:
        "https://j-tec-downloader-backend.onrender.com/api",


    /* -----------------------------------------------------
       API ENDPOINTS
    ----------------------------------------------------- */

    ENDPOINTS: Object.freeze({
        HEALTH: "/health",
        INFO: "/info",
        DOWNLOAD: "/download"
    }),


    /* -----------------------------------------------------
       REQUEST SETTINGS
    ----------------------------------------------------- */

    REQUEST_TIMEOUT: 120000

});
