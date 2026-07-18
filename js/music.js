/* ===== Background music (YouTube playlist) =====
   The owner sets a YouTube playlist (or video) link in the Manage panel.
   Everyone then gets a small floating player: play/pause + prev/next, and the
   playlist loops. Browsers block autoplay with sound, so the first tap starts
   it (we remember the choice for the session). ===== */
(function () {
  var player = null, apiReady = false, apiLoading = false, pending = null;
  var widget = null, playing = false, cur = null;

  function parseYT(url) {
    try {
      var u = new URL(url);
      var list = u.searchParams.get("list");
      if (list) return { type: "playlist", id: list };
      var v = u.searchParams.get("v");
      if (v) return { type: "video", id: v };
      if (/youtu\.be$/.test(u.hostname)) return { type: "video", id: u.pathname.slice(1) };
      var m = u.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/);
      if (m) return { type: "video", id: m[2] };
    } catch (e) {}
    return null;
  }

  window.applyMusic = function (url) {
    url = (url || "").trim();
    var info = url ? parseYT(url) : null;
    if (!info) { if (widget) widget.hidden = true; return; }
    // same source already loaded? just keep it
    if (cur && cur.type === info.type && cur.id === info.id) { if (widget) widget.hidden = false; return; }
    cur = info;
    buildWidget();
    widget.hidden = false;
    loadApi(function () { createOrLoad(info); });
  };

  function loadApi(cb) {
    if (apiReady) { cb(); return; }
    pending = cb;
    if (apiLoading) return;
    apiLoading = true;
    var host = document.createElement("div");
    host.id = "ytHost";
    host.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;";
    document.body.appendChild(host);
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { apiReady = true; if (prev) prev(); if (pending) { var f = pending; pending = null; f(); } };
    var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
  }

  function pvars(info) {
    var pv = { autoplay: 0, controls: 0, modestbranding: 1, playsinline: 1, loop: 1, rel: 0, fs: 0 };
    if (info.type === "playlist") { pv.listType = "playlist"; pv.list = info.id; }
    else { pv.playlist = info.id; }
    return pv;
  }
  function createOrLoad(info) {
    if (!apiReady) return;
    if (!player) {
      player = new YT.Player("ytHost", {
        height: "1", width: "1", playerVars: pvars(info),
        events: { onStateChange: function (e) { playing = (e.data === YT.PlayerState.PLAYING); updateBtn(); } },
      });
    } else {
      try {
        if (info.type === "playlist") player.loadPlaylist({ list: info.id, listType: "playlist" });
        else player.loadVideoById(info.id);
        if (player.setLoop) player.setLoop(true);
        player.pauseVideo();
      } catch (e) {}
    }
  }

  function buildWidget() {
    if (widget) return;
    widget = document.createElement("div");
    widget.className = "music-widget";
    widget.innerHTML =
      '<button class="mus-btn" id="musPrev" aria-label="Previous">' + ic("prev") + "</button>" +
      '<button class="mus-btn mus-play" id="musPlay" aria-label="Play/pause">' + ic("music") + "</button>" +
      '<button class="mus-btn" id="musNext" aria-label="Next">' + ic("next") + "</button>";
    document.body.appendChild(widget);
    widget.querySelector("#musPlay").addEventListener("click", toggle);
    widget.querySelector("#musPrev").addEventListener("click", function () { try { player && player.previousVideo(); } catch (e) {} });
    widget.querySelector("#musNext").addEventListener("click", function () { try { player && player.nextVideo(); } catch (e) {} });
  }
  function ic(n) { return (window.ICONS && ICONS[n]) || ""; }

  function toggle() {
    if (!player) { loadApi(function () { createOrLoad(cur); setTimeout(startPlay, 400); }); return; }
    if (playing) { try { player.pauseVideo(); } catch (e) {} }
    else startPlay();
  }
  function startPlay() { try { player.unMute && player.unMute(); player.playVideo(); } catch (e) {} }

  function updateBtn() {
    if (!widget) return;
    var b = widget.querySelector("#musPlay");
    if (b) b.innerHTML = playing ? ic("pause") : ic("music");
    widget.classList.toggle("playing", playing);
  }
})();
