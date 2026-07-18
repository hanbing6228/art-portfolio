/* ===== Guestbook: cloud-shared when configured, else this-device ===== */
(function () {
  var KEY = "guestbook";

  function getLocal() { return store.get(KEY, []); }
  function saveLocal(list) { store.set(KEY, list); }

  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
    catch (e) { return ""; }
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function paint(messages) {
    var list = $("#guestbookList");
    if (!list) return;
    if (!messages.length) {
      list.innerHTML = '<p class="gb-empty">No messages yet — be the first!</p>';
      return;
    }
    list.innerHTML = messages
      .map(function (m) {
        return (
          '<div class="gb-item">' +
          '<div class="gb-who">' + escapeHtml(m.name) +
          ' <span style="font-weight:normal;color:var(--muted)">· ' + escapeHtml(m.date) + "</span></div>" +
          '<div class="gb-body">' + escapeHtml(m.msg) + "</div></div>"
        );
      })
      .join("");
  }

  async function render() {
    if (window.Cloud && Cloud.enabled) {
      var rows = await Cloud.listGuestbook();
      if (rows) {
        paint(rows.map(function (r) { return { name: r.name, msg: r.message, date: fmtDate(r.created_at) }; }));
        return;
      }
      // cloud failed → fall through to local
    }
    paint(getLocal());
  }

  async function add() {
    var name = $("#gbName").value.trim() || "Anonymous";
    var msg = $("#gbMsg").value.trim();
    if (!msg) { toast("Write a message first"); return; }

    var saved = false;
    if (window.Cloud && Cloud.enabled) {
      saved = await Cloud.addGuestbook(name, msg);
    }
    if (!saved) {
      // local fallback (also used when cloud is off)
      var messages = getLocal();
      messages.unshift({ name: name, msg: msg, date: fmtDate(Date.now()) });
      saveLocal(messages);
    }

    $("#gbName").value = "";
    $("#gbMsg").value = "";
    await render();
    toast("Thanks for your message!");
    if (window.Achievements) Achievements.bump("messagesLeft");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var send = $("#gbSend");
    if (send) send.addEventListener("click", add);
    render();
    // refresh from cloud when the About page opens (picks up others' new messages)
    document.addEventListener("pagechange", function (e) {
      if (e.detail === "about" && window.Cloud && Cloud.enabled) render();
    });
  });
})();
