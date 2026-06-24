/* ============================================================
   views2.js — activities, rewards, achievements, leaderboard,
                parent dashboard, statistics
   ============================================================ */

const CATS = {
  all:    { name: "الكل", icon: "✨" },
  home:   { name: "المنزل", icon: "🏠" },
  learn:  { name: "التعلّم", icon: "📚" },
  health: { name: "الرياضة", icon: "⚽" },
  faith:  { name: "الدين والأخلاق", icon: "🕌" },
};

/* ============================================================
   ACTIVITIES
   ============================================================ */
App.viewActivities = function () {
  const isParent = App.session === "parent";
  const kid = isParent ? null : Store.kid(App.session);
  let acts = Store.data.activities.filter(a => a.active);
  if (App.filter !== "all") acts = acts.filter(a => a.category === App.filter);

  const myPending = kid ? Store.data.pending.filter(p => p.type === "activity" && p.kidId === kid.id).map(p => p.refId) : [];

  return `
    <h2 class="section-title"><span class="eyebrow">المهام</span> الأنشطة</h2>
    <div class="filter-row">
      ${Object.entries(CATS).map(([id, c]) => `
        <button class="filter ${App.filter === id ? "active" : ""}" onclick="App.setFilter('${id}')">
          ${c.icon} ${c.name}
        </button>`).join("")}
    </div>
    ${isParent ? `<p class="tiny muted" style="margin-bottom:10px">بصفتك ولي الأمر، يمكنك تعديل الأنشطة من تبويب الإدارة.</p>` : ""}
    <div class="grid grid-auto stagger">
      ${acts.map(act => App.activityTile(act, kid, myPending)).join("") ||
        `<div class="empty"><div class="ico">📭</div><div class="ttl">لا توجد أنشطة</div><p>لا توجد أنشطة في هذه الفئة بعد.</p></div>`}
    </div>`;
};

App.activityTile = function (act, kid, myPending) {
  const pending = kid && myPending.includes(act.id);
  const catName = CATS[act.category] ? CATS[act.category].name : "";
  return `
    <div class="tile">
      ${pending ? `<span class="tile__pending">⏳ بالانتظار</span>` : ""}
      <div class="tile__ico tile__ico--${act.category}">${act.icon}</div>
      <div class="tile__name">${App.esc(act.name)}</div>
      <div class="tile__desc">${App.esc(act.desc)}</div>
      <div class="tile__foot">
        <span class="tile__pts">+${toAr(act.points)} ⭐</span>
        <span class="diff">${[1,2,3].map(i => `<span class="${i <= act.difficulty ? "on" : ""}"></span>`).join("")}</span>
      </div>
      ${kid ? `
        <button class="btn ${pending ? "" : "btn--primary"} btn--block btn--sm"
          ${pending ? "disabled" : ""}
          onclick="App.completeActivity('${act.id}')">
          ${pending ? "بانتظار موافقة ولي الأمر" : "✓ أكملت هذا النشاط"}
        </button>` : `<span class="chip">${catName}</span>`}
    </div>`;
};

App.setFilter = function (f) { App.filter = f; App.renderView(); };

App.completeActivity = function (actId) {
  const res = Logic.requestActivity(App.session, actId);
  if (res === "dup") { App.toast("هذا النشاط بانتظار الموافقة بالفعل", "err", "⏳"); return; }
  if (res === true) {
    App.beep("ok");
    App.toast("تم الإرسال! ينتظر موافقة ولي الأمر", "win", "📨");
    App.renderView();
  } else {
    App.toast("تعذّر إرسال الطلب", "err", "⚠️");
  }
};

/* ============================================================
   REWARDS STORE
   ============================================================ */
App.viewRewards = function () {
  if (App.session === "parent") return App.viewParentDash.call(App);
  const kid = Store.kid(App.session);
  const bal = Logic.balance(kid);
  const rewards = Store.data.rewards.filter(r => r.available).sort((a, b) => a.cost - b.cost);
  const myPending = Store.data.pending.filter(p => p.type === "reward" && p.kidId === kid.id).map(p => p.refId);

  return `
    <h2 class="section-title"><span class="eyebrow">المتجر</span> المكافآت</h2>
    <div class="card" style="background:linear-gradient(135deg, rgba(245,166,35,.12), var(--surface));margin-bottom:6px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div><div class="tiny muted">رصيدك الحالي</div>
          <div style="font-family:var(--font-display);font-weight:800;font-size:1.8rem">${toAr(bal)} ⭐</div></div>
        <div style="font-size:2.4rem">🛍️</div>
      </div>
    </div>
    <div class="grid grid-auto stagger">
      ${rewards.map(rw => {
        const can = bal >= rw.cost;
        const pending = myPending.includes(rw.id);
        return `
        <div class="tile ${can || pending ? "" : "tile--locked"}">
          ${pending ? `<span class="tile__pending">⏳ بالانتظار</span>` : ""}
          <div class="tile__ico tile__ico--reward">${rw.icon}</div>
          <div class="tile__name">${App.esc(rw.name)}</div>
          <div class="tile__desc">${App.esc(rw.desc)}</div>
          <div class="tile__foot">
            <span class="tile__pts">${toAr(rw.cost)} ⭐</span>
            ${!can && !pending ? `<span class="chip chip--berry">تحتاج ${toAr(rw.cost - bal)}</span>` : ""}
          </div>
          <button class="btn ${pending ? "" : can ? "btn--mint" : ""} btn--block btn--sm"
            ${!can || pending ? "disabled" : ""}
            onclick="App.redeem('${rw.id}')">
            ${pending ? "بانتظار الموافقة" : can ? "🎁 استبدال" : "🔒 نقاط غير كافية"}
          </button>
        </div>`;
      }).join("")}
    </div>`;
};

