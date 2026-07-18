/* =============================================================
   Owner "Manage" panel  🔧
   Lets the signed-in owner upload an avatar, edit profile text, and
   add/delete artworks — all from the phone, saved to the cloud.
   Only appears when cloud is configured; writing requires owner sign-in.
   Images are resized/compressed in the browser before upload.
   ============================================================= */
(function () {
  var cloudOn = !!(window.Cloud && Cloud.enabled);

  document.addEventListener("DOMContentLoaded", function () {
    var gear = $("#adminBtn");
    if (!gear) return;
    if (!cloudOn) { gear.style.display = "none"; return; }
    gear.addEventListener("click", openAdmin);
    buildOverlay();
    // reflect signed-in state on the gear
    Cloud.onAuth(function (user) {
      gear.classList.toggle("owner-on", !!user);
    });
  });

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
  var overlay, newAvatar = null, newArtImg = null;

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
      field("adName", "Name", prof.name || cfg.name || "") +
      field("adTagline", "Tagline", prof.tagline != null ? prof.tagline : (cfg.tagline || "")) +
      field("adObsT", "Obsessed with (title)", prof.obsessionTitle != null ? prof.obsessionTitle : (obs.title || "")) +
      field("adObsN", "Obsessed with (note)", prof.obsessionNote != null ? prof.obsessionNote : (obs.note || "")) +
      area("adAbout", "About me (one line per paragraph)", (prof.about && prof.about.length ? prof.about : (cfg.about || [])).join("\n")) +
      area("adFacts", "Fun facts (one per line)", (prof.funFacts && prof.funFacts.length ? prof.funFacts : (cfg.funFacts || [])).join("\n")) +
      '<button class="tool-chip primary" id="adSaveProfile">Save profile</button>' +
      "</div>" +
      // ---- add artwork ----
      '<div class="admin-section"><h3>Add artwork</h3>' +
      '<label class="tool-chip">Choose photo<input id="adArtFile" type="file" accept="image/*" hidden /></label>' +
      '<img id="adArtPrev" class="admin-art-prev" hidden alt="preview" />' +
      field("adArtTitle", "Title", "") +
      field("adArtDesc", "Description", "") +
      field("adArtTags", "Tags (comma separated)", "") +
      '<label class="admin-label">Shape' +
      '<select id="adArtAspect" class="gb-input"><option value="square">Square</option><option value="tall">Tall</option><option value="wide">Wide</option></select></label>' +
      '<button class="tool-chip primary" id="adAddArt">Add artwork</button>' +
      "</div>" +
      // ---- existing artworks ----
      '<div class="admin-section"><h3>My artworks</h3><div id="adArtList" class="admin-art-list"></div></div>' +
      // ---- sign out ----
      '<button class="tool-chip" id="adSignOut">Sign out</button>';

    // avatar picker
    $("#adAvatarFile").addEventListener("change", async function (e) {
      var f = e.target.files[0]; if (!f) return;
      newAvatar = await resizeToDataURL(f, 400, 0.85);
      $("#adAvatarPrev").src = newAvatar;
    });
    // artwork picker
    $("#adArtFile").addEventListener("change", async function (e) {
      var f = e.target.files[0]; if (!f) return;
      newArtImg = await resizeToDataURL(f, 1000, 0.82);
      var prev = $("#adArtPrev"); prev.src = newArtImg; prev.hidden = false;
    });
    $("#adSaveProfile").addEventListener("click", saveProfile);
    $("#adAddArt").addEventListener("click", addArtwork);
    $("#adSignOut").addEventListener("click", async function () { await Cloud.signOutOwner(); close(); toast("Signed out"); });
    renderArtList();
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
      obsessionTitle: $("#adObsT").value.trim(),
      obsessionNote: $("#adObsN").value.trim(),
      about: lines($("#adAbout").value),
      funFacts: lines($("#adFacts").value),
    };
    if (newAvatar) prof.avatar = newAvatar;
    var ok = await Cloud.saveProfile(prof);
    btn.textContent = "Save profile";
    if (ok) { if (window.applyProfile) applyProfile(Object.assign({ avatar: $("#adAvatarPrev").src }, prof)); toast("Profile saved!"); }
    else toast("Save failed — check sign-in");
  }

  async function addArtwork() {
    if (!newArtImg) { toast("Choose a photo first"); return; }
    var btn = $("#adAddArt"); btn.textContent = "Adding…";
    var art = {
      title: $("#adArtTitle").value.trim() || "Untitled",
      desc: $("#adArtDesc").value.trim(),
      tags: $("#adArtTags").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean),
      aspect: $("#adArtAspect").value,
      img: newArtImg,
    };
    var id = await Cloud.addArtwork(art);
    btn.textContent = "Add artwork";
    if (id) {
      toast("Artwork added!");
      // reset form
      newArtImg = null; $("#adArtPrev").hidden = true; $("#adArtTitle").value = ""; $("#adArtDesc").value = ""; $("#adArtTags").value = "";
      await refreshArtworks();
    } else toast("Add failed — check sign-in");
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
})();
