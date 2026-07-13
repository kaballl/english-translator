"use strict";

function getConfig() {
  const config = window.APP_CONFIG;
  if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
    return null;
  }
  if (config.supabaseUrl.includes("YOUR_PROJECT")) {
    return null;
  }
  return config;
}

function showConfigError() {
  const banner = document.createElement("div");
  banner.className = "config-banner";
  banner.innerHTML =
    "<strong>Setup required:</strong> Copy <code>js/config.example.js</code> to <code>js/config.js</code> and add your Supabase URL + anon key. See <code>SETUP.md</code>.";
  document.body.prepend(banner);
}

function createSupabaseClient() {
  const config = getConfig();
  if (!config) {
    showConfigError();
    return null;
  }
  return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

async function getSession(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function getProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function requireAuth(supabase, allowedRoles) {
  const session = await getSession(supabase);
  if (!session) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `login.html?returnTo=${returnTo}`;
    return null;
  }

  const profile = await getProfile(supabase, session.user.id);

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    window.location.href = profile.role === "teacher" ? "teacher.html" : "student.html";
    return null;
  }

  return { session, profile };
}

async function signOut(supabase) {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function renderWordList(words) {
  if (!words || words.length === 0) return "—";
  return words.map((w) => `<span class="word-tag">${escapeHtml(w)}</span>`).join("");
}

function getTier(score) {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

const TIER_LABELS = {
  excellent: {
    badge: "Excellent",
    title: "Outstanding work!",
    message: "Your translation closely matches the model answer.",
  },
  good: {
    badge: "Good",
    title: "Well done!",
    message: "Most key words are correct. Review the missing ones below.",
  },
  fair: {
    badge: "Fair",
    title: "Keep practicing!",
    message: "You got some words right, but several are still missing.",
  },
  poor: {
    badge: "Needs work",
    title: "Don't give up!",
    message: "Review the missing words and try again.",
  },
};

function setScoreRing(el, scoreEl, score) {
  const tier = getTier(score);
  el.dataset.tier = tier;
  el.style.setProperty("--score-pct", score);
  scoreEl.textContent = score;
}

function showGradingResult(container, result) {
  const tier = getTier(result.score);
  const label = TIER_LABELS[tier];

  container.hidden = false;
  container.dataset.tier = tier;
  container.querySelector("[data-result-badge]").textContent = label.badge;
  container.querySelector("[data-result-title]").textContent = label.title;
  container.querySelector("[data-result-message]").textContent = label.message;
  container.querySelector("[data-missing-words]").innerHTML = renderWordList(result.missing);
  container.querySelector("[data-extra-words]").innerHTML = renderWordList(result.extra);
}

function setupHeader(supabase, profile) {
  const userBadge = document.getElementById("userBadge");
  const signOutBtn = document.getElementById("signOutBtn");

  if (userBadge) {
    const roleLabel = profile.role === "teacher" ? "Giáo viên" : "Học viên";
    userBadge.textContent = `${profile.full_name || profile.email} · ${roleLabel}`;
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => signOut(supabase));
  }
}
