#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_PATH="${STRIPE_WEBHOOK_PATH:-/api/webhooks/stripe}"
PORT="${PORT:-3000}"
FORWARD_TO="${STRIPE_FORWARD_TO:-http://localhost:${PORT}${WEBHOOK_PATH}}"
EVENTS="checkout.session.completed,customer.subscription.updated,customer.subscription.deleted"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_STRIPE_BIN="${REPO_ROOT}/tools/stripe-cli/stripe"

if [[ -x "${LOCAL_STRIPE_BIN}" ]]; then
  STRIPE_BIN="${LOCAL_STRIPE_BIN}"
elif command -v stripe >/dev/null 2>&1; then
  STRIPE_BIN="$(command -v stripe)"
else
  echo "Stripe CLI is not installed. Install it first: https://docs.stripe.com/stripe-cli"
  exit 1
fi

if ! "${STRIPE_BIN}" whoami >/dev/null 2>&1; then
  echo "Stripe CLI is not authenticated. Starting stripe login..."
  "${STRIPE_BIN}" login
fi

cleanup() {
  if [[ -n "${STRIPE_LISTEN_PID:-}" ]] && kill -0 "${STRIPE_LISTEN_PID}" >/dev/null 2>&1; then
    kill "${STRIPE_LISTEN_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "Forwarding Stripe events to: ${FORWARD_TO}"
"${STRIPE_BIN}" listen --events "${EVENTS}" --forward-to "${FORWARD_TO}" &
STRIPE_LISTEN_PID=$!

pnpm dev
