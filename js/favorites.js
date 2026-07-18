/* ===== Favorites / collection wall =====
   Visitors browse. The owner gets a floating ➕ button that opens an add
   dialog (paste a link → auto preview → tags → save). Tapping a card image
   opens it enlarged IN-APP (with a "Visit" button to the original). Filter
   by tag. */
(function () {
  var FAVES = [];
  var isOwner = false;
  var currentTag = "all";
  var previewImg = null;

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function escAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }
  function isImageUrl(u) { return /\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i.test(u || ""); }
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
    var items = visible();
    if (!items.length) {
      grid.innerHTML = '<p class="gb-empty">' + (FAVES.length ? "Nothing tagged that yet." : (isOwner ? "No favorites yet — tap the ➕ button!" : "No favorites yet — check back soon!")) + "</p>";
      return;
    }
    grid.innerHTML = "";
    items.forEach(function (f) {
      var card = document.createElement("div");
      card.className = "art-card fave-card";
      var media = f.img
        ? '<div class="art-imgwrap"><img src="' + escAttr(f.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest(\'.art-card\').classList.add(\'noimg\');this.remove();" /></div>'
        : "";
      card.innerHTML =
        media +
        '<div class="art-meta">' +
        (f.title ? '<div class="art-title">' + esc(f.title) + "</div>" : "") +
        (f.note ? '<div class="fave-note">' + esc(f.note) + "</div>" : "") +
        ((f.tags && f.tags.length) ? '<div class="art-tags">' + f.tags.map(function (t) { return '<button class="art-tag" data-t="' + escAttr(t) + '">#' + esc(t) + "</button>"; }).join("") + "</div>" : "") +
        (f.url ? '<a class="fave-link" href="' + escAttr(f.url) + '" target="_blank" rel="noopener">' + icon("link") + " " + esc(hostOf(f.url) || "visit") + "</a>" : "") +
        (isOwner ? '<button class="mini-btn fave-del" data-id="' + escAttr(f.id) + '">' + icon("trash") + "</button>" : "") +
        "</div>";
      // image → in-app viewer
      var iw = card.querySelector(".art-imgwrap");
      if (iw) iw.addEventListener("click", function () { openViewer(f); });
      // tag chips jump-filter
      card.querySelectorAll(".art-tag").forEach(function (chip) {
        chip.addEventListener("click", function (e) { e.stopPropagation(); currentTag = chip.dataset.t; renderFilters(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      });
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
  var viewer;
  function openViewer(f) {
    if (!viewer) {
      viewer = document.createElement("div");
      viewer.className = "fave-viewer";
      viewer.innerHTML =
        '<div class="fave-viewer-inner">' +
        '<button class="lightbox-close" id="favViewClose">' + (window.ICONS ? ICONS.close : "x") + "</button>" +
        '<img id="favViewImg" alt="" referrerpolicy="no-referrer" />' +
        '<h3 id="favViewTitle"></h3>' +
        '<div id="favViewActions" class="lightbox-actions"></div>' +
        "</div>";
      document.body.appendChild(viewer);
      viewer.addEventListener("click", function (e) { if (e.target === viewer) viewer.hidden = true; });
      document.getElementById("favViewClose").addEventListener("click", function () { viewer.hidden = true; });
    }
    document.getElementById("favViewImg").src = f.img || "";
    document.getElementById("favViewImg").style.display = f.img ? "" : "none";
    document.getElementById("favViewTitle").textContent = f.title || "";
    document.getElementById("favViewActions").innerHTML = f.url
      ? '<a class="tool-chip primary" href="' + escAttr(f.url) + '" target="_blank" rel="noopener">' + icon("link") + " Visit link</a>"
      : "";
    viewer.hidden = false;
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
      '<button class="tool-chip primary" id="favInAdd">Add favorite</button>' +
      "</div></div></div>";
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.hidden = true; });
    document.getElementById("favModalClose").addEventListener("click", function () { modal.hidden = true; });
    document.getElementById("favInFetch").addEventListener("click", getPreview);
    document.getElementById("favInAdd").addEventListener("click", doAdd);
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
    var meta = window.parseLinkPreview ? await window.parseLinkPreview(url) : null;
    btn.textContent = "Preview"; btn.disabled = false;
    if (meta) {
      previewImg = meta.image || null;
      if (meta.image) { var pv2 = document.getElementById("favInPrev"); pv2.src = meta.image; pv2.hidden = false; }
      var t = document.getElementById("favInTitle"); if (meta.title && !t.value) t.value = meta.title;
      toast(meta.image ? "Preview loaded!" : "No image found — you can still add it");
    } else toast("Couldn't read that link — you can still add it");
  }
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
    Cloud.onAuth(function (user) {
      isOwner = !!user;
      if (fab) fab.hidden = !isOwner;
      render();
      if (isOwner) handleShared();
    });
    reload();
    document.addEventListener("pagechange", function (e) { if (e.detail === "favorites") reload(); });
  });
})();
