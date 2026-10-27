import { readFileSync, writeFileSync } from 'node:fs';
import webpush from 'web-push';

// Kør lokalt. Nøgler skrives kun i den ignorerede miljøfil, aldrig til stdout.
const file = new URL('../.env.local', import.meta.url);
const content = readFileSync(file, 'utf8');
if (/^(NEXT_PUBLIC_VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY|VAPID_SUBJECT)=/m.test(content)) {
  console.log('Push-konfiguration findes allerede. Ingen nøgler er ændret.');
} else {
  const keys = webpush.generateVAPIDKeys();
  writeFileSync(file, content.replace(/\s*$/, '') + '\r\n' +
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\r\nVAPID_PRIVATE_KEY=${keys.privateKey}\r\nVAPID_SUBJECT=https://zet-wheat.vercel.app\r\n`);
  console.log('Push-nøgler er gemt lokalt. Ingen nøglemateriale vises.');
}
