/* ===== Fun quiz: about the artist + ORV ===== */
(function () {
  // Edit these questions any time! correct = index of the right answer.
  const QUESTIONS = [
    {
      q: "What is my favorite book right now?",
      options: ["Omniscient Reader's Viewpoint", "Harry Potter", "Diary of a Wimpy Kid", "Percy Jackson"],
      correct: 0,
    },
    {
      q: "Which of these do I NOT make?",
      options: ["Watercolor", "Printmaking", "Skateboards", "Clay sculpture"],
      correct: 2,
    },
    {
      q: "What kind of stories do I love most?",
      options: ["Cookbooks", "Manga", "Dictionaries", "Newspapers"],
      correct: 1,
    },
    {
      q: "What's my favorite color theme?",
      options: ["Red", "Purple", "Green", "Grey"],
      correct: 2,
    },
    {
      q: "In ORV, the main character is a devoted...",
      options: ["Chef", "Reader", "Pilot", "Farmer"],
      correct: 1,
    },
  ];

  let idx = 0, score = 0, locked = false;

  function render() {
    const area = $("#quizArea");
    if (idx >= QUESTIONS.length) return renderResult();
    const item = QUESTIONS[idx];
    locked = false;
    area.innerHTML = `
      <div class="card">
        <div class="quiz-progress">Question ${idx + 1} of ${QUESTIONS.length} · Score ${score}</div>
        <div class="quiz-q">${item.q}</div>
        <div class="quiz-opts">
          ${item.options.map((o, i) => `<button class="quiz-opt" data-i="${i}">${o}</button>`).join("")}
        </div>
      </div>`;
    $$(".quiz-opt", area).forEach((btn) => {
      btn.addEventListener("click", () => choose(+btn.dataset.i, item, btn));
    });
  }

  function choose(i, item, btn) {
    if (locked) return;
    locked = true;
    const opts = $$(".quiz-opt");
    opts[item.correct].classList.add("correct");
    if (i === item.correct) {
      score++;
      toast("Correct!");
    } else {
      btn.classList.add("wrong");
      toast("Oops!");
    }
    opts.forEach((o) => (o.disabled = true));
    setTimeout(() => { idx++; render(); }, 900);
  }

  function renderResult() {
    const area = $("#quizArea");
    const total = QUESTIONS.length;
    let msg = "Nice try!";
    if (score === total) msg = "Perfect score! You know me so well!";
    else if (score >= total - 1) msg = "Almost perfect!";
    else if (score >= total / 2) msg = "Pretty good!";
    area.innerHTML = `
      <div class="card quiz-result">
        <div class="quiz-score">${score}/${total}</div>
        <p>${msg}</p>
        <div class="doodle-tools" style="justify-content:center">
          <button class="tool-chip" id="quizRetry">${icon("retry")} Try again</button>
          <button class="tool-chip primary" id="quizShare">${icon("share")} Share result</button>
        </div>
      </div>`;
    $("#quizRetry").addEventListener("click", () => { idx = 0; score = 0; render(); });
    $("#quizShare").addEventListener("click", () =>
      shareContent("I took the art quiz!", `I scored ${score}/${total} on the art & ORV quiz! Can you beat me? 🎨`)
    );
  }

  document.addEventListener("DOMContentLoaded", render);
})();
