#!/usr/bin/env bash
# fsdk-starter dev setup — idempotent. Safe to re-run.
#
# Builds/refreshes the SUBDIR venv (server/.venv) with python3.12, installs
# server/requirements.txt, and ALWAYS (re)asserts the editable foundation-sdk
# repoint so `import foundation` resolves to THIS machine's sibling checkout
# (fixes the stale PEP-660 finder after a folder move). Rebuilds the venv if it
# is stale/broken. Mirrors rihla-web/scripts/setup.sh, adapted for the app that
# lives (and runs) under server/.
set -euo pipefail
cd "$(dirname "$0")/.."                   # fsdk-starter root regardless of cwd

PYTHON_BIN="${PYTHON_BIN:-python3.12}"    # NEVER bare python3 (that's 3.9 here)
APP_DIR="${APP_DIR:-server}"              # the subdir the app runs from
SDK_PATH="${SDK_PATH:-../foundation-sdk}" # sibling checkout (repoints to real path)
SDK_EXTRAS="${SDK_EXTRAS:-}"              # starter needs no SDK extras by default
REQ_FILE="${REQ_FILE:-$APP_DIR/requirements.txt}"
VENV="${VENV:-$APP_DIR/.venv}"

# 0. Preconditions --------------------------------------------------------
command -v "$PYTHON_BIN" >/dev/null 2>&1 || {
  echo "ERROR: '$PYTHON_BIN' not found. Install with: brew install python@3.12" >&2
  exit 1
}

# 1. Venv: create, OR rebuild if stale/corrupt (moved-machine breakage) ----
need_rebuild=0
if [ -d "$VENV" ]; then
  if ! "$VENV/bin/python" -c 'import sys' >/dev/null 2>&1; then need_rebuild=1; fi
  if [ -f "$VENV/bin/pip" ] && ! head -1 "$VENV/bin/pip" | grep -q "$(pwd)/$VENV"; then
    need_rebuild=1
  fi
fi
if [ "$need_rebuild" = 1 ]; then
  echo "==> stale/broken $VENV detected — rebuilding from scratch"
  rm -rf "$VENV"
fi
if [ ! -d "$VENV" ]; then
  echo "==> creating $VENV with $PYTHON_BIN ($("$PYTHON_BIN" --version 2>&1))"
  "$PYTHON_BIN" -m venv "$VENV"
fi

VPY="$VENV/bin/python"
"$VPY" -m pip install --upgrade pip wheel setuptools >/dev/null

# 2. Install app requirements. server/requirements.txt carries a bare
#    `foundation-sdk` self-reference (resolved via the editable install in
#    step 3, NOT PyPI) — strip it here so pip doesn't try to fetch it.
if [ -f "$REQ_FILE" ]; then
  echo "==> installing $REQ_FILE (minus the foundation-sdk self-reference)"
  filtered="$(mktemp)"
  grep -viE '^[[:space:]]*(-e[[:space:]]+)?\.?/?.*foundation-sdk([[:space:]]*(#.*)?$|\[)' "$REQ_FILE" > "$filtered" || true
  "$VPY" -m pip install -r "$filtered"
  rm -f "$filtered"
fi

# 3. ALWAYS (re)assert the editable SDK install — repoints the finder to this
#    machine's absolute path every run (idempotent; covers a stale finder) AND
#    installs the SDK's transitive deps. NOT --no-deps here: fsdk-starter's
#    requirements.txt is minimal (flask-cors, python-dotenv) and relies on the
#    foundation-sdk install to bring the Flask/SQLAlchemy/smorest stack — same
#    as dev.sh's `pip install -e foundation-sdk`.
echo "==> installing + repointing editable foundation-sdk -> ${SDK_PATH}${SDK_EXTRAS}"
"$VPY" -m pip install -e "${SDK_PATH}${SDK_EXTRAS}"

# 4. Arm pre-commit if this repo has a config (it may not).
[ -f .pre-commit-config.yaml ] && "$VPY" -m pre_commit install || true

# 5. Self-check (foundation is a PEP-420 namespace package, so report __path__).
"$VPY" -c 'import foundation; print("==> import foundation OK:", getattr(foundation, "__file__", None) or list(foundation.__path__)[0])'
echo "==> fsdk-starter dev env ready. dev.sh runs the app from $APP_DIR; activate: source $VENV/bin/activate"
