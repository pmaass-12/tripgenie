#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# TripGenie Pre-Deploy Check
# Run this before every git push / Netlify deploy.
#
# Usage:
#   bash scripts/pre-deploy-check.sh
#
# What it runs:
#   1. Smoke tests (@smoke)   — fast, no login, catches broken deploys
#   2. Regression tests (@regression) — guards all previously-fixed bugs
#   3. Unit tests (@unit)     — pure function correctness
#
# Full suite (auth required):
#   4. Integration tests (@integration)
#   5. E2E tests (@e2e)
#
# Exit codes:
#   0 = all tests passed — safe to deploy
#   1 = one or more tests failed — DO NOT deploy
#
# Required env vars (create a .env file or export before running):
#   TEST_EMAIL    — your login email for maass5.com
#   TEST_PASSWORD — your login password
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colour helpers ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║   TripGenie Pre-Deploy Check             ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Load .env if present ────────────────────────────────────────────
if [ -f ".env" ]; then
  echo -e "${YELLOW}⚙  Loading .env file...${NC}"
  export $(grep -v '^#' .env | xargs)
fi

# ── Check Playwright is installed ────────────────────────────────────
if ! command -v npx &> /dev/null; then
  echo -e "${RED}✗ npx not found. Run: npm install${NC}"
  exit 1
fi

if [ ! -d "node_modules/@playwright" ]; then
  echo -e "${RED}✗ Playwright not installed. Run: npm install && npx playwright install chromium${NC}"
  exit 1
fi

# ── Track failures ───────────────────────────────────────────────────
FAILED=0

run_suite() {
  local SUITE_NAME="$1"
  local GREP_TAG="$2"
  local EXTRA_ARGS="${3:-}"

  echo ""
  echo -e "${BOLD}── ${SUITE_NAME} ────────────────────────────────────────${NC}"

  if npx playwright test --grep "$GREP_TAG" --project=smoke $EXTRA_ARGS 2>&1; then
    echo -e "${GREEN}✓ ${SUITE_NAME} passed${NC}"
  else
    echo -e "${RED}✗ ${SUITE_NAME} FAILED${NC}"
    FAILED=$((FAILED + 1))
  fi
}

# ── Suite 1: Smoke tests (no login) ──────────────────────────────────
echo ""
echo -e "${BOLD}── Smoke tests (no login required) ──────────────────────────${NC}"
if npx playwright test tests/smoke.spec.js --project=smoke 2>&1; then
  echo -e "${GREEN}✓ Smoke tests passed${NC}"
else
  echo -e "${RED}✗ Smoke tests FAILED${NC}"
  FAILED=$((FAILED + 1))
fi

# ── Suite 2: Regression tests (no login) ─────────────────────────────
echo ""
echo -e "${BOLD}── Regression tests ──────────────────────────────────────────${NC}"
if npx playwright test tests/regression.spec.js --project=smoke 2>&1; then
  echo -e "${GREEN}✓ Regression tests passed${NC}"
else
  echo -e "${RED}✗ Regression tests FAILED${NC}"
  FAILED=$((FAILED + 1))
fi

# ── Suite 3: Unit tests (no login) ───────────────────────────────────
echo ""
echo -e "${BOLD}── Unit tests ────────────────────────────────────────────────${NC}"
if npx playwright test tests/unit.spec.js --project=smoke 2>&1; then
  echo -e "${GREEN}✓ Unit tests passed${NC}"
else
  echo -e "${RED}✗ Unit tests FAILED${NC}"
  FAILED=$((FAILED + 1))
fi

# ── Authenticated suites (skip if no credentials) ────────────────────
if [ -z "${TEST_EMAIL:-}" ] || [ -z "${TEST_PASSWORD:-}" ]; then
  echo ""
  echo -e "${YELLOW}⚠  TEST_EMAIL / TEST_PASSWORD not set — skipping auth suites.${NC}"
  echo -e "${YELLOW}   Set them to also run integration and E2E tests.${NC}"
else
  # ── Suite 4: Integration tests ──────────────────────────────────────
  echo ""
  echo -e "${BOLD}── Integration tests (requires login) ────────────────────────${NC}"
  if npx playwright test tests/integration.spec.js 2>&1; then
    echo -e "${GREEN}✓ Integration tests passed${NC}"
  else
    echo -e "${RED}✗ Integration tests FAILED${NC}"
    FAILED=$((FAILED + 1))
  fi

  # ── Suite 5: E2E tests ──────────────────────────────────────────────
  echo ""
  echo -e "${BOLD}── E2E tests (requires login) ────────────────────────────────${NC}"
  if npx playwright test tests/e2e.spec.js 2>&1; then
    echo -e "${GREEN}✓ E2E tests passed${NC}"
  else
    echo -e "${RED}✗ E2E tests FAILED${NC}"
    FAILED=$((FAILED + 1))
  fi
fi

# ── Final result ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${BLUE}════════════════════════════════════════════${NC}"
if [ $FAILED -eq 0 ]; then
  echo -e "${BOLD}${GREEN}✅  All suites passed — safe to deploy!${NC}"
  echo -e "${BOLD}${BLUE}════════════════════════════════════════════${NC}"
  echo ""
  exit 0
else
  echo -e "${BOLD}${RED}❌  ${FAILED} suite(s) FAILED — do NOT deploy${NC}"
  echo -e "${BOLD}${BLUE}════════════════════════════════════════════${NC}"
  echo ""
  echo -e "Run ${BOLD}npx playwright show-report${NC} to see detailed failure output."
  echo ""
  exit 1
fi
