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

  /* ---------- drawing ---------- */
  function pos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }
  function strokeStyleFor(pressure) {
    if (tool === "eraser") return "rgba(255,255,255,1)";
    var a = opacity;
    if (tool === "marker") a = opacity * 0.4;
    else if (tool === "highlighter") a = opacity * 0.28;
    return hexToRgba(color, a);
  }
  function widthFor(pressure) {
    var mult = tool === "marker" ? 1.7 : tool === "highlighter" ? 2.8 : tool === "oil" ? 2.3 : tool === "ink" ? 1.5 : tool === "pencil" ? 0.55 : 1;
    var w = brush * mult;
    if (tool === "highlighter") return Math.max(3, w); // flat, chunky
    var pr = (pressure && pressure > 0 && pressure !== 0.5) ? pressure : 0.6; // pens/touch vary; mouse ~0.5
    if (tool === "ink") return Math.max(1, w * (0.2 + 1.5 * pr));   // 毛笔: big thin↔thick range
    if (tool === "oil") return Math.max(3, w * (0.8 + 0.4 * pr));    // 油画笔: fat, steadier
    return Math.max(1, w * (0.55 + 0.9 * pr));
  }
  // double-tap on the canvas undoes the last stroke
  var lastTapTime = 0, lastTapX = 0, lastTapY = 0, wasTap = false, skipStroke = false, movedDist = 0;
  function start(e) {
    if (!ready) return;
    e.preventDefault();
    var p = pos(e);
    var now = Date.now();
    if (wasTap && now - lastTapTime < 320 && Math.abs(p.x - lastTapX) < 26 && Math.abs(p.y - lastTapY) < 26) {
      // double-tap → undo (removes the first tap's dot, then the stroke before it)
      skipStroke = true; wasTap = false; lastTapTime = 0;
      undo(); undo();
      return;
    }
    drawing = true; skipStroke = false; movedDist = 0;
    lastX = p.x; lastY = p.y;
    ctx.strokeStyle = strokeStyleFor(e.pressure);
    ctx.fillStyle = strokeStyleFor(e.pressure);
    var w = widthFor(e.pressure);
    ctx.beginPath(); ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2); ctx.fill();
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = pos(e);
    movedDist += Math.abs(p.x - lastX) + Math.abs(p.y - lastY);
    var w = widthFor(e.pressure);
    if (tool === "oil") {
      // 油画笔: a few parallel bristle strokes for a dry, textured look
      var dx = p.x - lastX, dy = p.y - lastY, len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len, base = strokeStyleFor(e.pressure);
      for (var i = -1; i <= 1; i++) {
        ctx.strokeStyle = i === 0 ? base : hexToRgba(color, 0.45);
        ctx.lineWidth = w * (i === 0 ? 1 : 0.35);
        var off = i * w * 0.32;
        ctx.beginPath(); ctx.moveTo(lastX + nx * off, lastY + ny * off); ctx.lineTo(p.x + nx * off, p.y + ny * off); ctx.stroke();
      }
    } else {
      ctx.strokeStyle = strokeStyleFor(e.pressure);
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    lastX = p.x; lastY = p.y;
  }
  function end() {
    if (skipStroke) { skipStroke = false; return; }
    if (drawing) {
      drawing = false; pushHistory();
      wasTap = movedDist < 8;                 // a quick, still touch counts as a "tap"
      lastTapTime = Date.now(); lastTapX = lastX; lastTapY = lastY;
    }
  }

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
