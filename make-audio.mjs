// Genereerib eestikeelsed heliklipid TartuNLP Neurokõne avalikust API-st kausta public/audio.
// Käivita kohalikult: node scripts/make-audio.mjs
// Muutujad: SPEAKER (vaikimisi "mari"), SPEED (vaikimisi 0.9), TTS_URL
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';

const URL_ = process.env.TTS_URL || 'https://api.tartunlp.ai/text-to-speech/v2';
const SPEAKER = process.env.SPEAKER || 'mari';
const SPEED = parseFloat(process.env.SPEED || '0.9');
const clips = JSON.parse(await readFile(new URL('./clips.json', import.meta.url), 'utf8'));
const outDir = new URL('../public/audio/', import.meta.url);
await mkdir(outDir, { recursive: true });

const exists = async (u) => { try { await access(u); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let made = 0, skipped = 0, failed = 0;

for (const [id, text] of Object.entries(clips)) {
  const file = new URL(`${id}.wav`, outDir);
  if (await exists(file)) { skipped++; continue; }
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speaker: SPEAKER, speed: SPEED }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    made++;
    console.log(`ok   ${id}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${id}: ${e.message}`);
  }
  await sleep(400);
}
console.log(`Valmis. Tehtud ${made}, vahele jäetud ${skipped}, ebaõnnestus ${failed}.`);
if (failed) process.exitCode = 1;
