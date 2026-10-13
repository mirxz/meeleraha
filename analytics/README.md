# Meeleraha mõõtmine

Põhimõte: **sisestatud numbrid ja tekst ei lahku brauserist**. Mõõdame ainult klõpse lubatud valikutega.

## Kuidas asju nimetatakse

- Sündmused: **Segment Spec** („Objekt Tegevus“, Title Case, minevikuvorm), nt `Situation Selected`.
- Komponendid: `leht.jaotis.komponent` (kebab-case), nt `ots.picker.situation-card`. Iga HTML-elemendi `data-mr-c` väärtus peab olema `public/taxonomy.json` registris.
- Omadused: snake_case ja ainult lubatud loendist (`enums`). Vabateksti ja numbreid omadused ei kanna.
- Üks tõe allikas: `public/taxonomy.json`. `public/taxonomy.js` on sellest tehtud koopia (testid kontrollivad, et need on samad).

## Deklaratiivne märgistus

```html
<a data-mr-c="nav.primary.link" data-mr-e="Nav Item Clicked" data-mr-p-item="haruta">…</a>
```

Programmiliselt: `MR.track('Block Moved', { preset_id: 'kool' }, 'ajatelg.timeline.block')`. Vigane sündmus, komponent või väärtus lükatakse tagasi ega lähe kuhugi.

## Mida see saadab

`navigator.sendBeacon('/api/e', {v:1, events:[{n, c, p, l, pg}]})`. Ei küpsiseid, ei püsivat tunnust, ei IP salvestamist. Do Not Track ja Global Privacy Control lülitavad mõõtmise välja. Iga lehe jaluses on „Mida see leht saadab“, mis näitab täpselt iga sündmuse.

## Lülitamine sisse (valikuline, saidi saab ka ilma)

Leht töötab ilma Workerita: kui `/api/e` ei vasta, ei juhtu midagi. Kui tahad loendureid:

1. `npx wrangler d1 create meeleraha-mootmine`
2. `npx wrangler d1 execute meeleraha-mootmine --remote --file=analytics/schema.sql`
3. Lisa `wrangler.jsonc` faili read failist `analytics/wrangler.example.jsonc` (pane oma `database_id`).
4. Deploy. Loendurite vaatamine:

```sql
SELECT day, event, SUM(n) AS n FROM events_daily WHERE prop = '' GROUP BY day, event ORDER BY day DESC, n DESC;
SELECT component, val, SUM(n) AS n FROM events_daily WHERE event = 'Situation Selected' AND prop = 'situation_id' GROUP BY val ORDER BY n DESC;
```

## Enne avalikku käivitust

Mõõtmise õiguslik hinnang (ePrivacy, GDPR) tuleb juristiga üle vaadata. Vaikimisi on mõõtmine sees, kui brauser ei ütle teisiti; selle saab vahetada failis `public/meeleraha.js` (`measure()`).
