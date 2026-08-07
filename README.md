# Advokat Pro

Advokat Pro is a small multi-user case-management PWA for a Serbian law office. The user-facing application is in Serbian. It is deployed on Cloudflare Pages and protected by Cloudflare Access.

Production URL: `https://advokat-pro.pages.dev/`

This README is intentionally written as a handoff document. A new developer or AI coding agent should be able to understand the current architecture, deployment setup, important constraints, and unfinished work without reconstructing the entire project history.

## What the application does

The application currently manages:

- legal cases / matters (`predmeti`)
- civil, criminal, enforcement, administrative, non-contentious and prosecution case types
- parties, courts, phone numbers, notes and dispute values
- procedural actions / submissions (`procesne radnje`)
- hearings (`ročišta`)
- appeal deadlines (`rokovi`)
- claims / awarded amounts (`potraživanja`)
- tariff calculations based on the tariff data currently embedded in the front-end
- uploaded PDF, Word and image attachments
- shared data between several lawyers
- PWA installation on desktop and Android
- Web Push notifications

The interface is mobile-first but also has a desktop layout.

## Current architecture

### Front end

The application is plain HTML/CSS/JavaScript rather than a framework application.

Important files:

- `index.html` - main UI markup and CSS
- `js/` - front-end logic split by feature
- `manifest.webmanifest` - PWA manifest
- `sw.js` - service worker, offline/cache behaviour and push notification handling
- `assets/icons/` - PWA icons

Do not assume the original prototype/localStorage architecture is still authoritative. The production application now uses the shared Cloudflare D1 backend.

### Hosting and authentication

The site is deployed from GitHub to Cloudflare Pages.

Cloudflare Access protects `advokat-pro.pages.dev`. Only explicitly allowed email addresses can log in. Users enter their allowed email address and receive a one-time code by email. The Access session was configured for approximately 30 days.

This is not an in-app username/password system and the application itself does not manage user passwords.

### Database - Cloudflare D1

Database name:

```text
advokat-pro-db
```

Database ID:

```text
65716c17-4a79-4d74-84be-e1389b317a0e
```

The Pages Functions D1 binding must be named:

```text
DB
```

The initial schema contains:

- `cases`
- `actions`
- `deadlines`
- `claims`
- `attachments`
- `push_subscriptions`
- `push_reminder_log` after the reminder migration is correctly applied

The client still uses short Serbian-ish property names (`D.p`, `D.ra`, `D.k`, `D.pot`, `D.arh`) for historical reasons. `functions/api/state.js` maps database rows into this legacy front-end shape.

### Main API endpoints

`functions/api/state.js`

- GET shared application state from D1
- returns cases, actions, deadlines, claims and attachment metadata

`functions/api/mutate.js`

- creates/deletes/updates cases
- creates/deletes/updates actions
- creates/deletes deadlines
- creates/deletes/updates claims
- deleting cases/actions also deletes corresponding files from Google Drive
- creating a new case triggers Web Push to registered devices

`functions/api/files.js`

- uploads/downloads/deletes attachments
- allowed extensions: PDF, DOC, DOCX, JPG, JPEG, PNG
- maximum file size: 10 MB
- files are stored in Google Drive through a Google Apps Script bridge

`functions/api/push/subscribe.js`

- stores browser/device Push API subscriptions in D1

`functions/_lib/webpush.js`

- Web Push / VAPID implementation used by Pages Functions and reminder logic

## File storage - Google Drive

R2 was considered first, but it was not enabled because the Cloudflare account did not have billing configured. Attachments therefore use Google Drive.

The bridge is implemented in:

```text
google-drive/Code.gs
```

It is deployed as a Google Apps Script Web App which executes as the owner account. Files remain private in the configured Drive folder; normal Advokat Pro users do not need direct access to the Drive folder.

Apps Script Script Properties required:

```text
API_SECRET
FOLDER_ID
```

Cloudflare Pages Variables/Secrets required:

```text
GDRIVE_URL       # deployed Apps Script Web App URL
GDRIVE_SECRET    # same value as Apps Script API_SECRET
```

`GDRIVE_SECRET` must be a secret, never committed to Git.

The attachment table still calls the Drive file ID column `r2_key` because storage originally targeted R2. It now contains the Google Drive file ID. Renaming this would require a migration and code changes and is not necessary unless deliberately cleaning up the schema.

