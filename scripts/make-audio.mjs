// Genereerib eestikeelsed heliklipid TartuNLP Neurokõne avalikust API-st kausta public/audio.
// Käivita kohalikult: node scripts/make-audio.mjs
// Muutujad: SPEAKER (vaikimisi "mari"), SPEED (vaikimisi 0.9), TTS_URL,
//           MP3=1 teisendab klipid mp3-ks (vajab ffmpeg-i), et failid oleksid mitu korda väiksemad.
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const URL_ = process.env.TTS_URL || 'https://api.tartunlp.ai/text-to-speech/v2';
const SPEAKER = process.env.SPEAKER || 'mari';
const SPEED = parseFloat(process.env.SPEED || '0.9');
const MP3 = process.env.MP3 === '1';
const clips = JSON.parse(await readFile(new URL('./clips.json', import.meta.url), 'utf8'));
const outDir = new URL('../public/audio/', import.meta.url);
await mkdir(outDir, { recursive: true });

const exists = async (u) => { try { await access(u); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let made = 0, skipped = 0, failed = 0;

for (const [id, text] of Object.entries(clips)) {
  const file = new URL(`${id}.wav`, outDir);
  const mp3 = new URL(`${id}.mp3`, outDir);
  if ((await exists(file)) || (await exists(mp3))) { skipped++; continue; }
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speaker: SPEAKER, speed: SPEED }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    if (MP3) {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', fileURLToPath(file), '-codec:a', 'libmp3lame', '-qscale:a', '5', fileURLToPath(mp3)]);
      await unlink(file);
    }
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
