"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || "";

  if (await resolveAuthRedirect(supabase, returnTo)) return;

  const loginCard = document.getElementById("loginCard");
  const signupCard = document.getElementById("signupCard");
  const forgotCard = document.getElementById("forgotCard");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const forgotForm = document.getElementById("forgotForm");
  const loginError = document.getElementById("loginError");
  const signupError = document.getElementById("signupError");
  const signupSuccess = document.getElementById("signupSuccess");
  const forgotError = document.getElementById("forgotError");
  const forgotSuccess = document.getElementById("forgotSuccess");
  const loginSuccess = document.getElementById("loginSuccess");

  function showLoginCard() {
    loginCard.hidden = false;
    signupCard.hidden = true;
    forgotCard.hidden = true;
  }

  function showSignupCard() {
    loginCard.hidden = true;
    signupCard.hidden = false;
    forgotCard.hidden = true;
  }

  function showForgotCard() {
    loginCard.hidden = true;
    signupCard.hidden = true;
    forgotCard.hidden = false;
  }

  document.getElementById("showSignup").addEventListener("click", showSignupCard);
  document.getElementById("showLogin").addEventListener("click", showLoginCard);
  document.getElementById("showForgot").addEventListener("click", showForgotCard);
  document.getElementById("backToLogin").addEventListener("click", showLoginCard);

  if (params.get("mode") === "signup") {
    showSignupCard();
  }

  if (params.get("reset") === "success") {
    showLoginCard();
    loginSuccess.textContent = "Password updated. You can sign in now.";
    loginSuccess.hidden = false;
  }

  async function handleGoogleSignIn() {
    loginError.hidden = true;
    signupError.hidden = true;
    try {
      await signInWithGoogle(supabase, returnTo);
    } catch (error) {
      loginError.textContent = error.message;
      loginError.hidden = false;
    }
  }

  document.getElementById("googleSignInBtn").addEventListener("click", handleGoogleSignIn);
  document.getElementById("googleSignUpBtn").addEventListener("click", handleGoogleSignIn);

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
    redirectAfterLogin(profile, returnTo);
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupError.hidden = true;
    signupSuccess.hidden = true;

    const fullName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: "student" },
      },
    });

    if (error) {
      signupError.textContent = error.message;
      signupError.hidden = false;
      return;
    }

    signupSuccess.textContent =
      "Account created! Check your email to confirm (if enabled), then sign in.";
    signupSuccess.hidden = false;
    signupForm.reset();
  });

  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    forgotError.hidden = true;
    forgotSuccess.hidden = true;

    const email = document.getElementById("forgotEmail").value.trim();
    const redirectTo = `${window.location.origin}/reset-password.html`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      forgotError.textContent = error.message;
      forgotError.hidden = false;
      return;
    }

    forgotSuccess.textContent = "Reset link sent. Check your inbox and spam folder.";
    forgotSuccess.hidden = false;
    forgotForm.reset();
  });

  supabase.auth.onAuthStateChange(async (event, session) => {
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
      await resolveAuthRedirect(supabase, returnTo);
    }
  });
});