## Web Push notifications

### Immediate new-case notification

When one lawyer creates a new case, `functions/api/mutate.js` sends a Web Push notification to all registered subscriptions.

This has been tested successfully on desktop and Android.

Each device/browser must:

1. open Advokat Pro
2. allow notifications
3. successfully register its Push API subscription

Subscriptions live in `push_subscriptions`.

### Hearing and deadline reminders

A separate Worker was added for server-side reminders:

```text
worker/reminders.js
wrangler.reminders.toml
```

Worker name:

```text
advokat-pro-reminders
```

It is configured to run every minute with a Cron Trigger and uses the same D1 database.

Intended reminder schedule:

- hearing: 08:00 on the hearing day
- hearing: 1 hour before the hearing
- deadline: 08:00 the day before the due date
- deadline: 08:00 on the due date

Timezone logic should use `Europe/Belgrade` rather than a hard-coded UTC offset.

Both Pages and the reminder Worker need the secret:

```text
VAPID_PRIVATE_KEY
```

Never commit the private VAPID key. The corresponding public key is safe to exist in front-end code.

Deploy the reminder Worker with:

```bash
npx wrangler deploy --config wrangler.reminders.toml
```

Set its secret with:

```bash
npx wrangler secret put VAPID_PRIVATE_KEY --config wrangler.reminders.toml
```

## IMPORTANT: current migration state / known issue

At the latest debugging point, D1 reported that there were no migrations left to apply, but `PRAGMA table_info(push_subscriptions);` showed only:

```text
endpoint
created_at
updated_at
```

The migration file `migrations/0003_server_push_reminders.sql` is supposed to add:

```text
p256dh
auth
```

and create:

```text
push_reminder_log
```

This means the D1 migration ledger and actual schema may be out of sync.

Before relying on server-side hearing/deadline reminders, verify the production schema:

```bash
npx wrangler d1 execute advokat-pro-db --remote --command \
"PRAGMA table_info(push_subscriptions);"
```

If `p256dh` and `auth` are missing, repair the production schema carefully. The proposed manual repair was:

```bash
npx wrangler d1 execute advokat-pro-db --remote --command \
"ALTER TABLE push_subscriptions ADD COLUMN p256dh TEXT;
 ALTER TABLE push_subscriptions ADD COLUMN auth TEXT;
 CREATE TABLE IF NOT EXISTS push_reminder_log (
   event_key TEXT PRIMARY KEY,
   sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );"
```

Also inspect the migration ledger before making further migration changes:

```bash
npx wrangler d1 execute advokat-pro-db --remote --command \
"SELECT * FROM d1_migrations ORDER BY id;"
```

After repairing the columns, reopen the app on every registered device so subscriptions are re-saved with their encryption keys. Then verify:

```bash
npx wrangler d1 execute advokat-pro-db --remote --command \
"SELECT COUNT(*) AS devices, COUNT(p256dh) AS ready_for_reminders FROM push_subscriptions;"
```

For two registered devices the desired result is `2 / 2`.

## D1 migrations

Apply remote migrations with:

```bash
npx wrangler d1 migrations apply advokat-pro-db --remote
```

Useful inspection command:

