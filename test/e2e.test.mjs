// Real-browser tests — run with: npm run test:e2e
//
// jsdom has no layout, no CSS cascade, no CSP and no real input events, so
// the things that only a browser can get wrong are checked here in Chrome:
// sizing on hostile pages, Trusted Types and style-src enforcement, dragging,
// real typing, themes, downloads, fullscreen and cross-tab handoff over the
// localStorage fallback (no GM_* APIs are defined here, on purpose).
//
// Uses the Chrome already installed on the machine (E2E_CHANNEL to change,
// e.g. "msedge" or "chromium" after `npx playwright install chromium`).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const SCRIPT = fs.readFileSync(new URL('../pomodoro.user.js', import.meta.url), 'utf8');
const ORIGIN = 'https://app.test';

const page = (head, body = '') =>
  '<!doctype html><html><head><meta charset="utf-8"><title>Example Page</title>' + head + '</head>' +
  '<body><h1>site</h1><input id="page-input">' + body + '</body></html>';

const PAGES = {
  '/plain': { html: page('') },
  // Everything a page can do to an injected widget short of removing it.
  '/hostile': {
    html: page('<style>' +
      'html { font-size: 62.5%; }' +
      'body { text-transform: uppercase; letter-spacing: 6px; word-spacing: 20px; font-style: italic; text-align: right; line-height: 3; color: red; visibility: hidden; }' +
      'div { display: none !important; opacity: 0.1 !important; transform: scale(3) !important; width: 10px !important; }' +
      '* { box-sizing: content-box; }' +
      '</style>'),
  },
  '/strict': {
    html: page(''),
    csp: "default-src 'none'; style-src 'none'; require-trusted-types-for 'script'",
  },
  // A site with a single-key shortcut that swallows the letter k.
  '/hotkeys': {
    html: page('', '<script>document.addEventListener("keydown", e => { if (e.key === "k") e.preventDefault(); });</script>'),
  },
};

let browser;
before(async () => {
  browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'chrome', headless: true });
});
after(async () => { await browser.close(); });

// One isolated profile (its own localStorage) per test.
async function withContext(fn, options = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1000, height: 700 }, colorScheme: 'dark' }, options));
  await ctx.route(ORIGIN + '/**', (route, req) => {
    const def = PAGES[new URL(req.url()).pathname];
    if (!def) return route.fulfill({ status: 404, body: '' });
    const headers = { 'content-type': 'text/html; charset=utf-8' };
    if (def.csp) headers['content-security-policy'] = def.csp;
    return route.fulfill({ status: 200, headers, body: def.html });
  });
  try { await fn(ctx); } finally { await ctx.close(); }
}

// Open a page and run the userscript in it, as Tampermonkey would at document-end.
async function open(ctx, path = '/plain', { clock = false } = {}) {
  const p = await ctx.newPage();
  p.problems = [];
  p.on('pageerror', e => p.problems.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') p.problems.push('console: ' + m.text()); });
  await p.goto(ORIGIN + path);
  if (clock) await freeze(p, new Date(2026, 2, 10, 9, 0, 0));
  await p.evaluate(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
  });
  await p.evaluate(SCRIPT);
  if (clock) await p.clock.runFor(500); // the idle-time leadership claim
  await p.locator('#pw-card').waitFor();
  return p;
}

// A fake clock that only moves when a test says so (clock.runFor).
async function freeze(p, time) {
  await p.clock.install({ time });
  await p.clock.pauseAt(new Date(time.getTime() + 1000));
}

const box = (p, sel) => p.locator(sel).boundingBox();
const css = (p, sel, prop) => p.locator(sel).evaluate((n, pr) => getComputedStyle(n)[pr], prop);
const stored = (p, key) => p.evaluate(k => JSON.parse(localStorage.getItem(k)), key);

