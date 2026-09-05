"use strict";

/* =========================================================
   J TEC DOWNLOADER
   Language translations.

   Add a new language by adding a key here, then it will
   automatically show up in Settings > Appearance > Language.
   ========================================================= */

const I18N = {

    STORAGE_KEY: "jtec_language",

    TRANSLATIONS: {
        en: {
            label: "English",
            badge: "FAST \u2022 SIMPLE \u2022 QUALITY",
            heroLine1: "Download",
            heroLine2: "Anything.",
            heroDescription: "Paste a supported media link and choose video or audio.",
            mediaUrlLabel: "Media URL",
            mediaUrlPlaceholder: "Paste your video link here...",
            getMedia: "Get Media",
            urlHint: "We'll fetch the best quality for you. \u2728",
            download: "Download",
            featSpeedTitle: "Super Fast",
            featSpeedDesc: "Lightning speed downloads.",
            featSecureTitle: "Secure",
            featSecureDesc: "100% safe and private.",
            featQualityTitle: "High Quality",
            featQualityDesc: "Best quality guaranteed.",
            featEasyTitle: "Easy to Use",
            featEasyDesc: "Simple interface, powerful results.",
            platformsLabel: "\u{1F310} SUPPORTED PLATFORMS",
            more: "More",
            promoTitle: "Your All-in-One Downloader",
            promoSub: "One link. Unlimited possibilities.",
            footerDisclaimer: "Download content you have permission to save."
        },

        es: {
            label: "Espa\u00f1ol",
            badge: "R\u00c1PIDO \u2022 SIMPLE \u2022 CALIDAD",
            heroLine1: "Descarga",
            heroLine2: "Cualquier Cosa.",
            heroDescription: "Pega un enlace compatible y elige video o audio.",
            mediaUrlLabel: "URL del Medio",
            mediaUrlPlaceholder: "Pega el enlace del video aqu\u00ed...",
            getMedia: "Obtener Medio",
            urlHint: "Buscaremos la mejor calidad para ti. \u2728",
            download: "Descargar",
            featSpeedTitle: "Muy R\u00e1pido",
            featSpeedDesc: "Descargas a gran velocidad.",
            featSecureTitle: "Seguro",
            featSecureDesc: "100% seguro y privado.",
            featQualityTitle: "Alta Calidad",
            featQualityDesc: "Calidad garantizada.",
            featEasyTitle: "F\u00e1cil de Usar",
            featEasyDesc: "Interfaz simple, resultados potentes.",
            platformsLabel: "\u{1F310} PLATAFORMAS COMPATIBLES",
            more: "M\u00e1s",
            promoTitle: "Tu Descargador Todo en Uno",
            promoSub: "Un enlace. Posibilidades ilimitadas.",
            footerDisclaimer: "Descarga solo contenido que tengas permiso de guardar."
        },

        fr: {
            label: "Fran\u00e7ais",
            badge: "RAPIDE \u2022 SIMPLE \u2022 QUALIT\u00c9",
            heroLine1: "T\u00e9l\u00e9chargez",
            heroLine2: "N'importe Quoi.",
            heroDescription: "Collez un lien pris en charge et choisissez vid\u00e9o ou audio.",
            mediaUrlLabel: "URL du Media",
            mediaUrlPlaceholder: "Collez le lien de la vid\u00e9o ici...",
            getMedia: "Obtenir le Media",
            urlHint: "Nous r\u00e9cup\u00e9rerons la meilleure qualit\u00e9. \u2728",
            download: "T\u00e9l\u00e9charger",
            featSpeedTitle: "Ultra Rapide",
            featSpeedDesc: "T\u00e9l\u00e9chargements \u00e9clair.",
            featSecureTitle: "S\u00e9curis\u00e9",
            featSecureDesc: "100% s\u00fbr et priv\u00e9.",
            featQualityTitle: "Haute Qualit\u00e9",
            featQualityDesc: "Qualit\u00e9 garantie.",
            featEasyTitle: "Facile \u00e0 Utiliser",
            featEasyDesc: "Interface simple, r\u00e9sultats puissants.",
            platformsLabel: "\u{1F310} PLATEFORMES PRISES EN CHARGE",
            more: "Plus",
            promoTitle: "Votre T\u00e9l\u00e9chargeur Tout-en-Un",
            promoSub: "Un lien. Des possibilit\u00e9s illimit\u00e9es.",
            footerDisclaimer: "T\u00e9l\u00e9chargez uniquement le contenu que vous \u00eates autoris\u00e9 \u00e0 enregistrer."
        }
    },

    current() {
        return localStorage.getItem(this.STORAGE_KEY) || "en";
    },

    apply(lang) {
        const dict = this.TRANSLATIONS[lang] || this.TRANSLATIONS.en;

        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (dict[key]) el.textContent = dict[key];
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
            const key = el.getAttribute("data-i18n-placeholder");
            if (dict[key]) el.placeholder = dict[key];
        });

        localStorage.setItem(this.STORAGE_KEY, lang);
        document.documentElement.lang = lang;
    },

    init() {
        this.apply(this.current());
    }
};

document.addEventListener("DOMContentLoaded", () => I18N.init());
