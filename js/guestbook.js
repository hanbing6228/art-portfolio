/* ===== Guestbook: visitor messages stored on this device ===== */
(function () {
  const KEY = "guestbook";

  function getMessages() { return store.get(KEY, []); }
  function saveMessages(list) { store.set(KEY, list); }

  function render() {
    const list = $("#guestbookList");
    if (!list) return;
    const messages = getMessages();
    if (!messages.length) {
      list.innerHTML = '<p class="gb-empty">No messages yet — be the first!</p>';
      return;
    }
    list.innerHTML = messages
      .map(
        (m) => `
        <div class="gb-item">
          <div class="gb-who">${escapeHtml(m.name)} <span style="font-weight:normal;color:var(--muted)">· ${m.date}</span></div>
          <div class="gb-body">${escapeHtml(m.msg)}</div>
        </div>`
      )
      .join("");
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function add() {
    const name = $("#gbName").value.trim() || "Anonymous";
    const msg = $("#gbMsg").value.trim();
    if (!msg) { toast("Write a message first"); return; }
    const messages = getMessages();
    const date = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    messages.unshift({ name, msg, date });
    saveMessages(messages);
    $("#gbName").value = "";
    $("#gbMsg").value = "";
    render();
    toast("Thanks for your message!");
    if (window.Achievements) Achievements.bump("messagesLeft");
  }

  document.addEventListener("DOMContentLoaded", function () {
    const send = $("#gbSend");
    if (send) send.addEventListener("click", add);
    render();
  });
})();
