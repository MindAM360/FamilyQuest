/* ============================================================
   store.js — state, persistence, seed data
   ============================================================ */

const STORAGE_KEY = "familyQuest:v1";
const BACKUP_KEY = "familyQuest:backup";

/* ---------- Default seed data ---------- */
function seedData() {
  const now = Date.now();
  const day = 86400000;

  const children = [
    {
      id: "kid_boy",
      name: "يوسف",
      role: "boy",
      avatar: "👦",
      age: 12,
      points: 340,
      spent: 120,
      history: [],        // completed/approved activity log
      badges: ["first_activity", "helping_hand"],
      streaks: { daily: 5, reading: 3, exercise: 2 },
      lastActiveDay: dayKey(now),
      best: { points: 340, streak: 7 },
    },
    {
      id: "kid_girl",
      name: "ليان",
      role: "girl",
      avatar: "👧",
      age: 8,
      points: 285,
      spent: 60,
      history: [],
      badges: ["first_activity"],
      streaks: { daily: 4, reading: 6, exercise: 1 },
      lastActiveDay: dayKey(now),
      best: { points: 285, streak: 6 },
    },
  ];

  const activities = [
    // Home
    a("act_room", "ترتيب غرفة النوم", "رتّب سريرك وملابسك وألعابك", "home", 10, "🛏️", 1),
    a("act_desk", "تنظيم مكتب الدراسة", "رتّب كتبك وأدواتك على المكتب", "home", 8, "📚", 1),
    a("act_table", "المساعدة في تجهيز السفرة", "ساعد في ترتيب طاولة الطعام", "home", 6, "🍽️", 1),
    a("act_help", "مساعدة الوالدين", "ساعد والديك في أي مهمة منزلية", "home", 12, "🤝", 2),
    // Learning
    a("act_read", "القراءة لمدة ٢٠ دقيقة", "اقرأ كتاباً مفيداً لمدة ٢٠ دقيقة", "learn", 15, "📖", 2),
    a("act_hw", "إنهاء الواجبات المدرسية", "أكمل جميع واجباتك المدرسية", "learn", 15, "✏️", 2),
    a("act_eng", "ممارسة اللغة الإنجليزية", "تدرّب على الإنجليزية ١٥ دقيقة", "learn", 12, "🔤", 2),
    a("act_edu", "نشاط تعليمي", "أي نشاط تعليمي أو علمي ممتع", "learn", 10, "🧪", 2),
    // Health & Sports
    a("act_walk", "المشي ٣٠ دقيقة", "امشِ في الخارج لمدة ٣٠ دقيقة", "health", 12, "🚶", 2),
    a("act_exercise", "تمارين رياضية ٢٠ دقيقة", "مارس تمارين رياضية", "health", 14, "🏃", 2),
    a("act_bike", "ركوب الدراجة", "اركب دراجتك في الحي", "health", 10, "🚲", 1),
    a("act_play", "اللعب في الخارج", "العب في الهواء الطلق", "health", 8, "⚽", 1),
    // Faith & Character
    a("act_pray", "الصلوات اليومية", "أدِّ صلواتك في وقتها", "faith", 20, "🕌", 2),
    a("act_quran", "قراءة القرآن", "اقرأ ورداً من القرآن الكريم", "faith", 18, "📿", 2),
    a("act_kind", "عمل لطيف تجاه العائلة", "قدّم عملاً لطيفاً لأحد أفراد العائلة", "faith", 10, "💝", 1),
    a("act_honest", "تحدي الصدق", "كن صادقاً طوال اليوم", "faith", 12, "🌟", 2),
  ];

  const rewards = [
    // Digital
    r("rw_ps15", "١٥ دقيقة بلايستيشن إضافية", "وقت لعب إضافي على البلايستيشن", 40, "🎮"),
    r("rw_ps30", "٣٠ دقيقة بلايستيشن إضافية", "وقت لعب أطول على البلايستيشن", 70, "🎮"),
    r("rw_ipad15", "١٥ دقيقة آيباد إضافية", "وقت إضافي على الآيباد", 35, "📱"),
    r("rw_ipad30", "٣٠ دقيقة آيباد إضافية", "وقت أطول على الآيباد", 65, "📱"),
    // Experiences
    r("rw_outing", "نزهة عائلية", "رحلة ممتعة مع العائلة", 150, "🌳"),
    r("rw_icecream", "رحلة آيس كريم", "آيس كريم لذيذ من المحل المفضل", 80, "🍦"),
    r("rw_movie", "ليلة أفلام", "مشاهدة فيلم مع العائلة", 90, "🎬"),
    r("rw_park", "زيارة خاصة للحديقة", "يوم مميز في الحديقة", 120, "🎡"),
    // Food
    r("rw_fastfood", "وجبة مطعم", "وجبتك المفضلة من المطعم", 110, "🍔"),
    r("rw_dessert", "حلوى مفضلة", "حلوى من اختيارك", 50, "🧁"),
    // Special
    r("rw_toy", "لعبة جديدة", "لعبة جديدة من اختيارك", 200, "🧸"),
    r("rw_surprise", "هدية مفاجئة", "هدية يختارها والداك", 180, "🎁"),
    r("rw_choose", "اختيار نشاط العائلة", "أنت تختار نشاط العائلة القادم", 100, "👑"),
  ];

  return {
    settings: {
      parentPin: "1234",
      theme: "light",
      sound: true,
      familyName: "عائلتنا",
    },
    children,
    activities,
    rewards,
    pending: [],          // {id, type:'activity'|'reward', kidId, refId, points, ts}
    challenges: [
      {
        id: "ch_read",
        name: "أسبوع القراءة",
        desc: "اقرأ كل يوم واحصل على نقاط إضافية!",
        icon: "📚",
        bonus: 30,
        start: dayKey(now),
        end: dayKey(now + 7 * day),
        participants: ["kid_boy", "kid_girl"],
      },
    ],
    achievements: ACHIEVEMENT_DEFS,
    log: [],              // activity feed
    meta: { created: now, version: 1 },
  };
}

