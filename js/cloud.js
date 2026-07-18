/* =============================================================
   Cloud sync (optional)  ☁️  — Firebase Firestore
   If you fill in CONFIG.cloud.firebase (see SETUP-CLOUD.md), the guestbook
   and likes are stored in the cloud and SHARED by everyone, on every device,
   and never lost.

   If it's empty, the site quietly falls back to this-browser storage
   (localStorage) — everything still works, just not shared.
   ============================================================= */
(function () {
  var cfg = (window.CONFIG && window.CONFIG.cloud) || {};
  var fb = cfg.firebase || null;
  var configured = !!(fb && fb.projectId && fb.apiKey);

  var db = null;
  var F = null; // firestore function refs
  var resolveReady;
  var readyPromise = new Promise(function (r) { resolveReady = r; });

  window.Cloud = {
    enabled: configured,
    ready: readyPromise,

    async listGuestbook() {
      var ok = await readyPromise;
      if (!ok || !db) return null;
      try {
        var q = F.query(F.collection(db, "guestbook"), F.orderBy("created", "desc"), F.limit(200));
        var snap = await F.getDocs(q);
        return snap.docs.map(function (d) {
          var x = d.data();
          return { name: x.name, message: x.message, created_at: x.created && x.created.toMillis ? x.created.toMillis() : Date.now() };
        });
      } catch (e) { console.warn("[cloud] guestbook load:", e.message || e); return null; }
    },
    async addGuestbook(name, message) {
      var ok = await readyPromise;
      if (!ok || !db) return false;
      try {
        await F.addDoc(F.collection(db, "guestbook"), { name: name, message: message, created: F.serverTimestamp() });
        return true;
      } catch (e) { console.warn("[cloud] guestbook add:", e.message || e); return false; }
    },
    async getLikeCounts() {
      var ok = await readyPromise;
      if (!ok || !db) return null;
      try {
        var snap = await F.getDocs(F.collection(db, "likes"));
        var m = {};
        snap.forEach(function (d) { m[d.id] = Math.max(0, (d.data().count) || 0); });
        return m;
      } catch (e) { console.warn("[cloud] likes load:", e.message || e); return null; }
    },
    async like(artId) { await bumpLike(artId, 1); },
    async unlike(artId) { await bumpLike(artId, -1); },
  };

  async function bumpLike(artId, by) {
    var ok = await readyPromise;
    if (!ok || !db) return;
    try {
      await F.setDoc(F.doc(db, "likes", artId), { count: F.increment(by) }, { merge: true });
    } catch (e) { console.warn("[cloud] like:", e.message || e); }
  }

  if (!configured) { resolveReady(false); return; }

  // Load Firebase (modular) on demand, only when configured
  var V = "https://www.gstatic.com/firebasejs/10.12.0/";
  Promise.all([import(V + "firebase-app.js"), import(V + "firebase-firestore.js")])
    .then(function (mods) {
      try {
        var app = mods[0].initializeApp(fb);
        var fs = mods[1];
        db = fs.getFirestore(app);
        F = {
          collection: fs.collection, doc: fs.doc, addDoc: fs.addDoc, getDocs: fs.getDocs,
          setDoc: fs.setDoc, query: fs.query, orderBy: fs.orderBy, limit: fs.limit,
          serverTimestamp: fs.serverTimestamp, increment: fs.increment,
        };
        resolveReady(true);
      } catch (e) {
        console.warn("[cloud] init failed:", e);
        window.Cloud.enabled = false;
        resolveReady(false);
      }
    })
    .catch(function () {
      console.warn("[cloud] could not load Firebase — using local storage.");
      window.Cloud.enabled = false;
      resolveReady(false);
    });
})();
