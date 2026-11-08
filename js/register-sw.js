// Offline support. Service workers only run on https:// (or localhost), so this is skipped when the file is opened from disk.
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
