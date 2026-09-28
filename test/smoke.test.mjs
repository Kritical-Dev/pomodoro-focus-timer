// Smoke tests for pomodoro.user.js — run with: node test/run.mjs
//
// Boots real jsdom windows with a shared Tampermonkey-like storage (including
// cross-window change dispatch) and a controllable clock, so timer math and
// cross-tab leadership can be tested without waiting for real minutes to pass.
import { JSDOM } from 'jsdom';
import fs from 'node:fs';

// POMODORO_SCRIPT lets us point the suite at a mutated build (used to verify
// that the tests actually catch the regressions they were written for).
const SCRIPT = fs.readFileSync(
  process.env.POMODORO_SCRIPT || new URL('../pomodoro.user.js', import.meta.url),
  'utf8'
);

/* ---------------- shared Tampermonkey-like storage ---------------- */
const store = new Map();
const listeners = []; // { win, key, cb }

function setValue(fromWindow, key, value) {
  store.set(key, value);
  for (const l of listeners) {
    if (l.key === key && l.win !== fromWindow) l.cb(key, undefined, value, true);
  }
}

let fakeNow = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const windows = [];

// Poll instead of guessing: the timer wakes on its own schedule, so assertions
// wait for the observable state to settle rather than for a fixed delay.
async function until(cond, ms = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (cond()) return true;
    await sleep(25);
  }
  return cond();
}

function setVisibilityState(w, state) {
  Object.defineProperty(w.document, 'visibilityState', { value: state, configurable: true });
  Object.defineProperty(w.document, 'hidden', { value: state !== 'visible', configurable: true });
}
function setVisibility(w, state) {
  setVisibilityState(w, state);
  w.document.dispatchEvent(new w.Event('visibilitychange'));
}

