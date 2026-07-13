"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const auth = await requireAuth(supabase, ["student"]);
  if (!auth) return;

  const { profile } = auth;
  setupHeader(supabase, profile);

  const historyList = document.getElementById("historyList");

  document.getElementById("openLinkForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = document.getElementById("exerciseLinkInput").value.trim();
    try {
      const url = new URL(raw, window.location.origin);
      const id = new URLSearchParams(url.search).get("id");
      if (!id) throw new Error("Link does not contain an exercise ID");
      window.location.href = `exercise.html?id=${id}`;
    } catch {
      historyList.insertAdjacentHTML(
        "afterbegin",
        '<p class="form-error">Invalid link. Please use the link your teacher sent.</p>'
      );
    }
  });

  const { data, error } = await supabase.rpc("get_student_submissions");

  if (error) {
    historyList.innerHTML = `<p class="empty-state error-text">${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data.length) {
    historyList.innerHTML = '<p class="empty-state">No submissions yet. Open a link from your teacher.</p>';
    return;
  }

  historyList.innerHTML = data
    .map((item) => {
      const title = item.title || "Exercise";
      return `
      <article class="submission-item">
        <div class="submission-header">
          <strong>${escapeHtml(title)}</strong>
          <span class="score-pill">${item.score}/100</span>
        </div>
        <a class="link-button" href="exercise.html?id=${item.exercise_id}">Review exercise</a>
        <time>${formatDate(item.submitted_at)}</time>
      </article>`;
    })
    .join("");
});
