#!/bin/sh
# Natlig backup af ZET-databasen. Kører som Railway-cron-tjeneste og stopper bagefter.
# Gemmer et pg_dump (custom-format) i en separat bucket og beholder de nyeste BACKUP_KEEP filer.
#
# Gendannelse til en TOM database (aldrig direkte oven i produktion):
#   aws s3 cp s3://$BACKUP_BUCKET/db/<fil>.dump zet.dump --endpoint-url $BACKUP_S3_ENDPOINT
#   pg_restore --no-owner --no-privileges --exit-on-error -d "$TOM_DATABASE_URL" zet.dump
set -eu

: "${BACKUP_DATABASE_URL:?mangler}"
: "${BACKUP_BUCKET:?mangler}"
: "${BACKUP_S3_ENDPOINT:?mangler}"
: "${AWS_ACCESS_KEY_ID:?mangler}"
: "${AWS_SECRET_ACCESS_KEY:?mangler}"
KEEP="${BACKUP_KEEP:-14}"

stamp=$(date -u +%Y-%m-%dT%H-%M-%SZ)
file="/tmp/zet-$stamp.dump"

pg_dump --format=custom --no-owner --no-privileges --file="$file" "$BACKUP_DATABASE_URL"
# Et dump, der ikke kan læses, må ikke erstatte gode backups.
pg_restore --list "$file" > /dev/null

aws s3 cp "$file" "s3://$BACKUP_BUCKET/db/zet-$stamp.dump" --endpoint-url "$BACKUP_S3_ENDPOINT" --only-show-errors
echo "Backup gemt: db/zet-$stamp.dump ($(wc -c < "$file") bytes)"
rm -f "$file"

# Nøglerne indeholder tidsstemplet, så alfabetisk rækkefølge er også tidsrækkefølge.
aws s3api list-objects-v2 --bucket "$BACKUP_BUCKET" --prefix db/ --endpoint-url "$BACKUP_S3_ENDPOINT" \
  --query 'Contents[].Key' --output text | tr '\t' '\n' | grep '\.dump$' | sort -r | tail -n +"$((KEEP + 1))" |
while read -r key; do
  aws s3 rm "s3://$BACKUP_BUCKET/$key" --endpoint-url "$BACKUP_S3_ENDPOINT" --only-show-errors
  echo "Slettet gammel backup: $key"
done

# Slettelisten (lib/deletion-log.ts): én tom fil pr. slettet konto. Den skal kun dække
# perioden, som backups dækker, så filer ældre end 15 dage slettes. Datoerne sammenlignes
# som tekst (ISO-format), derfor ingen tal-sammenligning i --query.
cutoff=$(date -u -d "@$(( $(date +%s) - 15 * 86400 ))" +%Y-%m-%dT%H:%M:%S)
removed=0
for key in $(aws s3api list-objects-v2 --bucket "$BACKUP_BUCKET" --prefix deletions/ --endpoint-url "$BACKUP_S3_ENDPOINT" \
  --query 'Contents[].[Key,LastModified]' --output text | awk -v c="$cutoff" '$1 ~ /^deletions\// && $2 < c { print $1 }'); do
  aws s3 rm "s3://$BACKUP_BUCKET/$key" --endpoint-url "$BACKUP_S3_ENDPOINT" --only-show-errors
  removed=$((removed + 1))
done
# Kun antallet logges, ikke bruger-id'erne.
echo "Slettelisten: $removed poster ældre end 15 dage fjernet."
