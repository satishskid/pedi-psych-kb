#!/usr/bin/env bash
set -euo pipefail

# Smoke test for ops-api Worker
# Usage:
#   bash scripts/smoke-ops-api.sh <BASE_URL>
# Examples:
#   bash scripts/smoke-ops-api.sh https://ops-api-prod.<account>.workers.dev
#   bash scripts/smoke-ops-api.sh http://localhost:8787

BASE_URL=${1:-"http://localhost:8787"}

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required. Install with 'brew install jq'" >&2
  exit 1
fi

info() { echo "[INFO] $*"; }
pass() { echo "[PASS] $*"; }
fail() { echo "[FAIL] $*"; exit 1; }

# 1) Login to get JWT
info "Logging in to $BASE_URL/auth/login as admin@example.com"
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RES" | jq -r '.token // empty')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "$LOGIN_RES" | jq '.' || true
  fail "Login failed: token not found"
fi
pass "Login ok"
AUTH_HEADER="Authorization: Bearer $TOKEN"

# 2) Create a policy
info "Creating policy"
CREATE_RES=$(curl -s -X POST "$BASE_URL/api/policies" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "Smoke Test Policy",
    "description": "Allow export for smoke test",
    "effect": "allow",
    "actions": ["create", "read", "delete"],
    "resources": ["policies", "export"],
    "conditions": {"user.role": "admin"}
  }')
POLICY_ID=$(echo "$CREATE_RES" | jq -r '.id // empty')
if [[ -z "$POLICY_ID" || "$POLICY_ID" == "null" ]]; then
  echo "$CREATE_RES" | jq '.' || true
  fail "Policy creation failed"
fi
pass "Policy created: $POLICY_ID"

# 3) List policies
info "Listing policies"
LIST_RES=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/policies")
COUNT=$(echo "$LIST_RES" | jq 'length')
if [[ "$COUNT" -lt 1 ]]; then
  echo "$LIST_RES" | jq '.' || true
  fail "Policies list empty"
fi
pass "Policies listed: count=$COUNT"

# 4) Get policy by id
info "Getting policy $POLICY_ID"
GET_RES=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/policies/$POLICY_ID")
PID=$(echo "$GET_RES" | jq -r '.id // empty')
if [[ "$PID" != "$POLICY_ID" ]]; then
  echo "$GET_RES" | jq '.' || true
  fail "Policy get mismatch"
fi
pass "Policy get ok"

# 5) Delete policy
info "Deleting policy $POLICY_ID"
DEL_RES=$(curl -s -X DELETE -H "$AUTH_HEADER" "$BASE_URL/api/policies/$POLICY_ID")
MSG=$(echo "$DEL_RES" | jq -r '.message // empty')
if [[ "$MSG" != "Policy deleted successfully" ]]; then
  echo "$DEL_RES" | jq '.' || true
  fail "Policy delete failed"
fi
pass "Policy deleted"

# 6) Optional: export if CARD_ID is provided
CARD_ID=${CARD_ID:-}
if [[ -n "$CARD_ID" ]]; then
  info "Creating HTML export for card: $CARD_ID"
  EXPORT_REQ=$(cat <<JSON
{
  "format": "html",
  "language": "en",
  "includeMetadata": true,
  "template": "default",
  "cardIds": ["$CARD_ID"]
}
JSON
)
  CREATE_EXP=$(curl -s -X POST "$BASE_URL/api/export" \
    -H "Content-Type: application/json" -H "$AUTH_HEADER" \
    -d "$EXPORT_REQ")
  EXP_ID=$(echo "$CREATE_EXP" | jq -r '.exportId // empty')
  if [[ -z "$EXP_ID" || "$EXP_ID" == "null" ]]; then
    echo "$CREATE_EXP" | jq '.' || true
    fail "Export creation failed"
  fi
  pass "Export created: $EXP_ID"

  info "Downloading export $EXP_ID"
  DL_HEADERS=$(mktemp)
  curl -s -D "$DL_HEADERS" -H "$AUTH_HEADER" "$BASE_URL/api/export/download/$EXP_ID" > /dev/null
  CT=$(grep -i '^Content-Type:' "$DL_HEADERS" | awk '{print $2}' | tr -d '\r')
  rm -f "$DL_HEADERS"
  if [[ "$CT" != "text/html" && "$CT" != "application/pdf" ]]; then
    fail "Unexpected content-type: $CT"
  fi
  pass "Export download ok (content-type: $CT)"
else
  info "CARD_ID not set; skipping export check"
fi

pass "Smoke test completed successfully"