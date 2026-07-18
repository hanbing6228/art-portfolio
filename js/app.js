/* ===== Core app: navigation, hero, theme, share helpers, PWA ===== */
(function () {
  const cfg = window.CONFIG || {};

  /* ---------- tiny helpers (shared) ---------- */
  window.$ = (sel, root) => (root || document).querySelector(sel);
  window.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let toastTimer;
  window.toast = function (msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2200);
  };

  // storage helpers (safe if storage disabled)
  window.store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    },
  };

  /* ---------- Share (used across the app) ---------- */
  window.shareContent = async function (title, text) {
    const url = location.href;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    // fallback: copy link
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied!");
    } catch (e) {
      toast("Copy this link: " + url);
    }
  };

  /* ---------- Save a canvas as an image (iOS-friendly) ----------
     On phones (esp. iOS) a plain <a download> often goes nowhere obvious, so
     we use the Web Share sheet with an image file — that gives a "Save Image"
     option straight to Photos. Falls back to a normal download elsewhere. */
  function downloadCanvas(canvas, filename) {
    try {
      var link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("Saved!");
    } catch (e) { toast("Couldn't save"); }
  }
  window.saveCanvasImage = function (canvas, filename) {
    filename = filename || "drawing.png";
    try {
      if (canvas.toBlob && navigator.canShare) {
        canvas.toBlob(function (blob) {
          if (!blob) return downloadCanvas(canvas, filename);
          var file = new File([blob], filename, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file] })
              .then(function () { toast("Saved!"); })
              .catch(function (err) { if (err && err.name !== "AbortError") downloadCanvas(canvas, filename); });
          } else downloadCanvas(canvas, filename);
        }, "image/png");
        return;
      }
    } catch (e) {}
    downloadCanvas(canvas, filename);
  };

  /* ---------- Fullscreen image viewer (image only) ---------- */
  window.openImageView = function (src) {
    if (!src) return;
    var v = document.getElementById("imgView");
    if (!v) {
      v = document.createElement("div");
      v.id = "imgView"; v.className = "img-view"; v.hidden = true;
      v.innerHTML = '<button class="lightbox-close" id="imgViewClose">' + ((window.ICONS && ICONS.close) || "x") + '</button><img id="imgViewImg" alt="" referrerpolicy="no-referrer" />';
      document.body.appendChild(v);
      var close = function () { v.hidden = true; };
      v.addEventListener("click", function (e) { if (e.target === v || (e.target.closest && e.target.closest("#imgViewClose"))) close(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !v.hidden) close(); });
    }
    document.getElementById("imgViewImg").src = src;
    v.hidden = false;
  };

  /* ---------- Navigation ---------- */
  function goTo(target) {
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === target));
    $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.target === target));
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.dispatchEvent(new CustomEvent("pagechange", { detail: target }));
  }
  window.goTo = goTo;

  $$(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => goTo(btn.dataset.target));
  });

  /* ---------- Profile (from config, overridable by cloud) ---------- */
  // A profile object may come from the cloud (owner-edited). Any missing field
  // falls back to CONFIG in js/config.js.
  function escapeText(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  var BADGE_ICONS = ["cake", "book", "leaf", "star", "sparkle"];

  window.applyProfile = function (p) {
    p = p || {};
    var obs = cfg.obsession || {};
    var setText = function (sel, val) { var el = $(sel); if (el) el.textContent = val; };

    setText("#heroName", p.name || cfg.name || "My Name");
    setText("#heroTagline", p.tagline != null ? p.tagline : (cfg.tagline || ""));
    $("#avatarImg").src = p.avatar || cfg.avatar || "assets/img/avatar.svg";
    setText("#obsessionTitle", p.obsessionTitle != null ? p.obsessionTitle : (obs.title || ""));
    setText("#obsessionNote", p.obsessionNote != null ? p.obsessionNote : (obs.note || ""));
    setText("#siteTitle", p.siteTitle || cfg.siteTitle || "Portfolio");
    setText("#galleryTitle", p.galleryTitle || cfg.galleryTitle || "My Work");

    // badges (editable list of labels)
    var badgeList = (p.badges && p.badges.length ? p.badges : (cfg.badges || []));
    var badges = $("#badges");
    if (badges) {
      badges.innerHTML = badgeList
        .map(function (label, i) { return '<span class="badge">' + icon(BADGE_ICONS[i] || "star") + " " + escapeText(label) + "</span>"; })
        .join("");
    }

    // home cover banner
    var cover = p.cover != null ? p.cover : (cfg.cover || "");
    var coverBox = $("#homeCover");
    if (coverBox) {
      if (cover) { $("#homeCoverImg").src = cover; coverBox.hidden = false; }
      else coverBox.hidden = true;
    }

    // background music
    if (window.applyMusic) applyMusic(p.music != null ? p.music : (cfg.music || ""));

    var about = $("#aboutText");
    about.innerHTML = "";
    (p.about && p.about.length ? p.about : (cfg.about || [])).forEach(function (para) {
      var el = document.createElement("p"); el.textContent = para; about.appendChild(el);
    });
    var ff = $("#funFacts");
    ff.innerHTML = "";
    (p.funFacts && p.funFacts.length ? p.funFacts : (cfg.funFacts || [])).forEach(function (f) {
      var s = document.createElement("span"); s.className = "chip"; s.textContent = f; ff.appendChild(s);
    });
  };

  /* ---------- Hero / About content ---------- */
  function fillContent() {
    applyProfile(null);

    // quick links on home
    const ql = $("#quickLinks");
    const links = [
      { icon: "gallery", label: "See my work", target: "gallery" },
      { icon: "brush", label: "Try the doodle pad", target: "doodle" },
      { icon: "quiz", label: "Take my quiz", target: "quiz" },
    ];
    links.forEach((l) => {
      const b = document.createElement("button");
      b.className = "tool-chip";
      b.innerHTML = icon(l.icon) + " " + l.label;
      b.addEventListener("click", () => goTo(l.target));
      ql.appendChild(b);
    });

    $("#year").textContent = new Date().getFullYear();

    // if cloud has an owner-edited profile, apply it over the defaults
    if (window.Cloud && Cloud.enabled) {
      Cloud.getProfile().then(function (prof) { if (prof) applyProfile(prof); });
    }
  }

  /* ---------- Theme toggle ---------- */
  function initTheme() {
    const saved = store.get("theme", "light");
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);
    $("#themeToggle").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      store.set("theme", next);
      updateThemeIcon(next);
    });
  }
  function updateThemeIcon(theme) {
    $("#themeToggle").innerHTML = icon(theme === "dark" ? "sun" : "moon");
  }

  /* ---------- Sparkle burst on avatar tap ---------- */
  function initSparkles() {
    const wrap = $("#avatarWrap");
    if (!wrap) return;
    wrap.addEventListener("click", () => {
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("span");
        s.style.cssText =
          "position:absolute;left:50%;top:50%;pointer-events:none;width:12px;height:12px;background:var(--accent);z-index:5;" +
          "clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);";
        wrap.appendChild(s);
        const ang = (Math.PI * 2 * i) / 8;
        const dist = 70 + i * 4;
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
        s.animate(
          [
            { transform: "translate(-50%,-50%) scale(0.4)", opacity: 1 },
            { transform: `translate(${dx}px,${dy}px) scale(1.3)`, opacity: 0 },
          ],
          { duration: 700, easing: "ease-out" }
        ).onfinish = () => s.remove();
      }
    });
  }

  /* ---------- Share portfolio button ---------- */
  function initShareButton() {
    const btn = $("#shareSite");
    if (btn) {
      btn.addEventListener("click", () =>
        shareContent(
          (cfg.name || "My") + "'s Art Portfolio",
          "Check out my art portfolio — printmaking, sketch, watercolor, clay & weaving! 🎨"
        )
      );
    }
  }

  /* ---------- Share target: a link shared into the app ---------- */
  function initShareTarget() {
    try {
      var q = new URLSearchParams(location.search);
      var url = q.get("url") || "";
      var text = q.get("text") || "";
      var title = q.get("title") || "";
      if (!url && text) { var m = text.match(/https?:\/\/\S+/); if (m) url = m[0]; }
      if (url) {
        window.SHARED_FAV = { url: url, title: title || "" };
        history.replaceState({}, "", location.pathname); // don't re-trigger on refresh
        goTo("favorites");
      }
    } catch (e) {}
  }

  /* ---------- PWA service worker ---------- */
  function initPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    if (window.renderIcons) renderIcons(document);
    fillContent();
    initTheme();
    initSparkles();
    initShareButton();
    initPWA();
    initShareTarget();
  });
})();
