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
| Plaani | `tingi.html`, `mangukast.html` | Vaieldav masin (üks lause → laud) ja läbirääkimise mängukast (sammhaaval). Link Lõnga otsa neljandast sõlmest ja Mängukastist. Vt allpool. |
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

## Tingi (vaieldav masin) ja läbirääkimise mängukast

Kaks lehte, üks mudel. Mõlemad töötavad täielikult brauseris (ei serverit, ei salvestust, ei võrgupäringuid), eesti ja inglise keeles (`?lang=en`); muud keeled näitavad inglise sisu.

- **`tingi.html` (menüüs „Tingi“): lihtne sissepääs.** Üks lause → „Ma kuulsin“ → laud. Masin loeb lause lihtsate reeglitega (mitte ennustusmudeliga) ja annab Jev'i-kujulise vastuse: tüübitud väärtused ja tõenäosused (stiil, väited, prioriteedid, soov, nende pakkumine, piir, palk). Alla 60% kindlat asja ta ei oleta: ta küsib **ühe** asja korraga. Iga rida saab ühe puudutusega parandada. „Mida ma ei tea“ nimetab ausalt puuduva (palk, eelarve, juhi eelistused) ja oletatu (hoobade hinnad, mudeli versioon, omanik, ülevaatuse kuupäev). Laual on kolm sulle ligikaudu samaväärset paketti (palgakeskne, tasakaalus, vähem palka); juht valib neist odavaima, ja ruumi mõõt näitab, kui palju väärtust jäi parimast paketist ära. Palgalagi ja eelarve kärbe lülitavad lauda kohe uuesti. Kui ükski pakett ei ületa ainult palka, ütleb masin seda: ruumi pole. „Ava mängukast“ viib sama olukorra mängukasti (`#s=…&a=…&w=…&p=…&k=…` aadressiribal, ei lähe serverisse).
- **`mangukast.html`: läbirääkimise mängukast.** Sammhaaval treening Lõnga otsa skeletil: seitse sõlme (viis väidet, Laud, Üllatus), piirid enne lauda, FIRE-sild ja vestluskaart (`vaidlus.md`). Sama, mis enne oli „Vaieldav masin“, ja varem „playbook“; jäi alles.
- **`vaidle-mudel.js`: üks tõde.** Hinnad, kulukordajad, tugevused, kõrvapott, lahendaja (kõigi kombinatsioonide läbivaatus), rahandus ja hoobade tekstid on ainult siin. Omanik, versioon ja ülevaatuse kuupäev on mõlemal lehel nähtaval. Muudatus tehakse siin ja mõlemad lehed saavad selle; kõik arvud on oletused, mitte andmed.
- **Mõõtmine:** olemasolevad `Knot Opened`, `Next Thread Pulled`, `Sample Loaded`, `Card Downloaded` (kaardid `tingi` ja `mangukast`), `Package Offered`, `Surprise Drawn` jt; lihtsal lehel uued `Sentence Read` (kindlus high/mid/low), `Reading Corrected` (väli) ja `Gamebox Opened`. Lause, numbrid ja unistus ei lähe kunagi mõõtmisse (testitud).
- **Jev (TypeSafe) hiljem:** lugemise liides (`DEBATE_LIGHT.read` → `derive`) on tüübitud vastuste ja tõenäosustega, nii et reeglid saab asendada System One'i kutsega. See saadaks lause kolmandale poolele, seega ainult selge nupuga „Aita mul täita“, mitte vaikimisi.
- **Päritolu ja luba:** küsimus „my AI vs your AI“ pärineb Kaie Peetre LinkedIni postitusest; enne avalikku käivitust küsi luba ja krediteeri. Mõte on esmalt visandatud 2018. aastal (debatable machine) ja jõudis 2021. aasta magistritööni „fun.damental.life“.
- **Veel tegemata:** väljakutse sõbrale, vaikuse nupp, kahe masina vaidlus, ainult küsimustega režiim, füüsiline pakk.
- **Enne avalikku käivitust:** juriidiline ülevaatus (haridus, mitte nõu), emakeelne ülevaatus eesti keelele, mõõtmise õiguslik hinnang, hoobade hindade ülevaatus praktikutega ja kontroll, mida tööandja leping lubab.

## Open Playbook API viide ja „ehitame avalikult“ (`public/open-playbook-api.html`)

Korporatiivse selge kujuga viide, mis on saidi osa aadressil `meeleraha.ee/open-playbook-api`. Leht ei ole käsitsi kirjutatud: ta joonistab JSON-spetsifikatsiooni. Värvid, kirjatüübid, taevas, menüü ja jalus tulevad saidi enda `mr.css`-ist ja ühisest raamist (tume režiim töötab), struktuur on sama selge: vasakul sisukord ja otsing, üks sektsioon teema kohta, tabelid ja staatused kuju ja sõnaga (ilma suurtähtedeta).

- **Koht:** viide on **jaluses kõigil lehtedel** („Partneritele: Open Playbook API“, üheksas keeles) ja ei ole ülemises menüüs: menüü on inimestele, viide on partneritele. Lehe nimi ei ole `/api/…`, et mitte kokku põrgata tulevaste lõpp-punktidega.
- **Allikad:** operatsioonid tulevad `open-playbook-api.openapi.json` ja `allowlist.json` failist (`openapi_to_spec.py` kaudu); arvud (sündmused, komponendid, kataloogi kirjed, testifailid, mudeli versioon) loetakse ehitamisel repost; ülejäänud on `build_reference.py` käsitsi sektsioonid. Kõik mustandi lõpp-punktid on **Closed**: HTTP-teenust ei ole.
- **Ehitamine:** `python3 tools/open-playbook-api/build_reference.py --repo . --out public/open-playbook-api.html`. Vaikimisi kujundus on `meeleraha-reference-layout.html`; `--layout api-reference-layout.html` annab üldise, brändita lehe teistele organisatsioonidele (vt `HOW-TO-REUSE.md`). Ehita uuesti iga väljalaske, lubatud nimekirja, reeglite või mudeli muutuse järel; `tests/api.test.mjs` kukub, kui leht on repost maha jäänud.
- **Avalik logi:** sektsioon „Building in public“ on väljalasete kviitungid (mis ehitati, mis testiti, mis märgiti). Iga väljalase lisab ühe rea; rida ilma märgitud nimekirjata ei ole väljalase.
- **Põhimõtted:** „Principles: one protocol, many playbooks“ ütleb, mis on kõigil läbirääkimistel ühine ja mis muutub playbookis. „Võrdne“ tähendab nähtavust, mitte võimu; „turvaline“ tähendab täna kohalikku esimest, kahe poole turvaline võrdlus on ehitamata (Sharemindi küsimus 5). Lapse nime lehel ei ole (testitud).
- **Privaatsuse teekaart:** rühm „Guardrails“ võtab kokku, mida täna lubatakse ja mida võiks muuta ning mis tingimustel. 3. etapp: majutatud mudelit käitusajal ei kasutata, lause ei lahku brauserist.
- **Leid:** kõik Meeleraha lehed laevad kirjatüübid Google'ist (`fonts.googleapis.com`), mis on päring kolmandale osapoolele lehe laadimisel. Uuringumärge väitis, et kõik päringud lähevad meeleraha.ee-le. Kontrolli brauseris; isehostimine või süsteemikirjatüübid kaotaksid selle (viide märgib seda kui ehitamata).
- **Kontrollida pärast deploy'd:** kanoonilised aadressid (`/tingi`, `/mangukast`, `/open-playbook-api`) ja et jaluse link avab lehe.
