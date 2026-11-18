# Gendannelse af databasen fra backup

Backups tages hver nat af `zet-backup` (se `backup.sh`) og ligger i backup-bucketten under `db/`. De 14 nyeste gemmes.

En backup kan indeholde konti, som brugerne har slettet efter backuppen blev taget. De må ikke komme tilbage. Derfor gemmer appen en sletteliste i samme bucket under `deletions/`: én tom fil pr. slettet konto, hvor filnavnet er bruger-id'et og filens tidspunkt er sletningen. Der står ikke navn eller e-mail. Filer ældre end 15 dage fjernes af backup-jobbet, fordi ingen backup er ældre end det.

Slettelisten dækker kun sletninger efter, at den blev taget i brug. Genindlæs derfor aldrig en ældre kopi fra et andet sted, fx en gammel database hos en tidligere leverandør.

## Fremgangsmåde

1. **Stop appen**, så ingen skriver imens: i Railway, tjenesten `zet`, Deployments, den aktive udrulning, Remove.
2. **Vælg backup.** Brug den nyeste, der er fra før fejlen. Skriv tidspunktet ned. Alt skrevet efter det tidspunkt går tabt.
3. **Åbn databasen midlertidigt udefra**: Postgres, Settings, Networking, tilføj en offentlig TCP-adresse. Brug den adresse i trinene nedenfor, og del den aldrig.
4. **Hent og indlæs backuppen** i en tom database (aldrig oven i data, der stadig kan reddes):
   ```
   aws s3 cp s3://<backup-bucket>/db/<fil>.dump zet.dump --endpoint-url <endpoint>
   psql "<offentlig adresse>" -c "DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   pg_restore --no-owner --no-privileges --exit-on-error -d "<offentlig adresse>" zet.dump
   ```
   Kør kun `DROP SCHEMA` på den database, der skal erstattes, og først når du er sikker på, at dens data er tabt eller gemt et andet sted.
5. **Slet konti igen fra slettelisten.** Sæt variablerne i terminalen (de har forrang for `.env.local`), og kør scriptet først uden `--apply`:
   ```
   DATABASE_URL=<offentlig adresse til den genindlæste database>
   DELETION_LOG_BUCKET, DELETION_LOG_S3_ENDPOINT, DELETION_LOG_S3_REGION,
   DELETION_LOG_ACCESS_KEY_ID, DELETION_LOG_SECRET_ACCESS_KEY   (backup-bucketten)
   S3_BUCKET, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY   (billedlageret)

   node --conditions=react-server --import tsx scripts/reapply-deletions.ts
   node --conditions=react-server --import tsx scripts/reapply-deletions.ts --apply
   ```
   Scriptet viser, hvor mange konti listen har, og hvor mange der findes i den genindlæste database. Med `--apply` slettes de med samme funktion som "Slet konto" i appen, også profilbilleder. Kør det igen bagefter: det skal sige, at 0 skal slettes.
6. **Start appen** igen: Deployments, Redeploy på den seneste udrulning. Prøv at logge ind.
7. **Luk databasen udefra** igen (fjern TCP-adressen) og slet den hentede `zet.dump`.
8. **Kør en backup** med det samme (`zet-backup`, Run now), så den nye tilstand er gemt.
9. **Fortæl brugerne**, at data fra efter backuppens tidspunkt er tabt.
