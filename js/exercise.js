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
    errorMessage.textContent = "Link bài tập không hợp lệ.";
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
    errorMessage.textContent = loadError?.message || "Không tìm thấy bài tập.";
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
    graderStatus.textContent = `Đã nộp — Điểm: ${existing.score}/100. Nộp lại sẽ cập nhật điểm.`;
  }

  document.getElementById("retryBtn").addEventListener("click", () => {
    studentAnswer.value = "";
    gradingResult.hidden = true;
    scoreRing.dataset.tier = "";
    scoreRing.style.setProperty("--score-pct", 0);
    scoreValue.textContent = "—";
    graderStatus.textContent = "Chữ hoa, dấu câu và khoảng trắng thừa không ảnh hưởng điểm.";
    studentAnswer.focus();
  });

  submitBtn.addEventListener("click", async () => {
    const answer = studentAnswer.value.trim();
    if (!answer) {
      graderStatus.textContent = "Vui lòng nhập bài làm trước khi nộp.";
      studentAnswer.focus();
      return;
    }

    submitBtn.disabled = true;
    graderStatus.textContent = "Đang chấm điểm...";

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
        throw new Error(result.error || "Không thể nộp bài");
      }

      setScoreRing(scoreRing, scoreValue, result.score);
      showGradingResult(gradingResult, result);
      graderStatus.textContent = `Điểm: ${result.score}/100 — Đã lưu bài nộp.`;
    } catch (err) {
      graderStatus.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
});
