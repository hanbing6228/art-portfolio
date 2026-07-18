/* ===== Favorites / collection wall =====
   Public visitors browse the collection. When the owner is signed in, an
   inline "Add favorite" bar appears right on this page: paste a link, grab a
   preview, and save — no need to open the Manage panel. */
(function () {
  var FAVES = [];
  var isOwner = false;
  var previewImg = null;

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function escAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }
  function isImageUrl(u) { return /\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i.test(u || ""); }

  function render() {
    var grid = document.getElementById("favesGrid");
    if (!grid) return;
    if (!FAVES.length) {
      grid.innerHTML = '<p class="gb-empty">No favorites yet' + (isOwner ? " — tap ➕ Add above!" : " — check back soon!") + "</p>";
      return;
    }
    grid.innerHTML = "";
    FAVES.forEach(function (f) {
      var card = document.createElement("div");
      card.className = "art-card fave-card";
      var media = f.img
        ? '<div class="art-imgwrap"><img src="' + escAttr(f.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest(\'.art-card\').classList.add(\'noimg\');this.remove();" /></div>'
        : "";
      var host = "";
      try { if (f.url) host = new URL(f.url).hostname.replace(/^www\./, ""); } catch (e) {}
      card.innerHTML =
        media +
        '<div class="art-meta">' +
        (f.title ? '<div class="art-title">' + esc(f.title) + "</div>" : "") +
        (f.note ? '<div class="fave-note">' + esc(f.note) + "</div>" : "") +
        (f.url ? '<div class="fave-link">' + icon("link") + " " + esc(host || "open link") + "</div>" : "") +
        (isOwner ? '<button class="mini-btn fave-del" data-id="' + escAttr(f.id) + '">' + icon("trash") + "</button>" : "") +
        "</div>";
      if (f.url) {
        card.querySelector(".art-imgwrap") && card.querySelector(".art-imgwrap").addEventListener("click", function () { window.open(f.url, "_blank", "noopener"); });
        var t = card.querySelector(".art-title"); if (t) { t.style.cursor = "pointer"; t.addEventListener("click", function () { window.open(f.url, "_blank", "noopener"); }); }
      }
      var del = card.querySelector(".fave-del");
      if (del) del.addEventListener("click", async function (e) {
        e.stopPropagation();
        if (!confirm("Remove this favorite?")) return;
        await Cloud.deleteFavorite(f.id);
        await reload();
        toast("Removed");
      });
      grid.appendChild(card);
    });
  }

  /* ---------- owner inline add bar ---------- */
  function buildAddBar() {
    var section = document.getElementById("favorites");
    var grid = document.getElementById("favesGrid");
    if (!section || !grid || document.getElementById("favAddBar")) return;

    var bar = document.createElement("div");
    bar.id = "favAddBar";
    bar.hidden = true;
    bar.innerHTML =
      '<button class="tool-chip primary" id="favAddToggle">' + icon("star") + " Add favorite</button>" +
      '<div id="favAddForm" class="fav-inline-form" hidden>' +
      '<div class="fav-add-row">' +
      '<input id="favInUrl" class="gb-input" placeholder="Paste a link or image URL" />' +
      '<button class="tool-chip" id="favInFetch">Preview</button></div>' +
      '<img id="favInPrev" class="admin-art-prev" hidden alt="preview" />' +
      '<input id="favInTitle" class="gb-input" placeholder="Title (optional)" />' +
      '<input id="favInNote" class="gb-input" placeholder="Note (optional)" />' +
      '<div class="fav-add-row">' +
      '<button class="tool-chip primary" id="favInAdd">Add</button>' +
      '<button class="tool-chip" id="favInCancel">Cancel</button></div>' +
      "</div>";
    section.insertBefore(bar, grid);

    document.getElementById("favAddToggle").addEventListener("click", function () {
      var f = document.getElementById("favAddForm"); f.hidden = !f.hidden;
    });
    document.getElementById("favInCancel").addEventListener("click", resetForm);
    document.getElementById("favInFetch").addEventListener("click", getPreview);
    document.getElementById("favInAdd").addEventListener("click", doAdd);
  }

  function resetForm() {
    previewImg = null;
    ["favInUrl", "favInTitle", "favInNote"].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ""; });
    var p = document.getElementById("favInPrev"); if (p) p.hidden = true;
    var f = document.getElementById("favAddForm"); if (f) f.hidden = true;
  }

  async function getPreview() {
    var url = document.getElementById("favInUrl").value.trim();
    if (!url) { toast("Paste a link first"); return; }
    if (isImageUrl(url)) {
      previewImg = url;
      var pv = document.getElementById("favInPrev"); pv.src = url; pv.hidden = false;
      toast("Image ready!"); return;
    }
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
      img: img,
    });
    btn.textContent = "Add"; btn.disabled = false;
    if (id) { toast("Saved to favorites!"); resetForm(); await reload(); }
    else toast("Add failed: " + (window.Cloud.lastError || "check Firestore rules"));
  }

  async function reload() {
    var list = await Cloud.listFavorites();
    if (list) { FAVES = list; render(); }
  }
  // let the Manage panel refresh this wall too
  window.reloadFaves = function (list) { if (list) FAVES = list; render(); };

  document.addEventListener("DOMContentLoaded", function () {
    render();
    if (!(window.Cloud && Cloud.enabled)) return;
    buildAddBar();
    Cloud.onAuth(function (user) {
      isOwner = !!user;
      var bar = document.getElementById("favAddBar"); if (bar) bar.hidden = !isOwner;
      render();
    });
    Cloud.listFavorites().then(function (list) { if (list) { FAVES = list; render(); } });
    document.addEventListener("pagechange", function (e) {
      if (e.detail === "favorites") Cloud.listFavorites().then(function (list) { if (list) { FAVES = list; render(); } });
    });
  });
})();