test('renders with the intended geometry and no errors', () => withContext(async ctx => {
  const p = await open(ctx);
  const card = await box(p, '#pw-card');
  assert.equal(card.width, 290);
  assert.ok(card.height > 300 && card.height < 520, 'card height ' + card.height);
  assert.equal(Math.round(card.x + card.width), 1000 - 20, 'docked 20px from the right');
  assert.equal(Math.round(card.y + card.height), 700 - 20, 'docked 20px from the bottom');
  const tab = await box(p, '#pw-tab');
  assert.equal(tab.x, 16, 'drawer tab 16px from the left');
  assert.equal(Math.round(tab.y + tab.height), 700, 'drawer tab flush with the bottom');
  assert.equal(await css(p, '#pw-time', 'fontSize'), '30px');
  assert.equal(await css(p, '#pw-card', 'backgroundColor'), 'rgb(15, 23, 42)');
  assert.equal(await css(p, '#pw-phase', 'color'), 'rgb(244, 63, 94)');
  assert.equal(await p.evaluate(() => document.getElementById('pomodoro-focus-timer-host').shadowRoot.adoptedStyleSheets.length), 1);
  assert.match(await p.title(), /^🍅 25:00 Focus — Example Page$/);
  assert.deepEqual(p.problems, []);
}));

test('a hostile page stylesheet cannot resize, restyle or hide the widget', () => withContext(async ctx => {
  const p = await open(ctx, '/hostile');
  const card = await box(p, '#pw-card');
  assert.equal(card.width, 290, 'unaffected by html{font-size:62.5%} and div{width:10px!important}');
  assert.equal(await css(p, '#pw-time', 'fontSize'), '30px');
  assert.equal(await css(p, '#pw-time', 'textTransform'), 'none');
  assert.equal(await css(p, '#pw-time', 'fontStyle'), 'normal');
  assert.equal(await css(p, '#pw-phase', 'wordSpacing'), '0px');
  assert.equal(await css(p, '#pw-card', 'visibility'), 'visible');
  assert.equal(await css(p, '#pw-card', 'boxSizing'), 'border-box');
  assert.equal(await css(p, '#pomodoro-focus-timer-host', 'opacity'), '1');
  assert.equal(await css(p, '#pomodoro-focus-timer-host', 'transform'), 'none');
  assert.ok(await p.locator('#pw-play').isVisible());
  // Same footprint as on a clean page.
  const clean = await box(await open(ctx, '/plain'), '#pw-card');
  assert.equal(card.height, clean.height);
}));

test("works under Trusted Types and style-src 'none'", () => withContext(async ctx => {
  const p = await open(ctx, '/strict');
  assert.equal((await box(p, '#pw-card')).width, 290, 'styled despite style-src none');
  assert.equal(await css(p, '#pw-card', 'backgroundColor'), 'rgb(15, 23, 42)');
  assert.ok(await p.locator('#pw-play svg').isVisible(), 'markup accepted through the Trusted Types policy');
  // Exercise every dynamic view: none may trip the CSP.
  await p.locator('[data-act="toggle"]').click();
  await p.locator('[data-act="stats"]').click();
  assert.equal(await p.locator('#pw-chart .pw-bar').count(), 7);
  assert.ok((await box(p, '#pw-chart .pw-col.today .pw-bar')).height >= 2);
  await p.locator('#pw-view-stats [data-act="back"]').click();
  await p.locator('[data-act="settings"]').click();
  await p.locator('#pw-sel-theme').selectOption('light');
  assert.equal(await css(p, '#pw-card', 'backgroundColor'), 'rgb(255, 255, 255)');
  assert.deepEqual(await p.evaluate(() => window.__csp), []);
  assert.deepEqual(p.problems, []);
}));

test('typing in the widget is isolated from page shortcuts', () => withContext(async ctx => {
  const p = await open(ctx, '/hotkeys');
  await p.locator('#pw-task').click();
  await p.keyboard.type('kick-off, week 2');
  assert.equal(await p.locator('#pw-task').inputValue(), 'kick-off, week 2');
  await p.keyboard.press('Enter');
  assert.equal((await stored(p, 'pomodoro.state')).task, 'kick-off, week 2');
  assert.match(await p.title(), /Focus · kick-off, week 2 — Example Page$/);
  // Double spaces used to freeze the page via a title feedback loop.
  await p.locator('#pw-task').fill('two  spaces');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(100);
  assert.match(await p.title(), /^🍅 25:00 Focus · two spaces — Example Page$/);
}));

