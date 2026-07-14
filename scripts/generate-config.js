const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "public");

const staticFiles = [
  "index.html",
  "login.html",
  "reset-password.html",
  "teacher.html",
  "student.html",
  "exercise.html",
  "styles.css",
];

function copyDir(src, dest, exclude = new Set()) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to, exclude);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of staticFiles) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}

copyDir(path.join(root, "js"), path.join(out, "js"), new Set(["config.js", "config.example.js"]));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  if (process.env.VERCEL) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY on Vercel.");
    process.exit(1);
  }
  console.warn("SUPABASE_URL or SUPABASE_ANON_KEY missing — writing placeholder config.");
}

const config = `window.APP_CONFIG = {
  supabaseUrl: "${url || "https://YOUR_PROJECT.supabase.co"}",
  supabaseAnonKey: "${key || "YOUR_ANON_KEY"}",
};
`;

fs.writeFileSync(path.join(out, "js", "config.js"), config);
console.log("Build complete → public/");
