/* ===== Favorites / collection wall =====
   The owner collects beautiful things (links, images from Pinterest, Google,
   the web…) in the Manage panel; everyone can browse them here. Stored in the
   cloud. Tapping a card opens its link. */
(function () {
  var FAVES = [];

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function escAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }

  function render() {
    var grid = document.getElementById("favesGrid");
    if (!grid) return;
    if (!FAVES.length) {
      grid.innerHTML = '<p class="gb-empty">No favorites yet — add some in the ⚙️ Manage panel!</p>';
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
        "</div>";
      if (f.url) {
        card.style.cursor = "pointer";
        card.addEventListener("click", function () { window.open(f.url, "_blank", "noopener"); });
      }
      grid.appendChild(card);
    });
  }

  // let the admin panel refresh the wall after add/delete
  window.reloadFaves = function (list) { if (list) FAVES = list; render(); };

  document.addEventListener("DOMContentLoaded", function () {
    render();
    if (window.Cloud && Cloud.enabled) {
      Cloud.listFavorites().then(function (list) { if (list) { FAVES = list; render(); } });
      // refresh when the Faves tab is opened
      document.addEventListener("pagechange", function (e) {
        if (e.detail === "favorites") Cloud.listFavorites().then(function (list) { if (list) { FAVES = list; render(); } });
      });
    }
  });
})();
