/* ===== Doodle pad (upgraded, still simple) =====
   Pointer drawing with pressure, pen / marker / eraser brushes, size &
   opacity sliders, color picker + palette, undo / redo, clear, save PNG. */
(function () {
  var PALETTE = ["#2f5d55", "#60925e", "#7cb342", "#a9c6a0", "#c8f5f9", "#f3c969", "#e5764b", "#e5484d", "#8a5a3c", "#d9b3b3", "#4a90d9", "#7b5ea7", "#111111", "#ffffff"];

  var canvas, ctx, drawing = false, ready = false;
  var color = "#2f5d55", brush = 8, opacity = 1, tool = "pen";
  var lastX = 0, lastY = 0;
  var undoStack = [], redoStack = [];

  // shared so the live board uses the same color / size / brush
  window.getDrawStyle = function () { return { color: tool === "eraser" ? "#ffffff" : color, size: brush, opacity: opacity, tool: tool }; };

  function setupCanvas(keep) {
    canvas = $("#doodleCanvas");
    if (!canvas) return;
    var prev = (keep && ready) ? canvas.toDataURL() : null;
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ready = rect.width > 0;
    if (prev) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0, rect.width, rect.height); }; im.src = prev; }
    else if (ready && !undoStack.length) pushHistory();
  }

  /* ---------- history ---------- */
  function pushHistory() {
    try { undoStack.push(canvas.toDataURL()); } catch (e) { return; }
    if (undoStack.length > 25) undoStack.shift();
    redoStack = [];
    updateHistBtns();
  }
  function restore(dataURL) {
    var rect = canvas.getBoundingClientRect();
    var im = new Image();
    im.onload = function () { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, rect.width, rect.height); ctx.drawImage(im, 0, 0, rect.width, rect.height); };
    im.src = dataURL;
  }
  function undo() { if (undoStack.length > 1) { redoStack.push(undoStack.pop()); restore(undoStack[undoStack.length - 1]); updateHistBtns(); } }
  function redo() { if (redoStack.length) { var s = redoStack.pop(); undoStack.push(s); restore(s); updateHistBtns(); } }
  function updateHistBtns() {
    var u = $("#undoBtn"), r = $("#redoBtn");
    if (u) u.disabled = undoStack.length <= 1;
    if (r) r.disabled = !redoStack.length;
  }

  /* ---------- drawing ---------- */
  function pos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }
  function strokeStyleFor(pressure) {
    if (tool === "eraser") return "rgba(255,255,255,1)";
    var a = tool === "marker" ? opacity * 0.35 : opacity;
    return hexToRgba(color, a);
  }
  function widthFor(pressure) {
    var w = brush * (tool === "marker" ? 1.6 : 1);
    var pr = (pressure && pressure > 0 && pressure !== 0.5) ? pressure : 0.6; // pens/touch vary; mouse ~0.5
    return Math.max(1, w * (0.55 + 0.9 * pr));
  }
  function start(e) {
    if (!ready) return;
    e.preventDefault();
    drawing = true;
    var p = pos(e); lastX = p.x; lastY = p.y;
    ctx.strokeStyle = strokeStyleFor(e.pressure);
    ctx.fillStyle = strokeStyleFor(e.pressure);
    var w = widthFor(e.pressure);
    ctx.beginPath(); ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2); ctx.fill();
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = pos(e);
    ctx.strokeStyle = strokeStyleFor(e.pressure);
    ctx.lineWidth = widthFor(e.pressure);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y;
  }
  function end() { if (drawing) { drawing = false; pushHistory(); } }

  function hexToRgba(hex, a) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ---------- controls ---------- */
  function renderColors() {
    var wrap = $("#doodleColors");
    if (!wrap) return;
    wrap.innerHTML = "";
    PALETTE.forEach(function (c, i) {
      var d = document.createElement("div");
      d.className = "color-dot" + (i === 0 ? " active" : "");
      d.style.background = c;
      d.addEventListener("click", function () { setColor(c); $$(".color-dot").forEach(function (x) { x.classList.remove("active"); }); d.classList.add("active"); });
      wrap.appendChild(d);
    });
  }
  function setColor(c) { color = c; if (tool === "eraser") setTool("pen"); var cp = $("#colorPicker"); if (cp) cp.value = c.length === 7 ? c : cp.value; paintSwatch(); }
  function setTool(t) {
    tool = t;
    $$(".brush-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.brush === t); });
    paintSwatch();
  }
  // reflect the live color/tool on the compact swatch button
  function paintSwatch() {
    var s = $("#padSwatch");
    if (!s) return;
    s.style.background = tool === "eraser" ? "#ffffff" : color;
    s.classList.toggle("is-eraser", tool === "eraser");
  }
  function updateSizePreview() {
    var p = $("#padSizePreview");
    if (!p) return;
    var d = Math.max(6, Math.min(26, brush));
    p.style.width = d + "px"; p.style.height = d + "px";
  }

  /* popovers: one open at a time, tap outside to close */
  function closePops() {
    ["colorPop", "adjustPop"].forEach(function (id) { var p = $("#" + id); if (p) p.hidden = true; });
    ["padSwatch", "padAdjust"].forEach(function (id) { var b = $("#" + id); if (b) b.classList.remove("active"); });
  }
  function togglePop(popId, btnId) {
    var p = $("#" + popId); if (!p) return;
    var willOpen = p.hidden;
    closePops();
    if (willOpen) { p.hidden = false; var b = $("#" + btnId); if (b) b.classList.add("active"); }
  }

  function initControls() {
    $("#brushSize").addEventListener("input", function (e) { brush = +e.target.value; updateSizePreview(); });
    $("#brushOpacity").addEventListener("input", function (e) { opacity = +e.target.value / 100; });
    $("#colorPicker").addEventListener("input", function (e) { setColor(e.target.value); $$(".color-dot").forEach(function (x) { x.classList.remove("active"); }); });
    $$(".brush-btn").forEach(function (b) { b.addEventListener("click", function () { setTool(b.dataset.brush); }); });

    // color / size popovers
    var sw = $("#padSwatch"); if (sw) sw.addEventListener("click", function (e) { e.stopPropagation(); togglePop("colorPop", "padSwatch"); });
    var adj = $("#padAdjust"); if (adj) adj.addEventListener("click", function (e) { e.stopPropagation(); togglePop("adjustPop", "padAdjust"); });
    document.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest(".pad-pop-wrap")) closePops(); });
    paintSwatch(); updateSizePreview();

    $("#undoBtn").addEventListener("click", undo);
    $("#redoBtn").addEventListener("click", redo);
    $("#clearBtn").addEventListener("click", function () {
      var rect = canvas.getBoundingClientRect();
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, rect.width, rect.height);
      pushHistory();
    });
    $("#saveDoodle").addEventListener("click", function () {
      if (window.saveCanvasImage) { saveCanvasImage(canvas, "my-doodle.png"); if (window.Achievements) Achievements.bump("doodlesSaved"); return; }
      try { var link = document.createElement("a"); link.download = "my-doodle.png"; link.href = canvas.toDataURL("image/png"); link.click(); toast("Saved your doodle!"); if (window.Achievements) Achievements.bump("doodlesSaved"); }
      catch (e) { toast("Couldn't save"); }
    });
    initFullscreen();
  }

  /* ---------- fullscreen canvas + scalable floating toolbar ---------- */
  var SCALES = ["", "tb-sm", "tb-lg"]; // normal / smaller / bigger toolbar
  var scaleIx = 0;
  function stage() { return $("#doodleStage"); }
  function isFs() { var s = stage(); return s && s.classList.contains("fs"); }
  function reflow() { setTimeout(function () { if (ready) setupCanvas(true); }, 70); }
  function setFsIcon() {
    var b = $("#doodleFull"); if (!b) return;
    b.innerHTML = '<span class="ic">' + ((window.ICONS && ICONS[isFs() ? "collapse" : "expand"]) || "") + "</span>";
    var sc = $("#padScale"); if (sc) sc.hidden = !isFs();
  }
  var stageHome = null; // remember where the stage lived so we can put it back
  function toggleFs() {
    if (isFs()) { exitFs(); return; }
    var s = stage(); if (!s) return;
    // Portal the stage to <body> so position:fixed is relative to the viewport
    // (not an ancestor) — this is what keeps it from drifting on iOS.
    stageHome = { parent: s.parentNode, next: s.nextSibling };
    document.body.appendChild(s);
    s.classList.add("fs");
    document.body.classList.add("doodle-fs-lock");
    closePops(); setFsIcon(); reflow();
  }
  function exitFs() {
    var s = stage(); if (!s || !isFs()) return;
    s.classList.remove("fs"); document.body.classList.remove("doodle-fs-lock");
    if (stageHome) {
      if (stageHome.next && stageHome.next.parentNode === stageHome.parent) stageHome.parent.insertBefore(s, stageHome.next);
      else stageHome.parent.appendChild(s);
      stageHome = null;
    }
    setFsIcon(); reflow();
  }
  function cycleScale() {
    var s = stage(); if (!s) return;
    s.classList.remove("tb-sm", "tb-lg");
    scaleIx = (scaleIx + 1) % SCALES.length;
    if (SCALES[scaleIx]) s.classList.add(SCALES[scaleIx]);
  }
  function initFullscreen() {
    var full = $("#doodleFull"); if (full) full.addEventListener("click", toggleFs);
    var sc = $("#padScale"); if (sc) sc.addEventListener("click", cycleScale);
    setFsIcon();
    // switching to "Together" leaves fullscreen and hides the button (live board
    // manages its own sizing); switching back to solo re-enables it.
    $$(".mode-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var live = b.dataset.mode === "live";
        var s = stage(); if (s) s.classList.toggle("live-mode", live);
        if (live) exitFs();
      });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isFs()) exitFs(); });
  }

  function bindDrawing() {
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("pointerleave", function () {});
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupCanvas();
    if (!canvas) return;
    renderColors();
    initControls();
    bindDrawing();
    updateHistBtns();
    document.addEventListener("pagechange", function (e) {
      if (e.detail === "doodle" && !ready) { setupCanvas(); }
      if (e.detail !== "doodle") exitFs(); // never leave a fullscreen canvas covering other pages
    });
    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () { if (ready) setupCanvas(true); }, 250); });
  });
})();
