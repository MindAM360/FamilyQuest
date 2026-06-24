/* ============================================================
   admin.js — full parent admin panel
   ============================================================ */

const ICON_SETS = {
  activity: ["🛏️","📚","🍽️","🤝","📖","✏️","🔤","🧪","🚶","🏃","🚲","⚽","🕌","📿","💝","🌟","🎨","🎵","🧹","🌱","💧","🦷"],
  reward:   ["🎮","📱","🌳","🍦","🎬","🎡","🍔","🧁","🧸","🎁","👑","🍕","🎟️","🚗","💰","⚽","🎨","📺"],
  child:    ["👦","👧","🧒","👶","🦸","🦸‍♀️","🐯","🦊","🐼","🦁","🐧","🦄"],
  challenge:["📚","🏃","📿","💝","🎯","🔥","⭐","🏆","🌟","🧠"],
};

App.viewAdmin = function () {
  if (App.session !== "parent") return App.viewKidDash.call(App);
  const tabs = [
    ["approve", "📥 الموافقات", Store.data.pending.length],
    ["children", "👨‍👩‍👧 الأبناء"],
    ["activities", "📋 الأنشطة"],
    ["rewards", "🎁 المكافآت"],
    ["challenges", "🎯 التحديات"],
    ["data", "💾 البيانات"],
  ];
  const body = {
    approve: App.adminApprove,
    children: App.adminChildren,
    activities: App.adminActivities,
    rewards: App.adminRewards,
    challenges: App.adminChallenges,
    data: App.adminData,
  }[App.adminTab] || App.adminApprove;

  return `
    <h2 class="section-title" style="margin-top:20px"><span class="eyebrow">التحكّم الكامل</span> الإدارة</h2>
    <div class="admin-tabs">
      ${tabs.map(([id, label, badge]) => `
        <button class="admin-tab ${App.adminTab === id ? "active" : ""}" onclick="App.setAdminTab('${id}')">
          ${label}${badge ? ` <span class="chip chip--berry" style="padding:1px 7px">${toAr(badge)}</span>` : ""}
        </button>`).join("")}
    </div>
    <div id="adminBody">${body.call(App)}</div>`;
};
App.setAdminTab = function (t) { App.adminTab = t; App.renderView(); };

/* ---------- Approvals ---------- */
App.adminApprove = function () {
  const pending = Store.data.pending.slice().sort((a, b) => a.ts - b.ts);
  if (!pending.length)
    return `<div class="empty"><div class="ico">🎉</div><div class="ttl">لا طلبات معلّقة</div><p>كل طلبات الأطفال تمت مراجعتها.</p></div>`;
  return `<div class="grid stagger" style="gap:10px">
    ${pending.map(p => {
      const kid = Store.kid(p.kidId);
      const ref = p.type === "activity" ? Store.activity(p.refId) : Store.reward(p.refId);
      if (!ref) return "";
      const isAct = p.type === "activity";
      return `
      <div class="approve-row">
        <div class="who-tag">${kid.avatar}</div>
        <div class="info">
          <div style="font-weight:700">${App.esc(kid.name)} — ${App.esc(ref.name)}</div>
          <div class="tiny muted">
            ${isAct ? `نشاط` : `مكافأة`} ${ref.icon} •
            ${isAct ? `+${toAr(p.points)} نقطة` : `−${toAr(p.points)} نقطة`} • ${timeAgo(p.ts)}
          </div>
        </div>
        <div class="actions">
          <button class="btn btn--mint btn--sm" onclick="App.doApprove('${p.id}')">✓ موافقة</button>
          <button class="btn btn--berry btn--sm" onclick="App.doReject('${p.id}')">✕ رفض</button>
        </div>
      </div>`;
    }).join("")}
  </div>`;
};

App.doApprove = function (pid) {
  const p = Logic.approve(pid);
  App.beep(p && p.type === "reward" ? "win" : "ok");
  if (p && p.type === "reward") App.confetti();
  App.toast(p && p.type === "activity" ? "تمت الموافقة وإضافة النقاط" : "تمت الموافقة على المكافأة", "win", "✅");
  App.renderShell();
};
App.doReject = function (pid) {
  Logic.reject(pid);
  App.beep("err");
  App.toast("تم رفض الطلب", "err", "↩️");
  App.renderView();
};

