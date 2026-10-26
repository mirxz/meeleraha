-- Koor (/pesa): ainult värv, hääl ja üks sõna. Ei nime, ei IP-d, ei kellaaega, ei vastuse teksti.
CREATE TABLE IF NOT EXISTS haaled (
  id TEXT PRIMARY KEY,
  hex TEXT NOT NULL,
  haal TEXT NOT NULL,
  sona TEXT NOT NULL,
  keel TEXT NOT NULL,
  paev TEXT NOT NULL,
  viimati TEXT NOT NULL,
  kordus INTEGER NOT NULL DEFAULT 1,
  olek TEXT NOT NULL DEFAULT 'ootab' CHECK (olek IN ('ootab','koor','kustutatud'))
);
CREATE INDEX IF NOT EXISTS haaled_olek ON haaled (olek, viimati);
