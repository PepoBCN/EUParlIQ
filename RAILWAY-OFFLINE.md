# EU ParlIQ - taken OFFLINE on Railway (28 Jun 2026)

## Why
Cost control. No paying client is using EU ParlIQ, so it was taken off Railway to
stop it incurring any "proper" cost (decision: keep non-revenue projects at ~£0
until a paying client justifies them). The web app (`eu-parliq-app`) had already
crashed last month and was not running; the Postgres database was the only thing
still online.

## What was done
- **Postgres** service: active deployment **Removed** via the Railway dashboard
  (Service -> Deployments -> ... -> Remove). It is now offline.
  - The service and its **`postgres-volume` were preserved** - the data is intact
    on the volume, nothing was deleted.
  - The DB holds the real EU dataset (tables: meps, voting_record, plenary_debates,
    hearings, committees, documents, written_questions, users, chat_sessions, etc.).
- **eu-parliq-app** web service: already in a crashed/stopped state, left as-is
  (not consuming resources).

Railway project: `eu-parliq` (id 29d817ba-3781-4733-bad3-16cf665cace1), env
`production`. Repo: PepoBCN/EUParlIQ.

## Bring it back (when needed)
1. **Postgres**: Railway dashboard -> eu-parliq -> Postgres service -> Deployments
   -> click "Deploy the image `ghcr.io/railwayapp-templates/postgres-ssl:18`"
   (or the Redeploy option on the REMOVED history entry). It re-mounts
   `postgres-volume`, so the data comes back intact. No restore needed.
2. **Web app**: redeploy `eu-parliq-app` (it had crashed - check the crash cause in
   logs first; was healthy as an MVP before). From this repo:
   `railway up --detach` (needs the eu-parliq project token / `railway login` - the
   project token is NOT stored on this machine, unlike ParlIQ's).
3. Verify the app loads and can query Postgres.

## Notes
- The eu-parliq project token is not on the local machine. Managing this project
  via CLI needs `railway login` or the new Railway MCP (mcp.railway.com, added to
  Claude Code - authorise via `/mcp`).
- Sister project ParlIQ (parliament-reports-qa) was taken offline the same day for
  the same reason - see `personal-projects/parliq/reports-qa/BRING-BACK.md`.
