/* ===== Creative Challenges =====
   Replaces the old story quiz. Each challenge is a creative prompt; the kid
   makes something for it, earns coins (server-authoritative when the backend is
   on — it caps the reward and pays each prompt only once), and can put the new
   art straight into their shop. Drives creation + supplies the shop + seeds the
   coin economy. ===== */
(function () {
  var PROMPTS = [
    { id: "sticker", emoji: "✨", title: "Design a sticker", sub: "Something small & cute that would look great as a sticker." },
    { id: "character", emoji: "🐣", title: "Invent a character", sub: "Make up an original little character and give it a name." },
    { id: "card", emoji: "🎂", title: "Birthday card art", sub: "Design the front of a birthday card." },
    { id: "animal", emoji: "🦊", title: "Favorite animal", sub: "Draw your favorite animal your own way." },
    { id: "pattern", emoji: "🌈", title: "Cool pattern", sub: "A repeating pattern for wrapping paper or a tote bag." },
    { id: "food", emoji: "🍩", title: "Yummy food", sub: "Draw a snack or dessert that looks delicious." },
    { id: "logo", emoji: "🏷️", title: "Design a logo", sub: "A fun logo for your very own shop!" },
    { id: "dream", emoji: "🏝️", title: "Dream place", sub: "Draw a place you would love to visit." },
  ];
  var REWARD = 15;

  function cid() { var c = store.get("clientId", null); if (!c) { c = "c" + Math.random().toString(36).slice(2); store.set("clientId", c); } return c; }
  function doneSet() { return store.get("challengesDone", {}); }
  function markDone(id) { var d = doneSet(); d[id] = true; store.set("challengesDone", d); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function resize(file, max, q) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); var s = Math.min(1, max / Math.max(im.width, im.height)); var c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); var o = c.toDataURL("image/jpeg", q); while (o.length > 600000 && q > 0.4) { q -= 0.1; o = c.toDataURL("image/jpeg", q); } res(o); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(); }; im.src = u;
    });
  }

  function render() {
    var host = $("#challengeList"); if (!host) return;
    var done = doneSet();
    host.innerHTML = '<div class="chal-grid">' + PROMPTS.map(function (p) {
      var d = !!done[p.id];
      return '<div class="chal-card' + (d ? " done" : "") + '">' +
        '<div class="chal-emoji">' + p.emoji + "</div>" +
        '<div class="chal-text"><div class="chal-title">' + esc(p.title) + "</div>" +
        '<div class="chal-sub">' + esc(p.sub) + "</div></div>" +
        (d ? '<span class="chal-badge">' + icon("check") + " Done</span>"
           : '<button class="tool-chip primary chal-do" data-id="' + p.id + '"><span class="ic" data-icon="coin"></span> Do it · +' + REWARD + "</button>") +
        "</div>";
    }).join("") + "</div>";
    host.querySelectorAll(".chal-do").forEach(function (b) { b.addEventListener("click", function () { doPrompt(b.dataset.id); }); });
    if (window.renderIcons) renderIcons(host);
  }

  var fileInput = null, activeId = null;
  function doPrompt(id) {
    activeId = id;
    if (!fileInput) {
      fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.accept = "image/*"; fileInput.hidden = true;
      document.body.appendChild(fileInput);
      fileInput.addEventListener("change", onFile);
    }
    fileInput.value = "";
    fileInput.click();
  }
  async function onFile(e) {
    var f = e.target.files[0]; if (!f || !activeId) return;
    var prompt = PROMPTS.filter(function (p) { return p.id === activeId; })[0];
    var img;
    try { img = await resize(f, 900, 0.82); } catch (err) { toast("Couldn't read that picture"); return; }
    toast("Nice work! 🎨");
    var me = cid(), myName = store.get("chatName", "") || "Me";
    var r = window.Cloud && Cloud.claimChallenge ? await Cloud.claimChallenge(me, myName, activeId) : { reward: REWARD };
    if (r && r.reward) toast("Challenge done! +" + r.reward + " coins 🪙");
    else if (r && r.already) toast("You already earned coins for this one 🙂");
    markDone(activeId); render();
    // offer to put the new art straight into the shop
    if (window.Cloud && Cloud.listItem && confirm("Put this in your shop to sell? You can set the price to 10 coins.")) {
      var id = await Cloud.listItem({ sellerId: me, sellerName: myName, title: prompt ? prompt.title : "My art", img: img, price: 10 });
      toast(id ? "Listed in your shop! 🛍️" : "Couldn't list it");
    }
    activeId = null;
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    document.addEventListener("pagechange", function (e) { if (e.detail === "challenges") render(); });
  });
})();
