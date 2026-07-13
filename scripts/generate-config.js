const fs = require("fs");
const path = require("path");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("SUPABASE_URL or SUPABASE_ANON_KEY missing — writing placeholder config.");
}

const content = `window.APP_CONFIG = {
  supabaseUrl: "${url || "https://YOUR_PROJECT.supabase.co"}",
  supabaseAnonKey: "${key || "YOUR_ANON_KEY"}",
};
`;

fs.writeFileSync(path.join(__dirname, "../js/config.js"), content);
console.log("Generated js/config.js");
