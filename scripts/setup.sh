#!/usr/bin/env bash
set -euo pipefail

# Setup script for reproducible local demo
# - Validates Supabase env vars
# - Seeds demo data

echo "==> Axiom Project: setup starting"

# Check env vars
: "${SUPABASE_URL:?SUPABASE_URL is required. Copy .env.example to .env or export it in your shell.}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required. Use a service role key for seeding.}"

# Optional: allow VITE_* fallbacks if user copied .env.example
export SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${VITE_SUPABASE_ANON_KEY:-}}"

node scripts/seed_demo.js || {
  echo "\n❌ Seeding failed. Ensure your database has the expected tables and RLS policies."
  echo "   Tip: Run migrations in Supabase or review the repo's migrations folder."
  exit 1
}

cat <<"EOT"

✅ Setup complete!

Next steps:
1) Start the dev server:
   npm run dev

2) Run a demo exploration (example question):
   node scripts/demo_exploration.js "What is the best cheeseburger in Virginia?"

3) Open the app:
   http://localhost:5173/cognitive-lab
EOT
