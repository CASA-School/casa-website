#!/bin/zsh
# The app's console and system logs in Log Analytics, grouped by message.
# Reads only; needs `az login`. Usage: ./scripts/ops/logs.sh [hours, default 24]
# KQL reserves `first` and `last`, so the time columns are t0 and t1.
hours=${1:-24}
ws=cd81b967-7d74-49b0-8748-85cb79210580
since="ago(${hours}h)"

print -- "--- console, last ${hours}h: errors and form deliveries, by message"
az monitor log-analytics query -w $ws -o tsv --analytics-query "ContainerAppConsoleLogs_CL | where TimeGenerated > $since and ContainerAppName_s == 'ca-casa-website' | where Log_s matches regex '(?i)(error|fail|exception|form-|careers-|appointments|unhandled|timeout|ECONN|503|500)' | extend m = substring(Log_s, 0, 160) | summarize n=count(), t0=min(TimeGenerated), t1=max(TimeGenerated) by m | order by n desc | take 40" 2>&1

print -- "--- system, last ${hours}h: restarts, scaling, probes"
az monitor log-analytics query -w $ws -o tsv --analytics-query "ContainerAppSystemLogs_CL | where TimeGenerated > $since and ContainerAppName_s == 'ca-casa-website' | summarize n=count(), t1=max(TimeGenerated) by Reason_s, Type_s | order by n desc | take 25" 2>&1
