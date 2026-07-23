/* ===== My Little Shop — coin economy (prototype) =====
   A safe sandbox where kids earn "creativity coins" by making & selling art,
   run their own shop, and practice pricing/business. Coins are closed-loop:
   they only spend inside the app. "Cash out" just asks a grown-up (no real
   money changes hands). Balances live in Firestore; before real use the
   minting/transfers should move into a Cloud Function so coins can't be forged.
   ===== */
(function () {
  var me = null, myName = "Me";
  var wallet = { coins: 0, owned: {} };
  var items = [];
  var unsubWallet = null, unsubShop = null;
  var started = false;

  function cid() {
    var c = store.get("clientId", null);
    if (!c) { c = "c" + Math.random().toString(36).slice(2); store.set("clientId", c); }
    return c;
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  /* ---------- weekly-earned tracker (local) ---------- */
  function weekKey() { return "shopWeek"; }
  function trackEarn(delta) {
    if (delta <= 0) return;
    var wk = store.get(weekKey(), { start: 0, earned: 0 });
    // reset roughly weekly
    if (!wk.start || (nowMs() - wk.start) > 7 * 864e5) wk = { start: nowMs(), earned: 0 };
    wk.earned += delta; store.set(weekKey(), wk);
    var el = $("#walletWeek"); if (el) el.textContent = "+" + wk.earned;
  }
  function nowMs() { try { return Date.now(); } catch (e) { return 0; } }
  function showWeek() { var wk = store.get(weekKey(), { earned: 0 }); var el = $("#walletWeek"); if (el) el.textContent = "+" + (wk.earned || 0); }

  /* ---------- render ---------- */
  function renderWallet() {
    var el = $("#walletCoins"); if (el) el.textContent = wallet.coins || 0;
  }
  function itemCard(it, mine) {
    var owned = wallet.owned && wallet.owned[it.id];
    var isMine = it.sellerId === me;
    var btn;
    if (isMine) btn = '<button class="mini-btn shop-unlist" data-id="' + esc(it.id) + '">' + icon("trash") + " unlist</button>";
    else if (owned) btn = '<span class="shop-owned">' + icon("check") + " Collected</span>";
    else btn = '<button class="tool-chip shop-buy" data-id="' + esc(it.id) + '">' + icon("coin") + " Buy · " + (it.price || 0) + "</button>";
    return '<div class="art-card shop-card">' +
      '<div class="art-imgwrap"><img src="' + esc(it.img) + '" alt="" referrerpolicy="no-referrer" /></div>' +
      '<div class="art-meta"><div class="art-title">' + esc(it.title || "Artwork") + "</div>" +
      '<div class="shop-row"><span class="shop-price">' + icon("coin") + " " + (it.price || 0) + "</span>" +
      '<span class="shop-sales">' + (it.sales || 0) + " sold</span></div>" +
      '<div class="shop-seller">by ' + esc(it.sellerName || "Artist") + "</div>" + btn + "</div></div>";
  }
  function render() {
    var market = $("#shopMarket"), mine = $("#shopMine");
    var others = items.filter(function (it) { return it.sellerId !== me; });
    var ours = items.filter(function (it) { return it.sellerId === me; });
    if (market) market.innerHTML = others.length ? others.map(function (it) { return itemCard(it); }).join("") : '<p class="gb-empty">No art for sale yet — be the first to list one!</p>';
    if (mine) mine.innerHTML = ours.length ? ours.map(function (it) { return itemCard(it, true); }).join("") : '<p class="gb-empty">Your shop is empty. Tap “List an artwork”.</p>';
    wire();
  }
  function wire() {
    $$(".shop-buy").forEach(function (b) { b.addEventListener("click", function () { buy(b.dataset.id); }); });
    $$(".shop-unlist").forEach(function (b) { b.addEventListener("click", function () { unlist(b.dataset.id); }); });
  }

  /* ---------- actions ---------- */
  async function buy(id) {
    var it = items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    if ((wallet.coins || 0) < it.price) { toast("Not enough coins — sell some art or come back tomorrow!"); return; }
    if (wallet.owned && wallet.owned[id]) { toast("You already collected this"); return; }
    // optimistic
    wallet.coins -= it.price; wallet.owned = wallet.owned || {}; wallet.owned[id] = true; renderWallet(); render();
    var ok = await Cloud.buyItem(it, me, myName);
    if (!ok) toast("Buy failed: " + (window.Cloud.lastError || ""));
    else { toast("Collected! 🎉"); if (window.Achievements) Achievements.bump("likesGiven"); }
  }
  async function unlist(id) {
    if (!confirm("Take this out of your shop?")) return;
    await Cloud.unlistItem(id, me); toast("Unlisted");
  }
  async function cashout() {
    var c = wallet.coins || 0;
    if (window.Cloud && Cloud.requestCashout) Cloud.requestCashout(me, myName, c);
    alert("💡 Ask a grown-up!\n\nYou have " + c + " coins. In this practice shop, coins stay in the app to keep playing.\n\nWhen real cash-out is turned on, a grown-up will approve it — the coins never turn into money by themselves.");
  }

  /* ---------- list an artwork ---------- */
  var modal = null, pendingImg = null;
  function resizeToDataURL(file, maxDim, q) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); var s = Math.min(1, maxDim / Math.max(img.width, img.height)); var c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); var out = c.toDataURL("image/jpeg", q); while (out.length > 500000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); } res(out); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(); }; img.src = url;
    });
  }
  function openListModal() {
    if (!modal) {
      modal = document.createElement("div"); modal.className = "admin-overlay"; modal.hidden = true;
      modal.innerHTML = '<div class="admin-panel"><div class="admin-head"><b>List an artwork</b><button class="icon-btn" id="slClose">' + ((window.ICONS && ICONS.close) || "x") + '</button></div>' +
        '<div style="padding:16px"><div class="admin-section">' +
        '<label class="tool-chip">Choose a picture<input id="slFile" type="file" accept="image/*" hidden /></label>' +
        '<img id="slPrev" class="admin-art-prev" hidden alt="preview" />' +
        '<label class="admin-label">Title<input id="slTitle" class="gb-input" placeholder="My cool drawing" /></label>' +
        '<label class="admin-label">Price (coins)<input id="slPrice" class="gb-input" type="number" min="1" max="999" value="10" /></label>' +
        '<button class="tool-chip primary" id="slAdd">Put it up for sale</button>' +
        "</div></div></div>";
      document.body.appendChild(modal);
      modal.addEventListener("click", function (e) { if (e.target === modal) modal.hidden = true; });
      $("#slClose").addEventListener("click", function () { modal.hidden = true; });
      $("#slFile").addEventListener("change", async function (e) { var f = e.target.files[0]; if (!f) return; pendingImg = await resizeToDataURL(f, 900, 0.82); var pv = $("#slPrev"); pv.src = pendingImg; pv.hidden = false; });
      $("#slAdd").addEventListener("click", doList);
    }
    pendingImg = null; $("#slPrev").hidden = true; $("#slTitle").value = ""; $("#slPrice").value = "10";
    modal.hidden = false;
  }
  async function doList() {
    if (!pendingImg) { toast("Choose a picture first"); return; }
    var price = Math.max(1, Math.min(999, parseInt($("#slPrice").value, 10) || 10));
    var btn = $("#slAdd"); btn.disabled = true; btn.textContent = "Listing…";
    var id = await Cloud.listItem({ sellerId: me, sellerName: myName, title: $("#slTitle").value.trim() || "Artwork", img: pendingImg, price: price });
    btn.disabled = false; btn.textContent = "Put it up for sale";
    if (id) { toast("Listed for sale! 🛍️"); modal.hidden = true; }
    else toast("List failed: " + (window.Cloud.lastError || "check rules"));
  }

  /* ---------- start / stop ---------- */
  async function start() {
    if (started) return; started = true;
    me = cid(); myName = store.get("chatName", "") || "Me";
    var w = await Cloud.ensureWallet(me, myName);
    if (w) {
      wallet = { coins: w.coins || 0, owned: w.owned || {} }; renderWallet();
      if (w.bonus > 0) { toast("+" + w.bonus + " daily creativity coins! 🎨"); trackEarn(w.bonus); }
    }
    showWeek();
    var prev = wallet.coins || 0;
    unsubWallet = Cloud.watchWallet(me, function (w2) {
      var delta = (w2.coins || 0) - prev; if (delta > 0) trackEarn(delta); prev = w2.coins || 0;
      wallet = w2; wallet.owned = wallet.owned || {}; renderWallet(); render();
    });
    unsubShop = Cloud.watchShop(function (list) { items = list; render(); });
  }
  function tryDay() { try { return new Date().toDateString(); } catch (e) { return "d"; } }
  function stop() { if (unsubWallet) { unsubWallet(); unsubWallet = null; } if (unsubShop) { unsubShop(); unsubShop = null; } started = false; }

  document.addEventListener("DOMContentLoaded", function () {
    // sub-tabs
    $$(".shop-tab").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".shop-tab").forEach(function (x) { x.classList.toggle("active", x === b); });
        $("#shopMarketWrap").hidden = b.dataset.shop !== "market";
        $("#shopMineWrap").hidden = b.dataset.shop !== "mine";
      });
    });
    var lb = $("#shopListBtn"); if (lb) lb.addEventListener("click", openListModal);
    var co = $("#cashoutBtn"); if (co) co.addEventListener("click", cashout);

    if (!(window.Cloud && Cloud.enabled)) {
      var m = $("#shopMarket"); if (m) m.innerHTML = '<p class="gb-empty">Connect the cloud to open your shop.</p>';
      return;
    }
    document.addEventListener("pagechange", function (e) { if (e.detail === "shop") start(); });
    if (document.getElementById("shop") && document.getElementById("shop").classList.contains("active")) start();
  });
})();
