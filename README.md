# Pennylog

A phone-first monthly budget planner. Log spending and income, give each category a monthly limit, keep track of recurring bills, and save toward goals.

- English (UK), Finnish and Swedish, switchable from the header
- Works offline and can be added to the phone's home screen with its own icon
- No build step, no dependencies: plain HTML, CSS and JavaScript

## Project layout

```
index.html               page markup; loads the files below in order
manifest.webmanifest     app name, colours and icons for "Add to Home Screen"
sw.js                    service worker (offline cache)
css/styles.css           all styles, light and dark theme
js/i18n.js               t("key") translation helper and language switching
js/locales/en-GB.js      English texts (default; every key must exist here)
js/locales/fi-FI.js      Finnish texts
js/locales/sv-SE.js      Swedish texts
js/app.js                state, storage, views and events
js/register-sw.js        registers the service worker
icons/                   app icons (SVG sources and PNG exports)
```

## Run it locally

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` straight from disk also works, without offline support.

## Publish (GitHub Pages)

1. Push this folder to a GitHub repository.
2. Repository **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Open `https://<user>.github.io/<repo>/` on your phone.

## Add to the home screen

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu ⋮ → *Add to Home screen* / *Install app*.

The app then opens full screen with the Pennylog icon.

## Your data

Outside Claude the app saves everything in the browser on that device (`localStorage`). Nothing is sent anywhere. To move a budget between devices, or from the Claude version, use **Settings → Save backup** on one and **Settings → Load backup** on the other. Transactions can also be exported as CSV for Excel or Google Sheets.

Category names you have already saved stay as you typed them when you switch language; suggested categories are named in the language active when you first set up the budget.

## Releasing changes

After editing any file, bump `CACHE` in `sw.js` (e.g. `pennylog-v2`) so installed copies fetch the new version.

## Adding a language

1. Copy `js/locales/en-GB.js` to `js/locales/<code>.js` and translate the values.
2. Add `<script src="js/locales/<code>.js" defer></script>` to `index.html`, before `js/app.js`.
3. Add `{ code, label }` to `I18N.languages` in `js/i18n.js`.
4. Add the file to `FILES` in `sw.js`.
