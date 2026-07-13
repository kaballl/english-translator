"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const session = await getSession(supabase);
  if (!session) return;

  const profile = await getProfile(supabase, session.user.id);
  const ctaRow = document.getElementById("ctaRow");

  ctaRow.innerHTML = `
    <a class="translate-button" href="${profile.role === "teacher" ? "teacher.html" : "student.html"}">
      Vào ${profile.role === "teacher" ? "bảng giáo viên" : "trang học viên"}
    </a>
    <button class="reset-button cta-secondary" id="homeSignOut" type="button">Đăng xuất</button>
  `;

  document.getElementById("homeSignOut").addEventListener("click", () => signOut(supabase));
});
