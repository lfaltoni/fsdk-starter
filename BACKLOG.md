# fsdk-starter — Backlog

## FSDK-DISTRIBUTION — make this the template friends build on (owner, 2026-10-15; research done, NOT scheduled)

This is the starter half of **FSDK-DISTRIBUTION**. The full research and work packages are in `foundation-sdk/BACKLOG.md`.

Drift risk today: this repo symlinks `foundation-sdk` and `fsdk-ts` into itself, and its README tells people to `pip install -e` the SDK. An AI agent working here sees SDK code as editable project files.

To do:
- Depend on **pinned releases** of foundation-sdk and fsdk-ts, and remove the symlinks and path installs.
- Ship a consumer `CLAUDE.md` (AI rules): the SDK packages are installed dependencies. Never copy, patch or vendor them. Build features in `server/` and `frontend/`. If the SDK lacks something, stop and ask the maintainer.
- Add a check that fails if SDK source code appears in the repo.
- Document the upgrade flow: bump the version, run the DB upgrade, run the smoke test.

Prompt: `~/GitHub/Projects/prompts/fsdk-distribution-planner.md`.

## ENABLE_BILLING=true has no BillingService (found 2026-10-31, FSDK-BOOT fix)

`server/app.py` registers `billing_blp` when `ENABLE_BILLING=true` but never attaches `app.billing_service`, so every billing endpoint raises AttributeError. Wire a `BillingService` (Stripe provider when `STRIPE_SECRET_KEY` is set) and declare `app.config['BILLING_PASSTHROUGH']` the way BlogMachine's `config.py` does before anyone turns billing on.