App.redeem = function (rwId) {
  const res = Logic.requestReward(App.session, rwId);
  if (res === "poor") { App.toast("نقاطك غير كافية لهذه المكافأة", "err", "🔒"); return; }
  if (res === true) {
    App.beep("ok");
    App.toast("تم إرسال طلب الاستبدال لولي الأمر", "win", "🎁");
    App.renderView();
  } else App.toast("هذه المكافأة غير متاحة", "err", "⚠️");
};

/* ============================================================
   ACHIEVEMENTS
   ============================================================ */
App.viewAchievements = function () {
  if (App.session === "parent") return App.viewParentDash.call(App);
  const kid = Store.kid(App.session);
  const earned = new Set(kid.badges);
  return `
    <h2 class="section-title"><span class="eyebrow">إنجازاتك</span> الأوسمة</h2>
    <div class="card" style="margin-bottom:16px;text-align:center">
      <div style="font-family:var(--font-display);font-weight:800;font-size:2rem">${toAr(kid.badges.length)} / ${toAr(ACHIEVEMENT_DEFS.length)}</div>
      <div class="tiny muted">أوسمة تم الحصول عليها</div>
      <div class="pbar" style="margin-top:10px"><span style="width:${(kid.badges.length / ACHIEVEMENT_DEFS.length) * 100}%"></span></div>
    </div>
    <div class="grid grid-auto stagger">
      ${ACHIEVEMENT_DEFS.map(b => {
        const has = earned.has(b.id);
        return `
        <div class="badge ${has ? "unlocked" : "badge--locked"}">
          <div class="badge__ico">${has ? b.icon : "🔒"}</div>
          <div class="badge__name">${App.esc(b.name)}</div>
          <div class="badge__desc">${App.esc(b.desc)}</div>
        </div>`;
      }).join("")}
    </div>`;
};

/* ============================================================
   LEADERBOARD
   ============================================================ */
App.viewLeaderboard = function () {
  const ranges = { week: "الأسبوع", month: "الشهر", all: "الكل" };
  const lb = Logic.leaderboard(App.lbRange);
  const medals = ["🥇", "🥈", "🥉"];
  return `
    <h2 class="section-title"><span class="eyebrow">المنافسة الودّية</span> الترتيب</h2>
    <div class="filter-row">
      ${Object.entries(ranges).map(([id, lbl]) => `
        <button class="filter ${App.lbRange === id ? "active" : ""}" onclick="App.setLb('${id}')">${lbl}</button>`).join("")}
    </div>
    <div class="grid stagger" style="gap:10px">
      ${lb.map((row, i) => `
        <div class="lb-row ${i === 0 ? "lb-row--1" : ""}">
          <div class="lb-medal">${medals[i] || toAr(i + 1)}</div>
          <div class="lb-ava">${row.kid.avatar}</div>
          <div class="lb-info">
            <div class="lb-name">${App.esc(row.kid.name)}</div>
            <div class="lb-msg">${lbMessage(i, row.score)}</div>
          </div>
          <div class="lb-pts">${toAr(row.score)} ⭐</div>
        </div>`).join("")}
    </div>
    <div class="card" style="margin-top:16px;text-align:center;background:linear-gradient(135deg, rgba(45,212,167,.12), var(--surface))">
      <div style="font-size:1.6rem">🌈</div>
      <strong>كل واحد منكم بطل!</strong>
      <p class="tiny muted">المهم أن تتحسّن كل يوم، وليس أن تسبق غيرك.</p>
    </div>`;
};
App.setLb = function (r) { App.lbRange = r; App.renderView(); };
function lbMessage(i, score) {
  if (i === 0) return "في الصدارة، جهد رائع! 🌟";
  if (score === 0) return "ابدأ نشاطك الأول اليوم! 💫";
  return "واصل التقدّم، أنت قريب! 💪";
}

/* ============================================================
   PARENT DASHBOARD
   ============================================================ */