/* ---------- Children CRUD ---------- */
App.adminChildren = function () {
  return `
    <button class="btn btn--primary btn--block" onclick="App.editChild()">➕ إضافة طفل</button>
    <div class="grid stagger" style="gap:10px;margin-top:14px">
    ${Store.data.children.map(kid => `
      <div class="admin-row">
        <div class="ico-box">${kid.avatar}</div>
        <div class="grow">
          <div class="ttl">${App.esc(kid.name)}</div>
          <div class="sub">${toAr(kid.age)} سنة • ${toAr(Logic.balance(kid))} نقطة متاحة</div>
        </div>
        <div class="row-actions">
          <button class="mini-btn" onclick="App.editChild('${kid.id}')">✏️</button>
          <button class="mini-btn danger" onclick="App.delChild('${kid.id}')">🗑️</button>
        </div>
      </div>`).join("")}
    </div>`;
};

App.editChild = function (id) {
  const kid = id ? Store.kid(id) : null;
  App.modal(`
    <div class="modal__handle"></div>
    <div class="modal__title">${kid ? "تعديل الطفل" : "إضافة طفل"}</div>
    <div class="field"><label>الاسم</label>
      <input class="input" id="f_name" value="${kid ? App.esc(kid.name) : ""}" placeholder="اسم الطفل"></div>
    <div class="field"><label>العمر</label>
      <input class="input" id="f_age" type="number" min="3" max="18" value="${kid ? kid.age : 8}"></div>
    <div class="field"><label>الصورة الرمزية</label>
      <div class="icon-picker" id="f_icons">
        ${ICON_SETS.child.map(ic => `<button class="icon-opt ${kid && kid.avatar === ic ? "sel" : ""}" onclick="App.pickIcon(this)">${ic}</button>`).join("")}
      </div></div>
    <div class="grid grid-2" style="margin-top:8px">
      <button class="btn" onclick="App.closeModal()">إلغاء</button>
      <button class="btn btn--primary" onclick="App.saveChild('${id || ""}')">حفظ</button>
    </div>`);
  App._selIcon = kid ? kid.avatar : ICON_SETS.child[0];
};
App.pickIcon = function (el) {
  el.parentElement.querySelectorAll(".icon-opt").forEach(b => b.classList.remove("sel"));
  el.classList.add("sel");
  App._selIcon = el.textContent;
};
App.saveChild = function (id) {
  const name = document.getElementById("f_name").value.trim();
  const age = parseInt(document.getElementById("f_age").value) || 8;
  if (!name) { App.toast("الرجاء إدخال الاسم", "err", "⚠️"); return; }
  if (id) {
    const kid = Store.kid(id);
    kid.name = name; kid.age = age; kid.avatar = App._selIcon;
  } else {
    Store.data.children.push({
      id: "kid_" + Date.now(), name, role: age < 18 ? "boy" : "boy", avatar: App._selIcon, age,
      points: 0, spent: 0, history: [], badges: [], streaks: { daily: 0, reading: 0, exercise: 0 },
      lastActiveDay: dayKey(Date.now()), best: { points: 0, streak: 0 },
    });
  }
  Store.save();
  App.closeModal();
  App.toast("تم الحفظ", "win", "✅");
  App.renderView();
};
App.delChild = function (id) {
  const kid = Store.kid(id);
  App.confirm(`هل تريد حذف «${App.esc(kid.name)}» وكل بياناته؟ لا يمكن التراجع.`, () => {
    Store.data.children = Store.data.children.filter(c => c.id !== id);
    Store.data.pending = Store.data.pending.filter(p => p.kidId !== id);
    Store.save();
    App.toast("تم الحذف", "err", "🗑️");
    App.renderView();
  }, true);
};

/* ---------- Activities CRUD ---------- */
App.adminActivities = function () {
  return `
    <button class="btn btn--primary btn--block" onclick="App.editActivity()">➕ إضافة نشاط</button>
    <div class="grid stagger" style="gap:10px;margin-top:14px">
    ${Store.data.activities.map(act => `
      <div class="admin-row" style="${act.active ? "" : "opacity:.55"}">
        <div class="ico-box">${act.icon}</div>
        <div class="grow">
          <div class="ttl">${App.esc(act.name)}</div>
          <div class="sub">${CATS[act.category].name} • +${toAr(act.points)} نقطة • صعوبة ${toAr(act.difficulty)}</div>
        </div>
        <div class="row-actions">
          <button class="mini-btn" onclick="App.toggleActive('act','${act.id}')" title="تفعيل/إيقاف">${act.active ? "👁️" : "🚫"}</button>
          <button class="mini-btn" onclick="App.editActivity('${act.id}')">✏️</button>
          <button class="mini-btn danger" onclick="App.delActivity('${act.id}')">🗑️</button>
        </div>
      </div>`).join("")}
    </div>`;
};

