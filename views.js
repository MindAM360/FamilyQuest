/* ============================================================
   views.js — gate, shell, dashboard, child & shared views
   ============================================================ */

/* ============================================================
   GATE / LOGIN
   ============================================================ */
App.renderGate = function () {
  const root = document.getElementById("root");
  const kids = Store.data.children;
  root.innerHTML = `
    <div class="gate">
      <div class="gate__card">
        <div class="gate__mark">🏰</div>
        <h1 class="gate__title">رحلة العائلة</h1>
        <p class="gate__sub">من أنت؟ اختر شخصيتك للبدء</p>
        <div class="who-grid">
          ${kids.map(k => `
            <button class="who" onclick="App.enterKid('${k.id}')">
              <span class="who__ava">${k.avatar}</span>
              <span class="who__name">${App.esc(k.name)}</span>
              <span class="who__role">${k.age} سنة</span>
            </button>`).join("")}
          <button class="who" onclick="App.askPin()">
            <span class="who__ava">👨‍👩‍👧</span>
            <span class="who__name">ولي الأمر</span>
            <span class="who__role">الإدارة</span>
          </button>
        </div>
      </div>
    </div>`;
};

/* PIN entry */
App.pinBuffer = "";
App.askPin = function () {
  App.pinBuffer = "";
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="gate">
      <div class="gate__card pin-wrap">
        <div class="gate__mark">🔐</div>
        <h1 class="gate__title">رمز ولي الأمر</h1>
        <p class="gate__sub">أدخل الرمز السري المكوّن من ٤ أرقام</p>
        <div class="pin-dots" id="pinDots">
          ${[0,1,2,3].map(() => `<span class="pin-dot"></span>`).join("")}
        </div>
        <div class="keypad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="key" onclick="App.pinPress('${n}')">${toAr(n)}</button>`).join("")}
          <button class="key" onclick="App.pinBack()">⌫</button>
          <button class="key" onclick="App.pinPress('0')">٠</button>
          <button class="key" onclick="App.renderGate()">↩</button>
        </div>
        <p class="tiny muted" style="margin-top:18px">الرمز الافتراضي: ١٢٣٤</p>
      </div>
    </div>`;
};
App.pinPress = function (n) {
  if (App.pinBuffer.length >= 4) return;
  App.pinBuffer += n;
  App.renderPinDots();
  if (App.pinBuffer.length === 4) setTimeout(App.checkPin, 180);
};
App.pinBack = function () { App.pinBuffer = App.pinBuffer.slice(0, -1); App.renderPinDots(); };
App.renderPinDots = function () {
  const dots = document.querySelectorAll("#pinDots .pin-dot");
  dots.forEach((d, i) => d.classList.toggle("on", i < App.pinBuffer.length));
};
App.checkPin = function () {
  if (App.pinBuffer === Store.data.settings.parentPin) {
    App.beep("ok");
    App.enterParent();
  } else {
    App.beep("err");
    const dots = document.querySelectorAll("#pinDots .pin-dot");
    dots.forEach(d => d.classList.add("err"));
    setTimeout(() => { App.pinBuffer = ""; App.renderPinDots(); dots.forEach(d => d.classList.remove("err")); }, 500);
  }
};

/* ============================================================
   ENTER SESSIONS
   ============================================================ */
App.enterKid = function (kidId) {
  App.session = kidId;
  App.view = "dash";
  App.beep("ok");
  App.renderShell();
};
App.enterParent = function () {
  App.session = "parent";
  App.view = "dash";
  App.renderShell();
};
App.logout = function () {
  App.session = null;
  App.renderGate();
};

/* ============================================================
   SHELL (topbar + view + tabbar)
   ============================================================ */
App.renderShell = function () {
  const root = document.getElementById("root");
  const isParent = App.session === "parent";
  const kid = isParent ? null : Store.kid(App.session);
  const pendingCount = Store.data.pending.length;

  const tabs = isParent
    ? [
        ["dash", "🏠", "الرئيسية"],
        ["activities", "📋", "الأنشطة"],
        ["admin", "⚙️", "الإدارة"],
        ["leaderboard", "🏅", "الترتيب"],
        ["stats", "📊", "التقارير"],
      ]
    : [
        ["dash", "🏠", "رحلتي"],
        ["activities", "📋", "الأنشطة"],
        ["rewards", "🎁", "المكافآت"],
        ["achievements", "🏆", "الأوسمة"],
        ["leaderboard", "🏅", "الترتيب"],
      ];

  root.innerHTML = `
    <div class="topbar">
      <div class="topbar__logo">
        <span class="mark">🏰</span>
        <span>${isParent ? "لوحة ولي الأمر" : App.esc(kid.name)}</span>
      </div>
      <div class="topbar__spacer"></div>
      <button class="icon-btn" onclick="App.toggleTheme(); App.renderShell()" title="السمة">
        ${Store.data.settings.theme === "dark" ? "☀️" : "🌙"}
      </button>
      <button class="icon-btn" onclick="App.logout()" title="خروج">🚪</button>
    </div>
    <main class="app" id="viewRoot"></main>
    <nav class="tabbar">
      ${tabs.map(([id, ico, label]) => `
        <button class="tab ${App.view === id ? "active" : ""}" onclick="App.go('${id}')">
          <span class="ico">${ico}</span>
          <span>${label}</span>
          ${id === "admin" && pendingCount ? `<span class="chip chip--berry" style="position:absolute;top:0;inset-inline-end:8px;padding:1px 6px">${toAr(pendingCount)}</span>` : ""}
        </button>`).join("")}
    </nav>`;
  App.renderView();
};

App.go = function (view) {
  App.view = view;
  App.filter = "all";
  // update tab active states without full re-render flash
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  App.renderShell();
};

App.renderView = function () {
  const isParent = App.session === "parent";
  const map = {
    dash: isParent ? App.viewParentDash : App.viewKidDash,
    activities: App.viewActivities,
    rewards: App.viewRewards,
    achievements: App.viewAchievements,
    leaderboard: App.viewLeaderboard,
    admin: App.viewAdmin,
    stats: App.viewStats,
  };
  const fn = map[App.view] || App.viewKidDash;
  document.getElementById("viewRoot").innerHTML = `<div class="view">${fn.call(App)}</div>`;
  if (App._afterRender) { App._afterRender(); App._afterRender = null; }
};

/* ============================================================
   KID DASHBOARD
   ============================================================ */
App.viewKidDash = function () {
  const kid = Store.kid(App.session);
  const s = Logic.stats(kid);
  const lb = Logic.leaderboard("all");
  const rank = lb.findIndex(x => x.kid.id === kid.id) + 1;
  const quote = dailyQuote();

  // next reward progress
  const affordable = Store.data.rewards.filter(r => r.available).sort((a, b) => a.cost - b.cost);
  const nextRw = affordable.find(r => r.cost > s.balance) || affordable[affordable.length - 1];
  const prog = nextRw ? Math.min(100, Math.round((s.balance / nextRw.cost) * 100)) : 100;

  const myPending = Store.data.pending.filter(p => p.kidId === kid.id);

  return `
    <div class="stagger">
      <div class="hero-quote" style="margin-top:20px">
        <div class="label">حكمة اليوم</div>
        <div class="q">${quote}</div>
      </div>

      <div class="kid-card kid-card--${kid.role === 'boy' ? 'boy' : 'girl'}" style="margin-top:16px">
        <div class="kid-card__streak">🔥 ${toAr(kid.streaks.daily)} أيام</div>
        <div class="kid-card__top">
          <div class="kid-card__ava">${kid.avatar}</div>
          <div>
            <div class="kid-card__name">${App.esc(kid.name)}</div>
            <div class="kid-card__rank">المركز ${toAr(rank)} • ${rankTitle(rank)}</div>
          </div>
        </div>
        <div class="kid-card__pts">${toAr(s.balance)} <small>نقطة متاحة</small></div>
        <div class="kid-card__stats">
          <div><b>${toAr(s.earned)}</b>مكتسبة</div>
          <div><b>${toAr(s.spent)}</b>مصروفة</div>
          <div><b>${toAr(s.completed)}</b>نشاط</div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <strong>الطريق للمكافأة القادمة</strong>
          <span class="chip chip--honey">${nextRw ? nextRw.icon + " " + App.esc(nextRw.name) : "—"}</span>
        </div>
        <div class="pbar"><span style="width:${prog}%"></span></div>
        <p class="tiny muted" style="margin-top:8px">
          ${nextRw && nextRw.cost > s.balance
            ? `تبقّى ${toAr(nextRw.cost - s.balance)} نقطة — ${encourage(prog)}`
            : "يمكنك استبدال أي مكافأة الآن! 🎉"}
        </p>
      </div>

      <div class="grid grid-2" style="margin-top:16px">
        <div class="stat-tile"><span class="ico">📅</span><span class="num">${toAr(s.week)}</span><span class="lbl">نقاط هذا الأسبوع</span></div>
        <div class="stat-tile"><span class="ico">🔥</span><span class="num">${toAr(kid.streaks.daily)}</span><span class="lbl">سلسلة الأيام</span></div>
        <div class="stat-tile"><span class="ico">🏆</span><span class="num">${toAr(kid.badges.length)}</span><span class="lbl">الأوسمة</span></div>
        <div class="stat-tile"><span class="ico">⏳</span><span class="num">${toAr(myPending.length)}</span><span class="lbl">بانتظار الموافقة</span></div>
      </div>

      ${App.challengeBanner(kid.id)}

      <h2 class="section-title"><span class="eyebrow">ابدأ الآن</span></h2>
      <button class="btn btn--primary btn--block" onclick="App.go('activities')">
        📋 أكمل نشاطاً واكسب نقاطاً
      </button>
    </div>`;
};

App.challengeBanner = function (kidId) {
  const active = Store.data.challenges.filter(ch =>
    ch.participants.includes(kidId) && Logic.challengeActive(ch));
  if (!active.length) return "";
  return active.map(ch => `
    <div class="card" style="margin-top:16px;background:linear-gradient(135deg, rgba(155,109,243,.12), var(--surface));border-color:#9B6DF3">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:2rem">${ch.icon}</div>
        <div style="flex:1">
          <strong>${App.esc(ch.name)}</strong>
          <div class="tiny muted">${App.esc(ch.desc)}</div>
        </div>
        <span class="chip" style="background:rgba(155,109,243,.18);color:#7d4ed6">+${toAr(ch.bonus)} لكل نشاط</span>
      </div>
    </div>`).join("");
};

/* ============================================================
   Localised helpers
   ============================================================ */
function toAr(n) {
  return String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}
function rankTitle(rank) {
  return rank === 1 ? "المتصدّر 👑" : rank === 2 ? "بطل رائع ⭐" : "مستمر 💪";
}
function encourage(prog) {
  if (prog >= 80) return "أنت قريب جداً! 🌟";
  if (prog >= 50) return "واصل التقدّم! 💪";
  if (prog >= 25) return "بداية رائعة! 👏";
  return "كل نشاط يقرّبك أكثر! ✨";
}
function dailyQuote() {
  const quotes = [
    "النجاح رحلة وليس وجهة 🌟",
    "كل يوم فرصة جديدة لتكون أفضل 💫",
    "المثابرة مفتاح كل إنجاز 🔑",
    "القراءة غذاء العقل 📚",
    "الصحة تاج على رؤوس الأصحاء 💪",
    "الأعمال الصغيرة المتكررة تصنع الفرق 🌱",
    "ابتسم، فابتسامتك صدقة 😊",
    "من جدّ وجد، ومن زرع حصد 🌾",
  ];
  const d = new Date();
  return quotes[(d.getFullYear() + d.getMonth() + d.getDate()) % quotes.length];
}
