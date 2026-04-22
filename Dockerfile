# ── Playwright Test Runner ────────────────────────────────────────────────────
#
# Uses the official Microsoft Playwright image which bundles Node.js and all
# browser binaries (Chromium, Firefox, WebKit) at the correct versions.
# Image tag must match @playwright/test version in package.json (1.58.2).
#
# Build:  docker compose build
# Run:    docker compose run --rm playwright
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# ── Install npm dependencies ──────────────────────────────────────────────────
# Copy lockfiles first so this layer is cached and only re-runs when
# package.json or package-lock.json changes — not on every code change.
COPY package.json package-lock.json ./
RUN npm ci

# ── Copy test files ───────────────────────────────────────────────────────────
COPY playwright.config.ts ./
COPY tests/ ./tests/

# ── CI mode ───────────────────────────────────────────────────────────────────
# Activates doubled timeouts, 1 retry, and list reporter
# as configured in playwright.config.ts via process.env.CI.
ENV CI=true

# ── Default command ───────────────────────────────────────────────────────────
# playwright-report/ is written here and exposed via the volume in
# docker-compose.yml so the HTML report lands on the host after the run.
CMD ["npm", "run", "test"]
