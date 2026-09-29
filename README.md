# Nexus Dashboard

A self-hosted dashboard for the services you run. Organise links into categories, manage
users with role-based access, and reach everything from one page.

React 19 + Vite frontend, Express + SQLite backend, one Docker container.

## Features

- Categorised link grid with search and favourites
- Full CRUD for links and categories, including link editing and icon uploads
- Upload manager with usage stats, in-use protection, and reclaimable-orphan cleanup
- Three roles: `admin`, `editor`, `viewer`
- Self-service password change for every account
- Rate-limited login, strict URL validation, and security headers
- Nightly SQLite backups with automatic retention pruning

## Roles

| Role    | View | Add / edit / delete links | Manage categories | Manage users |
| ------- | ---- | ------------------------- | ----------------- | ------------ |
| `admin` | Yes  | Yes                       | Yes               | Yes          |
| `editor`| Yes  | Yes                       | Yes               | No           |
| `viewer`| Yes  | No                        | No                | No           |

A single `admin` account with the password `admin` is seeded on first start **if no users
exist**. Change it immediately from the key icon in the header, or via
Settings → Users.

## Quick start

```bash
cp .env.example .env
openssl rand -base64 48          # paste into JWT_SECRET
docker compose up -d --build
```

The app listens on `127.0.0.1:4020` only. To reach it over SSH:

```bash
ssh -L 4020:127.0.0.1:4020 root@your-host
```

Then open <http://127.0.0.1:4020>.

### Exposing it through a tunnel

The compose file joins the container to the external network `cloudflared_default`, which the
`cloudflared` container is already attached to. Point a tunnel ingress rule at
`http://nexus-dashboard:4020` and Docker's embedded DNS resolves the name.

```bash
docker network inspect cloudflared_default --format '{{range .Containers}}{{.Name}} {{end}}'
```

## Configuration

All settings are environment variables, read from `.env` (see `.env.example`).

| Variable              | Default | Purpose                                                   |
| --------------------- | ------- | --------------------------------------------------------- |
| `JWT_SECRET`          | —       | Required. Signs session tokens. Minimum 32 characters.     |
| `PORT`                | `4020`  | Listen port inside the container.                          |
| `TRUST_PROXY`         | `false` | Set `true` behind a proxy so rate limiting sees real IPs.  |
| `COOKIE_SECURE`       | `false` | Set `true` only for end-to-end HTTPS.                      |
| `MAX_UPLOAD_MB`       | `2`     | Maximum icon upload size.                                  |
| `LOGIN_WINDOW_MINUTES`| `15`    | Login rate limit window.                                   |
| `LOGIN_MAX_ATTEMPTS`  | `5`     | Failed attempts allowed per window per IP.                 |
| `SESSION_DAYS`        | `7`     | Session token lifetime.                                    |

The server refuses to start if `JWT_SECRET` is missing, shorter than 32 characters, or set to
a known placeholder.

## Development

```bash
npm install
cp .env.example .env        # set JWT_SECRET
npm run dev                 # tsx watch + Vite middleware on :4020
```

```bash
npm run typecheck           # tsc --noEmit
npm run build               # vite build
npm run check               # both
```

## Backups

`scripts/backup.mjs` uses SQLite's online backup API, so it is safe to run against a live
database. It prunes backups older than `NEXUS_BACKUP_RETAIN_DAYS` (default 14).

```bash
docker exec nexus-dashboard node /app/scripts/backup.mjs
```

`deploy/nexus-backup.service` and `deploy/nexus-backup.timer` schedule it nightly at 03:17.

```bash
cp deploy/nexus-backup.service deploy/nexus-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now nexus-backup.timer
```

## Data

Everything lives in the `nexus-data` volume at `/app/data`:

```
database.sqlite     links, categories, users
uploads/            icons
backups/            nightly snapshots
```

## Security notes

- Link and icon URLs are validated server-side. Only `http://` and `https://` are accepted,
  which blocks `javascript:` URLs from being stored and later rendered as clickable links.
- Uploads are restricted by MIME type and size, served only to authenticated users, and
  returned with `nosniff` plus a sandboxing CSP so an uploaded SVG cannot run script.
- Unknown `/api/*` routes return JSON 404 instead of falling through to the SPA.
- The last admin cannot be deleted or demoted, so the instance cannot be locked out.