App.editActivity = function (id) {
  const act = id ? Store.activity(id) : null;
  App.modal(`
    <div class="modal__handle"></div>
    <div class="modal__title">${act ? "تعديل النشاط" : "إضافة نشاط"}</div>
    <div class="field"><label>اسم النشاط</label>
      <input class="input" id="f_name" value="${act ? App.esc(act.name) : ""}" placeholder="مثال: ترتيب الغرفة"></div>
    <div class="field"><label>الوصف</label>
      <textarea class="textarea" id="f_desc" placeholder="وصف قصير">${act ? App.esc(act.desc) : ""}</textarea></div>
    <div class="grid grid-2">
      <div class="field"><label>الفئة</label>
        <select class="select" id="f_cat">
          ${["home","learn","health","faith"].map(c => `<option value="${c}" ${act && act.category === c ? "selected" : ""}>${CATS[c].name}</option>`).join("")}
        </select></div>
      <div class="field"><label>النقاط</label>
        <input class="input" id="f_points" type="number" min="1" value="${act ? act.points : 10}"></div>
    </div>
    <div class="field"><label>مستوى الصعوبة</label>
      <select class="select" id="f_diff">
        ${[1,2,3].map(d => `<option value="${d}" ${act && act.difficulty === d ? "selected" : ""}>${["سهل","متوسط","صعب"][d-1]}</option>`).join("")}
      </select></div>
    <div class="field"><label>الأيقونة</label>
      <div class="icon-picker">
        ${ICON_SETS.activity.map(ic => `<button class="icon-opt ${act && act.icon === ic ? "sel" : ""}" onclick="App.pickIcon(this)">${ic}</button>`).join("")}
      </div></div>
    <div class="grid grid-2" style="margin-top:8px">
      <button class="btn" onclick="App.closeModal()">إلغاء</button>
      <button class="btn btn--primary" onclick="App.saveActivity('${id || ""}')">حفظ</button>
    </div>`);
  App._selIcon = act ? act.icon : ICON_SETS.activity[0];
};
App.saveActivity = function (id) {
  const name = document.getElementById("f_name").value.trim();
  if (!name) { App.toast("الرجاء إدخال الاسم", "err", "⚠️"); return; }
  const rec = {
    name,
    desc: document.getElementById("f_desc").value.trim(),
    category: document.getElementById("f_cat").value,
    points: parseInt(document.getElementById("f_points").value) || 10,
    difficulty: parseInt(document.getElementById("f_diff").value) || 1,
    icon: App._selIcon,
  };
  if (id) Object.assign(Store.activity(id), rec);
  else Store.data.activities.push({ id: "act_" + Date.now(), active: true, ...rec });
  Store.save(); App.closeModal(); App.toast("تم الحفظ", "win", "✅"); App.renderView();
};
App.delActivity = function (id) {
  const act = Store.activity(id);
  App.confirm(`حذف نشاط «${App.esc(act.name)}»؟`, () => {
    Store.data.activities = Store.data.activities.filter(a => a.id !== id);
    Store.data.pending = Store.data.pending.filter(p => !(p.type === "activity" && p.refId === id));
    Store.save(); App.toast("تم الحذف", "err", "🗑️"); App.renderView();
  }, true);
};
App.toggleActive = function (kind, id) {
  const rec = kind === "act" ? Store.activity(id) : Store.reward(id);
  if (kind === "act") rec.active = !rec.active; else rec.available = !rec.available;
  Store.save(); App.renderView();
};

