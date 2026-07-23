/* =============================================================
   Cloud sync (optional)  ☁️  — Firebase Firestore + Auth
   When CONFIG.cloud.firebase is set, this powers:
     - shared guestbook & likes (everyone)
     - owner-editable profile & artworks (only the signed-in owner can write;
       everyone can read). Images are stored as compressed data URLs in
       Firestore, so no paid Storage bucket is needed.
   Falls back to localStorage / config defaults when not configured.
   ============================================================= */
(function () {
  var cfg = (window.CONFIG && window.CONFIG.cloud) || {};
  var fb = cfg.firebase || null;
  var configured = !!(fb && fb.projectId && fb.apiKey);

  var db = null, auth = null, F = null, A = null;
  var resolveReady;
  var readyPromise = new Promise(function (r) { resolveReady = r; });

  function ok() { return readyPromise; }

  window.Cloud = {
    enabled: configured,
    ready: readyPromise,

    /* ---------- guestbook ---------- */
    async listGuestbook() {
      if (!(await ok()) || !db) return null;
      try {
        var q = F.query(F.collection(db, "guestbook"), F.orderBy("created", "desc"), F.limit(200));
        var snap = await F.getDocs(q);
        return snap.docs.map(function (d) { var x = d.data(); return { name: x.name, message: x.message, created_at: x.created && x.created.toMillis ? x.created.toMillis() : Date.now() }; });
      } catch (e) { console.warn("[cloud] guestbook load:", e.message || e); return null; }
    },
    async addGuestbook(name, message) {
      if (!(await ok()) || !db) return false;
      try { await F.addDoc(F.collection(db, "guestbook"), { name: name, message: message, created: F.serverTimestamp() }); return true; }
      catch (e) { console.warn("[cloud] guestbook add:", e.message || e); return false; }
    },

    /* ---------- live chat (real-time) ---------- */
    // cb receives the full message list (oldest -> newest) on every change.
    watchChat(cb) {
      var unsub = null, cancelled = false;
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        var q = F.query(F.collection(db, "guestbook"), F.orderBy("created", "asc"), F.limit(300));
        unsub = F.onSnapshot(q, function (snap) {
          cb(snap.docs.map(function (d) { var x = d.data(); return { name: x.name, message: x.message, created_at: x.created && x.created.toMillis ? x.created.toMillis() : Date.now() }; }));
        }, function (e) { console.warn("[cloud] chat watch:", e.message || e); });
      });
      return function () { cancelled = true; if (unsub) unsub(); };
    },

    /* ---------- presence ("N online") ---------- */
    startPresence(sessionId) {
      var timer = null, cancelled = false;
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        var beat = function () { F.setDoc(F.doc(db, "presence", sessionId), { seen: F.serverTimestamp() }, { merge: true }).catch(function () {}); };
        beat();
        timer = setInterval(function () { if (document.visibilityState !== "hidden") beat(); }, 20000);
      });
      return function () { cancelled = true; if (timer) clearInterval(timer); };
    },
    watchPresence(cb) {
      var unsub = null, cancelled = false;
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        unsub = F.onSnapshot(F.collection(db, "presence"), function (snap) {
          var now = Date.now(), n = 0;
          snap.forEach(function (d) { var s = d.data().seen; if (s && s.toMillis && now - s.toMillis() < 45000) n++; });
          cb(n);
        }, function () {});
      });
      return function () { cancelled = true; if (unsub) unsub(); };
    },

    /* ---------- live reactions (floating icons) ---------- */
    async sendReaction(icon) {
      if (!(await ok()) || !db) return;
      try { await F.addDoc(F.collection(db, "reactions"), { icon: icon, created: F.serverTimestamp() }); }
      catch (e) { console.warn("[cloud] reaction:", e.message || e); }
    },
    watchReactions(cb) {
      var unsub = null, cancelled = false, started = Date.now();
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        var q = F.query(F.collection(db, "reactions"), F.orderBy("created", "desc"), F.limit(20));
        unsub = F.onSnapshot(q, function (snap) {
          snap.docChanges().forEach(function (ch) {
            if (ch.type !== "added") return;
            var x = ch.doc.data();
            var t = x.created && x.created.toMillis ? x.created.toMillis() : Date.now();
            if (t >= started - 3000) cb(x.icon); // only fresh ones
          });
        }, function () {});
      });
      return function () { cancelled = true; if (unsub) unsub(); };
    },

    /* ---------- likes ---------- */
    async getLikeCounts() {
      if (!(await ok()) || !db) return null;
      try { var snap = await F.getDocs(F.collection(db, "likes")); var m = {}; snap.forEach(function (d) { m[d.id] = Math.max(0, (d.data().count) || 0); }); return m; }
      catch (e) { console.warn("[cloud] likes load:", e.message || e); return null; }
    },
    async like(artId) { await bumpLike(artId, 1); },
    async unlike(artId) { await bumpLike(artId, -1); },

    /* ---------- coin economy: wallets + shop (PROTOTYPE) ----------
       NOTE: balances are client-writable here for the demo. Before real use,
       move minting/transfers into a Cloud Function so coins can't be forged. */
    async ensureWallet(id, name) {
      if (!(await ok()) || !db) return null;
      try {
        var ref = F.doc(db, "wallets", id);
        var d = await F.getDoc(ref);
        if (!d.exists()) { await F.setDoc(ref, { coins: 50, name: name || "Artist", owned: {}, created: F.serverTimestamp() }); return { coins: 50, owned: {} }; }
        return d.data();
      } catch (e) { console.warn("[cloud] wallet:", e.message || e); return null; }
    },
    watchWallet(id, cb) {
      var unsub = null, cancelled = false;
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        unsub = F.onSnapshot(F.doc(db, "wallets", id), function (d) { cb(d.exists() ? d.data() : { coins: 0, owned: {} }); }, function () {});
      });
      return function () { cancelled = true; if (unsub) unsub(); };
    },
    async addCoins(id, delta, name) {
      if (!(await ok()) || !db) return false;
      try { await F.setDoc(F.doc(db, "wallets", id), { coins: F.increment(delta), name: name || "Artist" }, { merge: true }); return true; }
      catch (e) { window.Cloud.lastError = e.code || e.message; return false; }
    },
    watchShop(cb) {
      var unsub = null, cancelled = false;
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        var q = F.query(F.collection(db, "shopItems"), F.orderBy("created", "desc"), F.limit(80));
        unsub = F.onSnapshot(q, function (snap) {
          cb(snap.docs.map(function (d) { var x = d.data(); return { id: d.id, sellerId: x.sellerId, sellerName: x.sellerName, title: x.title, img: x.img, price: x.price, sales: x.sales || 0 }; }));
        }, function () {});
      });
      return function () { cancelled = true; if (unsub) unsub(); };
    },
    async listItem(obj) {
      if (!(await ok()) || !db) return false;
      try { var ref = await F.addDoc(F.collection(db, "shopItems"), Object.assign({ sales: 0, created: F.serverTimestamp() }, obj)); return ref.id; }
      catch (e) { window.Cloud.lastError = e.code || e.message; return false; }
    },
    async unlistItem(id) {
      if (!(await ok()) || !db) return false;
      try { await F.deleteDoc(F.doc(db, "shopItems", id)); return true; }
      catch (e) { window.Cloud.lastError = e.code || e.message; return false; }
    },
    async buyItem(item, buyerId, buyerName) {
      if (!(await ok()) || !db) return false;
      try {
        await F.setDoc(F.doc(db, "wallets", buyerId), { coins: F.increment(-item.price), name: buyerName || "Artist", owned: (function () { var o = {}; o[item.id] = true; return o; })() }, { merge: true });
        await F.setDoc(F.doc(db, "wallets", item.sellerId), { coins: F.increment(item.price) }, { merge: true });
        await F.setDoc(F.doc(db, "shopItems", item.id), { sales: F.increment(1) }, { merge: true });
        return true;
      } catch (e) { window.Cloud.lastError = e.code || e.message; return false; }
    },

    /* ---------- shared live board (collaborative drawing) ---------- */
    watchBoard(cb) {
      var unsub = null, cancelled = false;
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        // Newest strokes first, then reversed to oldest→newest for drawing. This
        // way fresh strokes are ALWAYS included even if the board has a big
        // backlog (an asc+limit query would hide anything past the limit).
        var q = F.query(F.collection(db, "board"), F.orderBy("created", "desc"), F.limit(2500));
        unsub = F.onSnapshot(q, function (snap) {
          var docs = snap.docs.slice().reverse();
          cb(docs.map(function (d) { var x = d.data(); return { id: d.id, c: x.c, w: x.w, p: x.p || [], cid: x.cid, tool: x.tool }; }));
        }, function (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] board watch:", e.message || e); });
      });
      return function () { cancelled = true; if (unsub) unsub(); };
    },
    async addStroke(stroke) {
      if (!(await ok()) || !db) return false;
      try { await F.addDoc(F.collection(db, "board"), Object.assign({}, stroke, { created: F.serverTimestamp() })); return true; }
      catch (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] stroke:", e.message || e); return false; }
    },
    async clearBoard() {
      if (!(await ok()) || !db) return false;
      try {
        // delete in chunks so a big backlog doesn't fire thousands of parallel deletes
        for (var i = 0; i < 100; i++) {
          var snap = await F.getDocs(F.query(F.collection(db, "board"), F.limit(300)));
          if (snap.empty) break;
          await Promise.all(snap.docs.map(function (d) { return F.deleteDoc(F.doc(db, "board", d.id)); }));
        }
        return true;
      } catch (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] board clear:", e.message || e); return false; }
    },
    // remove only MY strokes (for "each their own" — leaves friends' work alone)
    async clearMyStrokes(cidVal) {
      if (!(await ok()) || !db) return false;
      try {
        for (var i = 0; i < 100; i++) {
          var snap = await F.getDocs(F.query(F.collection(db, "board"), F.where("cid", "==", cidVal), F.limit(300)));
          if (snap.empty) break;
          await Promise.all(snap.docs.map(function (d) { return F.deleteDoc(F.doc(db, "board", d.id)); }));
        }
        return true;
      } catch (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] clear mine:", e.message || e); return false; }
    },
    watchLike(id, cb) {
      var unsub = null, cancelled = false;
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        unsub = F.onSnapshot(F.doc(db, "likes", id), function (d) { cb(d.exists() ? Math.max(0, (d.data().count) || 0) : 0); }, function () {});
      });
      return function () { cancelled = true; if (unsub) unsub(); };
    },

    /* ---------- finished-drawing submissions (Draw Together) ---------- */
    async addSubmission(name, img) {
      if (!(await ok()) || !db) return false;
      try { var ref = await F.addDoc(F.collection(db, "submissions"), { name: name || "Artist", img: img, created: F.serverTimestamp() }); return ref.id; }
      catch (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] submit:", e.message || e); return false; }
    },
    async listSubmissions() {
      if (!(await ok()) || !db) return null;
      try {
        var q = F.query(F.collection(db, "submissions"), F.orderBy("created", "desc"), F.limit(60));
        var snap = await F.getDocs(q);
        return snap.docs.map(function (d) { var x = d.data(); return { id: d.id, name: x.name, img: x.img, created: x.created && x.created.toMillis ? x.created.toMillis() : 0 }; });
      } catch (e) { console.warn("[cloud] submissions load:", e.message || e); return null; }
    },
    async deleteSubmission(id) {
      if (!(await ok()) || !db) return false;
      try { await F.deleteDoc(F.doc(db, "submissions", id)); return true; }
      catch (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] submission delete:", e.message || e); return false; }
    },
    // live-updating list of all submitted drawings (newest first)
    watchSubmissions(cb) {
      var unsub = null, cancelled = false;
      readyPromise.then(function (r) {
        if (cancelled || !r || !db) return;
        var q = F.query(F.collection(db, "submissions"), F.orderBy("created", "desc"), F.limit(60));
        unsub = F.onSnapshot(q, function (snap) {
          cb(snap.docs.map(function (d) { var x = d.data(); return { id: d.id, name: x.name, img: x.img }; }));
        }, function () {});
      });
      return function () { cancelled = true; if (unsub) unsub(); };
    },

    /* ---------- profile (owner writes) ---------- */
    async getProfile() {
      if (!(await ok()) || !db) return null;
      try { var d = await F.getDoc(F.doc(db, "profile", "main")); return d.exists() ? d.data() : null; }
      catch (e) { console.warn("[cloud] profile load:", e.message || e); return null; }
    },
    async saveProfile(obj) {
      if (!(await ok()) || !db) return false;
      try { await F.setDoc(F.doc(db, "profile", "main"), obj, { merge: true }); return true; }
      catch (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] profile save:", e.message || e); return false; }
    },

    /* ---------- artworks (owner writes) ---------- */
    async listArtworks() {
      if (!(await ok()) || !db) return null;
      try {
        var q = F.query(F.collection(db, "artworks"), F.orderBy("created", "desc"));
        var snap = await F.getDocs(q);
        return snap.docs.map(function (d) { var x = d.data(); return { id: d.id, title: x.title, desc: x.desc, img: x.img, tags: x.tags || [], aspect: x.aspect || "square" }; });
      } catch (e) { console.warn("[cloud] artworks load:", e.message || e); return null; }
    },
    async addArtwork(obj) {
      if (!(await ok()) || !db) return false;
      try { var ref = await F.addDoc(F.collection(db, "artworks"), Object.assign({}, obj, { created: F.serverTimestamp() })); return ref.id; }
      catch (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] artwork add:", e.message || e); return false; }
    },
    async updateArtwork(id, obj) {
      if (!(await ok()) || !db) return false;
      try { await F.setDoc(F.doc(db, "artworks", id), obj, { merge: true }); return true; }
      catch (e) { console.warn("[cloud] artwork update:", e.message || e); return false; }
    },
    async deleteArtwork(id) {
      if (!(await ok()) || !db) return false;
      try { await F.deleteDoc(F.doc(db, "artworks", id)); return true; }
      catch (e) { console.warn("[cloud] artwork delete:", e.message || e); return false; }
    },

    /* ---------- favorites / collection (owner writes) ---------- */
    async listFavorites() {
      if (!(await ok()) || !db) return null;
      try {
        var q = F.query(F.collection(db, "favorites"), F.orderBy("created", "desc"));
        var snap = await F.getDocs(q);
        return snap.docs.map(function (d) { var x = d.data(); return { id: d.id, url: x.url || "", title: x.title || "", note: x.note || "", img: x.img || "", tags: x.tags || [] }; });
      } catch (e) { console.warn("[cloud] favorites load:", e.message || e); return null; }
    },
    async addFavorite(obj) {
      if (!(await ok()) || !db) return false;
      try { var ref = await F.addDoc(F.collection(db, "favorites"), Object.assign({}, obj, { created: F.serverTimestamp() })); return ref.id; }
      catch (e) { window.Cloud.lastError = e.code || e.message; console.warn("[cloud] favorite add:", e.message || e); return false; }
    },
    async deleteFavorite(id) {
      if (!(await ok()) || !db) return false;
      try { await F.deleteDoc(F.doc(db, "favorites", id)); return true; }
      catch (e) { console.warn("[cloud] favorite delete:", e.message || e); return false; }
    },

    /* ---------- auth (owner) ---------- */
    async signIn(email, password) {
      if (!(await ok()) || !auth) return { ok: false, error: "Cloud not ready" };
      try { await A.signInWithEmailAndPassword(auth, email, password); return { ok: true }; }
      catch (e) { return { ok: false, error: (e && e.code) || (e && e.message) || "sign-in failed" }; }
    },
    async signOutOwner() { if (auth) try { await A.signOut(auth); } catch (e) {} },
    onAuth(cb) { readyPromise.then(function (r) { if (r && auth) A.onAuthStateChanged(auth, cb); else cb(null); }); },
    isOwner() { return !!(auth && auth.currentUser); },
  };

  async function bumpLike(artId, by) {
    if (!(await ok()) || !db) return;
    try { await F.setDoc(F.doc(db, "likes", artId), { count: F.increment(by) }, { merge: true }); }
    catch (e) { console.warn("[cloud] like:", e.message || e); }
  }

  if (!configured) { resolveReady(false); return; }

  var V = "https://www.gstatic.com/firebasejs/10.12.0/";
  Promise.all([
    import(V + "firebase-app.js"),
    import(V + "firebase-firestore.js"),
    import(V + "firebase-auth.js"),
  ]).then(function (mods) {
    try {
      var app = mods[0].initializeApp(fb);
      var fs = mods[1], au = mods[2];
      db = fs.getFirestore(app);
      auth = au.getAuth(app);
      F = {
        collection: fs.collection, doc: fs.doc, addDoc: fs.addDoc, getDoc: fs.getDoc, getDocs: fs.getDocs,
        setDoc: fs.setDoc, deleteDoc: fs.deleteDoc, query: fs.query, orderBy: fs.orderBy, limit: fs.limit, where: fs.where,
        serverTimestamp: fs.serverTimestamp, increment: fs.increment, onSnapshot: fs.onSnapshot,
      };
      A = {
        signInWithEmailAndPassword: au.signInWithEmailAndPassword, signOut: au.signOut,
        onAuthStateChanged: au.onAuthStateChanged,
      };
      resolveReady(true);
    } catch (e) {
      console.warn("[cloud] init failed:", e);
      window.Cloud.enabled = false; resolveReady(false);
    }
  }).catch(function () {
    console.warn("[cloud] could not load Firebase — using local storage.");
    window.Cloud.enabled = false; resolveReady(false);
  });
})();
