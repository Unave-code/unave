# Deploying UNAVE

Production runs on one server as Docker, managed by Dokploy. The database is
Postgres on the same server, not Neon: Neon stays where it belongs, in
development. This page is the whole runbook, from a bare server to a live site
at `https://unave.in`.

## The shape of it

| Piece | Where it runs | Notes |
| --- | --- | --- |
| The Next.js app | Docker container, port 3000 inside | Built from the repo `Dockerfile`, which needs `output: 'standalone'` in `next.config.ts` (already set) |
| Postgres 17 | Docker container on the same server | No published port; only the app reaches it. Tuned in the compose file for a 4 CPU, 8 GB box |
| Uploads | The `media` volume at `/app/public/media` | Survives redeploys. Move to object storage if the collection grows |
| The database the dev machines use | Neon | Never the production one, and never pointed at by `pnpm dev` |

Dokploy is Docker with a management layer on top: Traefik for routing and
automatic HTTPS, deploys on push, logs, volumes and env editing in one
dashboard. Running the plain `docker-compose.yml` by hand with
`docker compose up -d` also works; Dokploy just removes the parts you would
otherwise build yourself, and on one small server that trade is worth it.

## Prepare the server

Ubuntu 24.04, 4 CPUs, 8 GB RAM:

1. Install Docker.
2. Add 4 GB of swap, because the image build can need several gigabytes in one
   moment:

   ```bash
   fallocate -l 4G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
   ```

3. Open ports 22, 80 and 443 in the firewall. Dokploy's dashboard is on port
   3000; keep it reachable only for you (a firewall rule for your IP is enough).
4. Point DNS at the server: `unave.in` and `www.unave.in` as A records.
5. Install Dokploy with its install script and open the dashboard on port 3000.
   The install creates the `dokploy-network` the app joins.

## Deploy with Dokploy

1. In the dashboard, create a project, then a **Compose** service pointed at
   this repository, branch `master`, with the compose path set to
   `./docker-compose.dokploy.yml`. That file is `docker-compose.yml` plus the
   Traefik labels for `unave.in` and `www.unave.in`; it publishes no host port,
   because the Dokploy dashboard owns port 3000 on the host.
2. Set the environment on the service:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Anything; the compose file overrides it for the app with the on network URL |
   | `POSTGRES_PASSWORD` | A long random string |
   | `POSTGRES_USER`, `POSTGRES_DB` | `unave` for both is fine |
   | `PAYLOAD_SECRET` | A long random string |
   | `NEXT_PUBLIC_SERVER_URL` | `https://unave.in` |
   | `CRON_SECRET`, `PREVIEW_SECRET` | Random strings |
   | `MAINTENANCE_MODE` | Leave unset to serve the site normally. Set `on` to hold every public page on the maintenance screen; the admin panel and the API stay reachable. Changing it takes a redeploy |
   | `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO` | The sender identity, required for any mail to leave |
   | `ZEPTOMAIL_API_KEY` or the `SMTP_*` group | One transport at least. Mail goes through Zoho CPaaS (formerly ZeptoMail). The key is the agent's key: in the CPaaS console, Agents → the agent (alias `636b8be1a97d5320`) → SMTP/API → API Setup → Agent key. Put the key itself, without the `Zoho-enczapikey` prefix |
   | `ZEPTOMAIL_API_URL` | `https://cpaas.zoho.in/v1.1/email`. The account is in the India region, and the default `.com` host does not know it |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | The fallback when the API fails: `smtp.zeptomail.in`, `465`, `true`, `emailapikey`, and the same agent key as the password. With `587`, set `SMTP_SECURE=false` |
   | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile keys for `unave.in`. With both set, the contact, sign-in, sign-up, forgot-password, resend-verification and CMS forms ask Cloudflare whether the visitor is a person; leave both unset to switch the check off. Read at run time, so no rebuild is needed |
   | `TURNSTILE_HOSTNAMES` | Optional, comma separated: the site hostnames a Turnstile token may come from, for example `unave.in,www.unave.in`. Unset, it is the host of `NEXT_PUBLIC_SERVER_URL`. Never list `localhost` in production. Each form's token must also carry that form's action, so a token solved on one form is refused on another |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | For checkout |
   | `NEXT_PUBLIC_SENTRY_DSN` | Optional: the DSN of the Sentry project. Set, it turns on error tracking for the server and the browser (see **Error tracking**). Baked in at build time like the site URL, so changing it takes a rebuild |

   `NEXT_PUBLIC_SERVER_URL` is baked into the client bundles at build time, so
   it must be set before the first build, not after.
