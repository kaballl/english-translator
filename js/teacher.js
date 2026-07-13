"use strict";

let activeExerciseId = null;

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const auth = await requireAuth(supabase, ["teacher"]);
  if (!auth) return;

  const { profile } = auth;
  setupHeader(supabase, profile);

  const createForm = document.getElementById("createExerciseForm");
  const createError = document.getElementById("createError");
  const sharePanel = document.getElementById("sharePanel");
  const shareLink = document.getElementById("shareLink");
  const exerciseList = document.getElementById("exerciseList");
  const submissionsPanel = document.getElementById("submissionsPanel");
  const submissionsList = document.getElementById("submissionsList");
  const submissionsTitle = document.getElementById("submissionsTitle");

  document.getElementById("refreshBtn").addEventListener("click", loadExercises);
  document.getElementById("closeSubmissionsBtn").addEventListener("click", () => {
    submissionsPanel.hidden = true;
    activeExerciseId = null;
  });

  document.getElementById("copyLinkBtn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(shareLink.value);
    document.getElementById("copyLinkBtn").textContent = "Copied!";
    setTimeout(() => {
      document.getElementById("copyLinkBtn").textContent = "Copy";
    }, 2000);
  });

  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    createError.hidden = true;

    const title = document.getElementById("exerciseTitle").value.trim();
    const prompt = document.getElementById("exercisePrompt").value.trim();
    const answer_key = document.getElementById("exerciseAnswer").value.trim();

    const { data, error } = await supabase
      .from("exercises")
      .insert({ teacher_id: profile.id, title, prompt, answer_key })
      .select("id")
      .single();

    if (error) {
      createError.textContent = error.message;
      createError.hidden = false;
      return;
    }

    createForm.reset();
    const link = `${window.location.origin}/exercise.html?id=${data.id}`;
    shareLink.value = link;
    sharePanel.hidden = false;
    await loadExercises();
  });

  exerciseList.addEventListener("click", async (e) => {
    const viewBtn = e.target.closest("[data-view-submissions]");
    const copyBtn = e.target.closest("[data-copy-link]");

    if (copyBtn) {
      const id = copyBtn.dataset.copyLink;
      const link = `${window.location.origin}/exercise.html?id=${id}`;
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy link"; }, 2000);
      return;
    }

    if (viewBtn) {
      const id = viewBtn.dataset.viewSubmissions;
      const title = viewBtn.dataset.title;
      await loadSubmissions(supabase, id, title);
    }
  });

  async function loadExercises() {
    exerciseList.innerHTML = '<p class="empty-state">Loading...</p>';

    const { data, error } = await supabase
      .from("exercises")
      .select("id, title, prompt, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      exerciseList.innerHTML = `<p class="empty-state error-text">${escapeHtml(error.message)}</p>`;
      return;
    }

    if (!data.length) {
      exerciseList.innerHTML = '<p class="empty-state">No exercises yet. Create your first one above.</p>';
      return;
    }

    exerciseList.innerHTML = data
      .map(
        (ex) => `
        <article class="exercise-item">
          <div>
            <h3>${escapeHtml(ex.title)}</h3>
            <p class="exercise-prompt">${escapeHtml(ex.prompt.slice(0, 120))}${ex.prompt.length > 120 ? "…" : ""}</p>
            <time>${formatDate(ex.created_at)}</time>
          </div>
          <div class="exercise-item-actions">
            <button class="reset-button" type="button" data-copy-link="${ex.id}">Copy link</button>
            <button class="translate-button" type="button" data-view-submissions="${ex.id}" data-title="${escapeHtml(ex.title)}">View submissions</button>
          </div>
        </article>`
      )
      .join("");
  }

  async function loadSubmissions(supabase, exerciseId, title) {
    activeExerciseId = exerciseId;
    submissionsPanel.hidden = false;
    submissionsTitle.textContent = `Submissions: ${title}`;
    submissionsList.innerHTML = '<p class="empty-state">Loading...</p>';

    const { data, error } = await supabase.rpc("get_exercise_submissions", {
      exercise_uuid: exerciseId,
    });

    if (error) {
      submissionsList.innerHTML = `<p class="empty-state error-text">${escapeHtml(error.message)}</p>`;
      return;
    }

    if (!data.length) {
      submissionsList.innerHTML = '<p class="empty-state">No submissions yet.</p>';
      return;
    }

    submissionsList.innerHTML = data
      .map(
        (s) => `
        <article class="submission-item">
          <div class="submission-header">
            <strong>${escapeHtml(s.student_name || s.student_email)}</strong>
            <span class="score-pill">${s.score}/100</span>
          </div>
          <p class="submission-answer">${escapeHtml(s.answer)}</p>
          <div class="submission-meta">
            <span>Missing: ${renderWordList(s.missing_words)}</span>
            <span>Extra: ${renderWordList(s.extra_words)}</span>
          </div>
          <time>${formatDate(s.submitted_at)}</time>
        </article>`
      )
      .join("");
  }

  await loadExercises();
});
