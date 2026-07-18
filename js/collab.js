/* ===== Draw Together — live board =====
   Two ways to play:
   • "One canvas"    — everyone draws on the same board (finished strokes sync).
   • "Each their own" — you draw on your own board; each friend's drawing shows
     in a little floating window you can drag around or shrink to a dot.
   Points are stored normalized (0..1) so a stroke looks right on every screen.
   ===== */
(function () {
  var STICKERS = ["😂", "❤️", "🔥", "😎", "⭐", "🎨", "👑", "💯", "🥳", "😮"];
  var BOARD_LIKE_ID = "liveboard";

  var canvas, ctx, ready = false, drawing = false;
  var cur = [], lastX = 0, lastY = 0, style = null;
  var clientId = null;
  var unsubBoard = null, unsubLike = null, unsubPres = null, presStop = null;
  var active = false;

  var boardMode = "shared";        // "shared" | "separate"
  var allStrokes = [], seen = {}, others = {}; // others: cid -> {win, ctx, w, h}

  function cid() {
    if (clientId) return clientId;
    clientId = store.get("clientId", null);
    if (!clientId) { clientId = "c" + Math.random().toString(36).slice(2); store.set("clientId", clientId); }
    return clientId;
  }

  /* ---------- canvas ---------- */
  function setup() {
    canvas = $("#boardCanvas");
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ready = rect.width > 0;
  }
  function dims() { var r = canvas.getBoundingClientRect(); return { w: r.width, h: r.height }; }
  function mainW() { var r = canvas.getBoundingClientRect(); return r.width || 320; }

  function drawOn(c, s, d) {
    c.strokeStyle = s.tool === "marker" ? rgba(s.c, 0.4) : s.tool === "highlighter" ? rgba(s.c, 0.28) : (s.c || "#2f5d55");
    c.lineWidth = (s.w || 6) * (d.scale || 1);
    c.beginPath();
    (s.p || []).forEach(function (pt, i) {
      var x = pt[0] * d.w, y = pt[1] * d.h;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    });
    c.stroke();
  }
  function drawStroke(s) { drawOn(ctx, s, { w: dims().w, h: dims().h, scale: 1 }); }
  function rgba(hex, a) {
    hex = (hex || "#000").replace("#", ""); if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ---------- local drawing ---------- */
  function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function start(e) {
    if (!ready) return; e.preventDefault();
    drawing = true; style = (window.getDrawStyle ? getDrawStyle() : { color: "#2f5d55", size: 8, tool: "pen" });
    var p = pos(e); lastX = p.x; lastY = p.y; cur = [norm(p)];
    ctx.strokeStyle = style.tool === "marker" ? rgba(style.color, 0.4) : style.tool === "highlighter" ? rgba(style.color, 0.28) : style.color;
    ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = style.size;
    ctx.beginPath(); ctx.arc(p.x, p.y, style.size / 2, 0, Math.PI * 2); ctx.fill();
  }
  function move(e) {
    if (!drawing) return; e.preventDefault();
    var p = pos(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y; cur.push(norm(p));
  }
  function end() {
    if (!drawing) return; drawing = false;
    if (cur.length > 1 && window.Cloud) {
      Cloud.addStroke({ c: style.color, w: style.size, tool: style.tool, p: cur, cid: cid() });
    }
    cur = [];
  }
  function norm(p) { var d = dims(); return [+(p.x / d.w).toFixed(4), +(p.y / d.h).toFixed(4)]; }

  /* ---------- floating peer windows (separate mode) ---------- */
  function ensureOther(key) {
    if (others[key]) return others[key];
    var W = 152, H = 114, dpr = window.devicePixelRatio || 1;
    var win = document.createElement("div");
    win.className = "peer-win";
    win.innerHTML =
      '<div class="peer-head"><span class="peer-name">Friend</span>' +
      '<button class="peer-min" aria-label="Shrink">' + ((window.ICONS && ICONS.minimize) || "–") + "</button></div>" +
      '<canvas class="peer-canvas"></canvas>';
    document.body.appendChild(win);
    var n = Object.keys(others).length;
    win.style.top = (92 + n * 130) + "px"; win.style.right = "12px";
    var cv = win.querySelector(".peer-canvas");
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    var c2 = cv.getContext("2d"); c2.scale(dpr, dpr);
    c2.fillStyle = "#fff"; c2.fillRect(0, 0, W, H); c2.lineCap = "round"; c2.lineJoin = "round";
    var o = { win: win, ctx: c2, w: W, h: H };
    makeDraggable(win, win.querySelector(".peer-head"));
    win.querySelector(".peer-min").addEventListener("click", function (e) { e.stopPropagation(); win.classList.add("mini"); });
    win.addEventListener("click", function () { if (win.classList.contains("mini")) win.classList.remove("mini"); });
    others[key] = o; return o;
  }
  function clearOthers() {
    Object.keys(others).forEach(function (k) { if (others[k].win && others[k].win.parentNode) others[k].win.remove(); });
    others = {};
  }
  function makeDraggable(el, handle) {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return; // let the head's minimize button work
      dragging = true; try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      var r = el.getBoundingClientRect(); ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
      el.style.right = "auto"; el.style.left = ox + "px"; el.style.top = oy + "px";
      e.preventDefault();
    });
    handle.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      el.style.left = Math.max(2, Math.min(window.innerWidth - 44, ox + (e.clientX - sx))) + "px";
      el.style.top = Math.max(2, Math.min(window.innerHeight - 44, oy + (e.clientY - sy))) + "px";
    });
    function up(e) { dragging = false; try { handle.releasePointerCapture(e.pointerId); } catch (_) {} }
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  }

  /* ---------- routing & full redraw ---------- */
  function routeStroke(s) {
    if (s.cid === cid()) return;            // my own strokes are already on my canvas
    if (boardMode === "shared") drawStroke(s);
    else { var o = ensureOther(s.cid); drawOn(o.ctx, s, { w: o.w, h: o.h, scale: o.w / mainW() }); }
  }
  function fullRender() {
    setup(); clearOthers();
    allStrokes.forEach(function (s) {
      var mine = s.cid === cid();
      if (mine || boardMode === "shared") drawStroke(s);
      else { var o = ensureOther(s.cid); drawOn(o.ctx, s, { w: o.w, h: o.h, scale: o.w / mainW() }); }
    });
  }
  function setBoardMode(m) {
    boardMode = m;
    $$(".board-mode-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.bmode === m); });
    if (active) fullRender();
  }

  /* ---------- sync ---------- */
  function subscribe() {
    unsubBoard = Cloud.watchBoard(function (list) {
      if (list.length < allStrokes.length) { allStrokes = []; seen = {}; setup(); clearOthers(); } // a clear happened
      list.forEach(function (s) {
        if (seen[s.id]) return;
        seen[s.id] = 1; allStrokes.push(s);
        routeStroke(s);
      });
    });
    unsubLike = Cloud.watchLike(BOARD_LIKE_ID, function (n) { var el = $("#boardLikeN"); if (el) el.textContent = n; });
    var sid = store.get("sessionId", "s" + Math.random().toString(36).slice(2));
    presStop = Cloud.startPresence(sid);
    var prevPres = 0;
    unsubPres = Cloud.watchPresence(function (n) {
      var el = $("#boardOnlineN"); if (el) el.textContent = n || 1;
      if (prevPres && n > prevPres) toast("A friend joined! 🎨 Draw together!");
      prevPres = n;
    });
  }
  function unsubscribe() {
    [unsubBoard, unsubLike, unsubPres, presStop].forEach(function (f) { if (f) f(); });
    unsubBoard = unsubLike = unsubPres = presStop = null;
  }

  /* ---------- stickers ---------- */
  function initStickers() {
    var bar = $("#stickerBar");
    if (!bar || bar.dataset.done) return;
    bar.dataset.done = "1";
    bar.innerHTML = STICKERS.map(function (s) { return '<button class="sticker" data-s="' + s + '">' + s + "</button>"; }).join("");
    bar.querySelectorAll(".sticker").forEach(function (b) {
      b.addEventListener("click", function () { if (window.Cloud) Cloud.sendReaction(b.dataset.s); });
    });
  }

  /* ---------- mode toggle (solo / live) ---------- */
  function setMode(mode) {
    var live = mode === "live";
    $("#soloWrap").hidden = live;
    $("#liveBoardWrap").hidden = !live;
    $$(".mode-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.mode === mode); });
    if (live) enterLive(); else leaveLive();
  }
  function enterLive() {
    if (active) return; active = true;
    setup(); allStrokes = []; seen = {}; clearOthers();
    initStickers();
    bind();
    subscribe();
  }
  function leaveLive() {
    if (!active) return; active = false;
    unsubscribe(); clearOthers();
  }
  var bound = false;
  function bind() {
    if (bound) return; bound = true;
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    $("#boardClear").addEventListener("click", async function () {
      if (!confirm("Clear the shared board for everyone?")) return;
      var ok = await Cloud.clearBoard();
      if (!ok) toast("Only the owner can clear: " + (window.Cloud.lastError || ""));
    });
    $("#boardSave").addEventListener("click", function () {
      if (window.saveCanvasImage) { saveCanvasImage(canvas, "our-drawing.png"); return; }
      try { var a = document.createElement("a"); a.download = "our-drawing.png"; a.href = canvas.toDataURL("image/png"); a.click(); toast("Saved!"); }
      catch (e) { toast("Couldn't save"); }
    });
    $("#boardLike").addEventListener("click", function () { if (window.Cloud) Cloud.like(BOARD_LIKE_ID); });
    var gal = $("#boardGallery"); if (gal) gal.addEventListener("click", showGallery);
    var inv = $("#boardInvite"); if (inv) inv.addEventListener("click", invite);
    var sub = $("#boardSubmit"); if (sub) sub.addEventListener("click", submitDrawing);
    $$(".board-mode-btn").forEach(function (b) { b.addEventListener("click", function () { setBoardMode(b.dataset.bmode); }); });
  }
  // share a link that drops a friend straight into the live board
  function invite() {
    var url = location.origin + location.pathname + "?draw=1";
    if (navigator.share) { navigator.share({ title: "Draw with me on Linrose!", text: "Tap to join my live drawing board 🎨", url: url }).catch(function () {}); }
    else { try { navigator.clipboard.writeText(url); toast("Invite link copied — send it to a friend!"); } catch (e) { toast(url); } }
  }

  /* ---------- submit a finished drawing (works across devices) ---------- */
  function downscale(cv, maxDim, q) {
    var r = cv.getBoundingClientRect ? cv.getBoundingClientRect() : { width: cv.width, height: cv.height };
    var w = cv.width, h = cv.height;
    var scale = Math.min(1, maxDim / Math.max(w, h));
    var t = document.createElement("canvas"); t.width = Math.max(1, Math.round(w * scale)); t.height = Math.max(1, Math.round(h * scale));
    var tc = t.getContext("2d"); tc.fillStyle = "#fff"; tc.fillRect(0, 0, t.width, t.height); tc.drawImage(cv, 0, 0, t.width, t.height);
    return t.toDataURL("image/jpeg", q || 0.8);
  }
  async function submitDrawing() {
    if (!canvas) return;
    var url;
    try { url = downscale(canvas, 700, 0.8); } catch (e) { toast("Couldn't read the canvas"); return; }
    var btn = $("#boardSubmit"); if (btn) { btn.disabled = true; btn.textContent = "Submitting…"; }
    var name = store.get("chatName", "") || "Artist";
    var ok = (window.Cloud && Cloud.addSubmission) ? await Cloud.addSubmission(name, url) : false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="ic">' + ((window.ICONS && ICONS.check) || "") + "</span> Done — submit"; }
    toast(ok ? "Submitted! 🎉 Everyone can see it now" : "Submit failed: " + (window.Cloud && window.Cloud.lastError || "check rules"));
    showGallery();
  }

  /* ---------- gallery view: everyone's submitted drawings ---------- */
  async function showGallery() {
    var items = [];
    try { if (canvas) items.push({ name: "You (now)", url: canvas.toDataURL() }); } catch (e) {}
    if (window.Cloud && Cloud.listSubmissions) {
      var subs = await Cloud.listSubmissions();
      (subs || []).forEach(function (s) { if (s.img) items.push({ name: s.name || "Friend", url: s.img }); });
    }
    Object.keys(others).forEach(function (k) {
      try { items.push({ name: "Friend (live)", url: others[k].win.querySelector(".peer-canvas").toDataURL() }); } catch (e) {}
    });
    var ov = document.getElementById("boardGalleryOverlay");
    if (!ov) {
      ov = document.createElement("div"); ov.id = "boardGalleryOverlay"; ov.className = "board-gallery"; ov.hidden = true;
      document.body.appendChild(ov);
      ov.addEventListener("click", function (e) { if (e.target === ov || (e.target.closest && e.target.closest(".bg-close"))) ov.hidden = true; });
    }
    ov.innerHTML =
      '<div class="bg-inner"><div class="bg-head"><b>Everyone’s drawings</b>' +
      '<button class="bg-close" aria-label="Close">' + ((window.ICONS && ICONS.close) || "x") + "</button></div>" +
      '<div class="bg-grid">' +
      (items.length ? items.map(function (it) { return '<figure class="bg-item"><img src="' + it.url + '" alt="" /><figcaption>' + it.name + "</figcaption></figure>"; }).join("")
                    : '<p class="gb-empty">No drawings yet — start sketching!</p>') +
      "</div>" +
      '<div class="bg-react">' + STICKERS.map(function (s) { return '<button class="sticker" data-s="' + s + '">' + s + "</button>"; }).join("") + "</div>" +
      '<p class="page-sub" style="text-align:center;margin:0 0 14px">Tap an emoji to cheer each other on!</p>' +
      "</div>";
    ov.querySelectorAll(".bg-react .sticker").forEach(function (btn) {
      btn.addEventListener("click", function (e) { e.stopPropagation(); if (window.Cloud) Cloud.sendReaction(btn.dataset.s); });
    });
    ov.hidden = false;
  }

  // re-fit the board when it changes size (e.g. entering/leaving fullscreen)
  function refit() { if (active) { setup(); fullRender(); } }
  window.addEventListener("doodle-reflow", refit);
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(refit, 250); });

  document.addEventListener("DOMContentLoaded", function () {
    var liveBtn = $("#liveModeBtn");
    if (!(window.Cloud && Cloud.enabled)) { if (liveBtn) liveBtn.style.display = "none"; return; }
    $$(".mode-btn").forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.mode); }); });
    // leaving the doodle page drops the live subscriptions
    document.addEventListener("pagechange", function (e) { if (e.detail !== "doodle" && active) leaveLive(); });
  });
})();
