# Backup-tjeneste til Railway (Root Directory: backup). pg_dump skal være mindst
# samme hovedversion som databasen, derfor postgres:18.
FROM postgres:18-alpine
RUN apk add --no-cache aws-cli
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
