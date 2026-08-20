# CASA website — production container for Azure Container Apps.
#
# Three stages so the runtime image carries no toolchain, no source and no dev
# dependencies. Built in the cloud by `az acr build` (see infra/azure/deploy.sh),
# so nothing here depends on a local Docker daemon or on the builder's CPU
# architecture — ACR builds linux/amd64, which is what the Container Apps
# environment runs.
#
# Debian slim rather than Alpine on purpose: `sharp` is a dependency of `next`
# itself and does Next's production image optimisation. Its prebuilt binaries are
# glibc-first, and a musl base is the usual way self-hosted Next ends up serving
# unoptimised images without saying so.

# ---------------------------------------------------------------- dependencies
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Lockfile-only layer, so a source edit does not reinstall node_modules.
COPY package.json package-lock.json ./
RUN npm ci

# ----------------------------------------------------------------------- build
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# No DATABASE_URL at build time, deliberately. Every public page has a fixture
# fallback (see ARCHITECTURE.md "runtime modes"), so the build must not require a
# database — and a build that silently baked in database content would make the
# two runtime modes diverge.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --------------------------------------------------------------------- runtime
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root. Container Apps does not require it, but a public web container that
# can write to its own image is a needless step for an attacker to skip.
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# `output: 'standalone'` traces the exact runtime files and writes its own
# minimal node_modules, which is why no npm install happens in this stage. The
# two directories it deliberately does NOT include are public/ and .next/static,
# because it assumes a CDN serves them; here the container serves them itself.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
