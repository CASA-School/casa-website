#!/bin/zsh
# Public health of casa-bremen.de from outside: DNS on several resolvers, responses,
# certificates and mail records. Reads only. Usage: ./scripts/ops/health.sh
hosts=(casa-bremen.de www.casa-bremen.de admin.casa-bremen.de neu.casa-bremen.de)
apex_ip=20.79.72.159

print -- '--- DNS (Google, Cloudflare, Telekom, Quad9, this Mac)'
for r in 8.8.8.8 1.1.1.1 194.25.0.60 9.9.9.9 system; do
  print -n "$r: "
  for h in $hosts; do
    if [[ $r == system ]]; then a=$(dscacheutil -q host -a name $h 2>/dev/null | awk '/ip_address/{print $2; exit}')
    else a=$(dig +short +time=3 +tries=1 @$r $h A | tail -1); fi
    print -n "$h=$a  "
  done
  print
done

print -- '--- responses'
for h in $hosts; do
  curl -s -o /dev/null -w "$h  %{http_code}  %{time_total}s  ip=%{remote_ip}\n" --max-time 20 https://$h/
done
curl -s -o /dev/null -w "http://casa-bremen.de -> %{http_code} %{redirect_url}\n" --max-time 15 http://casa-bremen.de/
print -n 'api/health: '; curl -s --max-time 15 https://casa-bremen.de/api/health; print

print -- '--- certificates'
for h in $hosts; do
  print -n "$h: "
  print | openssl s_client -connect $apex_ip:443 -servername $h 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null
done

print -- '--- mail records (MX via SpamExperts; mail.casa-bremen.de stays on the old server)'
dig +short @8.8.8.8 casa-bremen.de MX
dig +short @8.8.8.8 mail.casa-bremen.de A
dig +short @8.8.8.8 casa-bremen.de TXT | grep -i spf
