/* =============================================================
   Owner "Manage" panel  🔧
   Lets the signed-in owner upload an avatar, edit profile text, and
   add/delete artworks — all from the phone, saved to the cloud.
   Only appears when cloud is configured; writing requires owner sign-in.
   Images are resized/compressed in the browser before upload.
   ============================================================= */
(function () {
  var cloudOn = !!(window.Cloud && Cloud.enabled);

  var gIsOwner = false, gOnGallery = false;

  document.addEventListener("DOMContentLoaded", function () {
    var gear = $("#adminBtn");
    if (!gear) return;
    if (!cloudOn) { gear.style.display = "none"; return; }
    gear.addEventListener("click", openAdmin);
    buildOverlay();
    buildGalleryAdd();
    gOnGallery = !!(document.getElementById("gallery") && document.getElementById("gallery").classList.contains("active"));
    // reflect signed-in state on the gear + the Gallery add button
    Cloud.onAuth(function (user) {
      gear.classList.toggle("owner-on", !!user);
      gIsOwner = !!user; updateGalleryFab();
      // top-left shows the app logo to visitors, the owner's avatar once signed in
      var logo = document.querySelector(".top-logo"), av = document.getElementById("topAvatar");
      if (logo) logo.hidden = !!user;
      if (av) av.hidden = !user;
    });
    document.addEventListener("pagechange", function (e) { gOnGallery = e.detail === "gallery"; updateGalleryFab(); });
    // (shared links are handled by the Favorites page's ➕ dialog)
  });

  /* ---------- Gallery page: owner "+" to add artwork ---------- */
  var gFab, gModal, gArtUpload = null, gArtParsed = null;
  function updateGalleryFab() { if (gFab) gFab.hidden = !(gIsOwner && gOnGallery); }
  function buildGalleryAdd() {
    gFab = document.createElement("button");
    gFab.id = "galleryFab"; gFab.className = "fav-fab"; gFab.hidden = true;
    gFab.setAttribute("aria-label", "Add artwork");
    gFab.innerHTML = iconRaw("plus");
    document.body.appendChild(gFab);
    gFab.addEventListener("click", openArtModal);
  }
  function buildArtModal() {
    if (gModal) return;
    gModal = document.createElement("div");
    gModal.className = "admin-overlay"; gModal.hidden = true;
    gModal.innerHTML =
      '<div class="admin-panel"><div class="admin-head"><b>Add artwork</b>' +
      '<button class="icon-btn" id="gaClose">' + iconRaw("close") + "</button></div>" +
      '<div style="padding:16px"><div class="admin-section">' +
      '<label class="tool-chip">Choose photo<input id="gaFile" type="file" accept="image/*" hidden /></label>' +
      '<div class="fav-add-row" style="margin-top:8px"><input id="gaUrl" class="gb-input" placeholder="…or paste an image / page link" />' +
      '<button class="tool-chip" id="gaFetch">Preview</button></div>' +
      '<img id="gaPrev" class="admin-art-prev" hidden alt="preview" />' +
      field("gaTitle", "Title", "") +
      field("gaDesc", "Description", "") +
      '<div class="fav-add-row">' + field("gaYear", "Year", "") + field("gaMedium", "Medium", "") + "</div>" +
      area("gaStory", "The story behind it (optional)", "") +
      field("gaTags", "Tags (comma separated)", "") +
      '<label class="admin-label">Shape<select id="gaAspect" class="gb-input"><option value="square">Square</option><option value="tall">Tall</option><option value="wide">Wide</option></select></label>' +
      '<button class="tool-chip primary" id="gaAdd">Add artwork</button>' +
      "</div></div></div>";
    document.body.appendChild(gModal);
    gModal.addEventListener("click", function (e) { if (e.target === gModal) gModal.hidden = true; });
    $("#gaClose").addEventListener("click", function () { gModal.hidden = true; });
    $("#gaFile").addEventListener("change", async function (e) {
      var f = e.target.files[0]; if (!f) return;
      gArtUpload = await resizeToDataURL(f, 1000, 0.82); gArtParsed = null;
      var pv = $("#gaPrev"); pv.src = gArtUpload; pv.hidden = false;
    });
    $("#gaFetch").addEventListener("click", async function () {
      var url = $("#gaUrl").value.trim(); if (!url) { toast("Paste a link first"); return; }
      var btn = $("#gaFetch"); btn.textContent = "…"; btn.disabled = true;
      var img = "";
      if (/\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i.test(url)) img = url;
      else {
        try { var r = await fetch("/api/grab?url=" + encodeURIComponent(url)); if (r.ok) { var j = await r.json(); if (j.image) img = j.image; if (j.title && !$("#gaTitle").value) $("#gaTitle").value = j.title; } } catch (_) {}
        if (!img) { var meta = await parseLink(url); if (meta && meta.image) img = meta.image; if (meta && meta.title && !$("#gaTitle").value) $("#gaTitle").value = meta.title; }
      }
      btn.textContent = "Preview"; btn.disabled = false;
      if (img) { gArtParsed = img; gArtUpload = null; var pv = $("#gaPrev"); pv.src = img; pv.hidden = false; toast("Image ready!"); }
      else toast("Couldn't get an image — upload one instead");
    });
    $("#gaAdd").addEventListener("click", async function () {
      var img = gArtUpload || gArtParsed;
      if (!img) { toast("Add a photo or paste a link first"); return; }
      var btn = $("#gaAdd"); btn.textContent = "Adding…"; btn.disabled = true;
      var art = {
        title: $("#gaTitle").value.trim() || "Untitled",
        desc: $("#gaDesc").value.trim(),
        year: $("#gaYear").value.trim(),
        medium: $("#gaMedium").value.trim(),
        story: $("#gaStory").value.trim(),
        tags: $("#gaTags").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean),
        aspect: $("#gaAspect").value, img: img,
      };
      var id = await Cloud.addArtwork(art);
      btn.textContent = "Add artwork"; btn.disabled = false;
      if (id) { toast("Artwork added!"); gModal.hidden = true; await refreshArtworks(); }
      else toast("Add failed: " + (window.Cloud.lastError || "check Firestore rules"));
    });
  }
  function openArtModal() {
    buildArtModal();
    gArtUpload = null; gArtParsed = null;
    ["gaTitle", "gaDesc", "gaYear", "gaMedium", "gaStory", "gaTags", "gaUrl"].forEach(function (id) { var el = $("#" + id); if (el) el.value = ""; });
    $("#gaPrev").hidden = true;
    gModal.hidden = false;
  }

  /* ---------- image resize ---------- */
  function resizeToDataURL(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var cw = Math.max(1, Math.round(img.width * scale));
        var ch = Math.max(1, Math.round(img.height * scale));
        var c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        c.getContext("2d").drawImage(img, 0, 0, cw, ch);
        var q = quality, out = c.toDataURL("image/jpeg", q);
        while (out.length > 900000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("bad image")); };
      img.src = url;
    });
  }

  /* ---------- overlay DOM ---------- */
  var overlay, newAvatar = null, newCover = null, newArtImg = null, newFavImg = null, parsedImg = null, parsedArtImg = null, pendingShare = null;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "admin-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="admin-panel">' +
      '<div class="admin-head"><b id="adminTitle">Manage</b>' +
      '<button class="icon-btn" id="adminClose">' + iconRaw("close") + "</button></div>" +
      '<div id="adminBody"></div>' +
      "</div>";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    $("#adminClose").addEventListener("click", close);
  }
  function iconRaw(n) { return (window.ICONS && ICONS[n]) || ""; }
  function close() { overlay.hidden = true; }

  function openAdmin() {
    overlay.hidden = false;
    if (Cloud.isOwner()) showPanel(); else showLogin();
  }

  /* ---------- login ---------- */
  function showLogin() {
    $("#adminTitle").textContent = "Owner sign in";
    $("#adminBody").innerHTML =
      '<p class="page-sub">Sign in to manage your portfolio.</p>' +
      '<div class="admin-form">' +
      '<input id="adEmail" class="gb-input" type="email" placeholder="Email" autocomplete="username" />' +
      '<input id="adPass" class="gb-input" type="password" placeholder="Password" autocomplete="current-password" />' +
      '<button class="tool-chip primary" id="adLogin">Sign in</button>' +
      '<div id="adErr" class="admin-err"></div>' +
      "</div>";
    $("#adLogin").addEventListener("click", doLogin);
    $("#adPass").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  }
  async function doLogin() {
    var email = $("#adEmail").value.trim(), pass = $("#adPass").value;
    if (!email || !pass) { $("#adErr").textContent = "Enter email and password."; return; }
    $("#adLogin").textContent = "Signing in…";
    var res = await Cloud.signIn(email, pass);
    if (res.ok) { showPanel(); toast("Signed in"); }
    else { $("#adErr").textContent = "Sign-in failed: " + res.error; $("#adLogin").textContent = "Sign in"; }
  }

  /* ---------- panel ---------- */
  async function showPanel() {
    $("#adminTitle").textContent = "Manage";
    $("#adminBody").innerHTML = '<p class="page-sub">Loading…</p>';
    var prof = (await Cloud.getProfile()) || {};
    var cfg = window.CONFIG || {};
    var obs = cfg.obsession || {};
    var avatar = prof.avatar || cfg.avatar || "assets/img/avatar.svg";
    newAvatar = null; newArtImg = null;

    $("#adminBody").innerHTML =
      // ---- profile ----
      '<div class="admin-section"><h3>Profile</h3>' +
      '<div class="admin-avatar-row"><img id="adAvatarPrev" class="admin-avatar-prev" src="' + avatar + '" alt="avatar" />' +
      '<label class="tool-chip">Change photo<input id="adAvatarFile" type="file" accept="image/*" hidden /></label></div>' +
      '<label class="tool-chip">Cover image (home banner)<input id="adCoverFile" type="file" accept="image/*" hidden /></label>' +
      '<img id="adCoverPrev" class="admin-art-prev" ' + (prof.cover ? 'src="' + escAttr(prof.cover) + '"' : "hidden") + ' alt="cover" />' +
      field("adName", "Name", prof.name || cfg.name || "") +
      field("adTagline", "Tagline", prof.tagline != null ? prof.tagline : (cfg.tagline || "")) +
      field("adSiteTitle", "Site title (top bar)", prof.siteTitle || cfg.siteTitle || "") +
      field("adGalleryTitle", "Gallery heading", prof.galleryTitle || cfg.galleryTitle || "") +
      field("adMusic", "Background music (YouTube playlist link)", prof.music != null ? prof.music : (cfg.music || "")) +
      field("adObsT", "Obsessed with (title)", prof.obsessionTitle != null ? prof.obsessionTitle : (obs.title || "")) +
      field("adObsN", "Obsessed with (note)", prof.obsessionNote != null ? prof.obsessionNote : (obs.note || "")) +
      area("adAbout", "About me (one line per paragraph)", (prof.about && prof.about.length ? prof.about : (cfg.about || [])).join("\n")) +
      area("adFacts", "Fun facts (one per line)", (prof.funFacts && prof.funFacts.length ? prof.funFacts : (cfg.funFacts || [])).join("\n")) +
      area("adBadges", "Home badges (one per line)", (prof.badges && prof.badges.length ? prof.badges : (cfg.badges || [])).join("\n")) +
      '<button class="tool-chip primary" id="adSaveProfile">Save profile</button>' +
      "</div>" +
      // ---- manage artworks (add via the Gallery page's + button) ----
      '<div class="admin-section"><h3>My artworks</h3>' +
      '<p class="page-sub" style="margin:0 0 10px">Add new artwork with the <b>+</b> button on the Gallery page.</p>' +
      '<div id="adArtList" class="admin-art-list"></div></div>' +
      // ---- manage favorites (add via the Faves page's + button) ----
      '<div class="admin-section"><h3>My favorites</h3>' +
      '<p class="page-sub" style="margin:0 0 10px">Add new favorites with the <b>+</b> button on the Faves page.</p>' +
      '<div id="adFavList" class="admin-art-list"></div></div>' +
      // ---- sign out ----
      '<button class="tool-chip" id="adSignOut">Sign out</button>';

    // avatar picker
    $("#adAvatarFile").addEventListener("change", async function (e) {
      var f = e.target.files[0]; if (!f) return;
      newAvatar = await resizeToDataURL(f, 400, 0.85);
      $("#adAvatarPrev").src = newAvatar;
    });
    // cover picker
    $("#adCoverFile").addEventListener("change", async function (e) {
      var f = e.target.files[0]; if (!f) return;
      newCover = await resizeToDataURL(f, 1200, 0.82);
      var pv = $("#adCoverPrev"); pv.src = newCover; pv.hidden = false;
    });
    $("#adSaveProfile").addEventListener("click", saveProfile);
    $("#adSignOut").addEventListener("click", async function () { await Cloud.signOutOwner(); close(); toast("Signed out"); });
    renderArtList();
    renderFavList();
  }

  /* ---------- link preview (paste a URL, auto-grab image + title) ---------- */
  async function parseLink(url) {
    try {
      var r = await fetch("https://api.microlink.io/?url=" + encodeURIComponent(url) + "&audio=false&video=false");
      var j = await r.json();
      if (j && j.status === "success" && j.data) {
        var d = j.data;
        return { image: (d.image && d.image.url) || (d.logo && d.logo.url) || "", title: d.title || "", desc: d.description || "" };
      }
    } catch (e) { console.warn("[fav] parse:", e.message || e); }
    return null;
  }
  // shared so the Favorites page can offer inline "add" too
  window.parseLinkPreview = parseLink;
  async function fetchPreview() {
    var url = $("#adFavUrl").value.trim();
    if (!url) { toast("Paste a link first"); return; }
    var btn = $("#adFavFetch"); btn.textContent = "Loading…"; btn.disabled = true;
    var meta = await parseLink(url);
    btn.textContent = "Get preview"; btn.disabled = false;
    if (meta) {
      parsedImg = meta.image || null;
      if (meta.image) { var prev = $("#adFavPrev"); prev.src = meta.image; prev.hidden = false; }
      if (meta.title && !$("#adFavTitle").value) $("#adFavTitle").value = meta.title;
      if (meta.desc && !$("#adFavNote").value) $("#adFavNote").value = meta.desc.slice(0, 120);
      toast(meta.image ? "Preview loaded!" : "No image found — you can still save it");
    } else {
      toast("Couldn't read that link — you can still save it, or upload an image");
    }
  }

  function field(id, label, val) {
    return '<label class="admin-label">' + label + '<input id="' + id + '" class="gb-input" value="' + escAttr(val) + '" /></label>';
  }
  function area(id, label, val) {
    return '<label class="admin-label">' + label + '<textarea id="' + id + '" class="gb-input" rows="3">' + escHtml(val) + "</textarea></label>";
  }
  function escAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function escHtml(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function lines(v) { return v.split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }

  async function saveProfile() {
    var btn = $("#adSaveProfile"); btn.textContent = "Saving…";
    var prof = {
      name: $("#adName").value.trim(),
      tagline: $("#adTagline").value.trim(),
      siteTitle: $("#adSiteTitle").value.trim(),
      galleryTitle: $("#adGalleryTitle").value.trim(),
      obsessionTitle: $("#adObsT").value.trim(),
      obsessionNote: $("#adObsN").value.trim(),
      about: lines($("#adAbout").value),
      funFacts: lines($("#adFacts").value),
      badges: lines($("#adBadges").value),
      music: $("#adMusic").value.trim(),
    };
    if (newAvatar) prof.avatar = newAvatar;
    if (newCover) prof.cover = newCover;
    var ok = await Cloud.saveProfile(prof);
    btn.textContent = "Save profile";
    if (ok) {
      if (window.applyProfile) applyProfile(Object.assign({ avatar: $("#adAvatarPrev").src, cover: ($("#adCoverPrev").hidden ? "" : $("#adCoverPrev").src) }, prof));
      toast("Profile saved!");
    }
    else toast("Save failed: " + (window.Cloud.lastError || "check Firestore rules"));
  }

  async function addArtwork() {
    var img = newArtImg || parsedArtImg;
    if (!img) { toast("Add a photo or paste a link first"); return; }
    var btn = $("#adAddArt"); btn.textContent = "Adding…";
    var art = {
      title: $("#adArtTitle").value.trim() || "Untitled",
      desc: $("#adArtDesc").value.trim(),
      tags: $("#adArtTags").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean),
      aspect: $("#adArtAspect").value,
      img: img,
    };
    var id = await Cloud.addArtwork(art);
    btn.textContent = "Add artwork";
    if (id) {
      toast("Artwork added!");
      newArtImg = null; parsedArtImg = null; $("#adArtPrev").hidden = true;
      $("#adArtUrl").value = ""; $("#adArtTitle").value = ""; $("#adArtDesc").value = ""; $("#adArtTags").value = "";
      await refreshArtworks();
    } else toast("Add failed: " + (window.Cloud.lastError || "check Firestore rules"));
  }

  async function renderArtList() {
    var host = $("#adArtList");
    var list = (await Cloud.listArtworks()) || [];
    if (!list.length) { host.innerHTML = '<p class="gb-empty">No uploaded artworks yet.</p>'; return; }
    host.innerHTML = list.map(function (a) {
      return '<div class="admin-art-item"><img src="' + a.img + '" alt="" />' +
        '<span>' + escHtml(a.title) + "</span>" +
        '<button class="mini-btn" data-del="' + a.id + '">' + iconRaw("trash") + "</button></div>";
    }).join("");
    host.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        if (!confirm("Delete this artwork?")) return;
        await Cloud.deleteArtwork(b.getAttribute("data-del"));
        await refreshArtworks();
        toast("Deleted");
      });
    });
  }

  async function refreshArtworks() {
    await renderArtList();
    var list = await Cloud.listArtworks();
    if (window.reloadGallery) reloadGallery(list && list.length ? list : null);
  }

  /* ---------- favorites ---------- */
  async function addFavorite() {
    var url = $("#adFavUrl").value.trim();
    var imgUrl = $("#adFavImgUrl").value.trim();
    var img = newFavImg || parsedImg || imgUrl || "";
    if (!url && !img) { toast("Add a link or an image"); return; }
    var btn = $("#adAddFav"); btn.textContent = "Adding…";
    var fav = {
      url: url,
      title: $("#adFavTitle").value.trim(),
      note: $("#adFavNote").value.trim(),
      img: img,
    };
    var id = await Cloud.addFavorite(fav);
    btn.textContent = "Add favorite";
    if (id) {
      toast("Saved to favorites!");
      newFavImg = null; parsedImg = null; $("#adFavPrev").hidden = true;
      $("#adFavUrl").value = ""; $("#adFavTitle").value = ""; $("#adFavNote").value = ""; $("#adFavImgUrl").value = "";
      await refreshFaves();
    } else toast("Add failed: " + (window.Cloud.lastError || "check Firestore rules"));
  }

  async function renderFavList() {
    var host = $("#adFavList");
    if (!host) return;
    var list = (await Cloud.listFavorites()) || [];
    if (!list.length) { host.innerHTML = '<p class="gb-empty">No favorites yet.</p>'; return; }
    host.innerHTML = list.map(function (f) {
      var thumb = f.img ? '<img src="' + f.img.replace(/"/g, "&quot;") + '" alt="" referrerpolicy="no-referrer" />' : '<span class="fave-thumb-ph">' + iconRaw("link") + "</span>";
      return '<div class="admin-art-item">' + thumb + '<span>' + escHtml(f.title || f.url || "favorite") + "</span>" +
        '<button class="mini-btn" data-delfav="' + f.id + '">' + iconRaw("trash") + "</button></div>";
    }).join("");
    host.querySelectorAll("[data-delfav]").forEach(function (b) {
      b.addEventListener("click", async function () {
        if (!confirm("Remove this favorite?")) return;
        await Cloud.deleteFavorite(b.getAttribute("data-delfav"));
        await refreshFaves();
        toast("Removed");
      });
    });
  }

  async function refreshFaves() {
    await renderFavList();
    var list = await Cloud.listFavorites();
    if (window.reloadFaves) reloadFaves(list || []);
  }
})();
