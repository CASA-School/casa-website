# The website's database tasks, run as a Container Apps job (infra/azure/db-job.sh).
#
# The server (psql-casa-website-f8d745) has no public access: it sits in the
# private data network, reachable only from the container environment. So
# migrations cannot run from a laptop; they run here, in the same network as
# the site. The image carries the migration runner, the SQL and pg, and the
# SchoolMan importers the bridge feeds (infra/azure/bridge.sh) — never data.
FROM node:22-bookworm-slim
WORKDIR /app
RUN npm init -y >/dev/null && npm install --no-audit --no-fund pg@8.23.0 country-list@2.4.1 && npm cache clean --force
COPY scripts/db ./scripts/db
COPY scripts/admin/seed-staff.mjs ./scripts/admin/seed-staff.mjs
COPY scripts/filemaker ./scripts/filemaker
COPY db ./db
COPY infra/azure/db/bootstrap.mjs ./bootstrap.mjs
COPY infra/azure/db/task.sh ./task.sh
USER node
CMD ["sh", "task.sh", "status"]
