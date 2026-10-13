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

Tekstid on failis `scripts/clips.json` (hoia sünkroonis lehel oleva tekstiga). Vaikimisi hääl on `mari`; teise häälega: `SPEAKER=albert node scripts/make-audio.mjs`. Lõngakera lehe klipid (`hn-…`, `hr-…`, `h-end`) on pikemad. Soovi korral tee need väiksemaks: `MP3=1 node scripts/make-audio.mjs` (vajab ffmpeg-i), leht proovib kõigepealt mp3, siis wav. Enne avalikku kasutamist teavita TartuNLP-d (ping@tartunlp.ai) ja kontrolli nende kasutustingimusi.

## Testid

Testid on kaustas `tests/` omaenda `package.json`-iga, nii et Cloudflare'i build neid ei paigalda.

    cd tests
    npm install
    npx playwright install chromium
    npm test

Mida kontrollitakse: leht laeb ilma vigadeta ja ilma horisontaalse kerimiseta, kõne tekst, kattuvus, FIRE-aeg võrreldes sõltumatu referendiga, kingi omadused, jagatav kaart, mikrofon (võlts-seadmega) ning heliklippide täielikkus ja tekstide sünkroon. Arvude (sissetulek, tootlus jms) muutmisel uuenda `referee` funktsiooni failis `tests/smoke.test.mjs`. GitHub Actions käivitab testid iga PR-i ja main'i push'i peal.

## Lehed

- `public/index.html`: manifest (hingamine, hääl, kõne, kattuvus, kingitus).
- `public/haruta.html`: Haruta lõngakera (pensionireeglid sõlmede ja kuulujuttudena, tirimine, hääl).
- `public/ajatelg.html`: Ajatelgekiik (eluklotsid ajateljel, rahu minevikuga; fail ainult sinu seadmes).
- `public/ots.html`: Lõnga ots (üks lõng seitsme sõlmega sinu enda numbritega; arvutused sinu seadmes, midagi ei salvestata).

## Meeleraha tervik: infoarhitektuur

Viis ust samasse majja (peamenüü) ja kolm abilehte (jalus):

| Ruum | Leht | Mida teeb |
|---|---|---|
| Tunne | `index.html` | Manifest: hinga, räägi tulevase minaga, kata, kingi. Alguses Meeleraha kaart. |
| Haruta | `haruta.html` | Pensionireeglid sõlmedena ja kuulujutu kontroll, seaduse paragrahvini. |
| Plaani | `ots.html` | Olukord, sinu numbrid, kaheksa sõlme, unistus lõnga otsas, `lõngaots.md`. |
| Elu | `ajatelg.html` | Eluklotsid ajateljel, rahu minevikuga, Elukaar: rahavood, bilanss, edasi ja tagurpidi. |
| Elu | `kellakeeramine.html` | Kaks korda aastas kümme minutit iseendaga, kalendrifail. |
| Kast | `kast.html` | Mängukast: kõigi tööriistade, allalaadimiste ja mängude kataloog (tasuta). |
| Meta | `privaatsus.html`, `kontakt.html` | Mida mõõdame, kuidas komponendid on nimetatud; kontakt nõusolekuga. |

Ühine raam (nav, jalus, keel, mõõtmine) tuleb failist `meeleraha.js`. Stiil: `mr.css`.

## Keel

Eesti keel on ametlik versioon. Liides on olemas üheksas keeles: eesti, inglise, saksa, hispaania, prantsuse, hollandi, rootsi, taani ja norra (bokmål). Keelevalija on navis, keel püsib linkides (`?lang=de`) ilma salvestamata.

Staatus: **kõik peale eesti keele on masinmustand** ja ootavad emakeelse lugeja ülevaatust. Iga mustandi keele all on bänner ja link „Paranda tõlget“ (viib kontaktivormi).

Mis on tõlgitud: raam (nav, jalus, mõõtmise paneel), manifesti kaart ja pealkirjad, Mängukast koos kataloogiga, kontakt, privaatsus, kellakeeramine, kalendrifail. Mis on **eesti keeles**: tööriistade sisu (seaduse sõlmed, kuulujutud, olukorrad, küsimused, kõne, `lõngaots.md`). Seda märgib bänner.

Kuidas parandada või lisada keel:
1. `node tools/i18n.mjs export tolked.csv` annab tabeli (võti, eesti, inglise, ... ).
2. Emakeelne parandab lahtreid (kohahoidjad `{n}` ja `{addr}` peavad jääma).
3. `node tools/i18n.mjs import tolked.csv --langs de` kannab parandused tagasi (ET jääb puutumata, kui ei anna `--et`). `node tools/i18n.mjs check` kontrollib täielikkust.
4. Uus keel: lisa `public/i18n.js` lõppu `window.MR_LANGS` loendisse rida ja `MR_I18N` objekti sõnastik; kataloogi (`kast.html` JSON) lisa nimi ja kirjeldus. Testid (`tests/keeled.test.mjs`) nõuavad täielikkust.
5. Terminid on lukus: `i18n/glossary.json` ja `i18n/GLOSSARY.md` (häälejuhend, ülevaatuse prioriteedid).

Riigipakett: Haruta räägib Eesti seadusest. Teise riigi jaoks ei piisa tõlkest; vaja on selle riigi reeglite paketti (seadus, maksud, vanused, allikad ja juristi kontroll). Seni on teistes keeltes seaduse sisu eesti keeles ja see on märgitud.

## Mõõtmine

Vt `analytics/README.md`. Põhimõte: sündmused kannavad ainult nime, komponendi ja lubatud valikud; sisestatud numbrid ja tekst ei jõua kunagi sündmusse. Registri allikas on `public/taxonomy.json`.
