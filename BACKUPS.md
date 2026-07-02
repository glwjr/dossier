# Backups & restore

The production database is Render-managed Postgres, and Render's managed backups
are the backup mechanism. They are private, encrypted at rest, and taken
automatically — the right home for data that contains user PII.

> **Why no off-site GitHub Actions backup?** An earlier version dumped the DB to
> a GitHub Actions artifact. That's unsafe on a **public** repo: artifacts are
> downloadable by anyone who can see the repo, so it would publish user PII. If
> the repo were private (or the dump encrypted to a key GitHub never sees, e.g.
> `age`), off-site dumps to private storage would be reasonable defense-in-depth
> — but not as plaintext artifacts on a public repo.

---

## Render managed backups

Render's paid Postgres plans take automated daily backups with retention (and
point-in-time recovery on higher tiers). **Verify this, don't assume it:**

1. Render Dashboard → your Postgres instance → **Backups** / **Recovery**.
2. Confirm backups exist; note the retention window and PITR availability for
   your plan (Basic-256mb).
3. **Test a restore** at least once so it isn't theoretical — restore a backup
   into a throwaway database and confirm the data is intact. Never restore over
   production to test.

---

## Restoring & verifying a dump

If you download a dump (from Render, or `pg_dump` manually), restore it into a
*throwaway* database — never over production. Use a Postgres client whose major
version is **>=** the server's (Render currently runs Postgres 18):

```bash
# Into a fresh, empty database:
psql "<target-connection-string>" -v ON_ERROR_STOP=1 -f dump.sql

# Then sanity-check:
#  - table row counts look right
#  - SELECT version_num FROM alembic_version;  matches `alembic heads`
#  - a FK join returns rows (e.g. programs JOIN users)
```

A dump restores cleanly under a different role than production if it was taken
with `pg_dump --no-owner --no-privileges`.
