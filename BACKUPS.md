# Backups & restore

The production database is Render-managed Postgres. There are two layers of
protection:

1. **Render's managed backups** — the primary safety net.
2. **Off-site logical dumps** via GitHub Actions ([db-backup.yml](.github/workflows/db-backup.yml)) — defense-in-depth against loss of the Render account itself.

---

## 1. Render managed backups (primary)

Render's paid Postgres plans take automated daily backups with retention (and
point-in-time recovery on higher tiers). **Verify this once, don't assume it:**

1. Render Dashboard → your Postgres instance → **Backups** (or **Recovery**).
2. Confirm backups exist and note the retention window and PITR availability for
   your plan (Basic-256mb).
3. **Test a restore** at least once so it isn't theoretical — restore a backup
   into a throwaway database and confirm the data is intact. Do NOT restore over
   production to test.

---

## 2. Off-site dumps (defense-in-depth)

`db-backup.yml` runs `pg_dump` daily and uploads a gzipped SQL dump as a GitHub
Actions artifact (30-day retention). It is **opt-in** — a no-op until you add the
secret.

### Enable it

1. Render Dashboard → your Postgres → copy the **External Database URL**
   (the one reachable from outside Render).
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository
   secret**: name `BACKUP_DATABASE_URL`, value = that external URL.
3. Trigger a run: **Actions → DB Backup → Run workflow** (or wait for the daily
   schedule). Download the artifact from the run to confirm it worked.

### Troubleshooting

The workflow **fails** (rather than uploading an empty file) if `pg_dump`
can't connect or produces no output. If a run errors with "Dump is empty or
invalid," check that `BACKUP_DATABASE_URL` is the **prod** database's External
URL (not a different/empty instance) and includes SSL if Render requires it
(e.g. append `?sslmode=require`). The `pg_dump` stderr in the run log shows the
exact connection error.

### Security note

The dump contains **all user data (PII)**. Keep the repo private, keep retention
short, and rotate `BACKUP_DATABASE_URL` if it's ever exposed. For stronger
protection, add a GPG-encryption step before upload (passphrase as a second
secret) — a reasonable follow-up if this holds real user data.

---

## Restoring from a dump

Download the artifact, unzip, and restore into a target database:

```bash
gunzip dossier-YYYYMMDDTHHMMSSZ.sql.gz

# Restore into a fresh/empty database (never test over production):
psql "<target-connection-string>" < dossier-YYYYMMDDTHHMMSSZ.sql
```

The dump uses `--no-owner --no-privileges`, so it restores cleanly under a
different role than production. After restoring, run `alembic current` against
the target to confirm the schema revision matches `alembic heads`.
