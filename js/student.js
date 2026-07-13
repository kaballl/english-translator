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
      if (!id) throw new Error("Link không chứa mã bài tập");
      window.location.href = `exercise.html?id=${id}`;
    } catch {
      historyList.insertAdjacentHTML(
        "afterbegin",
        '<p class="form-error">Link không hợp lệ. Hãy dùng link giáo viên gửi.</p>'
      );
    }
  });

  const { data, error } = await supabase.rpc("get_student_submissions");

  if (error) {
    historyList.innerHTML = `<p class="empty-state error-text">${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data.length) {
    historyList.innerHTML = '<p class="empty-state">Chưa có bài nào. Hãy mở link từ giáo viên.</p>';
    return;
  }

  historyList.innerHTML = data
    .map((item) => {
      const title = item.title || "Bài tập";
      return `
      <article class="submission-item">
        <div class="submission-header">
          <strong>${escapeHtml(title)}</strong>
          <span class="score-pill">${item.score}/100</span>
        </div>
        <a class="link-button" href="exercise.html?id=${item.exercise_id}">Xem lại bài</a>
        <time>${formatDate(item.submitted_at)}</time>
      </article>`;
    })
    .join("");
});
