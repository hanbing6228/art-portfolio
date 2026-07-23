/* api/economy.js — server-authoritative coin economy (Firebase Admin SDK).

   All coin minting / spending / transfers happen HERE, inside Firestore
   transactions, so a client can never forge a balance or overspend. The browser
   only *reads* wallets/shopItems live; every *write* goes through this endpoint.

   Setup (one-time):
   1. Firebase console → Project settings → Service accounts → Generate new
      private key. Copy the JSON.
   2. In Vercel → Project → Settings → Environment Variables, add
      FIREBASE_SERVICE_ACCOUNT  = <that whole JSON>  (Production + Preview).
   3. Redeploy. Until this is set, the app falls back to the client prototype. */
const admin = require("firebase-admin");

function getDb() {
  if (!admin.apps.length) {
    var raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("backend-not-configured");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin.firestore();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "post only" }); return; }

  var body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  var action = body.action;
  var uid = String(body.uid || "").slice(0, 80);
  var name = String(body.name || "Artist").slice(0, 40);
  if (!uid) { res.status(400).json({ error: "no uid" }); return; }

  var db, FV;
  try { db = getDb(); FV = admin.firestore.FieldValue; }
  catch (e) { res.status(503).json({ error: "backend-not-configured" }); return; }

  try {
    if (action === "wallet") {
      var wref = db.collection("wallets").doc(uid);
      var w = await db.runTransaction(async function (t) {
        var d = await t.get(wref);
        var data = d.exists ? d.data() : { coins: 50, owned: {}, name: name };
        var today = new Date().toISOString().slice(0, 10);
        var bonus = 0;
        if (data.bonusDay !== today) { bonus = 10; data.coins = (data.coins || 0) + 10; data.bonusDay = today; }
        data.name = name;
        t.set(wref, data, { merge: true });
        data._bonus = bonus;
        return data;
      });
      res.json({ ok: true, wallet: { coins: w.coins || 0, owned: w.owned || {}, bonus: w._bonus || 0 } });
      return;
    }

    if (action === "list") {
      if (typeof body.img !== "string" || body.img.length < 10 || body.img.length > 900000) { res.status(400).json({ error: "bad image" }); return; }
      var price = Math.max(1, Math.min(999, parseInt(body.price, 10) || 10));
      var ref = await db.collection("shopItems").add({
        sellerId: uid, sellerName: name, title: String(body.title || "Artwork").slice(0, 60),
        img: body.img, price: price, sales: 0, created: FV.serverTimestamp(),
      });
      res.json({ ok: true, id: ref.id });
      return;
    }

    if (action === "unlist") {
      var iref = db.collection("shopItems").doc(String(body.id));
      var isnap = await iref.get();
      if (isnap.exists && isnap.data().sellerId === uid) await iref.delete();
      res.json({ ok: true });
      return;
    }

    if (action === "buy") {
      var itemId = String(body.id);
      var out = await db.runTransaction(async function (t) {
        var itemRef = db.collection("shopItems").doc(itemId);
        var buyerRef = db.collection("wallets").doc(uid);
        var itemSnap = await t.get(itemRef);
        if (!itemSnap.exists) throw new Error("gone");
        var item = itemSnap.data();
        if (item.sellerId === uid) throw new Error("own");
        var buyerSnap = await t.get(buyerRef);
        var buyer = buyerSnap.exists ? buyerSnap.data() : { coins: 0, owned: {} };
        if (buyer.owned && buyer.owned[itemId]) throw new Error("owned");
        if ((buyer.coins || 0) < item.price) throw new Error("funds");
        var owned = buyer.owned || {}; owned[itemId] = true;
        t.set(buyerRef, { coins: (buyer.coins || 0) - item.price, owned: owned, name: name }, { merge: true });
        t.set(db.collection("wallets").doc(item.sellerId), { coins: FV.increment(item.price) }, { merge: true });
        t.set(itemRef, { sales: FV.increment(1) }, { merge: true });
        return { coins: (buyer.coins || 0) - item.price };
      });
      res.json({ ok: true, coins: out.coins });
      return;
    }

    if (action === "cashout") {
      await db.collection("cashouts").add({ uid: uid, name: name, coins: parseInt(body.coins, 10) || 0, status: "pending", created: FV.serverTimestamp() });
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: "unknown action" });
  } catch (e) {
    res.status(200).json({ ok: false, error: (e && e.message) || "error" });
  }
};
