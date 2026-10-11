# Meeleraha

Raha, mida kuuled, vaatad ja hingad. Mängulise rahatarkuse tööriist, kus tulevikuraha on vool, mida saab kuulata, vaadata ja hingata.

## Algus

Loodud 12.10.2026 eraldi projektina. Esimene versioon (`public/index.html`) kirjutati nullist ühe vestluse jooksul, ilma häkatoni materjalideta.

## Mida selles repos EI ole

- Tuleva häkatoni "Tulevane Mina" koodi, tekste, kaarte, andmebaasi ega mängu.
- Tuleva nime, logo, numbreid, andmeid ega disainisüsteemi.
- Kolmandate osapoolte uurimistöö materjale ilma loata.

Kui tahad siia midagi häkatonilt tuua, küsi enne kirjalik luba.

## Käivitamine

Staatiline leht. Ava `public/index.html` brauseris või käivita:

    npx wrangler dev

Avaldamine: Cloudflare Workers, Worker nimega `unistused`, staatilised failid kaustast `public`. Käsk: `npx wrangler deploy`.

## Eeldused ja piirid

Kõik numbrid on näited (sissetulek 2 500 €, reaaltootlus 4%, väljavõtmismäär 4%). See on haridus- ja simulatsioonitööriist, mitte finantsnõu.

## Eestikeelne hääl

Brauserites pole sageli eesti häält, seepärast mängib leht eelnevalt genereeritud heliklippe kaustast `public/audio`. Klipid tehakse TartuNLP Neurokõne avalikust API-st:

    node scripts/make-audio.mjs

Tekstid on failis `scripts/clips.json` (hoia sünkroonis lehel oleva tekstiga). Vaikimisi hääl on `mari`; teise häälega: `SPEAKER=albert node scripts/make-audio.mjs`. Enne avalikku kasutamist teavita TartuNLP-d (ping@tartunlp.ai) ja kontrolli nende kasutustingimusi.

## Testid

Testid on kaustas `tests/` omaenda `package.json`-iga, nii et Cloudflare'i build neid ei paigalda.

    cd tests
    npm install
    npx playwright install chromium
    npm test

Mida kontrollitakse: leht laeb ilma vigadeta ja ilma horisontaalse kerimiseta, kõne tekst, kattuvus, FIRE-aeg võrreldes sõltumatu referendiga, kingi omadused, jagatav kaart, mikrofon (võlts-seadmega) ning heliklippide täielikkus ja tekstide sünkroon. Arvude (sissetulek, tootlus jms) muutmisel uuenda `referee` funktsiooni failis `tests/smoke.test.mjs`. GitHub Actions käivitab testid iga PR-i ja main'i push'i peal.