3. Deploy. The `migrate` service runs first and applies every migration in
   `src/migrations`; the app starts only after it succeeds. It is safe to repeat
   on every deploy. Traefik issues the certificates on the first request.
4. Razorpay dashboard: set the webhook to
   `https://unave.in/api/razorpay/webhook` with `payment.captured`, auto
   capture on.
5. Visit `/admin`, create the first staff account, then fill in **Website → Header / Footer**
   (header, footer, contact email) and **Email settings**. The contact email in
   the footer is also the inbox every kitchen notice goes to.

## Housekeeping

**Payload jobs.** The daily `pruneEmailLog` task waits for a knock: Payload's
scheduler marks what is due, and something has to call the jobs endpoint for the
work to run. Add a host cron entry that runs hourly:

```bash
0 * * * * curl -s -H "Authorization: Bearer THE_CRON_SECRET" https://unave.in/api/payload-jobs/run
```

Running it hourly is fine; the task itself decides it is due at 03:00 and runs
once a day.

**Backups.** The database is the only thing that cannot be rebuilt. Nightly,
from the host (the container name starts with the project name; find it with
`docker ps`):

```bash
docker exec -t CONTAINER_OF_POSTGRES pg_dump -U unave -Fc unave > /backups/unave-$(date +%F).dump
```

Keep dumps off the server as well (rclone to any object storage), and prune old
ones. To restore:

```bash
cat unave-2026-11-03.dump | docker exec -i CONTAINER_OF_POSTGRES pg_restore -U unave -d unave --clean --if-exists
```

The uploads need the same care. Copy the `media` volume alongside the dumps:

```bash
docker run --rm -v UNAVE_MEDIA_VOLUME:/data alpine tar czf - -C /data . > /backups/media-$(date +%F).tar.gz
```

**Migrations.** New schema arrives as a guarded file in `src/migrations`
registered in `index.ts`; the compose `migrate` service applies it on the next
deploy. Development pushes its own schema with the dev server and is never
migrated; production only ever migrates. The retired combo audit table stays
registered as hidden so development sync keeps its existing records.

## Error tracking

Sentry gets the errors nobody would otherwise see: anything a page, route or
server action throws, errors in visitors' browsers and the admin, every
`payload.logger.error`, and the payment warnings listed in `ALERT_WARNINGS`
in `src/sentry/scrub.ts` (an amount mismatch, a webhook with no checkout
intent, an order mail that did not send). Each log code is its own issue, so
`razorpay_webhook_write_failed` reads as that, not as a database message.

Turning it on: create a free Sentry project (platform Next.js), set
`NEXT_PUBLIC_SENTRY_DSN` on the Dokploy service and redeploy. In Sentry, add
an alert rule that mails on every new issue. It sends only from a production
build, so `next dev` and the tests never report.

What it never gets: `beforeSend` in `src/sentry/scrub.ts` drops cookies,
request bodies, query strings, the user, and any field whose name looks like an
email, phone, address, name, password, token or signature, and it masks emails
and Indian mobile numbers inside messages. Tracing and session replay are off.
Wrong passwords, 404s and validation errors are dropped as expected behaviour.
Set `SENTRY_ENVIRONMENT` (and `NEXT_PUBLIC_SENTRY_ENVIRONMENT` at build) to
`staging` on a staging deploy so its issues stay apart.

