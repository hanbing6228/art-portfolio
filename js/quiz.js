/* =============================================================
   Story Challenge — a mini quiz game  🎮
   Difficulty levels · countdown timer + speed bonus · combo streak ·
   3 hearts (lives). Feeds the badge/achievement system on game over.

   Edit / add questions freely below. Each question:
     { q: "...", options: ["a","b","c","d"], correct: 0 }
   ============================================================= */
(function () {
  // ---- Question bank, grouped by difficulty ----
  // Tip: mix questions about YOU and about your favorite story.
  var BANK = {
    easy: [
      { q: "In ORV, the hero Kim Dokja is famous for being a devoted…", options: ["Reader", "Chef", "Pilot", "Painter"], correct: 0 },
      { q: "ORV (Omniscient Reader's Viewpoint) is originally a Korean…", options: ["Web novel", "Movie", "Song", "Comic strip"], correct: 0 },
      { q: "The story Kim Dokja loves is about surviving a world that has…", options: ["Turned into a survival game", "Run out of pizza", "Frozen over only", "Gone to sleep"], correct: 0 },
      { q: "At the start, Kim Dokja's favorite web novel had how many real fans?", options: ["Just one — him", "A million", "Exactly ten", "None"], correct: 0 },
      { q: "What is my favorite book right now?", options: ["Omniscient Reader's Viewpoint", "A cookbook", "The phone book", "A map"], correct: 0 },
      { q: "What color theme do I love most?", options: ["Green", "Neon pink", "Grey", "Black"], correct: 0 },
      { q: "Which kind of stories inspire my art the most?", options: ["Manga & webtoons", "Tax forms", "Weather reports", "Menus"], correct: 0 },
    ],
    medium: [
      { q: "Yoo Joonghyuk's special power is that when he dies, he…", options: ["Returns to the past (regresses)", "Turns invisible", "Falls asleep", "Loses his memory forever"], correct: 0 },
      { q: "Han Sooyoung is best known as a…", options: ["Writer", "Doctor", "Farmer", "Singer"], correct: 0 },
      { q: "The powerful beings who sponsor humans are called…", options: ["Constellations", "Wizards", "Robots", "Coaches"], correct: 0 },
      { q: "Who runs the deadly 'scenarios'?", options: ["Dokkaebi (goblins)", "Teachers", "Chefs", "Librarians"], correct: 0 },
      { q: "The in-story novel is titled 'Three Ways to Survive in a ___'.", options: ["Ruined World", "Big City", "Small Town", "Toy Store"], correct: 0 },
      { q: "Which of these do I make? (pick the real one)", options: ["Printmaking", "Rocket engines", "Skyscrapers", "Submarines"], correct: 0 },
    ],
    hard: [
      { q: "Yoo Joonghyuk is famous as a…", options: ["Regressor", "Time-freezer", "Mind-reader", "Shape-shifter"], correct: 0 },
      { q: "Constellations sponsor incarnations mainly in exchange for…", options: ["Entertainment / stories", "Money", "Homework", "Food"], correct: 0 },
      { q: "The apocalypse is structured as a series of…", options: ["Scenarios", "Exams", "Concerts", "Races"], correct: 0 },
      { q: "How many times had Yoo Joonghyuk regressed (his famous count)?", options: ["1863rd life", "3rd life", "50th life", "999th life"], correct: 0 },
      { q: "Kim Dokja's greatest 'weapon' throughout the story is his…", options: ["Knowledge of the plot", "Super strength", "Invisibility", "Fire magic"], correct: 0 },
      { q: "ORV was written by the author duo known as…", options: ["sing-Shong", "tls123 only", "Anonymous", "A single dokkaebi"], correct: 0 },
    ],
  };

  var LEVELS = [
    { id: "easy",   name: "Rookie",  sub: "Warm-up questions",     mult: 1,   time: 18, icon: "leaf" },
    { id: "medium", name: "Adept",   sub: "For real fans",         mult: 1.5, time: 14, icon: "sparkle" },
    { id: "hard",   name: "Legend",  sub: "Only true experts win", mult: 2,   time: 11, icon: "crown" },
  ];

  var ROUND_SIZE = 6;   // questions per game
  var MAX_LIVES = 3;
  var BASE_POINTS = 60; // per correct answer (before speed & combo)

  // ---- game state ----
  var state = null;
  var timerId = null;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function bestKey(level) { return "quizBest_" + level; }

  /* ---------- Start screen ---------- */
  function renderStart() {
    stopTimer();
    var area = $("#quizArea");
    area.innerHTML =
      '<div class="card quiz-start">' +
      '<p class="quiz-intro">Pick a difficulty and test how well you know the story you love. ' +
      "Answer fast for bonus points, keep your streak alive, and don't lose all 3 hearts!</p>" +
      '<div class="level-list">' +
      LEVELS.map(function (lv) {
        var best = store.get(bestKey(lv.id), 0);
        return (
          '<button class="level-btn" data-level="' + lv.id + '">' +
          '<span class="level-ic">' + icon(lv.icon) + "</span>" +
          '<span class="level-text"><span class="level-name">' + lv.name + "</span>" +
          '<span class="level-sub">' + lv.sub + " · x" + lv.mult + " points</span></span>" +
          '<span class="level-best">Best<br><b>' + best + "</b></span>" +
          "</button>"
        );
      }).join("") +
      "</div>" +
      '<button class="tool-chip achv-link" id="goAchv">' + icon("achievements") + " See my badges</button>" +
      "</div>";
    $$(".level-btn", area).forEach(function (btn) {
      btn.addEventListener("click", function () { startGame(btn.dataset.level); });
    });
    var goAchv = $("#goAchv");
    if (goAchv) goAchv.addEventListener("click", function () { goTo("achievements"); });
  }

  /* ---------- Game ---------- */
  function startGame(levelId) {
    var level = LEVELS.filter(function (l) { return l.id === levelId; })[0] || LEVELS[0];
    var pool = shuffle(BANK[levelId] || []);
    state = {
      level: level,
      questions: pool.slice(0, Math.min(ROUND_SIZE, pool.length)),
      idx: 0,
      score: 0,
      correct: 0,
      lives: MAX_LIVES,
      combo: 0,
      bestCombo: 0,
      locked: false,
      timeLeft: 0,
    };
    renderQuestion();
  }

  function renderQuestion() {
    stopTimer();
    if (!state) return;
    if (state.idx >= state.questions.length || state.lives <= 0) return renderResult();
    var item = state.questions[state.idx];
    state.locked = false;
    state.timeLeft = state.level.time;

    var area = $("#quizArea");
    area.innerHTML =
      '<div class="game-hud">' +
      '<span class="hud-lives" id="hudLives"></span>' +
      '<span class="hud-combo" id="hudCombo"></span>' +
      '<span class="hud-score">' + icon("trophy") + ' <b id="hudScore">' + state.score + "</b></span>" +
      "</div>" +
      '<div class="timer-bar"><span id="timerFill"></span></div>' +
      '<div class="card">' +
      '<div class="quiz-progress">' + state.level.name + " · Question " + (state.idx + 1) + " of " + state.questions.length + "</div>" +
      '<div class="quiz-q">' + item.q + "</div>" +
      '<div class="quiz-opts">' +
      item.options.map(function (o, i) { return '<button class="quiz-opt" data-i="' + i + '">' + o + "</button>"; }).join("") +
      "</div></div>";

    updateHud();
    $$(".quiz-opt", area).forEach(function (btn) {
      btn.addEventListener("click", function () { choose(+btn.dataset.i, item, btn); });
    });
    startTimer();
  }

  function updateHud() {
    var lives = "";
    for (var i = 0; i < MAX_LIVES; i++) lives += icon(i < state.lives ? "heart-filled" : "heart");
    $("#hudLives").innerHTML = lives;
    var combo = $("#hudCombo");
    if (state.combo >= 2) combo.innerHTML = icon("flame") + " <b>x" + state.combo + "</b>";
    else combo.innerHTML = "";
    $("#hudScore").textContent = state.score;
  }

  function startTimer() {
    var fill = $("#timerFill");
    var total = state.level.time;
    var tick = function () {
      state.timeLeft -= 0.1;
      if (fill) {
        var pct = Math.max(0, (state.timeLeft / total) * 100);
        fill.style.width = pct + "%";
        fill.style.background = pct < 30 ? "var(--blush)" : "var(--mid)";
      }
      if (state.timeLeft <= 0) {
        stopTimer();
        timeUp();
      }
    };
    if (fill) { fill.style.width = "100%"; fill.style.background = "var(--mid)"; }
    timerId = setInterval(tick, 100);
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

  function timeUp() {
    if (state.locked) return;
    state.locked = true;
    var item = state.questions[state.idx];
    var opts = $$(".quiz-opt");
    if (opts[item.correct]) opts[item.correct].classList.add("correct");
    opts.forEach(function (o) { o.disabled = true; });
    loseLife();
    state.combo = 0;
    toast("Time's up!");
    updateHud();
    nextSoon();
  }

  function choose(i, item, btn) {
    if (state.locked) return;
    state.locked = true;
    stopTimer();
    var opts = $$(".quiz-opt");
    opts.forEach(function (o) { o.disabled = true; });
    opts[item.correct].classList.add("correct");

    if (i === item.correct) {
      state.correct += 1;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      // scoring: base * level mult, + speed bonus, + combo bonus
      var speed = Math.round((state.timeLeft / state.level.time) * 40); // up to +40
      var comboBonus = (state.combo - 1) * 15;
      var gained = Math.round((BASE_POINTS + speed + comboBonus) * state.level.mult);
      state.score += gained;
      toast("+" + gained + (state.combo >= 2 ? "  x" + state.combo + " combo!" : ""));
    } else {
      btn.classList.add("wrong");
      state.combo = 0;
      loseLife();
      toast("Oops!");
    }
    updateHud();
    nextSoon();
  }

  function loseLife() {
    state.lives = Math.max(0, state.lives - 1);
  }

  function nextSoon() {
    setTimeout(function () {
      if (!state) return;
      state.idx += 1;
      renderQuestion();
    }, 950);
  }

  /* ---------- Result + achievements ---------- */
  function renderResult() {
    stopTimer();
    var area = $("#quizArea");
    var finished = state.lives > 0; // completed all questions without dying
    var perfect = finished && state.correct === state.questions.length;
    var total = state.questions.length;

    // save best score for this level
    var bk = bestKey(state.level.id);
    var prevBest = store.get(bk, 0);
    var newBest = state.score > prevBest;
    if (newBest) store.set(bk, state.score);

    // feed achievements
    var upgrades = [];
    if (window.Achievements) {
      upgrades = Achievements.recordGame({
        correct: state.correct,
        total: total,
        bestCombo: state.bestCombo,
        score: state.score,
        difficulty: state.level.id,
        finished: finished,
        perfect: perfect,
      });
    }

    var headline = perfect ? "Perfect run!" : finished ? "Challenge complete!" : "Out of hearts!";

    area.innerHTML =
      '<div class="card quiz-result">' +
      '<div class="result-icon">' + icon(perfect ? "gem" : finished ? "trophy" : "flame") + "</div>" +
      '<div class="result-headline">' + headline + "</div>" +
      '<div class="quiz-score">' + state.score + "</div>" +
      '<div class="result-sub">' + (newBest ? icon("sparkle") + " New best on " + state.level.name + "!" : state.level.name + " · Best " + prevBest) + "</div>" +
      '<div class="result-stats">' +
      "<span>" + icon("check") + " " + state.correct + "/" + total + "</span>" +
      "<span>" + icon("flame") + " x" + state.bestCombo + " streak</span>" +
      "<span>" + icon(finished ? "heart-filled" : "heart") + " " + state.lives + " left</span>" +
      "</div>" +
      (upgrades.length ? renderUpgrades(upgrades) : "") +
      '<div class="doodle-tools" style="justify-content:center;margin-top:14px">' +
      '<button class="tool-chip" id="quizRetry">' + icon("retry") + " Play again</button>" +
      '<button class="tool-chip" id="quizChange">' + icon("play") + " Change level</button>" +
      '<button class="tool-chip primary" id="quizShare">' + icon("share") + " Share</button>" +
      "</div></div>";

    $("#quizRetry").addEventListener("click", function () { startGame(state.level.id); });
    $("#quizChange").addEventListener("click", renderStart);
    $("#quizShare").addEventListener("click", function () {
      shareContent("Story Challenge", "I scored " + state.score + " on " + state.level.name + " in the Story Challenge! Can you beat me?");
    });
  }

  function renderUpgrades(ups) {
    return (
      '<div class="result-badges">' +
      '<div class="result-badges-title">' + icon("achievements") + " Badges earned!</div>" +
      ups
        .map(function (u) {
          return (
            '<div class="result-badge-row">' +
            '<span class="badge-medal tier-' + u.to + '">' + icon(u.icon) + "</span>" +
            "<span>" + u.name + " · <b>" + (window.Achievements ? Achievements.TIERS[u.to] : "") + "</b></span>" +
            "</div>"
          );
        })
        .join("") +
      '<button class="tool-chip achv-link" id="resAchv">' + icon("achievements") + " View all badges</button>" +
      "</div>"
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderStart();
    // "View all badges" button is created dynamically in results
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("#resAchv");
      if (t) goTo("achievements");
    });
    // leaving the quiz page stops any running timer
    document.addEventListener("pagechange", function (e) {
      if (e.detail !== "quiz") stopTimer();
    });
  });
})();