/* ---------- Rewards CRUD ---------- */
App.adminRewards = function () {
  return `
    <button class="btn btn--primary btn--block" onclick="App.editReward()">➕ إضافة مكافأة</button>
    <div class="grid stagger" style="gap:10px;margin-top:14px">
    ${Store.data.rewards.map(rw => `
      <div class="admin-row" style="${rw.available ? "" : "opacity:.55"}">
        <div class="ico-box">${rw.icon}</div>
        <div class="grow">
          <div class="ttl">${App.esc(rw.name)}</div>
          <div class="sub">${toAr(rw.cost)} نقطة</div>
        </div>
        <div class="row-actions">
          <button class="mini-btn" onclick="App.toggleActive('rw','${rw.id}')">${rw.available ? "👁️" : "🚫"}</button>
          <button class="mini-btn" onclick="App.editReward('${rw.id}')">✏️</button>
          <button class="mini-btn danger" onclick="App.delReward('${rw.id}')">🗑️</button>
        </div>
      </div>`).join("")}
    </div>`;
};
App.editReward = function (id) {
  const rw = id ? Store.reward(id) : null;
  App.modal(`
    <div class="modal__handle"></div>
    <div class="modal__title">${rw ? "تعديل المكافأة" : "إضافة مكافأة"}</div>
    <div class="field"><label>اسم المكافأة</label>
      <input class="input" id="f_name" value="${rw ? App.esc(rw.name) : ""}" placeholder="مثال: ساعة لعب إضافية"></div>
    <div class="field"><label>الوصف</label>
      <textarea class="textarea" id="f_desc" placeholder="وصف قصير">${rw ? App.esc(rw.desc) : ""}</textarea></div>
    <div class="field"><label>النقاط المطلوبة</label>
      <input class="input" id="f_cost" type="number" min="1" value="${rw ? rw.cost : 50}"></div>
    <div class="field"><label>الأيقونة</label>
      <div class="icon-picker">
        ${ICON_SETS.reward.map(ic => `<button class="icon-opt ${rw && rw.icon === ic ? "sel" : ""}" onclick="App.pickIcon(this)">${ic}</button>`).join("")}
      </div></div>
    <div class="grid grid-2" style="margin-top:8px">
      <button class="btn" onclick="App.closeModal()">إلغاء</button>
      <button class="btn btn--primary" onclick="App.saveReward('${id || ""}')">حفظ</button>
    </div>`);
  App._selIcon = rw ? rw.icon : ICON_SETS.reward[0];
};
App.saveReward = function (id) {
  const name = document.getElementById("f_name").value.trim();
  if (!name) { App.toast("الرجاء إدخال الاسم", "err", "⚠️"); return; }
  const rec = {
    name,
    desc: document.getElementById("f_desc").value.trim(),
    cost: parseInt(document.getElementById("f_cost").value) || 50,
    icon: App._selIcon,
  };
  if (id) Object.assign(Store.reward(id), rec);
  else Store.data.rewards.push({ id: "rw_" + Date.now(), available: true, ...rec });
  Store.save(); App.closeModal(); App.toast("تم الحفظ", "win", "✅"); App.renderView();
};
App.delReward = function (id) {
  const rw = Store.reward(id);
  App.confirm(`حذف مكافأة «${App.esc(rw.name)}»؟`, () => {
    Store.data.rewards = Store.data.rewards.filter(r => r.id !== id);
    Store.data.pending = Store.data.pending.filter(p => !(p.type === "reward" && p.refId === id));
    Store.save(); App.toast("تم الحذف", "err", "🗑️"); App.renderView();
  }, true);
};

