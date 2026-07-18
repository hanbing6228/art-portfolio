/* ===== Doodle pad: touch + mouse drawing, colors, eraser, save ===== */
(function () {
  const COLORS = ["#2f5233", "#5a8f4e", "#7cb342", "#a8d08d", "#f3c969", "#e5484d", "#4a90d9", "#8a5a3c", "#111111"];

  let canvas, ctx, drawing = false, current = COLORS[0], brush = 8, erasing = false;
  let lastX = 0, lastY = 0, ready = false;

  function setupCanvas() {
    canvas = $("#doodleCanvas");
    if (!canvas) return;
    // size the backing store to the displayed size (crisp on retina)
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ready = rect.width > 0;
  }

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    const p = pos(e);
    lastX = p.x; lastY = p.y;
    // dot on tap
    ctx.beginPath();
    ctx.fillStyle = erasing ? "#ffffff" : current;
    ctx.arc(p.x, p.y, brush / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.strokeStyle = erasing ? "#ffffff" : current;
    ctx.lineWidth = brush;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
  }
  function end() { drawing = false; }

  function renderColors() {
    const wrap = $("#doodleColors");
    if (!wrap) return;
    COLORS.forEach((c, i) => {
      const d = document.createElement("div");
      d.className = "color-dot" + (i === 0 ? " active" : "");
      d.style.background = c;
      d.addEventListener("click", () => {
        current = c;
        erasing = false;
        $("#eraserBtn").classList.remove("primary");
        $$(".color-dot").forEach((x) => x.classList.remove("active"));
        d.classList.add("active");
      });
      wrap.appendChild(d);
    });
  }

  function initControls() {
    $("#brushSize").addEventListener("input", (e) => (brush = +e.target.value));
    $("#eraserBtn").addEventListener("click", (e) => {
      erasing = !erasing;
      e.currentTarget.classList.toggle("primary", erasing);
    });
    $("#clearBtn").addEventListener("click", () => {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
    });
    $("#saveDoodle").addEventListener("click", () => {
      try {
        const link = document.createElement("a");
        link.download = "my-doodle.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast("Saved your doodle!");
        if (window.Achievements) Achievements.bump("doodlesSaved");
      } catch (e) {
        toast("Couldn't save");
      }
    });
  }

  function bindDrawing() {
    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupCanvas();
    if (!canvas) return;
    renderColors();
    initControls();
    bindDrawing();

    // The doodle page is hidden at load, so the canvas has 0 size until shown.
    // Initialize it the first time the user opens the Doodle tab.
    document.addEventListener("pagechange", (e) => {
      if (e.detail === "doodle" && !ready) setupCanvas();
    });
    // re-fit if the canvas gets its real size after layout / orientation change
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const img = canvas.toDataURL();
        setupCanvas();
        const image = new Image();
        image.onload = () => ctx.drawImage(image, 0, 0, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
        image.src = img;
      }, 250);
    });
  });
})();
