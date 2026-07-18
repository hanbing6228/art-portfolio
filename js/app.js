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
      toast("Link copied! 📋");
    } catch (e) {
      toast("Copy this link: " + url);
    }
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

  /* ---------- Hero / About content from config ---------- */
  function fillContent() {
    $("#heroName").textContent = cfg.name || "My Name";
    $("#heroTagline").textContent = cfg.tagline || "";
    $("#avatarImg").src = cfg.avatar || "assets/img/avatar.svg";
    if (cfg.age) $("#ageBadge").textContent = "🎂 Age " + cfg.age;
    if (cfg.obsession) {
      $("#obsessionTitle").textContent = cfg.obsession.title || "";
      $("#obsessionNote").textContent = cfg.obsession.note || "";
    }

    // quick links on home
    const ql = $("#quickLinks");
    const links = [
      { label: "🖼️ See my work", target: "gallery" },
      { label: "🖍️ Try the doodle pad", target: "doodle" },
      { label: "🧩 Take my quiz", target: "quiz" },
    ];
    links.forEach((l) => {
      const b = document.createElement("button");
      b.className = "tool-chip";
      b.textContent = l.label;
      b.addEventListener("click", () => goTo(l.target));
      ql.appendChild(b);
    });

    // about
    const about = $("#aboutText");
    (cfg.about || []).forEach((para) => {
      const p = document.createElement("p");
      p.textContent = para;
      about.appendChild(p);
    });
    const ff = $("#funFacts");
    (cfg.funFacts || []).forEach((f) => {
      const s = document.createElement("span");
      s.className = "chip";
      s.textContent = f;
      ff.appendChild(s);
    });

    $("#year").textContent = new Date().getFullYear();
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
    $("#themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
  }

  /* ---------- Sparkle burst on avatar tap ---------- */
  function initSparkles() {
    const wrap = $("#avatarWrap");
    if (!wrap) return;
    wrap.addEventListener("click", () => {
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("span");
        s.textContent = "✦";
        s.style.cssText =
          "position:absolute;left:50%;top:50%;pointer-events:none;color:var(--gold);font-size:1.2rem;z-index:5;";
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
    fillContent();
    initTheme();
    initSparkles();
    initShareButton();
    initPWA();
  });
})();