```bash
npx wrangler d1 execute advokat-pro-db --remote --command \
"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Wrangler occasionally returned Cloudflare API error `7403` even while the OAuth account was correct. `npx wrangler whoami` and `npx wrangler d1 list` are useful checks. Re-authentication may be needed if Cloudflare OAuth becomes stale.

## Cloudflare Pages environment

The production Pages project requires at least:

```text
DB                 # D1 binding, not a plaintext variable
GDRIVE_URL         # plaintext variable is acceptable
GDRIVE_SECRET      # secret
VAPID_PRIVATE_KEY  # secret
```

Do not commit production secrets to the repository.

A developer may keep local values in `.env.local`; `.env.*` is ignored by Git.

## PWA / service worker

The application can be installed on Android/desktop. PWA icon assets are in:

```text
assets/icons/icon-192.png
assets/icons/icon-512.png
assets/icons/apple-touch-icon.png
assets/icons/scales.svg
```

The service worker cache version has been bumped repeatedly during development. Whenever a UI/JS change appears stale on Android, check `sw.js`, deploy status, and site/service-worker cache before assuming the code did not deploy.

Avoid returning `index.html` as a fallback for arbitrary failed asset requests; this previously caused icon PNG URLs to render the application HTML instead of the image.

## Current UI work / next task

The most recent UI issue involved the tariff preview under **Vrednost spora (RSD)** in the new-case form.

Current behaviour after the latest fix:

- the cream tariff preview appears while working with the dispute-value field
- it hides when focus moves elsewhere
- it can be dismissed by clicking/tapping the preview

Requested next enhancement, NOT YET IMPLEMENTED:

- make appropriate tariff/value suggestions clickable
- clarify exactly which selected tariff amount should populate which field before implementing
- user also asked about database-driven value suggestions so newly entered dispute values can become reusable suggestions later

Important distinction: values such as `Podnesak`, `Ročište`, `Neodržano`, `Žalba` are calculated lawyer-fee amounts, not the dispute value itself. Do not blindly write those amounts back into `Vrednost spora`.

## Other likely next product improvements

These were discussed but intentionally not implemented yet:

- assigned lawyer per case
- notification routing by assigned lawyer vs all lawyers
- per-user notification preferences
- audit/activity log (who created/changed/deleted what)
- case status: active / waiting / completed / archived
- global search and stronger filters
- automatic database backups to Google Drive
- printable/PDF case summary
- optional Google Calendar integration

The preferred order was to observe actual lawyer usage before adding speculative features. Assigned lawyer + audit log were considered especially useful for a real multi-user office.

## Backups

There is currently no automated backup workflow.

D1 can be exported manually:

```bash
mkdir -p backups
npx wrangler d1 export advokat-pro-db --remote \
  --output "backups/advokat-pro-$(date +%F-%H%M).sql"
```

Never commit database backups containing client data.

A future proposed solution is a scheduled GitHub Action that exports D1 and uploads the SQL backup to Google Drive. This has NOT been implemented.

Google Drive already contains the uploaded document files, but that should not be treated as a database backup.

## Data safety / production caution

The office was explicitly advised not to make Advokat Pro the only source of truth immediately. It should be tested in real use first, and reliable automated backup should be added before the system becomes the sole repository for important legal data.

Tariff values in the application should also be independently checked by a practising lawyer before they are treated as authoritative for billing or court-cost calculations.

## Local development

A simple static server is sufficient for basic front-end work:

```bash
cd ~/projects/advokat_pro
python3 -m http.server 8080
```

However, Pages Functions, D1, Google Drive storage and Web Push require the Cloudflare environment or an appropriately configured Wrangler development setup. Do not expect the full production stack to work from a static local HTTP server alone.

Current Wrangler required Node.js 22+ during setup.

Example:

```bash
nvm use 22
npx wrangler whoami
```

## Git workflow

Cloudflare Pages automatically deploys production from the GitHub `main` branch.

If another developer/agent has committed directly to GitHub, local workstations should pull before making/pushing changes:

```bash
git pull --rebase
```

This project has already had push rejections caused by the remote branch moving ahead while changes were also made directly through GitHub.

## Security notes

Never commit:

- `VAPID_PRIVATE_KEY`
- `GDRIVE_SECRET`
- Google Apps Script `API_SECRET`
- database exports/backups containing client data
- any future API tokens

The application is protected by Cloudflare Access, but that does not remove the need to treat legal case data and uploaded documents as sensitive.

## Quick handoff checklist for the next developer / AI agent

Before changing anything substantial:

1. `git pull`
2. inspect the latest GitHub commits
3. verify the Pages deployment is healthy
4. check the D1 schema, especially `push_subscriptions`
5. confirm whether `0003_server_push_reminders.sql` is truly reflected in production
6. confirm the reminder Worker is deployed and has `VAPID_PRIVATE_KEY`
7. test push registration on at least desktop + Android
8. preserve the existing Google Drive bridge unless deliberately replacing storage
9. do not put secrets into code or README
10. continue from the **Current UI work / next task** section above

## Product philosophy

Keep the app simple and practical. It is being built for a small working law office, not as a generic SaaS platform. Prefer concrete workflow improvements based on lawyers' actual use over adding large abstractions or speculative complexity.