test('the countdown runs, completes a round and credits it', () => withContext(async ctx => {
  const p = await open(ctx, '/plain', { clock: true });
  await p.locator('#pw-play').click();
  assert.equal(await p.locator('#pw-state').textContent(), 'Focusing…');
  await p.clock.runFor(60_000);
  assert.equal(await p.locator('#pw-time').textContent(), '24:00');
  assert.match(await p.title(), /^🍅 24:00 Focus/);
  const ring = Number(await p.locator('#pw-ring').getAttribute('stroke-dashoffset'));
  assert.ok(ring > 12 && ring < 15, 'ring advanced by 1/25: ' + ring);

  await p.locator('#pw-extend').click();
  assert.equal(await p.locator('#pw-time').textContent(), '29:00');

  await p.clock.runFor(29 * 60_000 + 1000);
  assert.equal(await p.locator('#pw-phase').textContent(), 'Short Break');
  assert.equal(await p.locator('#pw-state').textContent(), 'Resting…', 'break auto-started');
  assert.equal(await css(p, '#pw-phase', 'color'), 'rgb(16, 185, 129)', 'accent follows the phase');
  assert.equal(await p.locator('#pw-dots i.done').count(), 1);
  const { key, day } = await stored(p, 'pomodoro.today');
  assert.equal(key, '2026-03-10');
  assert.equal(day.focus, 30 * 60);
  assert.equal(day.rounds, 1);
  assert.equal(await p.locator('#pw-today').textContent(), 'Today: 30m focused · 1 rounds');
  assert.deepEqual(p.problems, []);
}));

test('a round that straddles midnight is split between the two days', () => withContext(async ctx => {
  const p = await ctx.newPage();
  await p.goto(ORIGIN + '/plain');
  await freeze(p, new Date(2026, 2, 10, 23, 50, 0));
  await p.evaluate(SCRIPT);
  await p.clock.runFor(500);
  await p.locator('#pw-play').click();
  await p.clock.runFor(25 * 60_000 + 1000);
  const today = await stored(p, 'pomodoro.today');
  const stats = Object.assign(await stored(p, 'pomodoro.stats'), { [today.key]: today.day });
  assert.equal(today.key, '2026-03-11', 'the frequently written record moved to the new day');
  assert.ok(Math.abs(stats['2026-03-10'].focus - 599) <= 1, JSON.stringify(stats)); // started just after 23:50:01
  assert.equal(stats['2026-03-10'].focus + stats['2026-03-11'].focus, 1500);
  assert.equal(stats['2026-03-11'].rounds, 1, 'the round counts on the day it finished');
}));

test('dragging moves the widget and the position persists', () => withContext(async ctx => {
  const p = await open(ctx);
  const start = await box(p, '#pw-card');
  const header = await box(p, '#pw-header');
  const grab = { x: header.x + 60, y: header.y + header.height / 2 };
  await p.mouse.move(grab.x, grab.y);
  await p.mouse.down();
  await p.mouse.move(grab.x - 300, grab.y - 200, { steps: 5 });
  await p.mouse.up();
  const moved = await box(p, '#pw-card');
  assert.equal(moved.x, start.x - 300);
  assert.equal(moved.y, start.y - 200);
  assert.deepEqual((await stored(p, 'pomodoro.ui')).pos, { left: Math.round(moved.x), top: Math.round(moved.y) });

  // Dragging far off-screen is clamped inside the viewport.
  await p.mouse.move(moved.x + 60, moved.y + 15);
  await p.mouse.down();
  await p.mouse.move(-500, -500, { steps: 3 });
  await p.mouse.up();
  const clamped = await box(p, '#pw-card');
  assert.equal(clamped.x, 4);
  assert.equal(clamped.y, 4);

  // A fresh page in the same profile comes up in the same place.
  const again = await box(await open(ctx), '#pw-card');
  assert.equal(again.x, 4);
  assert.equal(again.y, 4);

  // A smaller window keeps it reachable without forgetting where it was.
  await p.bringToFront();
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));
  await p.locator('#pw-card').waitFor();
  await p.mouse.move(64, 19);
  await p.mouse.down();
  await p.mouse.move(700, 300, { steps: 3 });
  await p.mouse.up();
  const far = await box(p, '#pw-card');
  const right = () => document.getElementById('pomodoro-focus-timer-host').getBoundingClientRect().right;
  await p.setViewportSize({ width: 500, height: 700 });
  await p.waitForFunction(() => window.innerWidth === 500);
  await p.waitForTimeout(100); // the resize event is delivered on a later frame
  assert.equal(await p.evaluate(right), 500 - 4, 'clamped into the narrower window');
  await p.setViewportSize({ width: 1000, height: 700 });
  await p.waitForFunction(() => window.innerWidth === 1000);
  await p.waitForTimeout(100);
  assert.equal((await box(p, '#pw-card')).x, far.x, 'back where the user left it');
}));

