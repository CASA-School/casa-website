# The website's database tasks, run as a Container Apps job (infra/azure/db-job.sh).
#
# The server (psql-casa-website-f8d745) has no public access: it sits in the
# private data network, reachable only from the container environment. So
# migrations cannot run from a laptop; they run here, in the same network as
# the site. The image carries the migration runner, the SQL and pg, nothing else.
FROM node:22-bookworm-slim
WORKDIR /app
RUN npm init -y >/dev/null && npm install --no-audit --no-fund pg@8.23.0 && npm cache clean --force
COPY scripts/db ./scripts/db
COPY scripts/admin/seed-staff.mjs ./scripts/admin/seed-staff.mjs
COPY db ./db
COPY infra/azure/db/bootstrap.mjs ./bootstrap.mjs
COPY infra/azure/db/task.sh ./task.sh
USER node
CMD ["sh", "task.sh", "status"]
