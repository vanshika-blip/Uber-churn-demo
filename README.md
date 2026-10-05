# Uber × Hunar.ai — Driver Churn Voice AI Demo

- `index.html`: the website
- `api/calls.js`: starts a call (POST /api/calls)
- `api/call-status.js`: checks a call (GET /api/call-status?id=...)

Vercel setup: import the repo, Framework Preset **Other**, add the environment variable `HUNAR_API_KEY`, deploy.

To change agents, edit the `AGENTS` list near the top of `index.html`.
