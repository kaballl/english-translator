const { createClient } = require("@supabase/supabase-js");
const { gradeTranslation } = require("../lib/grading");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return res.status(500).json({ error: "Server configuration missing" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const { exerciseId, answer } = req.body || {};

  if (!exerciseId || typeof answer !== "string") {
    return res.status(400).json({ error: "exerciseId and answer are required" });
  }

  if (!answer.trim()) {
    return res.status(400).json({ error: "Answer cannot be empty" });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const { data: profile, error: profileError } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return res.status(403).json({ error: "Profile not found" });
  }

  if (profile.role !== "student") {
    return res.status(403).json({ error: "Only students can submit answers" });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: exercise, error: exerciseError } = await admin
    .from("exercises")
    .select("id, answer_key")
    .eq("id", exerciseId)
    .single();

  if (exerciseError || !exercise) {
    return res.status(404).json({ error: "Exercise not found" });
  }

  const result = gradeTranslation(exercise.answer_key, answer);

  const { error: submitError } = await admin.from("submissions").upsert(
    {
      exercise_id: exerciseId,
      student_id: user.id,
      answer: answer.trim(),
      score: result.score,
      missing_words: result.missing,
      extra_words: result.extra,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "exercise_id,student_id" }
  );

  if (submitError) {
    return res.status(500).json({ error: "Failed to save submission" });
  }

  return res.status(200).json({
    score: result.score,
    missing: result.missing,
    extra: result.extra,
  });
};