test('pill, drawer tab and hotkey', () => withContext(async ctx => {
  const p = await open(ctx);
  await p.locator('[data-act="min"]').click();
  assert.ok(await p.locator('#pw-pill').isVisible());
  assert.ok(await p.locator('#pw-card').isHidden());
  const pill = await box(p, '#pw-pill');
  assert.ok(pill.width < 120 && pill.height < 40, JSON.stringify(pill));
  await p.locator('#pw-pill').click();
  assert.ok(await p.locator('#pw-card').isVisible());

  await p.locator('#pw-tab').click();
  assert.ok(await p.locator('#pw-card').isHidden());
  assert.ok(await p.locator('#pw-tab').isVisible(), 'the drawer tab stays');

  await p.locator('h1').click();
  await p.keyboard.press('Alt+Shift+KeyT');
  assert.ok(await p.locator('#pw-card').isVisible(), 'hotkey shows the widget');
  // Alt combos type characters on macOS, so a page field keeps them.
  await p.locator('#page-input').click();
  await p.keyboard.press('Alt+Shift+KeyT');
  assert.ok(await p.locator('#pw-card').isVisible(), 'not stolen from a page field');

  // Record a new hotkey with real key presses.
  await p.locator('[data-act="settings"]').click();
  await p.locator('#pw-hotkey').click();
  await p.keyboard.press('Control+Shift+KeyY');
  assert.equal(await p.locator('#pw-hotkey').textContent(), 'Ctrl+Shift+Y');
  assert.ok(await p.locator('#pw-card').isVisible());
  await p.keyboard.press('Control+Shift+KeyY');
  assert.ok(await p.locator('#pw-card').isHidden());
}));

test('themes follow the system unless overridden', () => withContext(async ctx => {
  const p = await open(ctx);
  await p.emulateMedia({ colorScheme: 'light' });
  assert.equal(await css(p, '#pw-card', 'backgroundColor'), 'rgb(255, 255, 255)');
  assert.equal(await css(p, '#pw-time', 'color'), 'rgb(15, 23, 42)');
  await p.emulateMedia({ colorScheme: 'dark' });
  assert.equal(await css(p, '#pw-card', 'backgroundColor'), 'rgb(15, 23, 42)');
  await p.locator('[data-act="settings"]').click();
  await p.locator('#pw-sel-theme').selectOption('light');
  assert.equal(await css(p, '#pw-card', 'backgroundColor'), 'rgb(255, 255, 255)', 'explicit light beats a dark system');
  // The settings panel scrolls instead of overflowing a short window.
  await p.setViewportSize({ width: 1000, height: 420 });
  const card = await box(p, '#pw-card');
  assert.ok(card.y >= 0 && card.y + card.height <= 420, 'card fits: ' + JSON.stringify(card));
}));

test('the timer follows the focused tab (localStorage fallback path)', () => withContext(async ctx => {
  // Real time here: each page would otherwise have its own fake clock.
  const a = await open(ctx);
  await a.locator('#pw-play').click();
  await a.waitForTimeout(2100);

  const b = await open(ctx);
  assert.ok(await b.locator('#pw-card').isVisible(), 'the new tab leads');
  assert.equal(await b.locator('#pw-state').textContent(), 'Focusing…', 'and picks up the running timer');
  await a.locator('#pw-card').waitFor({ state: 'hidden' }); // the old tab yields
  assert.ok(await a.locator('#pw-tab').isHidden());
  assert.equal(await a.title(), 'Example Page', 'and hands its title back');

  await b.locator('#pw-play').click(); // pause in the new leader
  const focus = (await stored(b, 'pomodoro.today')).day.focus;
  assert.ok(focus >= 2 && focus <= 4, 'time from both tabs counted once: ' + focus);

  await a.bringToFront();
  await a.evaluate(() => window.dispatchEvent(new Event('focus')));
  await a.locator('#pw-card').waitFor(); // focusing the first tab takes it back
  assert.equal(await a.locator('#pw-state').textContent(), 'Paused');
  await b.locator('#pw-card').waitFor({ state: 'hidden' });
}));

