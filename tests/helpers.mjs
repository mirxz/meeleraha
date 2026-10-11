import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

export const PAGE_URL = new URL('../public/index.html', import.meta.url).href;
export const ROOT = fileURLToPath(new URL('../', import.meta.url));

export async function launch(extraArgs = []) {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required', ...extraArgs],
  });
}

export async function openPage(browser, { width = 390, height = 800, permissions = [] } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, permissions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_NAME_NOT_RESOLVED|fonts\.g/i.test(t)) return;
    errors.push(t);
  });
  await page.goto(PAGE_URL);
  await page.waitForTimeout(300);
  return { page, context, errors };
}

// Seab valikud lehel: acts = [bool x4], g = 0..300 (sammuga 25), mode = 'fut' | 'don'
export async function setState(page, { acts, g, mode }) {
  const chips = page.locator('#gA button');
  for (let i = 0; i < 4; i++) {
    const on = (await chips.nth(i).getAttribute('aria-pressed')) === 'true';
    if (on !== acts[i]) await chips.nth(i).click();
  }
  await page.click(mode === 'don' ? '#k2' : '#k1');
  await page.fill('#gf', String(g));
  await page.dispatchEvent('#gf', 'input');
}

export function parseMonths(text) {
  const m = text.match(/(\d+) a (\d+) k/);
  return m ? Number(m[1]) * 12 + Number(m[2]) : null;
}
