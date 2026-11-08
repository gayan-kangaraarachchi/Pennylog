// Pennylog translations.
// Each language lives in js/locales/<code>.js and registers itself in PENNYLOG_LOCALES.
// t("key", {name: value}) returns the text in the current language, falling back to en-GB.
// An entry is either a string with {placeholders} or a function (params) => string,
// used where the wording depends on a number ("1 transaction" / "2 transactions").
"use strict";
window.PENNYLOG_LOCALES = window.PENNYLOG_LOCALES || {};

const I18N = {
  fallback: "en-GB",
  // Order here is the order shown in the language picker.
  languages: [
    { code: "en-GB", label: "English" },
    { code: "fi-FI", label: "Suomi" },
    { code: "sv-SE", label: "Svenska" }
  ],
  lang: "en-GB"
};

(function initLang(){
  let saved = null;
  try { saved = localStorage.getItem("pennylog.lang"); } catch {}
  I18N.lang = I18N.languages.some(l => l.code === saved) ? saved : I18N.fallback;
  document.documentElement.lang = I18N.lang.slice(0, 2);
})();

function t(key, params){
  const p = params || {};
  const dict = window.PENNYLOG_LOCALES[I18N.lang] || {};
  const base = window.PENNYLOG_LOCALES[I18N.fallback] || {};
  const entry = key in dict ? dict[key] : base[key];
  if (entry === undefined) return key;
  if (typeof entry === "function") return entry(p);
  return String(entry).replace(/\{(\w+)\}/g, (_, k) => (k in p ? p[k] : ""));
}

// Locale used for dates, numbers and money.
function locale(){ return I18N.lang; }

function setLang(code){
  if (!I18N.languages.some(l => l.code === code)) return;
  I18N.lang = code;
  try { localStorage.setItem("pennylog.lang", code); } catch {}
  document.documentElement.lang = code.slice(0, 2);
  applyStaticText();
}

// Fixed text in index.html: elements carry data-i18n="key" (text) or data-i18n-aria="key" (aria-label).
function applyStaticText(root){
  const r = root || document;
  r.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  r.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}
