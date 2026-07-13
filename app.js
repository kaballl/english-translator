"use strict";

/* ── DOM refs ───────────────────────────────────────────────── */

const answerKey          = document.getElementById("answerKey");
const answerVisibilityButton = document.getElementById("answerVisibilityButton");
const practicePrompt     = document.getElementById("practicePrompt");
const studentAnswer      = document.getElementById("studentAnswer");
const gradeButton        = document.getElementById("gradeButton");
const resetGradeButton   = document.getElementById("resetGradeButton");
const scoreRing          = document.getElementById("scoreRing");
const scoreValue         = document.getElementById("scoreValue");
const gradingResult      = document.getElementById("gradingResult");
const resultBadge        = document.getElementById("resultBadge");
const resultTitle        = document.getElementById("resultTitle");
const resultMessage      = document.getElementById("resultMessage");
const missingWords       = document.getElementById("missingWords");
const extraWords         = document.getElementById("extraWords");
const graderStatus       = document.getElementById("graderStatus");

/* ── Text normalization ───────────────────────────────────────── */

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const normalized = normalize(text);
  return normalized ? normalized.split(" ") : [];
}

function wordFrequency(words) {
  const freq = new Map();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

/* ── Grading logic ────────────────────────────────────────────── */

function gradeTranslation(modelText, studentText) {
  const modelWords   = tokenize(modelText);
  const studentWords = tokenize(studentText);

  if (modelWords.length === 0) {
    return {
      score: studentWords.length === 0 ? 100 : 0,
      missing: [],
      extra: studentWords,
    };
  }

  const modelFreq   = wordFrequency(modelWords);
  const studentFreq = wordFrequency(studentWords);

  const missing = [];
  const extra   = [];
  let matched   = 0;

  for (const [word, count] of modelFreq) {
    const studentCount = studentFreq.get(word) || 0;
    const matchCount   = Math.min(count, studentCount);
    matched += matchCount;

    for (let i = 0; i < count - matchCount; i++) {
      missing.push(word);
    }
  }

  for (const [word, count] of studentFreq) {
    const modelCount = modelFreq.get(word) || 0;
    for (let i = 0; i < count - Math.min(count, modelCount); i++) {
      extra.push(word);
    }
  }

  const score = Math.round((matched / modelWords.length) * 100);

  return { score, missing, extra };
}

function getTier(score) {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

const TIER_LABELS = {
  excellent: { badge: "Excellent", title: "Outstanding work!", message: "Your translation closely matches the model answer." },
  good:      { badge: "Good",      title: "Well done!",         message: "Most key words are correct. Review the missing ones below." },
  fair:      { badge: "Fair",      title: "Keep practicing!",   message: "You got some words right, but several are still missing." },
  poor:      { badge: "Needs work", title: "Don't give up!",  message: "Compare your answer with the model and try again." },
};

/* ── UI helpers ───────────────────────────────────────────────── */

function renderWordList(words) {
  if (words.length === 0) {
    return "—";
  }
  return words
    .map((w) => `<span class="word-tag">${escapeHtml(w)}</span>`)
    .join("");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setScoreRing(score) {
  const tier = getTier(score);
  scoreRing.dataset.tier = tier;
  scoreRing.style.setProperty("--score-pct", score);
  scoreValue.textContent = score;
}

function showResult(result) {
  const tier  = getTier(result.score);
  const label = TIER_LABELS[tier];

  gradingResult.dataset.tier = tier;
  gradingResult.hidden = false;

  resultBadge.textContent   = label.badge;
  resultTitle.textContent   = label.title;
  resultMessage.textContent = label.message;
  missingWords.innerHTML    = renderWordList(result.missing);
  extraWords.innerHTML      = renderWordList(result.extra);
}

function hideResult() {
  gradingResult.hidden = true;
  scoreRing.dataset.tier = "";
  scoreRing.style.setProperty("--score-pct", 0);
  scoreValue.textContent = "—";
}

function setStatus(message) {
  graderStatus.textContent = message;
}

/* ── Answer visibility toggle ─────────────────────────────────── */

let answerHidden = false;

function updateAnswerVisibility() {
  answerKey.classList.toggle("is-hidden", answerHidden);
  answerVisibilityButton.textContent = answerHidden ? "Show answer" : "Hide answer";
  answerVisibilityButton.setAttribute("aria-pressed", String(answerHidden));
  answerVisibilityButton.setAttribute(
    "aria-label",
    answerHidden ? "Show model answer" : "Hide model answer"
  );
}

answerVisibilityButton.addEventListener("click", () => {
  answerHidden = !answerHidden;
  updateAnswerVisibility();
});

/* ── Grade & reset ────────────────────────────────────────────── */

function handleGrade() {
  const model   = answerKey.value;
  const student = studentAnswer.value;

  if (!normalize(model)) {
    setStatus("Please enter a model answer before grading.");
    answerKey.focus();
    return;
  }

  if (!normalize(student)) {
    setStatus("Please enter the student's answer before grading.");
    studentAnswer.focus();
    return;
  }

  const result = gradeTranslation(model, student);
  setScoreRing(result.score);
  showResult(result);
  setStatus(`Score: ${result.score}/100 — Capitalization, punctuation, and extra spacing are ignored.`);
}

function handleReset() {
  studentAnswer.value = "";
  practicePrompt.value = "";
  hideResult();
  setStatus("Capitalization, punctuation, and extra spacing do not affect the score.");
  studentAnswer.focus();
}

gradeButton.addEventListener("click", handleGrade);
resetGradeButton.addEventListener("click", handleReset);

/* ── Keyboard shortcut: Ctrl/Cmd + Enter to grade ─────────────── */

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    handleGrade();
  }
});
