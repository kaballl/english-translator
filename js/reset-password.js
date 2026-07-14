"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const resetPanel = document.getElementById("resetPanel");
  const resetErrorPanel = document.getElementById("resetErrorPanel");
  const resetForm = document.getElementById("resetForm");
  const resetError = document.getElementById("resetError");
  const resetErrorMessage = document.getElementById("resetErrorMessage");

  function showInvalidLink(message) {
    resetErrorPanel.hidden = false;
    resetPanel.hidden = true;
    resetErrorMessage.textContent = message;
  }

  function showResetForm() {
    resetPanel.hidden = false;
    resetErrorPanel.hidden = true;
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const isRecoveryLink = hashParams.get("type") === "recovery";

  if (isRecoveryLink) {
    showResetForm();
  } else {
    const session = await getSession(supabase);
    if (!session) {
      showInvalidLink("This reset link is invalid or has expired.");
      return;
    }
    showResetForm();
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      showResetForm();
    }
  });

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetError.hidden = true;

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword.length < 6) {
      resetError.textContent = "Password must be at least 6 characters.";
      resetError.hidden = false;
      return;
    }

    if (newPassword !== confirmPassword) {
      resetError.textContent = "Passwords do not match.";
      resetError.hidden = false;
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      resetError.textContent = error.message;
      resetError.hidden = false;
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "login.html?reset=success";
  });
});
