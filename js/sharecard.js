/* ===== Beautiful share card =====
   Turns one artwork into a polished, ready-to-post image (great for WeChat
   Moments / 朋友圈): the picture in a soft frame, the artist's avatar + name,
   a warm tagline, and a QR code back to the site. Rendered on a canvas and
   handed to the share sheet (or downloaded). ===== */
(function () {
  var W = 1080, H = 1350;
  var C = { bg1: "#dbe6cf", bg2: "#b9c4a8", deep: "#2f5d55", mid: "#60925e", cream: "#faf8ee", tan: "#cfaf92", blush: "#d9b3b3", cyan: "#c8f5f9", ink: "#2c3f2a", muted: "#6b7f63" };

  function load(src) {
    return new Promise(function (res) {
      if (!src) { res(null); return; }
      var im = new Image();
      im.crossOrigin = "anonymous"; im.referrerPolicy = "no-referrer";
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function star(ctx, cx, cy, s, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = color; ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = (Math.PI / 4) * i, r = (i % 2 === 0) ? s : s * 0.42;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // profile bits from the live page (owner-edited) with config fallback
  function profile() {
    var cfg = window.CONFIG || {};
    var nameEl = document.getElementById("heroName");
    var tagEl = document.getElementById("heroTagline");
    var avEl = document.getElementById("avatarImg");
    return {
      name: (nameEl && nameEl.textContent) || cfg.name || "Linrose",
      tagline: (tagEl && tagEl.textContent) || cfg.tagline || "Young Artist & Maker",
      avatar: (avEl && avEl.src) || cfg.avatar || "assets/img/avatar.svg",
    };
  }

  window.makeShareCard = async function (imgSrc, title) {
    if (!imgSrc) { toast("No picture to share"); return; }
    toast("Making your share card… ✨");
    var p = profile();
    var art = await load(imgSrc);
    var avatar = await load(p.avatar);
    var qr = await load(window.LINROSE_QR || "");

    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");

    // background
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bg1); g.addColorStop(1, C.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // halftone dots
    ctx.fillStyle = "rgba(96,146,94,0.12)";
    for (var y = 40; y < H; y += 46) for (var x = 40; x < W; x += 46) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    // sparkles
    star(ctx, 120, 210, 26, C.cyan); star(ctx, W - 130, 300, 20, C.tan); star(ctx, W - 90, H - 360, 24, C.blush);

    // main white card
    var m = 70, cardY = 150, cardW = W - m * 2, cardH = H - cardY - 130;
    ctx.save(); ctx.shadowColor = "rgba(47,93,85,0.28)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = C.cream; rr(ctx, m, cardY, cardW, cardH, 46); ctx.fill(); ctx.restore();

    // header: avatar + name + tagline
    var hx = m + 46, hy = cardY + 52, av = 96;
    if (avatar) { ctx.save(); ctx.beginPath(); ctx.arc(hx + av / 2, hy + av / 2, av / 2, 0, 7); ctx.closePath(); ctx.clip(); ctx.drawImage(avatar, hx, hy, av, av); ctx.restore(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(hx + av / 2, hy + av / 2, av / 2, 0, 7); ctx.stroke(); }
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.deep; ctx.font = "bold 54px 'Trebuchet MS', system-ui, sans-serif";
    ctx.fillText(p.name, hx + av + 28, hy + 44);
    ctx.fillStyle = C.muted; ctx.font = "30px 'Trebuchet MS', system-ui, sans-serif";
    ctx.fillText(p.tagline, hx + av + 28, hy + 86);

    // artwork in a rounded frame
    var fx = m + 46, fy = hy + av + 44, fw = cardW - 92, fh = fw; // square frame
    ctx.save(); ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(47,93,85,0.18)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    rr(ctx, fx, fy, fw, fh, 30); ctx.fill(); ctx.restore();
    if (art) {
      ctx.save(); rr(ctx, fx + 12, fy + 12, fw - 24, fh - 24, 22); ctx.clip();
      var iw = fw - 24, ih = fh - 24, ar = art.width / art.height, br = iw / ih, dw, dh, dx, dy;
      if (ar > br) { dh = ih; dw = ih * ar; dx = fx + 12 - (dw - iw) / 2; dy = fy + 12; }
      else { dw = iw; dh = iw / ar; dx = fx + 12; dy = fy + 12 - (dh - ih) / 2; }
      ctx.fillStyle = "#fff"; ctx.fillRect(fx + 12, fy + 12, iw, ih);
      ctx.drawImage(art, dx, dy, dw, dh); ctx.restore();
    }

    // title
    ctx.fillStyle = C.ink; ctx.font = "bold 46px 'Trebuchet MS', system-ui, sans-serif";
    var t = (title || "My artwork").slice(0, 26);
    ctx.fillText(t, fx, fy + fh + 62);
    ctx.fillStyle = C.blush; ctx.font = "38px 'Trebuchet MS', system-ui, sans-serif";
    ctx.fillText("♥ made with love", fx, fy + fh + 108);

    // footer band: QR + site
    var fby = cardY + cardH + 34;
    if (qr) { var qs = 88; ctx.drawImage(qr, m, fby - 20, qs, qs); }
    ctx.fillStyle = C.deep; ctx.font = "bold 40px 'Trebuchet MS', system-ui, sans-serif";
    ctx.fillText("See more art →", m + 110, fby + 22);
    ctx.fillStyle = C.mid; ctx.font = "34px 'Trebuchet MS', system-ui, sans-serif";
    ctx.fillText("linrose.vercel.app", m + 110, fby + 66);

    try {
      if (window.saveCanvasImage) saveCanvasImage(cv, "linrose-card.png");
      else { var a = document.createElement("a"); a.download = "linrose-card.png"; a.href = cv.toDataURL("image/png"); a.click(); }
    } catch (e) { toast("Couldn't make the card (image blocked)"); }
  };
})();
