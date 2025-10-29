#!/usr/bin/env bash
set -euo pipefail

# Seed POLICY_STORE with a demo card and user for ops-api
# Usage:
#   bash scripts/seed-ops-api.sh [ENV]
# ENV defaults to production; ensure env KV bindings are set in wrangler.toml.
# Example:
#   bash scripts/seed-ops-api.sh production
#   bash scripts/seed-ops-api.sh dev

ENV=${1:-production}

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: Node/npm (npx) is required." >&2
  exit 1
fi

# Verify wrangler
if ! npx --yes wrangler --version >/dev/null 2>&1; then
  echo "Wrangler not found; logging in and installing if needed..." >&2
  npx wrangler login || true
fi

info() { echo "[INFO] $*"; }
pass() { echo "[PASS] $*"; }
fail() { echo "[FAIL] $*"; exit 1; }

# Ensure data files exist
CARD_JSON="scripts/data/card-demo.json"
USER_JSON="scripts/data/user-demo.json"
[[ -f "$CARD_JSON" ]] || fail "Missing $CARD_JSON"
[[ -f "$USER_JSON" ]] || fail "Missing $USER_JSON"

# Put demo card into POLICY_STORE
info "Seeding demo card to POLICY_STORE (env=$ENV)"
if npx wrangler kv key put card:card-1 \
  --binding=POLICY_STORE --env "$ENV" --path "$CARD_JSON"; then
  pass "Card seeded: card:card-1"
else
  fail "Failed to seed card. Check env bindings in wrangler.toml"
fi

# Put demo user into POLICY_STORE
info "Seeding demo user to POLICY_STORE (env=$ENV)"
if npx wrangler kv key put user:demo@example.com \
  --binding=POLICY_STORE --env "$ENV" --path "$USER_JSON"; then
  pass "User seeded: user:demo@example.com"
else
  fail "Failed to seed user. Check env bindings in wrangler.toml"
fi

# Put demo user password into POLICY_STORE
info "Seeding demo user password to POLICY_STORE (env=$ENV)"
if npx wrangler kv key put user:demo@example.com:password \
  --binding=POLICY_STORE --env "$ENV" --text "demo123"; then
  pass "User password seeded: user:demo@example.com:password"
else
  fail "Failed to seed user password. Check env bindings in wrangler.toml"
fi

# Verify keys exist
info "Verifying seeded keys"
if npx wrangler kv key get card:card-1 --binding=POLICY_STORE --env "$ENV" >/dev/null; then
  pass "Verified card key"
else
  fail "Card key not found"
fi
if npx wrangler kv key get user:demo@example.com --binding=POLICY_STORE --env "$ENV" >/dev/null; then
  pass "Verified user key"
else
  fail "User key not found"
fi
if npx wrangler kv key get user:demo@example.com:password --binding=POLICY_STORE --env "$ENV" >/dev/null; then
  pass "Verified user password key"
else
  fail "User password key not found"
fi

pass "Seeding completed. Use demo user 'demo@example.com' with password 'demo123' to login."