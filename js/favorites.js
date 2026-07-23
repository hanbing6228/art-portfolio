/* ===== Favorites / collection wall =====
   Visitors browse. The owner gets a floating ➕ button that opens an add
   dialog (paste a link → auto preview → tags → save). Tapping a card image
   opens it enlarged IN-APP (with a "Visit" button to the original). Filter
   by tag. */
(function () {
  var FAVES = [];
  var isOwner = false, onFaves = false;
  var currentTag = "all";
  var previewImg = null;

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function escAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }
  function isImageUrl(u) { return /\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i.test(u || ""); }
  function updateFab() { if (fab) fab.hidden = !(isOwner && onFaves); }

  // resize a picked image to a compressed data URL (fallback when a link has no preview)
  function resizeToDataURL(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var cw = Math.max(1, Math.round(img.width * scale)), ch = Math.max(1, Math.round(img.height * scale));
        var c = document.createElement("canvas"); c.width = cw; c.height = ch;
        c.getContext("2d").drawImage(img, 0, 0, cw, ch);
        var q = quality, out = c.toDataURL("image/jpeg", q);
        while (out.length > 900000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("bad image")); };
      img.src = url;
    });
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }

  /* ---------- tag filter ---------- */
  function allTags() {
    var c = {};
    FAVES.forEach(function (f) { (f.tags || []).forEach(function (t) { c[t] = (c[t] || 0) + 1; }); });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b); });
  }
  function renderFilters() {
    var wrap = document.getElementById("favesFilters");
    if (!wrap) return;
    var tags = allTags();
    if (!tags.length) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = "";
    ["all"].concat(tags).forEach(function (tag) {
      var b = document.createElement("button");
      b.className = "filter-btn" + (tag === currentTag ? " active" : "");
      b.innerHTML = tag === "all" ? icon("sparkle") + " All" : "#" + esc(tag);
      b.addEventListener("click", function () { currentTag = tag; renderFilters(); render(); });
      wrap.appendChild(b);
    });
  }
  function visible() {
    if (currentTag === "all") return FAVES;
    return FAVES.filter(function (f) { return (f.tags || []).indexOf(currentTag) !== -1; });
  }

  /* ---------- grid ---------- */
  function render() {
    var grid = document.getElementById("favesGrid");
    if (!grid) return;
    // favorites are private — only the signed-in owner sees them
    if (!isOwner) {
      var filt = document.getElementById("favesFilters"); if (filt) filt.innerHTML = "";
      grid.innerHTML = '<p class="gb-empty">🔒 This collection is private.</p>';
      return;
    }
    var items = visible();
    if (!items.length) {
      grid.innerHTML = '<p class="gb-empty">' + (FAVES.length ? "Nothing tagged that yet." : "No favorites yet — tap the ➕ button!") + "</p>";
      return;
    }
    grid.innerHTML = "";
    items.forEach(function (f) {
      var card = document.createElement("div");
      card.className = "art-card fave-card" + (f.img ? "" : " noimg");
      // Clean Pinterest-style wall: just the picture. (No title / link / tags on
      // the card face.) Cards with no image fall back to a small label.
      card.innerHTML =
        (f.img
          ? '<div class="art-imgwrap"><img src="' + escAttr(f.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest(\'.art-card\').classList.add(\'noimg\');this.remove();" /></div>'
          : '<div class="fave-fallback">' + esc(f.title || hostOf(f.url) || "link") + "</div>") +
        (isOwner ? '<button class="mini-btn fave-del" data-id="' + escAttr(f.id) + '">' + icon("trash") + "</button>" : "");
      // tap the picture → fullscreen image; a link-only card → open the link
      var iw = card.querySelector(".art-imgwrap");
      if (iw) iw.addEventListener("click", function () { openViewer(f); });
      var fb = card.querySelector(".fave-fallback");
      if (fb && f.url) fb.addEventListener("click", function () { window.open(f.url, "_blank", "noopener"); });
      var del = card.querySelector(".fave-del");
      if (del) del.addEventListener("click", async function (e) {
        e.stopPropagation();
        if (!confirm("Remove this favorite?")) return;
        await Cloud.deleteFavorite(f.id); await reload(); toast("Removed");
      });
      grid.appendChild(card);
    });
  }

  /* ---------- in-app image viewer ---------- */
  // Preview shows just the picture, fullscreen (no title / tags / details).
  function openViewer(f) {
    if (f && f.img && window.openImageView) { openImageView(f.img, f.title); return; }
  }

  /* ---------- owner: floating + button and add modal ---------- */
  var fab, modal;
  function buildFab() {
    if (fab) return;
    fab = document.createElement("button");
    fab.id = "favFab"; fab.className = "fav-fab"; fab.hidden = true;
    fab.setAttribute("aria-label", "Add favorite");
    fab.innerHTML = ICONS.plus || "+";
    document.body.appendChild(fab);
    fab.addEventListener("click", openModal);
  }
  function buildModal() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "admin-overlay"; modal.hidden = true;
    modal.innerHTML =
      '<div class="admin-panel"><div class="admin-head"><b>Add favorite</b>' +
      '<button class="icon-btn" id="favModalClose">' + (window.ICONS ? ICONS.close : "x") + "</button></div>" +
      '<div style="padding:16px"><div class="admin-section">' +
      '<p class="page-sub" style="margin:0 0 10px">Paste a link — I\'ll grab the picture automatically.</p>' +
      '<div class="fav-add-row"><input id="favInUrl" class="gb-input" placeholder="Paste a link or image URL" />' +
      '<button class="tool-chip" id="favInFetch">Preview</button></div>' +
      '<img id="favInPrev" class="admin-art-prev" hidden alt="preview" />' +
      '<label class="admin-label">Title<input id="favInTitle" class="gb-input" /></label>' +
      '<label class="admin-label">Note (optional)<input id="favInNote" class="gb-input" /></label>' +
      '<label class="admin-label">Tags (comma separated)<input id="favInTags" class="gb-input" placeholder="art, cute, blue" /></label>' +
      '<details class="fav-more"><summary>No picture showed up? Upload one</summary>' +
      '<label class="tool-chip" style="margin-top:8px">Upload an image<input id="favInFile" type="file" accept="image/*" hidden /></label>' +
      '<p class="page-sub" style="font-size:0.75rem;margin:6px 0 0">Tip: on Pinterest, long-press the picture → “Copy image address”, then paste that here.</p>' +
      "</details>" +
      '<button class="tool-chip primary" id="favInAdd">Add favorite</button>' +
      "</div></div></div>";
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.hidden = true; });
    document.getElementById("favModalClose").addEventListener("click", function () { modal.hidden = true; });
    document.getElementById("favInFetch").addEventListener("click", getPreview);
    document.getElementById("favInAdd").addEventListener("click", doAdd);
    document.getElementById("favInFile").addEventListener("change", async function (e) {
      var f = e.target.files[0]; if (!f) return;
      previewImg = await resizeToDataURL(f, 1000, 0.82);
      var pv = document.getElementById("favInPrev"); pv.src = previewImg; pv.hidden = false;
      toast("Image ready!");
    });
  }
  function openModal() {
    buildModal();
    previewImg = null;
    ["favInUrl", "favInTitle", "favInNote", "favInTags"].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ""; });
    document.getElementById("favInPrev").hidden = true;
    modal.hidden = false;
  }

  async function getPreview() {
    var url = document.getElementById("favInUrl").value.trim();
    if (!url) { toast("Paste a link first"); return; }
    if (isImageUrl(url)) { previewImg = url; var pv = document.getElementById("favInPrev"); pv.src = url; pv.hidden = false; toast("Image ready!"); return; }
    var btn = document.getElementById("favInFetch"); btn.textContent = "…"; btn.disabled = true;
    var t = document.getElementById("favInTitle");

    // 1) fast path: link-preview service (og:image)
    var meta = window.parseLinkPreview ? await window.parseLinkPreview(url) : null;
    if (meta && meta.title && !t.value) t.value = meta.title;
    if (meta && meta.image) { btn.textContent = "Preview"; btn.disabled = false; showPreview(meta.image, "Preview loaded!"); return; }

    btn.textContent = "Grabbing…";
    // 2) our own server-side grabber (crawler UA gets past Pinterest's login wall)
    var api = await grabViaApi(url);
    if (api) { btn.textContent = "Preview"; btn.disabled = false; showPreview(api, "Got the picture!"); return; }

    // 3) read the page's own og:image through a CORS proxy (follows pin.it → pinterest)
    var og = await readOgImage(url);
    if (og) { btn.textContent = "Preview"; btn.disabled = false; showPreview(og, "Got the picture!"); return; }

    // 4) render the page with a JS-capable reader and pull the real image out
    var scraped = await scrapeImage(url);
    if (scraped) { btn.textContent = "Preview"; btn.disabled = false; showPreview(scraped, "Got the picture!"); return; }

    // 5) last resort: a screenshot of the page
    btn.textContent = "Preview"; btn.disabled = false;
    var shot = screenshotUrl(url);
    var pv3 = document.getElementById("favInPrev");
    previewImg = shot;
    pv3.onerror = function () { pv3.onerror = null; pv3.hidden = true; previewImg = null; toast("Couldn't grab it — long-press the pin, “Copy image address”, paste that"); };
    pv3.onload = function () { pv3.onload = null; toast("Grabbed a screenshot!"); };
    pv3.src = shot; pv3.hidden = false;
  }
  function showPreview(src, msg) {
    previewImg = src;
    var pv = document.getElementById("favInPrev"); pv.onerror = null; pv.onload = null;
    pv.src = src; pv.hidden = false;
    if (msg) toast(msg);
  }
  function bumpPin(u) { return u.replace(/\/(?:\d{2,3}x\d{0,3}|\d{2,3}x)\//, "/736x/"); }
  // our Vercel serverless grabber — most reliable for Pinterest (see api/grab.js)
  async function grabViaApi(url) {
    try {
      var res = await fetch("/api/grab?url=" + encodeURIComponent(url));
      if (!res.ok) return null;
      var j = await res.json();
      if (j && j.title) { var t = document.getElementById("favInTitle"); if (t && !t.value) t.value = j.title; }
      return j && j.image ? j.image : null;
    } catch (e) { return null; }
  }
  // Fetch the raw HTML through a CORS proxy and read <meta og:image>. The proxy
  // follows the pin.it redirect server-side, so we get the real pinterest page.
  async function readOgImage(url) {
    var proxies = [
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(url),
      "https://corsproxy.io/?url=" + encodeURIComponent(url),
    ];
    for (var i = 0; i < proxies.length; i++) {
      try {
        var res = await fetch(proxies[i]);
        if (!res.ok) continue;
        var html = await res.text();
        var m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
             || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
             || html.match(/https?:\/\/i\.pinimg\.com\/[^\s"'<>\\]+\.(?:jpg|jpeg|png|webp)/i);
        if (m) return bumpPin(m[1] || m[0]);
      } catch (e) {}
    }
    return null;
  }
  // Render the page (JS + redirects) via a reader proxy and extract the main image.
  async function scrapeImage(url) {
    try {
      var res = await fetch("https://r.jina.ai/" + url, { headers: { "x-return-format": "markdown" } });
      if (!res.ok) return null;
      var text = await res.text();
      var m = text.match(/https?:\/\/i\.pinimg\.com\/[^\s"')\]]+\.(?:jpg|jpeg|png|webp)/i)
           || text.match(/https?:\/\/[^\s"')\]]+\.(?:jpg|jpeg|png|webp)/i);
      if (!m) return null;
      return bumpPin(m[0]);
    } catch (e) { return null; }
  }
  // screenshot-service fallback: renders the page and returns it as an image
  function screenshotUrl(u) { return "https://image.thum.io/get/width/900/noanimate/" + u; }
  async function doAdd() {
    var url = document.getElementById("favInUrl").value.trim();
    var img = previewImg || (isImageUrl(url) ? url : "");
    if (!url && !img) { toast("Paste a link first"); return; }
    var btn = document.getElementById("favInAdd"); btn.textContent = "Adding…"; btn.disabled = true;
    var id = await Cloud.addFavorite({
      url: url,
      title: document.getElementById("favInTitle").value.trim(),
      note: document.getElementById("favInNote").value.trim(),
      tags: document.getElementById("favInTags").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean),
      img: img,
    });
    btn.textContent = "Add favorite"; btn.disabled = false;
    if (id) { toast("Saved to favorites!"); modal.hidden = true; await reload(); }
    else toast("Add failed: " + (window.Cloud.lastError || "check Firestore rules"));
  }

  async function reload() {
    var list = await Cloud.listFavorites();
    if (list) { FAVES = list; renderFilters(); render(); }
  }
  window.reloadFaves = function (list) { if (list) FAVES = list; renderFilters(); render(); };

  // handle a link shared into the app (from the OS share sheet)
  function handleShared() {
    if (!window.SHARED_FAV || !isOwner) return;
    var s = window.SHARED_FAV; window.SHARED_FAV = null;
    openModal();
    document.getElementById("favInUrl").value = s.url || "";
    if (s.title) document.getElementById("favInTitle").value = s.title;
    if (s.url) getPreview();
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    if (!(window.Cloud && Cloud.enabled)) return;
    buildFab();
    onFaves = !!(document.getElementById("favorites") && document.getElementById("favorites").classList.contains("active"));
    Cloud.onAuth(function (user) {
      isOwner = !!user;
      updateFab();
      render();
      if (isOwner) handleShared();
    });
    reload();
    document.addEventListener("pagechange", function (e) {
      onFaves = e.detail === "favorites";
      updateFab();
      if (onFaves) reload();
    });
  });
})();
