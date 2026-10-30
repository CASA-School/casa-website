#!/bin/zsh
# The live Container App from the inside: active revisions, delivery settings, recent errors,
# the SchoolMan job's last runs and the database's state. Reads only; needs `az login`.
# Usage: ./scripts/ops/health-azure.sh
app=ca-casa-website; rg=rg-casa-website-prod

print -- '--- active revisions'
az containerapp revision list -n $app -g $rg --query "[?properties.active].{rev:name, created:properties.createdTime, traffic:properties.trafficWeight, health:properties.healthState, replicas:properties.replicas}" -o table

print -- '--- delivery and feature settings (names and values that are not secrets)'
az containerapp show -n $app -g $rg --query "properties.template.containers[0].env[?name=='FORM_DELIVERY_MODE' || starts_with(name, 'CMS_') || starts_with(name, 'CASA_') || starts_with(name, 'REGISTRATION_') || starts_with(name, 'NEXT_PUBLIC_')].{name:name, value:value}" -o table

print -- '--- errors in the last 300 log lines'
az containerapp logs show -n $app -g $rg --tail 300 --format text 2>/dev/null \
  | grep -iE "error|exception|fatal|unhandled" | grep -viE "no error|error: null|\"error\":null" | tail -15

print -- '--- SchoolMan job, last runs'
az containerapp job execution list -n caj-casa-website-schoolman -g $rg --query "[0:5].{name:name, status:properties.status, start:properties.startTime}" -o table 2>/dev/null

print -- '--- database'
az postgres flexible-server list -g $rg --query "[].{name:name, state:state, version:version, location:location}" -o table 2>/dev/null