App.viewParentDash = function () {
  const kids = Store.data.children;
  const pending = Store.data.pending;
  const feed = Store.data.log.slice(0, 6);

  return `
    <div class="stagger">
      <h2 class="section-title" style="margin-top:20px"><span class="eyebrow">نظرة عامة</span> لوحة العائلة</h2>

      <div class="grid grid-2">
        ${kids.map(kid => {
          const s = Logic.stats(kid);
          return `
          <div class="kid-card kid-card--${kid.role === 'boy' ? 'boy' : 'girl'}">
            <div class="kid-card__streak">🔥 ${toAr(kid.streaks.daily)}</div>
            <div class="kid-card__top">
              <div class="kid-card__ava">${kid.avatar}</div>
              <div><div class="kid-card__name">${App.esc(kid.name)}</div>
                <div class="kid-card__rank">${toAr(s.completed)} نشاط منجز</div></div>
            </div>
            <div class="kid-card__pts">${toAr(s.balance)} <small>متاحة</small></div>
            <div class="kid-card__stats">
              <div><b>${toAr(s.week)}</b>الأسبوع</div>
              <div><b>${toAr(s.month)}</b>الشهر</div>
              <div><b>${toAr(kid.badges.length)}</b>أوسمة</div>
            </div>
          </div>`;
        }).join("")}
      </div>

      ${pending.length ? `
      <div class="card" style="margin-top:16px;border-color:var(--honey);background:linear-gradient(135deg, rgba(245,166,35,.1), var(--surface))">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div><strong>${toAr(pending.length)} طلب بانتظار موافقتك</strong>
            <div class="tiny muted">راجع طلبات الأنشطة والمكافآت</div></div>
          <button class="btn btn--primary btn--sm" onclick="App.adminTab='approve';App.go('admin')">مراجعة</button>
        </div>
      </div>` : `
      <div class="card" style="margin-top:16px;text-align:center">
        <div style="font-size:1.6rem">✅</div><strong>كل الطلبات تمت مراجعتها</strong>
        <p class="tiny muted">لا توجد طلبات معلّقة حالياً.</p>
      </div>`}

      <h2 class="section-title"><span class="eyebrow">آخر الأحداث</span> النشاط الأخير</h2>
      <div class="card">
        ${feed.length ? feed.map(f => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:1.3rem">${f.icon}</span>
            <span style="flex:1">${App.esc(f.text)}</span>
            <span class="tiny muted">${timeAgo(f.ts)}</span>
          </div>`).join("") :
          `<div class="empty"><div class="ico">📜</div><div class="ttl">لا أحداث بعد</div><p>ستظهر إنجازات الأطفال هنا.</p></div>`}
      </div>
    </div>`;
};

/* ============================================================
   STATISTICS / REPORTS (parent)
   ============================================================ */
App.viewStats = function () {
  if (App.session !== "parent") return App.viewKidDash.call(App);
  const kids = Store.data.children;
  return `
    <h2 class="section-title" style="margin-top:20px"><span class="eyebrow">التقارير</span> الإحصائيات</h2>
    <div class="grid stagger" style="gap:16px">
    ${kids.map(kid => {
      const s = Logic.stats(kid);
      return `
      <div class="card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="font-size:2rem">${kid.avatar}</div>
          <div><strong style="font-size:1.1rem">${App.esc(kid.name)}</strong>
            <div class="tiny muted">ملخّص الأداء</div></div>
        </div>
        <div class="grid grid-2" style="gap:10px">
          ${statBox("نقاط مكتسبة", toAr(s.earned), "⭐")}
          ${statBox("نقاط مصروفة", toAr(s.spent), "💸")}
          ${statBox("أنشطة منجزة", toAr(s.completed), "✅")}
          ${statBox("مكافآت مستبدلة", toAr(s.redeemed), "🎁")}
          ${statBox("أطول سلسلة", toAr(s.longestStreak) + " يوم", "🔥")}
          ${statBox("النشاط المفضّل", s.favorite, "❤️")}
        </div>
        <div style="margin-top:14px">
          <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px">
            <span>معدّل الإنجاز</span><strong>${toAr(s.rate)}٪</strong></div>
          <div class="pbar pbar--mint"><span style="width:${s.rate}%"></span></div>
        </div>
        <div class="grid grid-2" style="gap:10px;margin-top:14px">
          <div class="stat-tile"><span class="ico">📅</span><span class="num">${toAr(s.week)}</span><span class="lbl">ملخّص الأسبوع</span></div>
          <div class="stat-tile"><span class="ico">🗓️</span><span class="num">${toAr(s.month)}</span><span class="lbl">ملخّص الشهر</span></div>
        </div>
      </div>`;
    }).join("")}
    </div>`;
};

function statBox(label, val, icon) {
  return `<div style="background:var(--surface-2);border-radius:14px;padding:12px">
    <div style="font-size:1.2rem">${icon}</div>
    <div style="font-family:var(--font-display);font-weight:800;font-size:1.1rem;margin-top:2px">${val}</div>
    <div class="tiny muted">${label}</div></div>`;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `${toAr(m)} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${toAr(h)} س`;
  return `${toAr(Math.floor(h / 24))} يوم`;
}
