"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const params = new URLSearchParams(window.location.search);
  const exerciseId = params.get("id");

  const exercisePanel = document.getElementById("exercisePanel");
  const errorPanel = document.getElementById("errorPanel");
  const errorMessage = document.getElementById("errorMessage");

  if (!exerciseId) {
    errorMessage.textContent = "Invalid exercise link.";
    errorPanel.hidden = false;
    return;
  }

  const auth = await requireAuth(supabase, ["student"]);
  if (!auth) return;

  const { session, profile } = auth;
  setupHeader(supabase, profile);

  const scoreRing = document.getElementById("scoreRing");
  const scoreValue = document.getElementById("scoreValue");
  const gradingResult = document.getElementById("gradingResult");
  const graderStatus = document.getElementById("graderStatus");
  const studentAnswer = document.getElementById("studentAnswer");
  const submitBtn = document.getElementById("submitBtn");

  const { data: exercises, error: loadError } = await supabase.rpc("get_exercise_prompt", {
    exercise_uuid: exerciseId,
  });

  if (loadError || !exercises?.length) {
    errorMessage.textContent = loadError?.message || "Exercise not found.";
    errorPanel.hidden = false;
    return;
  }

  const exercise = exercises[0];
  document.getElementById("exerciseTitle").textContent = exercise.title;
  document.getElementById("exercisePrompt").textContent = exercise.prompt;
  exercisePanel.hidden = false;

  const { data: existing } = await supabase
    .from("submissions")
    .select("answer, score, missing_words, extra_words")
    .eq("exercise_id", exerciseId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (existing) {
    studentAnswer.value = existing.answer;
    setScoreRing(scoreRing, scoreValue, existing.score);
    showGradingResult(gradingResult, {
      score: existing.score,
      missing: existing.missing_words,
      extra: existing.extra_words,
    });
    graderStatus.textContent = `Submitted — Score: ${existing.score}/100. Resubmitting will update your score.`;
  }

  document.getElementById("retryBtn").addEventListener("click", () => {
    studentAnswer.value = "";
    gradingResult.hidden = true;
    scoreRing.dataset.tier = "";
    scoreRing.style.setProperty("--score-pct", 0);
    scoreValue.textContent = "—";
    graderStatus.textContent = "Capitalization, punctuation, and extra spacing do not affect the score.";
    studentAnswer.focus();
  });

  submitBtn.addEventListener("click", async () => {
    const answer = studentAnswer.value.trim();
    if (!answer) {
      graderStatus.textContent = "Please enter your answer before submitting.";
      studentAnswer.focus();
      return;
    }

    submitBtn.disabled = true;
    graderStatus.textContent = "Grading...";

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ exerciseId, answer }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not submit answer");
      }

      setScoreRing(scoreRing, scoreValue, result.score);
      showGradingResult(gradingResult, result);
      graderStatus.textContent = `Score: ${result.score}/100 — Submission saved.`;
    } catch (err) {
      graderStatus.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
});