/* ---------- Challenges ---------- */
App.adminChallenges = function () {
  return `
    <button class="btn btn--primary btn--block" onclick="App.editChallenge()">➕ إنشاء تحدٍّ</button>
    <div class="grid stagger" style="gap:10px;margin-top:14px">
    ${Store.data.challenges.length ? Store.data.challenges.map(ch => {
      const active = Logic.challengeActive(ch);
      return `
      <div class="admin-row">
        <div class="ico-box">${ch.icon}</div>
        <div class="grow">
          <div class="ttl">${App.esc(ch.name)} ${active ? '<span class="chip chip--mint">نشط</span>' : '<span class="chip">منتهٍ</span>'}</div>
          <div class="sub">+${toAr(ch.bonus)} لكل نشاط • ${App.esc(ch.start)} ← ${App.esc(ch.end)}</div>
        </div>
        <div class="row-actions">
          <button class="mini-btn" onclick="App.editChallenge('${ch.id}')">✏️</button>
          <button class="mini-btn danger" onclick="App.delChallenge('${ch.id}')">🗑️</button>
        </div>
      </div>`;
    }).join("") : `<div class="empty"><div class="ico">🎯</div><div class="ttl">لا تحديات</div><p>أنشئ تحدياً لتحفيز أبنائك!</p></div>`}
    </div>`;
};
App.editChallenge = function (id) {
  const ch = id ? Store.data.challenges.find(c => c.id === id) : null;
  const today = dayKey(Date.now());
  const week = dayKey(Date.now() + 7 * 86400000);
  App.modal(`
    <div class="modal__handle"></div>
    <div class="modal__title">${ch ? "تعديل التحدّي" : "تحدٍّ جديد"}</div>
    <div class="field"><label>اسم التحدّي</label>
      <input class="input" id="f_name" value="${ch ? App.esc(ch.name) : ""}" placeholder="مثال: أسبوع القراءة"></div>
    <div class="field"><label>الوصف</label>
      <textarea class="textarea" id="f_desc" placeholder="وصف تحفيزي">${ch ? App.esc(ch.desc) : ""}</textarea></div>
    <div class="grid grid-2">
      <div class="field"><label>تاريخ البداية</label>
        <input class="input" id="f_start" type="date" value="${ch ? isoDate(ch.start) : isoDate(today)}"></div>
      <div class="field"><label>تاريخ النهاية</label>
        <input class="input" id="f_end" type="date" value="${ch ? isoDate(ch.end) : isoDate(week)}"></div>
    </div>
    <div class="field"><label>نقاط إضافية لكل نشاط</label>
      <input class="input" id="f_bonus" type="number" min="0" value="${ch ? ch.bonus : 20}"></div>
    <div class="field"><label>المشاركون</label>
      <div id="f_parts">
        ${Store.data.children.map(k => `
          <label style="display:flex;align-items:center;gap:8px;padding:6px 0">
            <input type="checkbox" value="${k.id}" ${!ch || ch.participants.includes(k.id) ? "checked" : ""} style="width:18px;height:18px">
            ${k.avatar} ${App.esc(k.name)}
          </label>`).join("")}
      </div></div>
    <div class="field"><label>الأيقونة</label>
      <div class="icon-picker">
        ${ICON_SETS.challenge.map(ic => `<button class="icon-opt ${ch && ch.icon === ic ? "sel" : ""}" onclick="App.pickIcon(this)">${ic}</button>`).join("")}
      </div></div>
    <div class="grid grid-2" style="margin-top:8px">
      <button class="btn" onclick="App.closeModal()">إلغاء</button>
      <button class="btn btn--primary" onclick="App.saveChallenge('${id || ""}')">حفظ</button>
    </div>`);
  App._selIcon = ch ? ch.icon : ICON_SETS.challenge[0];
};
App.saveChallenge = function (id) {
  const name = document.getElementById("f_name").value.trim();
  if (!name) { App.toast("الرجاء إدخال الاسم", "err", "⚠️"); return; }
  const parts = [...document.querySelectorAll("#f_parts input:checked")].map(c => c.value);
  const rec = {
    name,
    desc: document.getElementById("f_desc").value.trim(),
    start: document.getElementById("f_start").value,
    end: document.getElementById("f_end").value,
    bonus: parseInt(document.getElementById("f_bonus").value) || 0,
    participants: parts,
    icon: App._selIcon,
  };
  if (id) Object.assign(Store.data.challenges.find(c => c.id === id), rec);
  else Store.data.challenges.push({ id: "ch_" + Date.now(), ...rec });
  Store.save(); App.closeModal(); App.toast("تم الحفظ", "win", "✅"); App.renderView();
};
App.delChallenge = function (id) {
  App.confirm("حذف هذا التحدّي؟", () => {
    Store.data.challenges = Store.data.challenges.filter(c => c.id !== id);
    Store.save(); App.toast("تم الحذف", "err", "🗑️"); App.renderView();
  }, true);
};

