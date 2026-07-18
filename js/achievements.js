/* =============================================================
   Achievements & badge system  🏅
   Badges upgrade through 4 tiers: Bronze -> Silver -> Gold -> Diamond.
   Progress is tracked from what you do in the app (quiz game, likes,
   doodles, messages) and saved in this browser (localStorage).
   ============================================================= */
(function () {
  var STATS_KEY = "achvStats";

  var DEFAULTS = {
    gamesPlayed: 0,
    totalCorrect: 0,
    bestCombo: 0,
    bestScore: 0,
    perfectGames: 0,
    hardWins: 0,
    likesGiven: 0,
    doodlesSaved: 0,
    messagesLeft: 0,
  };

  // Tier 0 = locked. 1..4 = Bronze/Silver/Gold/Diamond.
  var TIERS = ["Locked", "Bronze", "Silver", "Gold", "Diamond"];
  var TIER_COLORS = {
    0: "#b9c3ac", // locked (muted sage)
    1: "#c08457", // bronze
    2: "#a9b4b8", // silver
    3: "#d6b24a", // gold
    4: "#7fd8e0", // diamond (cyan family)
  };

  // Each badge maps a stat to 4 ascending thresholds (bronze..diamond).
  var BADGES = [
    { id: "scholar",   name: "Story Scholar",   icon: "scholar", stat: "totalCorrect", desc: "Answer quiz questions correctly.",      tiers: [10, 30, 75, 150] },
    { id: "combo",     name: "Combo Master",    icon: "flame",   stat: "bestCombo",    desc: "Build a big answer streak in one game.", tiers: [3, 5, 8, 12] },
    { id: "scorer",    name: "High Scorer",     icon: "target",  stat: "bestScore",    desc: "Reach a high score in a single game.",  tiers: [150, 400, 800, 1500] },
    { id: "regular",   name: "True Fan",        icon: "retry",   stat: "gamesPlayed",  desc: "Play the story challenge.",             tiers: [1, 5, 15, 30] },
    { id: "legend",    name: "Legend Slayer",   icon: "crown",   stat: "hardWins",     desc: "Finish games on Legend difficulty.",    tiers: [1, 3, 7, 15] },
    { id: "perfect",   name: "Perfectionist",   icon: "gem",     stat: "perfectGames", desc: "Finish a game with no wrong answers.",  tiers: [1, 3, 6, 10] },
    { id: "artlover",  name: "Art Lover",       icon: "heart-filled", stat: "likesGiven",   desc: "Like the artworks you enjoy.",     tiers: [3, 10, 25, 50] },
    { id: "artist",    name: "Little Artist",   icon: "brush",   stat: "doodlesSaved", desc: "Save doodles from the doodle pad.",     tiers: [1, 3, 8, 20] },
    { id: "welcomer",  name: "Welcomer",        icon: "chat",    stat: "messagesLeft", desc: "Leave messages in the guestbook.",      tiers: [1, 3, 8, 20] },
  ];

  function getStats() {
    var s = store.get(STATS_KEY, {});
    var out = {};
    for (var k in DEFAULTS) out[k] = typeof s[k] === "number" ? s[k] : DEFAULTS[k];
    return out;
  }
  function setStats(s) { store.set(STATS_KEY, s); }

  function tierIndex(badge, stats) {
    var v = stats[badge.stat] || 0;
    var t = 0;
    for (var i = 0; i < badge.tiers.length; i++) if (v >= badge.tiers[i]) t = i + 1;
    return t; // 0..4
  }

  function progressInfo(badge, stats) {
    var v = stats[badge.stat] || 0;
    var t = tierIndex(badge, stats);
    if (t >= 4) return { tier: 4, pct: 100, have: v, next: null };
    var prev = t === 0 ? 0 : badge.tiers[t - 1];
    var next = badge.tiers[t];
    var pct = Math.max(0, Math.min(100, Math.round(((v - prev) / (next - prev)) * 100)));
    return { tier: t, pct: pct, have: v, next: next, remaining: Math.max(0, next - v) };
  }

  function snapshotTiers() {
    var stats = getStats();
    var m = {};
    BADGES.forEach(function (b) { m[b.id] = tierIndex(b, stats); });
    return m;
  }

  function diffUpgrades(before) {
    var stats = getStats();
    var ups = [];
    BADGES.forEach(function (b) {
      var after = tierIndex(b, stats);
      if (after > (before[b.id] || 0)) {
        ups.push({ id: b.id, name: b.name, icon: b.icon, from: before[b.id] || 0, to: after });
      }
    });
    return ups;
  }

  /* ---- public: record a finished quiz game ---- */
  function recordGame(r) {
    var before = snapshotTiers();
    var s = getStats();
    s.gamesPlayed += 1;
    s.totalCorrect += r.correct || 0;
    s.bestCombo = Math.max(s.bestCombo, r.bestCombo || 0);
    s.bestScore = Math.max(s.bestScore, r.score || 0);
    if (r.perfect) s.perfectGames += 1;
    if (r.difficulty === "hard" && r.finished) s.hardWins += 1;
    setStats(s);
    var ups = diffUpgrades(before);
    refreshIfVisible();
    return ups;
  }

  /* ---- public: bump a simple counter (likes / doodles / messages) ---- */
  function bump(stat, n) {
    var before = snapshotTiers();
    var s = getStats();
    if (typeof s[stat] !== "number") s[stat] = 0;
    s[stat] += n || 1;
    setStats(s);
    var ups = diffUpgrades(before);
    if (ups.length) announce(ups);
    refreshIfVisible();
    return ups;
  }

  /* ---- celebratory overlay for new / upgraded badges ---- */
  function announce(ups) {
    if (!ups || !ups.length) return;
    var overlay = document.createElement("div");
    overlay.className = "achv-pop";
    overlay.innerHTML =
      '<div class="achv-pop-card">' +
      '<div class="achv-pop-title">' + icon("sparkle") + " Badge Unlocked!</div>" +
      ups
        .map(function (u) {
          return (
            '<div class="achv-pop-row">' +
            '<span class="badge-medal tier-' + u.to + '">' + icon(u.icon) + "</span>" +
            '<div><div class="achv-pop-name">' + u.name + "</div>" +
            '<div class="achv-pop-tier" style="color:' + TIER_COLORS[u.to] + '">' +
            (u.from === 0 ? "Earned" : "Upgraded to") + " " + TIERS[u.to] + "</div></div></div>"
          );
        })
        .join("") +
      '<button class="tool-chip primary achv-pop-close">Nice!</button>' +
      "</div>";
    document.body.appendChild(overlay);
    var close = function () { overlay.remove(); };
    overlay.querySelector(".achv-pop-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }

  /* ---- render the Achievements page ---- */
  function render() {
    var host = document.getElementById("achvContent");
    if (!host) return;
    var stats = getStats();

    var earned = 0, totalTierPts = 0;
    BADGES.forEach(function (b) { var t = tierIndex(b, stats); if (t > 0) earned++; totalTierPts += t; });
    var maxPts = BADGES.length * 4;
    var rank = rankName(totalTierPts, maxPts);

    var summary =
      '<div class="card achv-summary">' +
      '<div class="achv-rank-badge">' + icon("trophy") + "</div>" +
      '<div class="achv-rank-name">' + rank + "</div>" +
      '<div class="achv-summary-stats">' +
      '<span>' + earned + "/" + BADGES.length + " badges</span>" +
      "<span>Best score " + stats.bestScore + "</span>" +
      "<span>Best streak " + stats.bestCombo + "</span>" +
      "</div></div>";

    var grid =
      '<div class="badge-grid">' +
      BADGES.map(function (b) {
        var p = progressInfo(b, stats);
        var locked = p.tier === 0;
        var tierLabel = locked ? "Locked" : TIERS[p.tier];
        var barColor = TIER_COLORS[Math.min(4, p.tier + (locked ? 1 : 0))] || TIER_COLORS[1];
        var nextText = p.tier >= 4
          ? "Maxed out!"
          : "Next " + TIERS[p.tier + 1] + ": " + p.remaining + " more";
        return (
          '<div class="badge-card ' + (locked ? "locked" : "") + '">' +
          '<span class="badge-medal tier-' + p.tier + '">' +
          (locked ? icon("lock") : icon(b.icon)) +
          '<span class="tier-dots">' + tierDots(p.tier) + "</span>" +
          "</span>" +
          '<div class="badge-name">' + b.name + "</div>" +
          '<div class="badge-tier" style="color:' + (locked ? "var(--muted)" : TIER_COLORS[p.tier]) + '">' + tierLabel + "</div>" +
          '<div class="badge-desc">' + b.desc + "</div>" +
          '<div class="badge-bar"><span style="width:' + p.pct + "%;background:" + barColor + '"></span></div>' +
          '<div class="badge-next">' + nextText + "</div>" +
          "</div>"
        );
      }).join("") +
      "</div>";

    host.innerHTML = summary + grid;
  }

  function tierDots(t) {
    var s = "";
    for (var i = 1; i <= 4; i++) s += '<i class="' + (i <= t ? "on tier-" + t : "") + '"></i>';
    return s;
  }

  function rankName(pts, max) {
    var r = pts / max;
    if (pts === 0) return "New Challenger";
    if (r < 0.2) return "Rising Reader";
    if (r < 0.4) return "Story Explorer";
    if (r < 0.6) return "Devoted Fan";
    if (r < 0.8) return "Star Collector";
    if (r < 1) return "Master of Scenarios";
    return "Ultimate Legend";
  }

  function refreshIfVisible() {
    var page = document.getElementById("about");
    if (page && page.classList.contains("active")) render();
  }

  window.Achievements = {
    recordGame: recordGame,
    bump: bump,
    announce: announce,
    render: render,
    BADGES: BADGES,
    TIERS: TIERS,
    TIER_COLORS: TIER_COLORS,
  };

  document.addEventListener("DOMContentLoaded", function () {
    render();
    document.addEventListener("pagechange", function (e) {
      if (e.detail === "about") render();
    });
  });
})();