/* helpers to build records compactly */
function a(id, name, desc, category, points, icon, difficulty) {
  return { id, name, desc, category, points, icon, difficulty, active: true };
}
function r(id, name, desc, cost, icon) {
  return { id, name, desc, cost, icon, available: true };
}

/* ---------- Achievement definitions ---------- */
const ACHIEVEMENT_DEFS = [
  { id: "first_activity", name: "البداية", desc: "أكمل أول نشاط", icon: "🎯" },
  { id: "streak_7", name: "أسبوع متواصل", desc: "حافظ على ٧ أيام متتالية", icon: "🔥" },
  { id: "streak_30", name: "بطل الاستمرار", desc: "٣٠ يوماً متتالية", icon: "💎" },
  { id: "reading_champ", name: "بطل القراءة", desc: "أكمل القراءة ١٠ مرات", icon: "📖" },
  { id: "sports_hero", name: "بطل الرياضة", desc: "أكمل ١٠ أنشطة رياضية", icon: "🏆" },
  { id: "helping_hand", name: "اليد المساعدة", desc: "ساعد العائلة ٥ مرات", icon: "🤝" },
  { id: "quran_star", name: "نجم القرآن", desc: "اقرأ القرآن ١٠ مرات", icon: "⭐" },
  { id: "super_week", name: "الأسبوع الخارق", desc: "اكسب ١٠٠ نقطة في أسبوع", icon: "🚀" },
];

/* ---------- Date helpers ---------- */
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function startOfWeek(ts) {
  const d = new Date(ts);
  const diff = d.getDate() - d.getDay();
  return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
}
function startOfMonth(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/* ---------- Store ---------- */
const Store = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? JSON.parse(raw) : seedData();
    } catch (e) {
      console.warn("تعذّر تحميل البيانات، استخدام البيانات الافتراضية", e);
      this.data = seedData();
    }
    // Ensure achievement defs always present/up to date
    this.data.achievements = ACHIEVEMENT_DEFS;
    this.save(true);
    return this.data;
  },

  save(silent) {
    try {
      const json = JSON.stringify(this.data);
      localStorage.setItem(STORAGE_KEY, json);
      // Rolling backup
      localStorage.setItem(BACKUP_KEY, json);
    } catch (e) {
      if (!silent) console.error("فشل الحفظ", e);
    }
  },

  reset() {
    this.data = seedData();
    this.save();
  },

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed.children || !parsed.activities) throw new Error("ملف غير صالح");
    this.data = parsed;
    this.data.achievements = ACHIEVEMENT_DEFS;
    this.save();
  },

  // Convenience getters
  kid(id) { return this.data.children.find(c => c.id === id); },
  activity(id) { return this.data.activities.find(x => x.id === id); },
  reward(id) { return this.data.rewards.find(x => x.id === id); },
};
