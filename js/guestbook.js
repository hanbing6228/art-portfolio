/* ===== Live chat (About card + floating drawer) + presence + reactions =====
   Cloud on: real-time chat everyone sees instantly, an online count, and
   tap-to-float reactions. A floating chat button opens the same chat anywhere.
   Cloud off: a simple this-device message list. ===== */
(function () {
  var KEY = "guestbook";
  var REACTIONS = ["heart-filled", "star", "sparkle", "flame"];
  var latest = [];

  function getLocal() { return store.get(KEY, []); }
  function saveLocal(list) { store.set(KEY, list); }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return ""; } }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function bubble(m) {
    return '<div class="gb-item"><div class="gb-who">' + esc(m.name) +
      ' <span style="font-weight:normal;color:var(--muted)">· ' + esc(m.date || "") + "</span></div>" +
      '<div class="gb-body">' + esc(m.msg) + "</div></div>";
  }
  function renderInto(id, chatMode) {
    var list = document.getElementById(id);
    if (!list) return;
    if (!latest.length) { list.innerHTML = '<p class="gb-empty">' + (chatMode ? "Say hi! 👋 Be the first to chat." : "No messages yet — be the first!") + "</p>"; return; }
    list.innerHTML = latest.map(bubble).join("");
    if (chatMode) list.scrollTop = list.scrollHeight;
  }
  function renderAll() { renderInto("guestbookList", true); renderInto("chatDrawerList", true); }
  function setMessages(msgs) { latest = msgs; renderAll(); }

  async function post(nameEl, msgEl) {
    var name = (nameEl && nameEl.value || "").trim() || "Anonymous";
    var msg = (msgEl && msgEl.value || "").trim();
    if (!msg) { toast("Type a message first"); return; }
    var cloudOn = window.Cloud && Cloud.enabled;
    var saved = false;
    if (cloudOn) saved = await Cloud.addGuestbook(name, msg);
    if (!saved && !cloudOn) {
      var m = getLocal(); m.push({ name: name, msg: msg, date: fmtDate(Date.now()) }); saveLocal(m);
      setMessages(m.slice());
    } else if (!saved) { toast("Send failed: " + (window.Cloud.lastError || "try again")); return; }
    if (msgEl) msgEl.value = "";
    if (window.Achievements) Achievements.bump("messagesLeft");
  }

  /* ---------- live ---------- */
  function startChat() {
    Cloud.watchChat(function (rows) {
      setMessages(rows.map(function (r) { return { name: r.name, msg: r.message, date: fmtDate(r.created_at) }; }));
    });
  }

  /* ---------- presence ---------- */
  function initPresence() {
    var sid = store.get("sessionId", null);
    if (!sid) { sid = "s" + Math.random().toString(36).slice(2) + Date.now(); store.set("sessionId", sid); }
    Cloud.startPresence(sid);
    Cloud.watchPresence(function (n) {
      ["chatOnline", "cdOnline"].forEach(function (id) { var el = document.getElementById(id); if (el) el.hidden = false; });
      ["chatOnlineN", "cdOnlineN"].forEach(function (id) { var el = document.getElementById(id); if (el) el.textContent = n || 1; });
    });
  }

  /* ---------- reactions ---------- */
  function initReactions() {
    var bar = $("#reactionBar");
    if (bar) {
      bar.innerHTML = REACTIONS.map(function (r) { return '<button class="react-btn" data-r="' + r + '">' + icon(r) + "</button>"; }).join("");
      bar.querySelectorAll(".react-btn").forEach(function (b) { b.addEventListener("click", function () { Cloud.sendReaction(b.dataset.r); }); });
    }
    var layer = document.createElement("div"); layer.className = "reaction-layer"; document.body.appendChild(layer);
    Cloud.watchReactions(function (name) { floatIcon(layer, name); });
  }
  function floatIcon(layer, name) {
    var span = document.createElement("span");
    span.className = "float-react";
    if (window.ICONS && ICONS[name]) span.innerHTML = ICONS[name];
    else { span.textContent = name || ""; span.classList.add("emoji"); }
    span.style.left = (12 + Math.floor(seedFract() * 74)) + "%";
    layer.appendChild(span);
    span.animate(
      [{ transform: "translateY(0) scale(0.6)", opacity: 0 },
       { transform: "translateY(-30vh) scale(1.2)", opacity: 1, offset: 0.3 },
       { transform: "translateY(-85vh) scale(1)", opacity: 0 }],
      { duration: 2600, easing: "ease-out" }
    ).onfinish = function () { span.remove(); };
  }
  var seed = 1; function seedFract() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  /* ---------- floating chat button + drawer ---------- */
  function buildChatUI() {
    var fab = document.createElement("button");
    fab.className = "chat-fab"; fab.setAttribute("aria-label", "Open chat");
    fab.innerHTML = icon("chat");
    document.body.appendChild(fab);

    var drawer = document.createElement("div");
    drawer.className = "chat-drawer"; drawer.hidden = true;
    drawer.innerHTML =
      '<div class="chat-drawer-panel">' +
      '<div class="admin-head"><b>Live chat</b>' +
      '<span class="chat-online" id="cdOnline" hidden><span class="online-dot"></span> <span id="cdOnlineN">1</span> online</span>' +
      '<button class="icon-btn" id="cdClose">' + (window.ICONS ? ICONS.close : "x") + "</button></div>" +
      '<div id="chatDrawerList" class="guestbook-list chat"></div>' +
      '<div class="guestbook-form">' +
      '<input id="cdName" class="gb-input" maxlength="24" placeholder="Your name" />' +
      '<div class="chat-input-row"><input id="cdMsg" class="gb-input" maxlength="200" placeholder="Type a message…" />' +
      '<button id="cdSend" class="tool-chip primary">' + icon("send") + "</button></div></div>" +
      "</div>";
    document.body.appendChild(drawer);

    fab.addEventListener("click", function () { drawer.hidden = false; renderAll(); });
    drawer.addEventListener("click", function (e) { if (e.target === drawer) drawer.hidden = true; });
    document.getElementById("cdClose").addEventListener("click", function () { drawer.hidden = true; });
    document.getElementById("cdSend").addEventListener("click", function () { post(document.getElementById("cdName"), document.getElementById("cdMsg")); });
    document.getElementById("cdMsg").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); post(document.getElementById("cdName"), document.getElementById("cdMsg")); } });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var send = $("#gbSend");
    if (send) send.addEventListener("click", function () { post($("#gbName"), $("#gbMsg")); });
    var msg = $("#gbMsg");
    if (msg) msg.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); post($("#gbName"), $("#gbMsg")); } });

    buildChatUI();

    if (window.Cloud && Cloud.enabled) {
      startChat(); initPresence(); initReactions();
    } else {
      setMessages(getLocal().slice());
    }
  });
})();
