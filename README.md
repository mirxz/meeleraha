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
| Plaani | `debate.html` | Vaieldav masin: palgavestluse harjutus lõngal, mis viib sinu unistuseni. Link Lõnga otsa neljandast sõlmest ja Mängukastist. Vt allpool. |
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

## Katse: vaieldav masin (`debate.html`)

Ühe faili tööriist, mis töötab täielikult brauseris (ei serverit, ei salvestust, ei võrgupäringuid). Inglise- ja eestikeelne; muud keeled näitavad inglise sisu. Sihtrühm: inimesed, kes tahavad oma palgakasvu viia sinnamaani, et unistus (FIRE) oleks saavutatav.

**Sama anatoomia mis Lõnga otsal.** Üks lõng viie sõlmega, igaüks on vastaspoole väide. Sõlmel on ring, „Mis muutub“, „Väide“ koos „Miks?“, „Kuidas see arv tehti?“, „Unista“, „Lõks ja valmisoleku märk“ ja „Allikas“ koos usaldusmärgiga (`[verified]`, `[secondary]`, `[inferred]`, `[kontrollimata]`). Ees on Esimene tõmme (kolm väljamõeldud juhti), Kompass, Sinu unistus ja Sinu numbrid näidisandmetega; lõpus Lõnga ots (sinu unistus) ja „Võta kaasa“ (`vaidlus.md`, „ilma summadeta“). Lõnga otsa lehel on neljas sõlm lingiga siia ning Mängukastis on kirje `vaidlusmasin`.

- **Mudel:** reeglipõhine, mitte LLM. Tulemus = tõendi tugevus + 1, kui küsisid enne „Miks?“ − vastupanu; 2 või rohkem võtab väite tagasi, 1 nõrgendab (pool väärtust). Tabelid `STR`, `RES`, `VAL`, `BASE` lehe skriptis ja nähtavad „Kuidas see arv tehti?“ all. Pakkumine ei ületa sinu soovi. Tugevused ja vastupanud on oletused, mitte andmed.
- **Majandus nagu Elukaares:** tulemused on vahemikud tootlusel 4–0%, tänase raha hindades, ilma maksudeta. Kolm teed (täna, selle tõusuga, sama summa kulusid vähendades, mis langetab ka sihti) ja tagurpidi arvutus („vajad kuus säästu X–Y“). Kui sõltumatuseni on üle viie aasta, ütleb leht ausalt, et üks tõus liigutab kuupäeva kuudega või mõne aastaga, ja näitab 5 aasta lisasäästu. Sõltumatu kontroll testis (suletud valem).
- **Piirid enne lauda:** sinu enda reeglid enne vestlust: miinimumtõus (ei võta alla) ja kolm prioriteeti kaheksa hoova seast. Prioriteedid määravad, mis on sulle iga hoob väärt (×3, ×2, ×1,5; muud ×1). Lõpus märgib masin, kas piir pidas; ta ei otsusta sinu eest.
- **2. vaatus, Laud (6. sõlm):** kaheksa hooba (põhipalk, ühekordne boonus, lisapuhkus, kaugtöö, õppebüdžett, tiitel, varasem läbivaatus, lühem nädal) liuguritena, igaühel unistuse valuuta rida (päev puhkust = 8 tundi aastas sinu unistusele). Salvesta kuni kolm paketti; juht valib odavaima, mis mahub eelarvesse (praegune pakkumine + kõrvalpott). Ruumi mõõt on parima võimaliku paketi väärtus (kõigi kombinatsioonide läbivaatus) võrreldes ainult-palga pakkumisega. „Küsi: mis on teile odav?“ paljastab odavad ja kallid hoovad. Valitud paketi palgaosa läheb FIRE-sillale.
- **3. vaatus, Üllatus (7. sõlm):** neli kaarti stiili järjekorras: palgalagi, eelarve kärbe (−30%), tähtaja kingitus (tiitel +1, kui lepid täna) ja toolide vahetus (sina oled juht ja valid odavaima paketi, mis töötajale veel sobib). Vastus võrdleb sinu paketti parimaga uue piiri sees (95% väga hea, 75% lähedal).
- **Hinnamudel:** kulu neile = sammud × turuhind (% aastapalgast; päev puhkust = 0,4, õppebüdžett = summa ÷ palk, muud oletused) × stiili kulukordaja; väärtus sulle = sammud × turuhind × prioriteedi kordaja. Kõik tabelid (`KAP`, `POOL`, `mkt`) on lehe skriptis ja nähtavad „Kuidas see arv tehti?“ all; need on oletused, mitte andmed.
- **Tulevane mina:** lõpus ütleb tulevane mina, mitu kuud varem jõuad sõltumatuseni (4% tootlus).
- **Veel tegemata:** väljakutse sõbrale (seis lingis), vaikuse nupp, kahe masina vaidlus kohtunikuga, ainult küsimustega režiim ja füüsiline kaardipakk.
- **Provokatsioon ja paljastus:** nupp „Võta nende pakkumine kohe vastu“; paljastus näitab, mitu väidet jäi uurimata. Lõpetamine nõuab ühe lause.
- **Mõõtmine:** kolmteist uut sündmust (`Debate Started`, `Evidence Brought`, `Why Opened`, `Claim Challenged`, `Claim Accepted`, `Offer Accepted`, `Independence Shift Viewed`, `Debate Restarted`, `Cheap Levers Asked`, `Package Saved`, `Package Offered`, `Surprise Drawn`, `Surprise Answered`) ning olemasolevad `Knot Opened`, `Next Thread Pulled`, `Sample Loaded`, `Card Downloaded` (kaart `debate`). Numbrid, lause ja unistus ei lähe kunagi mõõtmisse (testitud).
- **Raam:** leht kuulutab `data-mr-native="en"`, nii et inglise keele mustandi riba seal ei näidata.
- **Falsifikaator (viis inimest):** kui alla 3 viiest oskab pärast vaidlust nimetada allikata väite ja kirjutada lause, on masin teater.
- **Päritolu ja luba:** küsimus „my AI vs your AI“ pärineb Kaie Peetre LinkedIni postitusest; enne avalikku käivitust küsi luba ja krediteeri. Mõte on esmalt visandatud 2018. aastal (debatable machine) ja jõudis 2021. aasta magistritööni „fun.damental.life“.
- **Enne avalikku käivitust:** juriidiline ülevaatus (haridus, mitte nõu), emakeelne ülevaatus eesti keelele, mõõtmise õiguslik hinnang, ja kontroll, mida tööandja leping lubab.
