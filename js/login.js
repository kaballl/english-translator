"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || "";

  const session = await getSession(supabase);
  if (session) {
    const profile = await getProfile(supabase, session.user.id);
    if (returnTo) {
      window.location.href = returnTo;
      return;
    }
    window.location.href = profile.role === "teacher" ? "teacher.html" : "student.html";
    return;
  }

  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const signupCard = document.getElementById("signupCard");
  const loginCard = loginForm.closest(".auth-card");
  const loginError = document.getElementById("loginError");
  const signupError = document.getElementById("signupError");
  const signupSuccess = document.getElementById("signupSuccess");

  document.getElementById("showSignup").addEventListener("click", () => {
    loginCard.hidden = true;
    signupCard.hidden = false;
  });

  document.getElementById("showLogin").addEventListener("click", () => {
    signupCard.hidden = true;
    loginCard.hidden = false;
  });

  if (params.get("mode") === "signup") {
    loginCard.hidden = true;
    signupCard.hidden = false;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.hidden = true;

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      loginError.textContent = error.message;
      loginError.hidden = false;
      return;
    }

    const profile = await getProfile(supabase, data.user.id);
    if (returnTo) {
      window.location.href = returnTo;
      return;
    }
    window.location.href = profile.role === "teacher" ? "teacher.html" : "student.html";
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupError.hidden = true;
    signupSuccess.hidden = true;

    const fullName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const role = signupForm.querySelector('input[name="role"]:checked').value;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      signupError.textContent = error.message;
      signupError.hidden = false;
      return;
    }

    signupSuccess.textContent =
      "Đăng ký thành công! Kiểm tra email để xác nhận (nếu bật), sau đó đăng nhập.";
    signupSuccess.hidden = false;
    signupForm.reset();
  });
});