test('stats export downloads real files and import restores them', () => withContext(async ctx => {
  const p = await open(ctx, '/plain', { clock: true });
  await p.locator('#pw-task').fill('=SUM(A1)');
  await p.keyboard.press('Enter');
  await p.locator('#pw-play').click();
  await p.clock.runFor(90_000);
  await p.locator('#pw-play').click();
  await p.locator('[data-act="stats"]').click();

  const read = async d => fs.readFileSync(await d.path(), 'utf8');
  let [d] = await Promise.all([p.waitForEvent('download'), p.locator('[data-act="exportcsv"]').click()]);
  assert.equal(d.suggestedFilename(), 'pomodoro-stats-2026-03-10.csv');
  const csvText = await read(d);
  assert.match(csvText, /^date,task,focus_seconds,focus_minutes,rounds_that_day\n2026-03-10,'=SUM\(A1\),90,1\.5,0\n$/);

  [d] = await Promise.all([p.waitForEvent('download'), p.locator('[data-act="exportjson"]').click()]);
  assert.equal(d.suggestedFilename(), 'pomodoro-stats-2026-03-10.json');
  const backup = await read(d);

  await p.locator('#pw-clear').click();
  await p.locator('#pw-clear').click();
  assert.equal(await p.locator('#pw-stat-focus').textContent(), '0s');

  await p.locator('#pw-import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await p.locator('#pw-stats-msg', { hasText: 'Imported 1 day.' }).waitFor();
  assert.equal(await p.locator('#pw-stat-focus').textContent(), '1m');
  assert.equal(await p.locator('#pw-tasks .pw-task span').textContent(), '=SUM(A1)');
  assert.deepEqual(p.problems, []);
}));

test('hides while the page is fullscreen', () => withContext(async ctx => {
  const p = await open(ctx);
  await p.locator('h1').click();
  await p.evaluate(() => document.documentElement.requestFullscreen());
  await p.waitForFunction(() => !!document.fullscreenElement);
  await p.locator('#pw-card').waitFor({ state: 'hidden' });
  assert.ok(await p.locator('#pw-tab').isHidden());
  await p.evaluate(() => document.exitFullscreen());
  await p.locator('#pw-card').waitFor({ state: 'visible' });
}));

test('an excluded site stays clear until re-enabled elsewhere', () => withContext(async ctx => {
  const p = await open(ctx);
  await p.locator('[data-act="settings"]').click();
  assert.equal(await p.locator('#pw-exclude').textContent(), 'Hide on app.test');
  await p.locator('#pw-exclude').click();
  await p.locator('#pw-tab').waitFor({ state: 'hidden' });
  assert.equal(await p.title(), 'Example Page');

  // A new page on the excluded site never builds a widget.
  const q = await ctx.newPage();
  await q.goto(ORIGIN + '/plain');
  await q.evaluate(SCRIPT);
  await q.waitForTimeout(600);
  assert.equal(await q.locator('#pomodoro-focus-timer-host').count(), 0);
  await q.keyboard.press('Alt+Shift+KeyT');
  assert.equal(await q.locator('#pomodoro-focus-timer-host').count(), 0);
  assert.equal(await q.title(), 'Example Page');
}));

test('the completion chime can play after a click in the widget', () => withContext(async ctx => {
  const p = await ctx.newPage();
  // Observe the AudioContext the script creates.
  await p.addInitScript(() => {
    const Real = window.AudioContext;
    window.__audio = [];
    window.AudioContext = class extends Real { constructor(...a) { super(...a); window.__audio.push(this); } };
  });
  await p.goto(ORIGIN + '/plain');
  await p.evaluate(SCRIPT);
  await p.locator('#pw-card').waitFor();
  assert.equal(await p.evaluate(() => window.__audio.length), 0, 'no audio context before any interaction');
  await p.locator('[data-act="settings"]').click();
  await p.waitForFunction(() => window.__audio.length === 1);
  // A running context keeps an audio thread awake, so it must not stay running.
  await p.waitForFunction(() => window.__audio[0].state === 'suspended');
  // The preview chime schedules real oscillators without throwing.
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.locator('#pw-sel-chime').selectOption('digital');
  await p.waitForFunction(() => window.__audio[0].state === 'running'); // resumed for the preview chime
  await p.locator('#pw-volume').fill('40');
  await p.waitForFunction(() => window.__audio[0].state === 'suspended', null, { timeout: 5000 }); // and rests again
  assert.equal(await p.evaluate(() => window.__audio.length), 1, 'one context, reused');
  assert.deepEqual(errors, []);
  assert.equal((await stored(p, 'pomodoro.settings')).volume, 40);
}));