/* ---------------- boot one window ---------------- */
async function boot({ hidden = false } = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><head><title>Example Page</title></head><body><h1>site</h1></body></html>',
    { url: 'https://example.com/', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;
  windows.push(w);
  w.Date.now = () => fakeNow; // controllable clock for the timer engine
  setVisibilityState(w, hidden ? 'hidden' : 'visible');

  const notifications = [];
  w.GM_getValue = k => store.get(k);
  w.GM_setValue = (k, v) => setValue(w, k, v);
  w.GM_notification = n => notifications.push(n);
  w.GM_registerMenuCommand = () => {};
  w.GM_addValueChangeListener = (key, cb) => { listeners.push({ win: w, key, cb }); return listeners.length; };

  w.eval(SCRIPT);
  await sleep(40); // the leadership claim is deferred to an idle slot

  // Resolved lazily: the widget is built later (on becoming the leader), so a
  // snapshot taken here would never observe it.
  const hostOf = () => w.document.getElementById('pomodoro-focus-timer-host');
  const shadowOf = () => { const h = hostOf(); return h ? h.shadowRoot : null; };
  return {
    dom, w, notifications,
    get built() { return !!hostOf(); },
    get shadow() { return shadowOf(); },
    $: sel => { const s = shadowOf(); return s ? s.querySelector(sel) : null; },
  };
}

/* ---------------- tiny test runner ---------------- */
let failures = 0;
function check(name, cond, info) {
  if (cond) { console.log('  \u2713 ' + name); }
  else { failures++; console.log('  \u2717 ' + name + (info !== undefined ? '  →  ' + info : '')); }
}
function section(t) { console.log('\n' + t); }

const occurrences = (str, sub) => str.split(sub).length - 1;
const leaderOf = () => JSON.parse(store.get('pomodoro.leader') || 'null');

/* ================================================================== */
const main = async () => {
  section('Boot & widget visibility');
  const A = await boot();
  const tab = A.$('#pw-tab');
  check('the leading tab builds the widget', A.built);
  check('card is visible', !A.$('#pw-card').classList.contains('hidden'));
  check('drawer tab is visible (no "hidden")', !tab.classList.contains('hidden'), tab.className);
  check('drawer tab has "flex"', tab.classList.contains('flex'));
  check('drawer tab is docked bottom-left', /\bfixed\b/.test(tab.className) && /\bbottom-0\b/.test(tab.className) && /\bleft-4\b/.test(tab.className));
  check('drawer tab shows the down arrow while open', A.$('#pw-tab-icon').innerHTML.includes('M7.41 8.59'));

  section('Tabs that never lead stay inert');
  const leaderBefore = store.get('pomodoro.leader');
  const C = await boot({ hidden: true });
  check('a hidden tab builds no DOM at all', !C.built);
  check('a hidden tab does not claim leadership', store.get('pomodoro.leader') === leaderBefore);
  setVisibility(C.w, 'visible');
  await until(() => C.built);
  check('becoming visible builds the widget', C.built);
  check('becoming visible claims leadership', leaderOf().id !== JSON.parse(leaderBefore).id);
  check('the previous leader yields', A.$('#pw-tab').classList.contains('hidden'));
  A.w.dispatchEvent(new A.w.Event('focus'));
  await until(() => !A.$('#pw-card').classList.contains('hidden'));
  check('focusing the old tab takes leadership back', !A.$('#pw-card').classList.contains('hidden'));

  section('Tab title (no runaway feedback loop)');
  const t0 = A.w.document.title;
  check('title shows the countdown', t0.includes('\u{1F345}') && t0.includes('25:00'), t0);
  check('title has exactly one separator', occurrences(t0, ' \u2014 ') === 1, JSON.stringify(t0));
  check('title is not accumulating', t0.length < 60, JSON.stringify(t0));

  section('Timer math from timestamps');
  A.$('#pw-play').click();
  check('play switches to running state', A.$('#pw-state').textContent === 'Focusing\u2026', A.$('#pw-state').textContent);
  fakeNow += 60000;
  await until(() => A.$('#pw-time').textContent === '24:00');
  check('after 60s of (fake) time the clock reads 24:00', A.$('#pw-time').textContent === '24:00', A.$('#pw-time').textContent);
  const t1 = A.w.document.title;
  check('title stays bounded while ticking', occurrences(t1, ' \u2014 ') === 1 && t1.length < 60, JSON.stringify(t1));

  section('Phase completion, stats & auto-start');
  fakeNow += 25 * 60000;
  await until(() => A.$('#pw-phase').textContent === 'Short Break');
  check('phase advanced to Short Break', A.$('#pw-phase').textContent === 'Short Break', A.$('#pw-phase').textContent);
  check('break auto-started (default setting)', A.$('#pw-state').textContent === 'Resting\u2026', A.$('#pw-state').textContent);
  check('the completion announced exactly once', A.notifications.length === 1, String(A.notifications.length));
  const stats = JSON.parse(store.get('pomodoro.stats') || '{}');
  const d = stats[Object.keys(stats)[0]] || {};
  check('a focus round was credited', d.rounds === 1, JSON.stringify(d));
  check('focus time was credited', (d.focus || 0) > 0, JSON.stringify(d));
  check('task captured as Untracked', d.tasks && d.tasks.Untracked > 0, JSON.stringify(d.tasks));

  section('Site/SPA title changes are not duplicated');
  A.w.document.title = 'New Site Title';
  await sleep(50);
  const t2 = A.w.document.title;
  check('title picked up the new site name once', t2.endsWith('New Site Title') && occurrences(t2, 'New Site Title') === 1, JSON.stringify(t2));
  check('title still has one separator', occurrences(t2, ' \u2014 ') === 1, JSON.stringify(t2));

  section('Cross-tab leadership (one running instance)');
  const B = await boot();
  check('newest focused tab is the leader (widget shown)', !B.$('#pw-card').classList.contains('hidden'));
  check('previous tab yields (widget hidden)', A.$('#pw-card').classList.contains('hidden'));
  check('previous tab hides the drawer tab too', A.$('#pw-tab').classList.contains('hidden'));
  check('previous tab restores the site title', A.w.document.title === 'New Site Title', JSON.stringify(A.w.document.title));
  check('leader tab keeps the countdown', B.w.document.title.includes('Short Break'), JSON.stringify(B.w.document.title));
  A.w.dispatchEvent(new A.w.Event('focus'));
  await sleep(50);
  check('focusing the old tab reclaims leadership', !A.$('#pw-tab').classList.contains('hidden'));
  check('the other tab yields again', B.$('#pw-tab').classList.contains('hidden'));

  section('Drawer tab toggling');
  A.$('#pw-tab').click();
  check('tab click hides the widget', A.$('#pw-card').classList.contains('hidden'));
  check('tab arrow flips to up when hidden', A.$('#pw-tab-icon').innerHTML.includes('M7.41 15.41'));
  A.$('#pw-tab').click();
  check('tab click shows the widget again', !A.$('#pw-card').classList.contains('hidden'));
  check('tab arrow flips to down when shown', A.$('#pw-tab-icon').innerHTML.includes('M7.41 8.59'));

  section('Structural guards for the idle/timer model');
  check('no polling timers anywhere (setInterval)', !SCRIPT.includes('setInterval'));
  check('catch-up completions are silent', SCRIPT.includes('announce && !catchingUp'));
  check('catch-up chains are capped', SCRIPT.includes('rapidSteps < 20'));
  check('UI is built lazily, not at startup', SCRIPT.includes('function buildUI()'));
  check('no store reads at load time', !/^\s*let settings = Object\.assign\({}, DEFAULT_SETTINGS, store\.get/m.test(SCRIPT));

  // Clean up jsdom timers so the process can exit.
  await sleep(50);
  for (const w of windows) w.close();

  console.log('\n' + (failures ? '\u2717 ' + failures + ' check(s) failed' : '\u2713 all checks passed'));
  process.exit(failures ? 1 : 0);
};

main().catch(err => { console.error('\nHarness error:', err); process.exit(1); });
