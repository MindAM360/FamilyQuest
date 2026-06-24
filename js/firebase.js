/* ============================================================
   firebase.js — مزامنة البيانات الفورية عبر Firebase Firestore
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcptMU1AXgDRk2lyhLMdhgH12JSd0ZQ-A",
  authDomain: "family-quest-e01c2.firebaseapp.com",
  projectId: "family-quest-e01c2",
  storageBucket: "family-quest-e01c2.firebasestorage.app",
  messagingSenderId: "569084629830",
  appId: "1:569084629830:web:f1a89ff29142e98678cb47",
};

const fireApp = initializeApp(firebaseConfig);
const db = getFirestore(fireApp);
const DOC_REF = doc(db, "family", "data");

let _unsubscribe = null;
let _isSaving = false;
let _saveTimer = null;

const Sync = {
  /* أول تحميل — اجلب البيانات من السحابة أو استخدم المحلية */
  async init() {
    try {
      const snap = await getDoc(DOC_REF);
      if (snap.exists()) {
        const remote = snap.data().payload;
        if (remote) {
          Store.data = JSON.parse(remote);
          Store.data.achievements = ACHIEVEMENT_DEFS;
          Store.save(true);
          console.log("✅ بيانات محمّلة من Firebase");
        }
      } else {
        // أول مرة — ارفع البيانات المحلية للسحابة
        await this.push();
      }
    } catch (e) {
      console.warn("Firebase غير متاح، استخدام البيانات المحلية", e);
    }
    this.listen();
  },

  /* استمع للتغييرات الفورية من أجهزة أخرى */
  listen() {
    if (_unsubscribe) _unsubscribe();
    _unsubscribe = onSnapshot(DOC_REF, (snap) => {
      if (_isSaving) return; // تجاهل التغييرات الناتجة عن حفظنا نفسنا
      if (!snap.exists()) return;
      const remote = snap.data().payload;
      if (!remote) return;
      try {
        const parsed = JSON.parse(remote);
        Store.data = parsed;
        Store.data.achievements = ACHIEVEMENT_DEFS;
        Store.save(true);
        // أعد رسم الواجهة إذا كان المستخدم مسجّل دخول
        if (App.session) {
          App.renderShell();
          App.toast("تم تحديث البيانات من جهاز آخر 🔄", "", "🔄");
        }
      } catch (e) {
        console.warn("خطأ في تحليل بيانات Firebase", e);
      }
    }, (err) => {
      console.warn("Firebase listener error", err);
    });
  },

  /* ارفع البيانات للسحابة (مع تأخير لتجميع التغييرات المتتالية) */
  push() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
      _isSaving = true;
      try {
        await setDoc(DOC_REF, {
          payload: JSON.stringify(Store.data),
          updatedAt: Date.now(),
        });
      } catch (e) {
        console.warn("فشل الرفع لـ Firebase", e);
      }
      setTimeout(() => { _isSaving = false; }, 1000);
    }, 800);
  },
};

/* اعترض Store.save لإضافة المزامنة تلقائياً */
const _origSave = Store.save.bind(Store);
Store.save = function(silent) {
  _origSave(silent);
  if (!silent) Sync.push();
};

/* تصدير للاستخدام العام */
window.Sync = Sync;

// ابدأ المزامنة فور تحميل الملف
Sync.init();
