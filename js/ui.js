/* ============================================================
   ui.js — rendering, navigation, effects
   ============================================================ */

const App = {
  session: null,    // 'parent' | kidId
  view: "dash",
  filter: "all",
  adminTab: "approve",
  lbRange: "week",

  init() {
    Store.load();
    Logic.checkStreakBreaks();
    this.applyTheme();
    this.renderGate();
  },

  /* ---------- Theme ---------- */
  applyTheme() {
    document.documentElement.setAttribute("data-theme", Store.data.settings.theme);
  },
  toggleTheme() {
    Store.data.settings.theme = Store.data.settings.theme === "dark" ? "light" : "dark";
    Store.save();
    this.applyTheme();
  },

  /* ---------- Sound ---------- */
  beep(type) {
    if (!Store.data.settings.sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      const map = { ok: [660, 880], win: [523, 659, 784, 1047], err: [320, 200] };
      const notes = map[type] || [600];
      let t = ctx.currentTime;
      notes.forEach((f, i) => {
        o.frequency.setValueAtTime(f, t + i * 0.09);
      });
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + notes.length * 0.09 + 0.1);
      o.start(t); o.stop(t + notes.length * 0.09 + 0.15);
    } catch (e) { /* ignore */ }
  },

  /* ---------- Toast ---------- */
  toast(msg, kind, icon) {
    let wrap = document.getElementById("toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toast-wrap"; wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const t = document.createElement("div");
    t.className = "toast" + (kind ? ` toast--${kind}` : "");
    t.innerHTML = `<span>${icon || "✨"}</span><span>${msg}</span>`;
    wrap.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity .3s, transform .3s";
      t.style.opacity = "0"; t.style.transform = "translateY(12px)";
      setTimeout(() => t.remove(), 320);
    }, 2600);
  },

  /* ---------- Confetti ---------- */
  confetti() {
    const c = document.createElement("canvas");
    c.id = "confetti";
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#F5A623", "#FF8A5B", "#2DD4A7", "#4FB0E8", "#E8536E", "#9B6DF3"];
    const N = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 130;
    const parts = Array.from({ length: N }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: innerHeight / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -16 - 5,
      r: Math.random() * 7 + 4,
      col: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
      life: 1,
    }));
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(p => {
        p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.008;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      frame++;
      if (frame < 150) requestAnimationFrame(tick);
      else c.remove();
    };
    if (N) tick(); else setTimeout(() => c.remove(), 50);
  },

  /* ---------- Confirm dialog ---------- */
  confirm(msg, onYes, danger) {
    this.modal(`
      <div class="modal__handle"></div>
      <div class="modal__title">تأكيد</div>
      <p class="muted" style="margin:8px 0 20px">${msg}</p>
      <div class="grid grid-2">
        <button class="btn" onclick="App.closeModal()">إلغاء</button>
        <button class="btn ${danger ? "btn--berry" : "btn--primary"}" id="confirmYes">تأكيد</button>
      </div>
    `);
    document.getElementById("confirmYes").onclick = () => { this.closeModal(); onYes(); };
  },

  /* ---------- Modal ---------- */
  modal(html) {
    this.closeModal();
    const o = document.createElement("div");
    o.className = "overlay"; o.id = "overlay";
    o.innerHTML = `<div class="modal" onclick="event.stopPropagation()">${html}</div>`;
    o.onclick = () => this.closeModal();
    document.body.appendChild(o);
  },
  closeModal() {
    const o = document.getElementById("overlay");
    if (o) o.remove();
  },

  esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, m =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  },
};
