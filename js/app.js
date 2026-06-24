/* ============================================================
   app.js — bootstrap
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

// Re-render on resize for confetti canvas accuracy is handled per-call.
// Persist on tab close as a safety net.
window.addEventListener("beforeunload", () => {
  try { Store.save(true); } catch (e) {}
});
