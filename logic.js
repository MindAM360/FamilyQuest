/* ============================================================
   logic.js — game rules: points, approvals, streaks, badges, stats
   ============================================================ */

const Logic = {
  /* ---------- Activity completion → pending ---------- */
  requestActivity(kidId, actId) {
    const act = Store.activity(actId);
    if (!act || !act.active) return false;
    // prevent duplicate pending of same activity by same kid
    const dup = Store.data.pending.find(
      p => p.type === "activity" && p.kidId === kidId && p.refId === actId
    );
    if (dup) return "dup";
    Store.data.pending.push({
      id: "p_" + Date.now() + Math.random().toString(36).slice(2, 6),
      type: "activity",
      kidId, refId: actId,
      points: act.points,
      ts: Date.now(),
    });
    Store.save();
    return true;
  },

  requestReward(kidId, rwId) {
    const rw = Store.reward(rwId);
    const kid = Store.kid(kidId);
    if (!rw || !rw.available) return false;
    const balance = kid.points - kid.spent;
    if (balance < rw.cost) return "poor";
    Store.data.pending.push({
      id: "p_" + Date.now() + Math.random().toString(36).slice(2, 6),
      type: "reward",
      kidId, refId: rwId,
      points: rw.cost,
      ts: Date.now(),
    });
    Store.save();
    return true;
  },

  /* ---------- Parent approval ---------- */
  approve(pendingId) {
    const idx = Store.data.pending.findIndex(p => p.id === pendingId);
    if (idx < 0) return;
    const p = Store.data.pending[idx];
    const kid = Store.kid(p.kidId);

    if (p.type === "activity") {
      const act = Store.activity(p.refId);
      let pts = p.points;
      // challenge bonus
      const bonus = this.challengeBonus(p.kidId, act);
      pts += bonus;
      kid.points += pts;
      kid.history.push({ actId: p.refId, category: act.category, points: pts, ts: Date.now() });
      this.updateStreaks(kid, act);
      this.bumpBest(kid);
      this.log(`${kid.name} أكمل «${act.name}» (+${pts})`, "✅");
      this.checkAchievements(kid);
    } else {
      const rw = Store.reward(p.refId);
      kid.spent += rw.cost;
      kid.history.push({ rwId: p.refId, redeem: true, cost: rw.cost, ts: Date.now() });
      this.log(`${kid.name} استبدل «${rw.name}» (−${rw.cost})`, "🎁");
    }
    Store.data.pending.splice(idx, 1);
    Store.save();
    return p;
  },

  reject(pendingId) {
    const idx = Store.data.pending.findIndex(p => p.id === pendingId);
    if (idx < 0) return;
    const p = Store.data.pending[idx];
    const kid = Store.kid(p.kidId);
    const ref = p.type === "activity" ? Store.activity(p.refId) : Store.reward(p.refId);
    this.log(`تم رفض طلب ${kid.name} «${ref ? ref.name : ""}»`, "↩️");
    Store.data.pending.splice(idx, 1);
    Store.save();
  },

  /* ---------- Streaks ---------- */
  updateStreaks(kid, act) {
    const today = dayKey(Date.now());
    const yesterday = dayKey(Date.now() - 86400000);
    if (kid.lastActiveDay === today) {
      // already counted today
    } else if (kid.lastActiveDay === yesterday) {
      kid.streaks.daily += 1;
    } else {
      kid.streaks.daily = 1;
    }
    kid.lastActiveDay = today;
    if (act.category === "learn" && act.id === "act_read") kid.streaks.reading += 1;
    if (act.category === "health") kid.streaks.exercise += 1;
  },

  bumpBest(kid) {
    kid.best = kid.best || { points: 0, streak: 0 };
    if (kid.points > kid.best.points) kid.best.points = kid.points;
    if (kid.streaks.daily > kid.best.streak) kid.best.streak = kid.streaks.daily;
  },

  /* ---------- Challenges ---------- */
  challengeBonus(kidId, act) {
    const today = dayKey(Date.now());
    let bonus = 0;
    Store.data.challenges.forEach(ch => {
      if (!ch.participants.includes(kidId)) return;
      if (!this.challengeActive(ch)) return;
      // simple rule: any activity during challenge earns bonus
      bonus += ch.bonus || 0;
    });
    return bonus;
  },
  challengeActive(ch) {
    const t = Date.now();
    const s = new Date(ch.start).getTime();
    const e = new Date(ch.end).getTime() + 86400000;
    return t >= s && t <= e;
  },

  /* ---------- Achievements ---------- */
  checkAchievements(kid) {
    const earned = new Set(kid.badges);
    const hist = kid.history.filter(h => h.actId);
    const count = (fn) => hist.filter(fn).length;

    const rules = {
      first_activity: () => hist.length >= 1,
      streak_7: () => kid.streaks.daily >= 7,
      streak_30: () => kid.streaks.daily >= 30,
      reading_champ: () => count(h => h.actId === "act_read") >= 10,
      sports_hero: () => count(h => h.category === "health") >= 10,
      helping_hand: () => count(h => h.actId === "act_help") >= 5,
      quran_star: () => count(h => h.actId === "act_quran") >= 10,
      super_week: () => this.weekPoints(kid) >= 100,
    };

    const newly = [];
    Object.entries(rules).forEach(([id, test]) => {
      if (!earned.has(id) && test()) {
        kid.badges.push(id);
        newly.push(id);
        const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
        this.log(`${kid.name} حصل على وسام «${def.name}»!`, def.icon);
      }
    });
    return newly;
  },

  /* ---------- Statistics ---------- */
  weekPoints(kid) {
    const sw = startOfWeek(Date.now());
    return kid.history.filter(h => h.points && h.ts >= sw).reduce((s, h) => s + h.points, 0);
  },
  monthPoints(kid) {
    const sm = startOfMonth(Date.now());
    return kid.history.filter(h => h.points && h.ts >= sm).reduce((s, h) => s + h.points, 0);
  },
  balance(kid) { return kid.points - kid.spent; },

  stats(kid) {
    const acts = kid.history.filter(h => h.actId);
    const redeems = kid.history.filter(h => h.redeem);
    // favorite activity
    const tally = {};
    acts.forEach(h => { tally[h.actId] = (tally[h.actId] || 0) + 1; });
    let favId = null, favN = 0;
    Object.entries(tally).forEach(([id, n]) => { if (n > favN) { favN = n; favId = id; } });
    const fav = favId ? Store.activity(favId) : null;
    // completion rate (approved vs total requested incl pending+rejected estimate) — use approved over active activities count today
    const activeActs = Store.data.activities.filter(a => a.active).length;
    return {
      earned: kid.points,
      spent: kid.spent,
      balance: this.balance(kid),
      completed: acts.length,
      redeemed: redeems.length,
      week: this.weekPoints(kid),
      month: this.monthPoints(kid),
      favorite: fav ? `${fav.icon} ${fav.name}` : "—",
      longestStreak: (kid.best && kid.best.streak) || kid.streaks.daily,
      rate: activeActs ? Math.min(100, Math.round((acts.length / (activeActs * 4)) * 100)) : 0,
    };
  },

  /* ---------- Leaderboard ---------- */
  leaderboard(range) {
    const fn = range === "week" ? (k) => this.weekPoints(k)
      : range === "month" ? (k) => this.monthPoints(k)
      : (k) => k.points;
    return Store.data.children
      .map(k => ({ kid: k, score: fn(k) }))
      .sort((a, b) => b.score - a.score);
  },

  /* ---------- Activity feed ---------- */
  log(text, icon) {
    Store.data.log.unshift({ text, icon, ts: Date.now() });
    Store.data.log = Store.data.log.slice(0, 40);
  },

  /* ---------- Daily reset check (streak break) ---------- */
  checkStreakBreaks() {
    const twoDaysAgo = dayKey(Date.now() - 2 * 86400000);
    const yesterday = dayKey(Date.now() - 86400000);
    const today = dayKey(Date.now());
    Store.data.children.forEach(kid => {
      if (kid.lastActiveDay !== today && kid.lastActiveDay !== yesterday) {
        kid.streaks.daily = 0;
      }
    });
    Store.save(true);
  },
};
