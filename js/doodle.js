/* ===== Doodle pad (upgraded, still simple) =====
   Pointer drawing with pressure, pen / marker / eraser brushes, size &
   opacity sliders, color picker + palette, undo / redo, clear, save PNG. */
(function () {
  var PALETTE = [
    "#2f5d55", "#3f7d6e", "#60925e", "#7cb342", "#a9c6a0", "#cfe8c2",
    "#c8f5f9", "#4ac6d6", "#4a90d9", "#2f5fae", "#7b5ea7", "#b06fc9",
    "#f3c969", "#f0a24b", "#e5764b", "#e5484d", "#c0392b", "#8a5a3c",
    "#d9b3b3", "#f6b8c8", "#7a7a7a", "#b8b8b8", "#111111", "#ffffff"
  ];

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

  /* ---------- drawing engine ----------
     Each stroke is re-rendered from a snapshot of the canvas taken when the
     stroke began. That keeps every brush smooth (quadratic curves, no
     "beading" on fast moves) and gives translucent brushes an even, uniform
     tone instead of dark blobs where segments overlap. */
  var baseCanvas = document.createElement("canvas"), baseCtx = baseCanvas.getContext("2d");
  var cur = []; // points of the in-progress stroke, in CSS pixels
  function pos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }

  function captureBase() {
    baseCanvas.width = canvas.width; baseCanvas.height = canvas.height;
    baseCtx.setTransform(1, 0, 0, 1, 0, 0);
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    baseCtx.drawImage(canvas, 0, 0);
  }
  function restoreBase() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.restore();
  }

  // distinct look per brush (works even with no stylus pressure)
  function brushParams() {
    switch (tool) {
      case "eraser":      return { color: "#ffffff", width: brush, alpha: 1, cap: "round", type: "solid" };
      case "pencil":      return { color: color, width: Math.max(1, brush * 0.55), alpha: 0.9 * opacity, cap: "round", type: "pencil" };
      case "marker":      return { color: color, width: brush * 2, alpha: 0.5 * opacity, cap: "butt", type: "solid" };
      case "highlighter": return { color: color, width: brush * 3.6, alpha: 0.22 * opacity, cap: "butt", type: "solid" };
      case "ink":         return { color: color, width: brush * 1.3, alpha: opacity, cap: "round", type: "ink" };
      case "oil":         return { color: color, width: brush * 2.3, alpha: opacity, cap: "round", type: "oil" };
      default:            return { color: color, width: brush, alpha: opacity, cap: "round", type: "solid" }; // pen
    }
  }

  function smoothPath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }
  function renderStroke(pts) {
    var pr = brushParams();
    ctx.save();
    ctx.globalAlpha = pr.alpha;
    ctx.lineCap = pr.cap; ctx.lineJoin = "round";
    ctx.strokeStyle = pr.color; ctx.fillStyle = pr.color;
    if (pts.length === 1) {
      ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, Math.max(0.6, pr.width / 2), 0, Math.PI * 2); ctx.fill();
      ctx.restore(); return;
    }
    if (pr.type === "ink") {
      // 毛笔: line thins with speed, thickens when slow → calligraphic taper
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y);
        ctx.lineWidth = pr.width * Math.max(0.25, Math.min(2.1, 7 / (d + 3.5)));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    } else if (pr.type === "oil") {
      // 油画笔: several parallel bristles for a dry, streaky look
      for (var bnd = -1; bnd <= 1; bnd++) {
        ctx.globalAlpha = pr.alpha * (bnd === 0 ? 1 : 0.5);
        ctx.lineWidth = pr.width * (bnd === 0 ? 1 : 0.4);
        ctx.beginPath();
        for (var j = 0; j < pts.length; j++) {
          var p = pts[j], nx = 0, ny = 0;
          if (j > 0) { var dx = p.x - pts[j - 1].x, dy = p.y - pts[j - 1].y, l = Math.hypot(dx, dy) || 1; nx = -dy / l; ny = dx / l; }
          var off = bnd * pr.width * 0.34;
          if (j === 0) ctx.moveTo(p.x + nx * off, p.y + ny * off); else ctx.lineTo(p.x + nx * off, p.y + ny * off);
        }
        ctx.stroke();
      }
    } else if (pr.type === "pencil") {
      ctx.lineWidth = pr.width; smoothPath(pts);
      // grainy speckle so it reads like graphite
      ctx.globalAlpha = pr.alpha * 0.45;
      for (var k = 0; k < pts.length; k += 2) {
        var q = pts[k], s = (k * 928371) % 97;
        ctx.beginPath();
        ctx.arc(q.x + ((s % 7) - 3) * 0.6, q.y + (((s >> 2) % 7) - 3) * 0.6, pr.width * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.lineWidth = pr.width; smoothPath(pts);
    }
    ctx.restore();
  }

  // double-tap on the canvas undoes the last stroke
  var lastTapTime = 0, lastTapX = 0, lastTapY = 0, wasTap = false, skipStroke = false, movedDist = 0;
  function start(e) {
    if (!ready) return;
    e.preventDefault();
    var p = pos(e), now = Date.now();
    if (wasTap && now - lastTapTime < 320 && Math.abs(p.x - lastTapX) < 26 && Math.abs(p.y - lastTapY) < 26) {
      skipStroke = true; wasTap = false; lastTapTime = 0;
      undo(); undo();
      return;
    }
    drawing = true; skipStroke = false; movedDist = 0;
    lastX = p.x; lastY = p.y;
    captureBase();
    cur = [{ x: p.x, y: p.y }];
    restoreBase(); renderStroke(cur);
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = pos(e);
    movedDist += Math.abs(p.x - lastX) + Math.abs(p.y - lastY);
    cur.push({ x: p.x, y: p.y });
    restoreBase(); renderStroke(cur);
    lastX = p.x; lastY = p.y;
  }
  function end() {
    if (skipStroke) { skipStroke = false; return; }
    if (drawing) {
      drawing = false; pushHistory();
      var lp = cur[cur.length - 1] || { x: lastX, y: lastY };
      wasTap = movedDist < 8;                 // a quick, still touch counts as a "tap"
      lastTapTime = Date.now(); lastTapX = lp.x; lastTapY = lp.y;
    }
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
    if (willOpen) {
      p.hidden = false;
      var b = $("#" + btnId);
      if (b) { b.classList.add("active"); positionPop(p, b); }
    }
  }
  // keep the popover on-screen (the toolbar can be dragged to any edge)
  function positionPop(p, b) {
    var br = b.getBoundingClientRect(), pr = p.getBoundingClientRect();
    var left = Math.max(8, Math.min(br.left + br.width / 2 - pr.width / 2, window.innerWidth - pr.width - 8));
    var top = br.bottom + 8;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, br.top - pr.height - 8);
    p.style.left = left + "px"; p.style.top = top + "px";
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

  /* ---------- timed drawing ---------- */
  var timerId = null, timerEnd = 0;
  var TIMER_STEPS = [0, 1, 3, 5], timerStep = 0;
  function cycleTimer() { timerStep = (timerStep + 1) % TIMER_STEPS.length; setTimer(TIMER_STEPS[timerStep]); }
  function setTimer(mins) {
    if (timerId) { clearInterval(timerId); timerId = null; }
    var btn = $("#padTimerBtn"); if (btn) btn.classList.toggle("active", mins > 0);
    if (!mins) { showTimer(-1); toast("Timer off"); return; }
    timerEnd = Date.now() + mins * 60000;
    timerId = setInterval(tickTimer, 500); tickTimer();
    toast(mins + " min — go!");
  }
  function tickTimer() {
    var left = Math.max(0, timerEnd - Date.now());
    showTimer(left);
    if (left <= 0) { clearInterval(timerId); timerId = null; timeUp(); }
  }
  function showTimer(ms) {
    var b = $("#padTimer"); if (!b) return;
    if (ms < 0) { b.hidden = true; return; }
    var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); s = s % 60;
    b.textContent = m + ":" + (s < 10 ? "0" : "") + s; b.hidden = false;
    b.classList.toggle("low", ms > 0 && ms < 15000);
  }
  function timeUp() {
    showTimer(0); toast("Time's up! ⏰");
    var s = stage(); if (s) { s.classList.add("time-up"); setTimeout(function () { s.classList.remove("time-up"); }, 1600); }
    setTimeout(function () { showTimer(-1); }, 2200);   // the timer badge auto-disappears
    timerStep = 0; var btn = $("#padTimerBtn"); if (btn) btn.classList.remove("active");
    window.dispatchEvent(new Event("doodle-timeup"));   // Draw Together shows everyone's boards
  }

  /* ---------- fullscreen canvas + draggable / collapsible toolbar ---------- */
  function stage() { return $("#doodleStage"); }
  function isFs() { var s = stage(); return s && s.classList.contains("fs"); }
  function reflow() { setTimeout(function () { if (ready) setupCanvas(true); window.dispatchEvent(new Event("doodle-reflow")); }, 70); }
  function setFsIcon() {
    var b = $("#doodleFull"); if (!b) return;
    b.innerHTML = '<span class="ic">' + ((window.ICONS && ICONS[isFs() ? "collapse" : "expand"]) || "") + "</span>";
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
    // enter as a small draggable puck tucked in the corner
    var bar = $(".pad-bar");
    if (bar) { bar.classList.add("floating", "collapsed"); bar.style.left = "12px"; bar.style.top = "72px"; bar.style.transform = "none"; }
    closePops(); setFsIcon(); reflow();
  }
  function exitFs() {
    var s = stage(); if (!s || !isFs()) return;
    s.classList.remove("fs"); document.body.classList.remove("doodle-fs-lock");
    var bar = $(".pad-bar");
    if (bar) { bar.classList.remove("floating", "collapsed"); bar.style.left = bar.style.top = bar.style.transform = ""; }
    if (stageHome) {
      if (stageHome.next && stageHome.next.parentNode === stageHome.parent) stageHome.parent.insertBefore(s, stageHome.next);
      else stageHome.parent.appendChild(s);
      stageHome = null;
    }
    setFsIcon(); reflow();
  }
  // drag the toolbar by its grip; a tap (no drag) collapses/expands it
  function initGrip() {
    var grip = $("#padGrip"), bar = $(".pad-bar");
    if (!grip || !bar) return;
    var dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    grip.addEventListener("pointerdown", function (e) {
      dragging = true; moved = false;
      try { grip.setPointerCapture(e.pointerId); } catch (_) {}
      var r = bar.getBoundingClientRect(); ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
      if (!bar.classList.contains("floating")) bar.classList.add("floating");
      bar.style.left = ox + "px"; bar.style.top = oy + "px"; bar.style.transform = "none";
      e.preventDefault(); e.stopPropagation();
    });
    grip.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      bar.style.left = Math.max(4, Math.min(window.innerWidth - 46, ox + dx)) + "px";
      bar.style.top = Math.max(8, Math.min(window.innerHeight - 46, oy + dy)) + "px";
    });
    function up(e) {
      if (!dragging) return; dragging = false;
      try { grip.releasePointerCapture(e.pointerId); } catch (_) {}
      if (!moved) bar.classList.toggle("collapsed"); // tap = collapse ↔ expand
    }
    grip.addEventListener("pointerup", up);
    grip.addEventListener("pointercancel", up);
  }
  function initFullscreen() {
    var full = $("#doodleFull"); if (full) full.addEventListener("click", toggleFs);
    setFsIcon();
    initGrip();
    var tb = $("#padTimerBtn"); if (tb) tb.addEventListener("click", cycleTimer);
    // both Solo and Together can go fullscreen
    $$(".mode-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = stage(); if (s) s.classList.toggle("live-mode", b.dataset.mode === "live");
        reflow();
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
