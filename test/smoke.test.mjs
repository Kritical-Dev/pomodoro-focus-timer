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

// Starts at 09:00 local so the suite never straddles midnight by accident.
let fakeNow = new Date().setHours(9, 0, 0, 0);
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
async function boot({ hidden = false, trustedTypes = false } = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><head><title>Example Page</title></head><body><h1>site</h1></body></html>',
    { url: 'https://example.com/', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;
  windows.push(w);
  w.Date.now = () => fakeNow; // controllable clock for the timer engine
  setVisibilityState(w, hidden ? 'hidden' : 'visible');

  const notifications = [];
  const menu = []; // { label, fn } — Tampermonkey menu commands
  w.GM_getValue = k => store.get(k);
  w.GM_setValue = (k, v) => setValue(w, k, v);
  w.GM_notification = n => notifications.push(n);
  w.GM_registerMenuCommand = (label, fn) => { menu.push({ label, fn }); };
  w.GM_addValueChangeListener = (key, cb) => { listeners.push({ win: w, key, cb }); return listeners.length; };

  if (trustedTypes) {
    // Emulate `require-trusted-types-for 'script'`: innerHTML rejects plain strings.
    const desc = Object.getOwnPropertyDescriptor(w.Element.prototype, 'innerHTML');
    Object.defineProperty(w.Element.prototype, 'innerHTML', {
      configurable: true,
      get: desc.get,
      set(v) {
        if (!(v && v.__trusted)) throw new w.TypeError("This document requires 'TrustedHTML' assignment.");
        desc.set.call(this, v.html);
      },
    });
    w.trustedTypes = {
      createPolicy: (name, rules) => ({ createHTML: s => ({ __trusted: true, html: rules.createHTML(s) }) }),
    };
  }

  w.eval(SCRIPT);
  await sleep(40); // the leadership claim is deferred to an idle slot

  // Resolved lazily: the widget is built later (on becoming the leader), so a
  // snapshot taken here would never observe it.
  const hostOf = () => w.document.getElementById('pomodoro-focus-timer-host');
  const shadowOf = () => { const h = hostOf(); return h ? h.shadowRoot : null; };
  return {
    dom, w, notifications, menu,
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

  section('Settings & quality-of-life');
  const setNum = (key, v) => {
    const input = A.$('#pw-set-' + key);
    input.value = String(v);
    input.dispatchEvent(new A.w.Event('change', { bubbles: true }));
  };
  const settingsNow = () => JSON.parse(store.get('pomodoro.settings'));

  A.$('[data-act="reset"]').click();
  check('reset returns to a ready focus round', A.$('#pw-state').textContent === 'Ready', A.$('#pw-state').textContent);
  check('duration fields carry their bounds', A.$('#pw-set-focusMin').min === '1' && A.$('#pw-set-focusMin').max === '180');

  setNum('focusMin', 50);
  check('typing a duration is committed', settingsNow().focusMin === 50, JSON.stringify(settingsNow()));
  check('a fresh phase adopts the typed duration', A.$('#pw-time').textContent === '50:00', A.$('#pw-time').textContent);

  setNum('focusMin', 9999);
  check('out-of-range input is clamped', A.$('#pw-set-focusMin').value === '180', A.$('#pw-set-focusMin').value);
  A.$('[data-step="focusMin:-1"]').click();
  check('the steppers agree with the field', A.$('#pw-set-focusMin').value === '179', A.$('#pw-set-focusMin').value);

  // Drive a whole cycle with 1-minute phases so the round counter moves.
  setNum('focusMin', 1);
  setNum('shortMin', 1);
  A.$('#pw-play').click();
  fakeNow += 60000;
  await until(() => A.$('#pw-phase').textContent === 'Short Break');
  fakeNow += 60000;
  await until(() => A.$('#pw-rounds').textContent === 'Round 2/4');
  check('the round advances once a break finishes', A.$('#pw-rounds').textContent === 'Round 2/4', A.$('#pw-rounds').textContent);
  setNum('rounds', 1);
  check('shrinking rounds clamps the round in flight', A.$('#pw-rounds').textContent === 'Round 1/1', A.$('#pw-rounds').textContent);

  A.$('#pw-reset-settings').click();
  const defaults = JSON.parse(store.get('pomodoro.settings'));
  check('reset-settings restores every default', defaults.focusMin === 25 && defaults.shortMin === 5 && defaults.longMin === 15 && defaults.rounds === 4, JSON.stringify(defaults));
  check('reset-settings refreshes the fields', A.$('#pw-set-focusMin').value === '25', A.$('#pw-set-focusMin').value);
  check('reset-settings re-adopts the duration', A.$('#pw-time').textContent === '25:00', A.$('#pw-time').textContent);

  A.$('[data-act="hide"]').click();
  check('the hide button hides the widget', A.$('#pw-card').classList.contains('hidden'));
  check('the drawer tab stays available while hidden', !A.$('#pw-tab').classList.contains('hidden'));
  check('the drawer arrow points up while hidden', A.$('#pw-tab-icon').innerHTML.includes('M7.41 15.41'));
  A.$('#pw-tab').click();
  check('the drawer tab brings the widget back', !A.$('#pw-card').classList.contains('hidden'));

  A.$('[data-act="settings"]').click();
  check('the settings panel opens', !A.$('#pw-view-settings').classList.contains('hidden'));
  A.shadow.dispatchEvent(new A.w.KeyboardEvent('keydown', { key: 'Escape' }));
  check('Escape returns to the timer', !A.$('#pw-view-timer').classList.contains('hidden') && A.$('#pw-view-settings').classList.contains('hidden'));

  A.$('[data-act="stats"]').click();
  const weekTotal = A.$('#pw-week-total').textContent;
  check('stats total the last 7 days', /^This week: /.test(weekTotal) && weekTotal !== 'This week: 0m', weekTotal);
  check('stats show the focus credited today', A.$('#pw-stat-focus').textContent !== '0m', A.$('#pw-stat-focus').textContent);
  check('stats list the tracked task', A.$('#pw-tasks').textContent.includes('Untracked'), A.$('#pw-tasks').textContent);
  A.shadow.dispatchEvent(new A.w.KeyboardEvent('keydown', { key: 'Escape' }));

  section('Keystroke isolation (page shortcuts must not swallow typing)');
  const seenByPage = [];
  const pageHotkey = e => { seenByPage.push(e.key); if (e.key === 'k') e.preventDefault(); };
  A.w.document.addEventListener('keydown', pageHotkey);
  const keyEv = (key, extra = {}) => new A.w.KeyboardEvent('keydown', Object.assign({ key, code: 'KeyK', bubbles: true, composed: true }, extra));
  const task5 = A.$('#pw-task');
  task5.focus();

  const plainKey = keyEv('k');
  task5.dispatchEvent(plainKey);
  check('a plain letter never reaches page-level shortcuts', seenByPage.length === 0, seenByPage.join(','));
  check('we never preventDefault a plain letter ourselves', plainKey.defaultPrevented === false);

  task5.dispatchEvent(keyEv('K', { shiftKey: true }));
  check('shift+letter (capitals) stay inside too', seenByPage.length === 0, seenByPage.join(','));

  task5.dispatchEvent(keyEv('k', { ctrlKey: true }));
  check('modifier combos still reach the page (copy/paste, site shortcuts)', seenByPage.join(',') === 'k', seenByPage.join(','));

  seenByPage.length = 0;
  A.$('#pw-set-focusMin').dispatchEvent(keyEv('k'));
  check('the settings fields are shielded as well', seenByPage.length === 0, seenByPage.join(','));
  A.w.document.removeEventListener('keydown', pageHotkey);

  A.$('[data-act="settings"]').click();
  A.$('#pw-set-focusMin').dispatchEvent(new A.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
  check('the shield does not block our own key handling', !A.$('#pw-view-timer').classList.contains('hidden'));

  section('Focus accounting (exact, capped, handoff-safe)');
  // Summed over every stored day, so the checks hold whatever day a credit lands on.
  const todayStats = () => {
    const t = { focus: 0, rounds: 0, tasks: Object.create(null) };
    for (const d of Object.values(JSON.parse(store.get('pomodoro.stats') || '{}'))) {
      t.focus += d.focus;
      t.rounds += d.rounds;
      for (const [n, v] of Object.entries(d.tasks)) t.tasks[n] = (t.tasks[n] || 0) + v;
    }
    return t;
  };
  const setTask = name => { const t = A.$('#pw-task'); t.value = name; t.dispatchEvent(new A.w.Event('change')); };

  A.$('[data-act="reset"]').click();
  let before = todayStats();
  A.$('#pw-play').click();
  fakeNow += 30000;
  A.$('#pw-play').click(); // pause before any wakeup has accrued the time
  check('pausing credits the time since the last wakeup', todayStats().focus - before.focus === 30, todayStats().focus - before.focus);

  before = todayStats();
  A.$('[data-act="skip"]').click();
  check('skipping moves on to the break', A.$('#pw-phase').textContent === 'Short Break', A.$('#pw-phase').textContent);
  check('a skipped focus round is not counted as completed', todayStats().rounds === before.rounds, JSON.stringify(todayStats()));
  A.$('[data-act="reset"]').click();

  before = todayStats();
  let n0 = A.notifications.length;
  A.$('#pw-play').click();
  fakeNow += 5 * 3600000; // e.g. the laptop slept mid-round
  await until(() => A.$('#pw-phase').textContent === 'Short Break');
  check('a long sleep credits at most the phase length', todayStats().focus - before.focus === 25 * 60, todayStats().focus - before.focus);
  check('...and exactly one completed round', todayStats().rounds - before.rounds === 1, todayStats().rounds - before.rounds);
  check('the late completion is announced once', A.notifications.length - n0 === 1, A.notifications.length - n0);
  A.$('[data-act="reset"]').click();

  before = todayStats();
  A.$('#pw-play').click();
  fakeNow += 40000;
  B.w.dispatchEvent(new B.w.Event('focus'));
  await until(() => !B.$('#pw-card').classList.contains('hidden'));
  check('the focused tab takes over a running timer', B.$('#pw-state').textContent === 'Focusing…', B.$('#pw-state').textContent);
  B.$('#pw-play').click();
  check('focus time survives a tab handoff, counted once', todayStats().focus - before.focus === 40, todayStats().focus - before.focus);
  check('the new leader shows the exact remaining time', B.$('#pw-time').textContent === '24:20', B.$('#pw-time').textContent);
  A.w.dispatchEvent(new A.w.Event('focus'));
  await until(() => !A.$('#pw-card').classList.contains('hidden'));
  A.$('[data-act="reset"]').click();

  section('Tab title survives whitespace normalisation');
  // document.title's getter collapses runs of whitespace, so a task with double
  // spaces must not make our own write look like a site title change.
  setTask('Write   the  report');
  await sleep(50);
  const t3 = A.w.document.title;
  check('a task with repeated spaces does not snowball the title', occurrences(t3, ' — ') === 1 && t3.length < 90, JSON.stringify(t3.slice(0, 160)));

  section('Task names cannot corrupt stats');
  for (const name of ['constructor', '__proto__', 'toString']) {
    setTask(name);
    A.$('#pw-play').click();
    fakeNow += 5000;
    A.$('#pw-play').click();
  }
  setTask('');
  A.$('[data-act="reset"]').click();
  const tk = todayStats().tasks;
  check('"constructor" / "toString" are tracked as plain numbers', tk.constructor === 5 && tk.toString === 5, JSON.stringify(tk));
  check('"__proto__" is tracked as a plain number', Object.prototype.hasOwnProperty.call(tk, '__proto__') && tk['__proto__'] === 5, JSON.stringify(tk));

  section('Position follows the leader');
  store.set('pomodoro.ui', JSON.stringify({ mode: 'card', hidden: false, pos: { left: 100, top: 120 } }));
  B.w.dispatchEvent(new B.w.Event('focus'));
  await until(() => !B.$('#pw-card').classList.contains('hidden'));
  const bHost = B.w.document.getElementById('pomodoro-focus-timer-host');
  check('a reclaiming tab moves its widget to the saved position', bHost.style.left === '100px' && bHost.style.top === '120px', bHost.getAttribute('style'));

  section('Round dots, +5 min and the daily goal');
  A.w.dispatchEvent(new A.w.Event('focus'));
  await until(() => !A.$('#pw-card').classList.contains('hidden'));
  A.$('[data-act="reset"]').click();
  check('one dot per round, the current one marked', A.shadow.querySelectorAll('#pw-dots i').length === 4 && A.shadow.querySelectorAll('#pw-dots i.now').length === 1, A.$('#pw-dots').innerHTML);
  A.$('#pw-extend').click();
  check('+5 min extends a phase that has not started', A.$('#pw-time').textContent === '30:00', A.$('#pw-time').textContent);
  A.$('#pw-play').click();
  A.$('#pw-extend').click();
  check('+5 min extends a running phase', A.$('#pw-time').textContent === '35:00' && A.$('#pw-state').textContent === 'Focusing\u2026', A.$('#pw-time').textContent);
  A.$('[data-act="skip"]').click();
  check('a finished round fills its dot', A.shadow.querySelectorAll('#pw-dots i.done').length === 1, A.$('#pw-dots').innerHTML);
  A.$('[data-act="reset"]').click();

  setNum('goalMin', Math.ceil(todayStats().focus / 60) + 1);
  check('the footer shows progress toward the goal', / \/ /.test(A.$('#pw-today').textContent), A.$('#pw-today').textContent);
  n0 = A.notifications.length;
  A.$('#pw-play').click();
  fakeNow += 120000;
  A.$('#pw-play').click();
  check('reaching the goal is announced once', A.notifications.length - n0 === 1 && /goal/i.test(A.notifications[A.notifications.length - 1].title), JSON.stringify(A.notifications.slice(n0)));
  check('...and noted in the widget', /goal/i.test(A.$('#pw-notice').textContent) && !A.$('#pw-notice').classList.contains('hidden'), A.$('#pw-notice').textContent);
  check('notifications focus the tab when clicked', typeof A.notifications[A.notifications.length - 1].onclick === 'function');
  A.$('[data-act="stats"]').click();
  check('the stats view shows the goal bar', !A.$('#pw-goal').classList.contains('hidden') && A.$('#pw-goal-bar').style.width === '100%', A.$('#pw-goal-bar').style.width);
  check('pressing a button clears the notice', A.$('#pw-notice').classList.contains('hidden'));
  A.$('[data-act="back"]').click();
  setNum('goalMin', 0);
  A.$('[data-act="reset"]').click();

  section('Task autocomplete');
  const suggestions = [...A.shadow.querySelectorAll('#pw-tasklist option')].map(o => o.value);
  check('recent task names are offered', suggestions.includes('constructor') && suggestions.includes('toString'), suggestions.join(','));
  check('"Untracked" is not offered', !suggestions.includes('Untracked'), suggestions.join(','));

  section('Theme and sound settings');
  const setSelect = (key, v) => { const el = A.$('#pw-sel-' + key); el.value = v; el.dispatchEvent(new A.w.Event('change')); };
  setSelect('theme', 'light');
  check('the theme applies immediately', A.$('#pw-wrap').getAttribute('data-theme') === 'light');
  setSelect('chime', 'digital');
  A.$('#pw-volume').value = '35';
  A.$('#pw-volume').dispatchEvent(new A.w.Event('change'));
  check('chime and volume are saved', settingsNow().chime === 'digital' && settingsNow().volume === 35, JSON.stringify(settingsNow()));
  A.$('#pw-reset-settings').click();
  check('reset-settings restores them', settingsNow().theme === 'auto' && settingsNow().chime === 'bell' && settingsNow().volume === 70, JSON.stringify(settingsNow()));

  section('Stats: two-click clear, export, import');
  A.$('[data-act="stats"]').click();
  const focusBefore = todayStats().focus;
  A.$('#pw-clear').click();
  check('the first click only arms the clear button', todayStats().focus === focusBefore && A.$('#pw-clear').classList.contains('armed'));

  const blobs = [], downloads = [];
  A.w.URL.createObjectURL = b => { blobs.push(b); return 'blob:test'; };
  A.w.URL.revokeObjectURL = () => {};
  A.w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  const readBlob = b => new Promise(r => { const fr = new A.w.FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsText(b); });
  A.$('[data-act="exportcsv"]').click();
  check('another button disarms it', !A.$('#pw-clear').classList.contains('armed') && todayStats().focus === focusBefore);
  A.$('[data-act="exportjson"]').click();
  check('exports are offered as dated files', /^pomodoro-stats-\d{4}-\d\d-\d\d\.csv$/.test(downloads[0]) && /\.json$/.test(downloads[1]), downloads.join(' '));
  const csv = await readBlob(blobs[0]);
  check('the CSV has a header and task rows', csv.startsWith('date,task,focus_seconds') && csv.includes(',Untracked,'), csv.slice(0, 120));
  const backup = await readBlob(blobs[1]);
  check('the backup round-trips the stats', JSON.stringify(JSON.parse(backup).stats) === store.get('pomodoro.stats'));

  A.$('#pw-clear').click();
  A.$('#pw-clear').click();
  check('the second click clears today', todayStats().focus === 0 && A.$('#pw-stat-focus').textContent === '0s', JSON.stringify(todayStats()));

  const importFile = text => {
    const input = A.$('#pw-import-file');
    Object.defineProperty(input, 'files', { value: [new A.w.File([text], 'backup.json', { type: 'application/json' })], configurable: true });
    input.dispatchEvent(new A.w.Event('change'));
  };
  importFile(backup);
  await until(() => /Imported/.test(A.$('#pw-stats-msg').textContent));
  check('importing the backup restores the stats', todayStats().focus === focusBefore && A.$('#pw-stat-focus').textContent !== '0s', A.$('#pw-stats-msg').textContent);
  importFile('<script>alert(1)</script>');
  await until(() => /No usable/.test(A.$('#pw-stats-msg').textContent));
  check('a junk file is rejected without touching the stats', /No usable/.test(A.$('#pw-stats-msg').textContent) && todayStats().focus === focusBefore, A.$('#pw-stats-msg').textContent);
  A.$('[data-act="back"]').click();

  section('Backgrounded tab: coarse title');
  A.$('#pw-play').click();
  setVisibility(A.w, 'hidden');
  check('a hidden running tab shows whole minutes', /\b25m\b/.test(A.w.document.title) && !/\d\d:\d\d/.test(A.w.document.title), A.w.document.title);
  setVisibility(A.w, 'visible');
  check('it switches back to the clock when visible', /25:00/.test(A.w.document.title), A.w.document.title);
  A.$('[data-act="reset"]').click();

  section('Fullscreen');
  const aHost = A.w.document.getElementById('pomodoro-focus-timer-host');
  Object.defineProperty(A.w.document, 'fullscreenElement', { value: A.w.document.body, configurable: true });
  A.w.document.dispatchEvent(new A.w.Event('fullscreenchange'));
  check('the widget hides while the page is fullscreen', aHost.style.display === 'none', aHost.getAttribute('style'));
  Object.defineProperty(A.w.document, 'fullscreenElement', { value: null, configurable: true });
  A.w.document.dispatchEvent(new A.w.Event('fullscreenchange'));
  check('...and returns afterwards', aHost.style.display === 'block', aHost.getAttribute('style'));

  section('Configurable hotkey');
  const press = (target, init) => target.dispatchEvent(new A.w.KeyboardEvent('keydown', Object.assign({ bubbles: true, composed: true, cancelable: true }, init)));
  const cardHidden = () => A.$('#pw-card').classList.contains('hidden');
  press(A.w.document.body, { altKey: true, shiftKey: true, code: 'KeyT', key: 'T' });
  check('Alt+Shift+T hides the widget', cardHidden());
  press(A.w.document.body, { altKey: true, shiftKey: true, code: 'KeyT', key: 'T' });
  check('...and shows it again', !cardHidden());
  const pageInput = A.w.document.createElement('input');
  A.w.document.body.appendChild(pageInput);
  const typed = new A.w.KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, altKey: true, shiftKey: true, code: 'KeyT', key: '\u02c7' });
  pageInput.dispatchEvent(typed);
  check('an Alt combo typed into a page field is left alone', !cardHidden() && !typed.defaultPrevented);

  A.$('[data-act="settings"]').click();
  A.$('#pw-hotkey').click();
  check('the hotkey button waits for a key press', /Press/.test(A.$('#pw-hotkey').textContent), A.$('#pw-hotkey').textContent);
  press(A.$('#pw-hotkey'), { code: 'KeyY', key: 'y' });
  check('a combination without Ctrl/Alt/Meta is not accepted', /Press/.test(A.$('#pw-hotkey').textContent));
  press(A.$('#pw-hotkey'), { ctrlKey: true, shiftKey: true, code: 'KeyY', key: 'Y' });
  check('the new combination is recorded', settingsNow().hotkey === 'Ctrl+Shift+KeyY' && A.$('#pw-hotkey').textContent === 'Ctrl+Shift+Y', A.$('#pw-hotkey').textContent);
  check('recording does not trigger the hotkey itself', !cardHidden());
  press(A.w.document.body, { altKey: true, shiftKey: true, code: 'KeyT', key: 'T' });
  check('the old hotkey no longer works', !cardHidden());
  press(pageInput, { ctrlKey: true, shiftKey: true, code: 'KeyY', key: 'Y' });
  check('the new one does, even from a page field (Ctrl combos type nothing)', cardHidden());
  press(A.w.document.body, { ctrlKey: true, shiftKey: true, code: 'KeyY', key: 'Y' });
  A.$('#pw-reset-settings').click();
  A.$('[data-act="back"]').click();

  section('A site that fights for its title');
  const fighter = new A.w.MutationObserver(() => { if (A.w.document.title !== 'Mine!') A.w.document.title = 'Mine!'; });
  fighter.observe(A.w.document.head, { childList: true, characterData: true, subtree: true });
  A.w.document.title = 'Mine!';
  await sleep(150); // a ping-pong would spin forever here (and trip the watchdog)
  check('the script backs off and leaves the title to the site', A.w.document.title === 'Mine!', A.w.document.title);
  fighter.disconnect();
  B.w.dispatchEvent(new B.w.Event('focus'));
  A.w.dispatchEvent(new A.w.Event('focus'));
  await sleep(50);
  check('the countdown returns the next time the tab takes over', A.w.document.title.includes('25:00') && A.w.document.title.endsWith('Mine!'), A.w.document.title);

  section('Per-site exclusion');
  const siteSwitch = A.menu.find(m => m.label.includes('on this site'));
  A.$('[data-act="settings"]').click();
  check('the settings offer to hide on this site', A.$('#pw-exclude').textContent === 'Hide on example.com', A.$('#pw-exclude').textContent);
  A.$('#pw-exclude').click();
  check('excluding hides the widget and the drawer tab', A.$('#pw-card').classList.contains('hidden') && A.$('#pw-tab').classList.contains('hidden'));
  check('the site is saved', settingsNow().excluded.join() === 'example.com', JSON.stringify(settingsNow().excluded));
  check('the tab title is handed back', A.w.document.title === 'Mine!', A.w.document.title);
  A.w.dispatchEvent(new A.w.Event('focus'));
  setVisibility(A.w, 'visible');
  press(A.w.document.body, { altKey: true, shiftKey: true, code: 'KeyT', key: 'T' });
  A.menu.find(m => m.label.includes('Start')).fn();
  await sleep(30);
  check('focus, hotkey and menu stay inert on an excluded site', A.$('#pw-tab').classList.contains('hidden') && leaderOf().id === '', JSON.stringify(leaderOf()));
  siteSwitch.fn();
  check('the menu switch brings the widget back', !A.$('#pw-tab').classList.contains('hidden') && settingsNow().excluded.length === 0);
  A.$('[data-act="back"]').click();

  section('A phase that ended while no tab was open');
  store.set('pomodoro.state', JSON.stringify({ phase: 'focus', round: 1, running: true, duration: 1500000, remaining: 1500000, endsAt: fakeNow - 60000, lastTick: fakeNow - 660000, task: 'Away' }));
  before = todayStats();
  const F = await boot();
  check('it completes on return and the break starts now', F.$('#pw-phase').textContent === 'Short Break' && F.$('#pw-time').textContent === '05:00', F.$('#pw-phase').textContent + ' ' + F.$('#pw-time').textContent);
  check('silently — no chime or notification for something unwitnessed', F.notifications.length === 0);
  check('with a note in the widget', /while you were away/.test(F.$('#pw-notice').textContent), F.$('#pw-notice').textContent);
  check('crediting only the time up to the phase end', todayStats().focus - before.focus === 600 && todayStats().tasks.Away === 600, todayStats().focus - before.focus);
  F.$('[data-act="reset"]').click();

  section('Corrupt / hostile storage is sanitised');
  const dk = Object.keys(JSON.parse(store.get('pomodoro.stats'))).sort().pop();
  store.set('pomodoro.settings', JSON.stringify({ focusMin: 'abc', shortMin: -3, rounds: 999, sound: 'yes', theme: 5, hotkey: 'k', chime: '<x>', excluded: 'nope', volume: 1e9 }));
  store.set('pomodoro.ui', JSON.stringify({ mode: 'weird', hidden: 'no', pos: { left: 'x', top: 5 } }));
  store.set('pomodoro.state', JSON.stringify({ phase: 'focus', round: 50, running: false, duration: 'NaN', remaining: null }));
  store.set('pomodoro.stats', JSON.stringify({
    [dk]: { focus: '<img src=x onerror=alert(1)>', rounds: 2, tasks: { '<b>t</b>': 30, '<img src=x>': '<img src=x>', ok: 60 } },
    'not-a-date': { focus: 1 },
  }));
  const E = await boot();
  check('the widget still builds and shows', E.built && !E.$('#pw-card').classList.contains('hidden'));
  check('an invalid duration falls back to the default', E.$('#pw-time').textContent === '25:00', E.$('#pw-time').textContent);
  check('an out-of-range round count is clamped', E.$('#pw-rounds').textContent === 'Round 12/12', E.$('#pw-rounds').textContent);
  E.$('[data-act="stats"]').click();
  check('stored strings never become markup', !E.shadow.querySelector('img, #pw-tasks span b') && E.$('#pw-tasks').textContent.includes('<b>t</b>'), E.$('#pw-tasks').innerHTML);
  check('invalid choices fall back to defaults', E.$('#pw-wrap').getAttribute('data-theme') === 'auto' && E.$('#pw-hotkey').textContent === 'Alt+Shift+T', E.$('#pw-hotkey').textContent);
  check('no NaN / undefined anywhere in the widget', !/NaN|undefined/.test(E.shadow.textContent), E.shadow.textContent.match(/.{0,20}(NaN|undefined).{0,20}/));
  check('valid task entries survive', E.$('#pw-tasks').textContent.includes('ok'), E.$('#pw-tasks').textContent);
  E.$('#pw-reset-settings').click();

  section('Trusted Types–enforcing pages (YouTube, Gmail, …)');
  const T = await boot({ trustedTypes: true });
  check('the widget builds under Trusted Types enforcement', T.built && !!T.$('#pw-card'));
  check('icons render through the policy', !!T.$('#pw-play svg'));

  section('Structural guards for the idle/timer model');
  check('no polling timers anywhere (setInterval)', !SCRIPT.includes('setInterval'));
  check('no unload/beforeunload listeners (they break the back/forward cache)', !/addEventListener\(\s*'(?:before)?unload'/.test(SCRIPT));
  check('the stylesheet uses px, immune to the page root font-size', !/\d(?:\.\d+)?rem\b/.test(SCRIPT), (SCRIPT.match(/[\d.]+rem\b/g) || []).slice(0, 5).join(' '));
  check('the host resets inherited page styles', SCRIPT.includes("'all', 'initial'"));
  check('no Tailwind left in the build', !SCRIPT.includes('--tw-') && !/tailwind/i.test(SCRIPT));
  check('styles are adopted (immune to a strict style-src CSP)', SCRIPT.includes('adoptedStyleSheets'));
  check('no native confirm() dialogs', !/\bconfirm\(/.test(SCRIPT));
  check('UI is built lazily, not at startup', SCRIPT.includes('function buildUI()'));
  check('a hide action exists in the widget', SCRIPT.includes('data-act="hide"'));
  check('metadata declares an icon', SCRIPT.includes('// @icon'));
  check('iframes are excluded at metadata level', SCRIPT.includes('// @noframes'));
  check('reduced-motion is honoured in CSS', SCRIPT.includes('prefers-reduced-motion'));
  check('number fields hide their spinners', SCRIPT.includes('.pw-num::-webkit-inner-spin-button'));

  // Privacy claim: the README says the script makes no network requests, so the
  // absence of every network-capable API is asserted rather than assumed.
  check(
    'no network-capable APIs are used',
    !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource|importScripts/.test(SCRIPT),
    (SCRIPT.match(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource|importScripts/g) || []).join(', ')
  );

  const updateUrls = [...SCRIPT.matchAll(/\/\/ @(?:update|download)URL\s+(\S+)/g)].map(m => m[1]);
  const RAW_URL = 'https://raw.githubusercontent.com/Kritical-Dev/pomodoro-focus-timer/main/pomodoro.user.js';
  check('update/download URLs point at the published raw file', updateUrls.length === 2 && updateUrls.every(u => u === RAW_URL), updateUrls.join(' '));
  check('no store reads at load time', !/^\s*let settings = Object\.assign\({}, DEFAULT_SETTINGS, store\.get/m.test(SCRIPT));

  // Clean up jsdom timers so the process can exit.
  await sleep(50);
  for (const w of windows) w.close();

  console.log('\n' + (failures ? '\u2717 ' + failures + ' check(s) failed' : '\u2713 all checks passed'));
  process.exit(failures ? 1 : 0);
};

main().catch(err => { console.error('\nHarness error:', err); process.exit(1); });
