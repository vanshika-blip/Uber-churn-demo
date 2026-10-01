# Uber × Hunar.ai — Driver Churn Voice AI Demo

Live site: **https://vanshika-blip.github.io/uber-churn-demo/**

- `public/index.html` — the website (hosted on GitHub Pages)
- `src/index.js` — the API that talks to Hunar and Google Sheets (hosted on Cloudflare Workers, because it holds secret keys that can't go on GitHub Pages)
- `.github/workflows/deploy.yml` — every push to `main` deploys both automatically

## One-time setup

**1. GitHub Pages:** repo **Settings → Pages → Source: GitHub Actions**.

**2. Cloudflare API token:** in Cloudflare go to **My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"** template → create, copy it.

**3. Repo secrets:** repo **Settings → Secrets and variables → Actions → New repository secret**, add:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 2 |
| `HUNAR_API_KEY` | your Hunar API key |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | the full Google service-account JSON |

**4. Run it:** **Actions → Deploy → Run workflow** (or just push to `main`).

## Changing agents

Edit the `AGENTS` list near the top of `public/index.html` — each `id` is a Hunar agent ID. Push, and the site updates in about a minute.

## First-time Google Sheet header

Open `https://uber-churn-agent.<your-subdomain>.workers.dev/api/sheets/init` once to write the header row.