/* ---------- Data management ---------- */
App.adminData = function () {
  return `
    <div class="grid stagger" style="gap:12px">
      <div class="card">
        <strong>🔐 رمز ولي الأمر</strong>
        <p class="tiny muted" style="margin:4px 0 10px">غيّر الرمز السري المكوّن من ٤ أرقام.</p>
        <div class="grid grid-2">
          <input class="input" id="f_pin" type="text" inputmode="numeric" maxlength="4" placeholder="رمز جديد" value="">
          <button class="btn btn--primary" onclick="App.changePin()">تغيير الرمز</button>
        </div>
      </div>

      <div class="card">
        <strong>🔊 المؤثرات الصوتية</strong>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
          <span class="muted tiny">تشغيل الأصوات عند الإنجاز والمكافآت</span>
          <button class="btn btn--sm ${Store.data.settings.sound ? "btn--mint" : ""}" onclick="App.toggleSound()">
            ${Store.data.settings.sound ? "🔊 مُفعّل" : "🔇 متوقّف"}
          </button>
        </div>
      </div>

      <div class="card">
        <strong>💾 النسخ الاحتياطي</strong>
        <p class="tiny muted" style="margin:4px 0 12px">صدّر بياناتك أو استوردها. يتم الحفظ تلقائياً في متصفحك.</p>
        <div class="grid grid-2">
          <button class="btn btn--primary" onclick="App.exportData()">⬇️ تصدير JSON</button>
          <button class="btn" onclick="document.getElementById('importFile').click()">⬆️ استيراد JSON</button>
        </div>
        <input type="file" id="importFile" accept="application/json" class="hidden" onchange="App.importData(event)">
      </div>

      <div class="card" style="border-color:var(--berry)">
        <strong style="color:var(--berry)">⚠️ منطقة الخطر</strong>
        <p class="tiny muted" style="margin:4px 0 12px">إعادة تعيين كل النقاط والإحصائيات، أو استعادة البيانات الافتراضية.</p>
        <div class="grid grid-2">
          <button class="btn btn--berry" onclick="App.resetStats()">↺ تصفير النقاط</button>
          <button class="btn btn--berry" onclick="App.resetAll()">🗑️ إعادة ضبط كاملة</button>
        </div>
      </div>
    </div>`;
};
App.changePin = function () {
  const v = document.getElementById("f_pin").value.trim();
  if (!/^\d{4}$/.test(v)) { App.toast("الرمز يجب أن يكون ٤ أرقام", "err", "⚠️"); return; }
  Store.data.settings.parentPin = v; Store.save();
  App.toast("تم تغيير الرمز", "win", "🔐");
  App.renderView();
};
App.toggleSound = function () {
  Store.data.settings.sound = !Store.data.settings.sound; Store.save();
  if (Store.data.settings.sound) App.beep("ok");
  App.renderView();
};
App.exportData = function () {
  const blob = new Blob([Store.exportJSON()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `family-quest-backup-${dayKey(Date.now())}.json`;
  a.click(); URL.revokeObjectURL(url);
  App.toast("تم تصدير البيانات", "win", "⬇️");
};
App.importData = function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    App.confirm("استيراد سيستبدل كل بياناتك الحالية. متابعة؟", () => {
      try {
        Store.importJSON(reader.result);
        App.toast("تم الاستيراد بنجاح", "win", "✅");
        App.renderShell();
      } catch (err) {
        App.toast("ملف غير صالح", "err", "⚠️");
      }
    }, true);
  };
  reader.readAsText(file);
  e.target.value = "";
};
App.resetStats = function () {
  App.confirm("تصفير كل النقاط والسلاسل والأوسمة للأطفال؟ تبقى الأنشطة والمكافآت.", () => {
    Store.data.children.forEach(k => {
      k.points = 0; k.spent = 0; k.history = []; k.badges = [];
      k.streaks = { daily: 0, reading: 0, exercise: 0 };
      k.best = { points: 0, streak: 0 };
    });
    Store.data.pending = []; Store.data.log = [];
    Store.save(); App.toast("تم التصفير", "err", "↺"); App.renderShell();
  }, true);
};
App.resetAll = function () {
  App.confirm("إعادة ضبط كاملة للتطبيق إلى البيانات الافتراضية؟ لا يمكن التراجع.", () => {
    Store.reset(); App.applyTheme();
    App.toast("تمت إعادة الضبط", "err", "🗑️");
    App.session = "parent"; App.adminTab = "data"; App.renderShell();
  }, true);
};

/* ---------- date helpers for inputs ---------- */
function isoDate(key) {
  // key may be "YYYY-M-D" or already ISO — normalize to YYYY-MM-DD
  const parts = String(key).split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return key;
}
