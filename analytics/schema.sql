-- Meeleraha anonüümne mõõtmine: ainult päevased loendurid. Ühtegi rida ei saa siduda inimesega.
CREATE TABLE IF NOT EXISTS events_daily (
  day       TEXT NOT NULL,   -- YYYY-MM-DD (UTC)
  event     TEXT NOT NULL,   -- „Objekt Tegevus“ (Segment Spec), vt public/taxonomy.json
  component TEXT NOT NULL,   -- leht.jaotis.komponent või tühi
  page      TEXT NOT NULL,   -- leht (infoarhitektuuri sõlm)
  lang      TEXT NOT NULL,   -- et | en
  prop      TEXT NOT NULL,   -- omaduse nimi või tühi (sündmuse kogusumma)
  val       TEXT NOT NULL,   -- lubatud väärtus või tühi
  n         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, component, page, lang, prop, val)
);
