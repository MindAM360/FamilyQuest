/* ============================================================
   app.js — bootstrap
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  App.init();
  // Firebase يبدأ بعد تحميل الصفحة (module script)
  // Sync.init() يُستدعى من firebase.js تلقائياً
});

window.addEventListener("beforeunload", () => {
  try { Store.save(true); } catch (e) {}
});
