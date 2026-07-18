/* ===== Draw Together — shared live board =====
   A few friends draw on one canvas; finished strokes sync to everyone in
   real time (Firestore). Snapchat-style sticker reactions float up, and you
   can like the board. Points are stored normalized (0..1) so it looks right
   on every screen size. ===== */
(function () {
  var STICKERS = ["😂", "❤️", "🔥", "😎", "⭐", "🎨", "👑", "💯", "🥳", "😮"];
  var BOARD_LIKE_ID = "liveboard";

  var canvas, ctx, ready = false, drawing = false;
  var cur = [], lastX = 0, lastY = 0, style = null;
  var clientId = null;
  var drawnIds = {}, drawnCount = 0;
  var unsubBoard = null, unsubLike = null, unsubPres = null, presStop = null;
  var active = false;

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

  function drawStroke(s) {
    var d = dims();
    ctx.strokeStyle = s.tool === "marker" ? rgba(s.c, 0.4) : s.c;
    ctx.lineWidth = s.w;
    ctx.beginPath();
    (s.p || []).forEach(function (pt, i) {
      var x = pt[0] * d.w, y = pt[1] * d.h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
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
    ctx.strokeStyle = style.tool === "marker" ? rgba(style.color, 0.4) : style.color;
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

  /* ---------- sync ---------- */
  function subscribe() {
    unsubBoard = Cloud.watchBoard(function (list) {
      // a clear happened (fewer strokes than we've drawn, or ids missing) -> full redraw
      var shrunk = list.length < drawnCount;
      if (shrunk) { setup(); drawnIds = {}; drawnCount = 0; }
      list.forEach(function (s) {
        if (drawnIds[s.id]) return;
        drawnIds[s.id] = 1; drawnCount++;
        if (s.cid === cid() && !shrunk) return; // already drawn locally
        drawStroke(s);
      });
    });
    unsubLike = Cloud.watchLike(BOARD_LIKE_ID, function (n) { var el = $("#boardLikeN"); if (el) el.textContent = n; });
    var sid = store.get("sessionId", "s" + Math.random().toString(36).slice(2));
    presStop = Cloud.startPresence(sid);
    unsubPres = Cloud.watchPresence(function (n) { var el = $("#boardOnlineN"); if (el) el.textContent = n || 1; });
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

  /* ---------- mode toggle ---------- */
  function setMode(mode) {
    var live = mode === "live";
    $("#soloWrap").hidden = live;
    $("#liveBoardWrap").hidden = !live;
    $$(".mode-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.mode === mode); });
    if (live) enterLive(); else leaveLive();
  }
  function enterLive() {
    if (active) return; active = true;
    setup(); drawnIds = {}; drawnCount = 0;
    initStickers();
    bind();
    subscribe();
  }
  function leaveLive() {
    if (!active) return; active = false;
    unsubscribe();
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
  }

  document.addEventListener("DOMContentLoaded", function () {
    var liveBtn = $("#liveModeBtn");
    if (!(window.Cloud && Cloud.enabled)) { if (liveBtn) liveBtn.style.display = "none"; return; }
    $$(".mode-btn").forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.mode); }); });
    // leaving the doodle page drops the live subscriptions
    document.addEventListener("pagechange", function (e) { if (e.detail !== "doodle" && active) leaveLive(); });
  });
})();