Readable stack traces need source maps. They upload during the build when
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are present, and are
deleted afterwards. The Docker build does not pass them yet: a token given as a
build argument would stay readable in the `migrate` image, so wire it as a
BuildKit secret when it is wanted.

## Load testing

Every public page renders on each request (the site layout is `force-dynamic`
because the header reads the cart and the customer session), so the number of
visitors one server holds is worth knowing before a launch or a campaign.
`scripts/load/browse.k6.js` simulates them with [k6](https://k6.io): 70% read
the home page and `/products`, 20% open a product or meal plan, 10% add a line to
the cart, view it and remove it. Nothing ever reaches checkout or Razorpay.

**Where to point it.** A staging deploy with a copy of the production database
is best. Production works only at a quiet hour and announced in advance: the
VPS also runs the Dokploy dashboard, and a stress run slows everything on it.
Aim at the origin, not through Cloudflare, so the numbers are the server's own.
On staging leave `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` unset; the
browse and cart paths are not rate limited.

**Running it.** Install k6 (`winget install k6`, `brew install k6` or the
Docker image `grafana/k6`), then start with the smoke profile, which also
proves the script finds real products:

```bash
k6 run -e BASE_URL=https://staging.unave.in scripts/load/browse.k6.js
k6 run -e BASE_URL=https://staging.unave.in -e PROFILE=load scripts/load/browse.k6.js
k6 run -e BASE_URL=https://staging.unave.in -e PROFILE=stress scripts/load/browse.k6.js
```

| Profile | Visitors | Length | Question it answers |
|---|---|---|---|
| `smoke` (default) | 2 | 30 s | Does the script work against this deploy? |
| `load` | 10 → 25 → 50 | about 13 min | Does a busy day stay fast? |
| `stress` | 25 → 100 | about 12 min | Where does it break, and how? |

**Pass line.** 95% of requests under 800 ms and under 1% failing, overall and
separately for the home, `/products` and product pages. k6 prints a red ✗ against
any threshold it misses and exits non-zero. While it runs, watch the host:

```bash
docker stats
docker exec CONTAINER_OF_POSTGRES psql -U unave -c "select count(*) from pg_stat_activity"
```

**Reading a failure.** The app container pinned near 100% of one core means
rendering is the limit: put Cloudflare in front for images and media, or run a
second `app` replica. Postgres busy or connections climbing towards the 50 in
the compose file means a query is the limit: cache it with `unstable_cache`
and a tag its afterChange hook revalidates, the way `getCachedGlobal` does. CMS
pages read through `queryPageBySlug` are the first suspect, since only React
`cache()` sits in front of that query.

## Moving content off Neon

Two paths, and the honest advice is to prefer the first:

1. **Fresh start.** Deploy, migrate, create content in the admin. The posts in
   the dev database are template filler, and the demo customer and order are
   test rows, so very little is worth carrying over.
2. **Carry the content over.** If real content already lives in Neon, dump the
   data and restore it into the migrated production schema:

   ```bash
   pg_dump --data-only --no-owner --no-privileges "$NEON_URL" > neon-data.sql
   ```

   Exclude the housekeeping tables, then restore inside the server:

   ```bash
   docker exec -i CONTAINER_OF_POSTGRES psql -U unave -d unave \
     -c "CREATE SCHEMA IF NOT EXISTS neon_import;"
   # load the dump into neon_import, then move the rows across table by table
   ```

   Because the Neon schema was pushed by a dev server rather than built by the
   migrations, check column by column as you go, and verify row counts at the
   end. Treat the result as a draft and read it in the admin before going live.

## If the build runs out of memory

The image build is the only heavy moment on an 8 GB server. The 4 GB swap
usually absorbs it. If a deploy still fails while building, raise the swap to
6 GB or build the image elsewhere (GitHub Actions) and let Dokploy deploy the
finished image instead.
