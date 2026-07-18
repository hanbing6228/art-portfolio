/* ===== Live chat + presence + floating reactions =====
   With cloud on, the message wall is a real-time chat (everyone sees new
   messages instantly), shows how many friends are online, and lets people
   tap reactions that float up on everyone's screen. Falls back to a simple
   this-device message list when cloud is off. ===== */
(function () {
  var KEY = "guestbook";
  var REACTIONS = ["heart-filled", "star", "sparkle", "flame"];

  function getLocal() { return store.get(KEY, []); }
  function saveLocal(list) { store.set(KEY, list); }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return ""; } }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  /* ---------- render chat bubbles ---------- */
  function paint(messages, chatMode) {
    var list = $("#guestbookList");
    if (!list) return;
    if (!messages.length) { list.innerHTML = '<p class="gb-empty">' + (chatMode ? "Say hi! 👋 Be the first to chat." : "No messages yet — be the first!") + "</p>"; return; }
    list.innerHTML = messages
      .map(function (m) {
        return '<div class="gb-item"><div class="gb-who">' + esc(m.name) +
          ' <span style="font-weight:normal;color:var(--muted)">· ' + esc(m.date || "") + "</span></div>" +
          '<div class="gb-body">' + esc(m.msg) + "</div></div>";
      })
      .join("");
    if (chatMode) list.scrollTop = list.scrollHeight; // newest at bottom
  }

  /* ---------- live (cloud) ---------- */
  var chatUnsub = null;
  function startChat() {
    if (chatUnsub) return;
    chatUnsub = Cloud.watchChat(function (rows) {
      paint(rows.map(function (r) { return { name: r.name, msg: r.message, date: fmtDate(r.created_at) }; }), true);
    });
  }

  async function add() {
    var name = ($("#gbName").value || "").trim() || "Anonymous";
    var msg = ($("#gbMsg").value || "").trim();
    if (!msg) { toast("Type a message first"); return; }

    var saved = false;
    if (window.Cloud && Cloud.enabled) saved = await Cloud.addGuestbook(name, msg);
    if (!saved && !(window.Cloud && Cloud.enabled)) {
      var messages = getLocal();
      messages.unshift({ name: name, msg: msg, date: fmtDate(Date.now()) });
      saveLocal(messages);
      paint(messages, false);
    } else if (!saved) {
      toast("Send failed: " + (window.Cloud.lastError || "try again"));
      return;
    }
    $("#gbMsg").value = "";
    if (window.Achievements) Achievements.bump("messagesLeft");
  }

  /* ---------- presence ("N online") ---------- */
  function initPresence() {
    var sid = store.get("sessionId", null);
    if (!sid) { sid = "s" + Math.random().toString(36).slice(2) + Date.now(); store.set("sessionId", sid); }
    Cloud.startPresence(sid);
    Cloud.watchPresence(function (n) {
      var el = $("#chatOnline"); if (!el) return;
      el.hidden = false;
      $("#chatOnlineN").textContent = n || 1;
    });
  }

  /* ---------- floating reactions ---------- */
  function initReactions() {
    var bar = $("#reactionBar");
    if (bar) {
      bar.innerHTML = REACTIONS.map(function (r) { return '<button class="react-btn" data-r="' + r + '">' + icon(r) + "</button>"; }).join("");
      bar.querySelectorAll(".react-btn").forEach(function (b) {
        b.addEventListener("click", function () { Cloud.sendReaction(b.dataset.r); });
      });
    }
    var layer = document.createElement("div");
    layer.className = "reaction-layer";
    document.body.appendChild(layer);
    Cloud.watchReactions(function (name) { floatIcon(layer, name); });
  }
  function floatIcon(layer, name) {
    var span = document.createElement("span");
    span.className = "float-react";
    span.innerHTML = (window.ICONS && ICONS[name]) || "";
    span.style.left = (10 + Math.floor((0.15 + 0.7 * fract(name)) * 80)) + "%";
    layer.appendChild(span);
    span.animate(
      [{ transform: "translateY(0) scale(0.6)", opacity: 0 },
       { transform: "translateY(-30vh) scale(1.2)", opacity: 1, offset: 0.3 },
       { transform: "translateY(-85vh) scale(1)", opacity: 0 }],
      { duration: 2600, easing: "ease-out" }
    ).onfinish = function () { span.remove(); };
  }
  var seed = 1;
  function fract() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  document.addEventListener("DOMContentLoaded", function () {
    var send = $("#gbSend");
    if (send) send.addEventListener("click", add);
    var msg = $("#gbMsg");
    if (msg) msg.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });

    if (window.Cloud && Cloud.enabled) {
      startChat();
      initPresence();
      initReactions();
    } else {
      paint(getLocal(), false);
    }
  });
})();
