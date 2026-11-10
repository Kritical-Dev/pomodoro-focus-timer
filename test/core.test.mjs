// Unit tests for the pure logic in src/core.js — run with: node --test test/core.test.mjs
// No DOM and no real clock: every function takes its inputs (including "now").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const core = createRequire(import.meta.url)('../src/core.js');
const {
  DEFAULT_SETTINGS, MAX_PHASE_MS,
  dkey, fmtClock, fmtMinutes, fmtHuman,
  validHotkey, hotkeyFromEvent, hotkeyLabel, normalizeHost, hostExcluded,
  loadSettings, loadStats, loadToday, loadUi, loadState,
  durationFor, freshState, nextPhase, nextWakeDelay,
  splitByDay, creditFocus, recentTasks, buildTitle,
  csvCell, statsToCsv, statsToJson, parseImport, mergeStats,
} = core;

const at = (y, mo, d, h = 0, mi = 0, s = 0, ms = 0) => new Date(y, mo - 1, d, h, mi, s, ms).getTime();
const NOON = at(2026, 3, 10, 12);
const MIN = 60000;

test('formatting', () => {
  assert.equal(fmtClock(25 * MIN), '25:00');
  assert.equal(fmtClock(999), '00:01', 'rounds up so 00:00 only shows at zero');
  assert.equal(fmtClock(0), '00:00');
  assert.equal(fmtClock(-5), '00:00');
  assert.equal(fmtClock(61 * MIN + 5000), '1:01:05');
  assert.equal(fmtMinutes(25 * MIN), '25m');
  assert.equal(fmtMinutes(24 * MIN + 1), '25m');
  assert.equal(fmtMinutes(10), '1m');
  assert.equal(fmtHuman(0), '0s');
  assert.equal(fmtHuman(59), '59s');
  assert.equal(fmtHuman(60), '1m');
  assert.equal(fmtHuman(3900), '1h 05m');
  assert.equal(dkey(at(2026, 1, 5, 23, 59)), '2026-01-05');
});

test('hotkeys', () => {
  assert.ok(validHotkey('Alt+Shift+KeyT'));
  assert.ok(validHotkey('Ctrl+F5'));
  assert.ok(!validHotkey('KeyT'), 'needs Ctrl, Alt or Meta');
  assert.ok(!validHotkey('Shift+KeyT'), 'Shift alone would capture plain typing');
  assert.ok(!validHotkey('Alt+ShiftLeft'), 'a modifier is not a key');
  assert.ok(!validHotkey('Shift+Alt+KeyT'), 'canonical modifier order only');
  assert.ok(!validHotkey(null));
  assert.equal(hotkeyFromEvent({ altKey: true, shiftKey: true, code: 'KeyT' }), 'Alt+Shift+KeyT');
  assert.equal(hotkeyFromEvent({ ctrlKey: true, metaKey: true, code: 'Digit1' }), 'Ctrl+Meta+Digit1');
  assert.equal(hotkeyFromEvent({ altKey: true, code: 'AltLeft' }), null);
  assert.equal(hotkeyFromEvent({ code: 'KeyT' }), null);
  assert.equal(hotkeyFromEvent({ altKey: true, code: '' }), null);
  assert.equal(hotkeyLabel('Alt+Shift+KeyT'), 'Alt+Shift+T');
  assert.equal(hotkeyLabel('Ctrl+Digit1'), 'Ctrl+1');
  assert.equal(hotkeyLabel('Ctrl+F5'), 'Ctrl+F5');
});

test('site exclusion', () => {
  assert.equal(normalizeHost(' WWW.Example.COM. '), 'www.example.com');
  assert.equal(normalizeHost('bad host'), '');
  assert.equal(normalizeHost('<script>'), '');
  assert.equal(normalizeHost(5), '');
  assert.ok(hostExcluded('example.com', ['example.com']));
  assert.ok(hostExcluded('mail.example.com', ['example.com']), 'covers subdomains');
  assert.ok(!hostExcluded('notexample.com', ['example.com']), 'but not lookalike suffixes');
  assert.ok(!hostExcluded('example.com', ['mail.example.com']));
  assert.ok(!hostExcluded('', ['example.com']));
});

test('loadSettings sanitises every field', () => {
  assert.deepEqual(loadSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(loadSettings('junk'), DEFAULT_SETTINGS);
  const s = loadSettings({
    focusMin: 9999, shortMin: -4, longMin: 'x', rounds: 2.6, goalMin: 0, volume: 55.4,
    sound: 'yes', autoFocus: true, chime: 'gong', theme: 'light', hotkey: 'T',
    excluded: ['Example.com', 'example.com', 'bad host', 7, 'a.b'], extra: 1,
  });
  assert.equal(s.focusMin, 180);
  assert.equal(s.shortMin, 1);
  assert.equal(s.longMin, 15);
  assert.equal(s.rounds, 3);
  assert.equal(s.goalMin, 0);
  assert.equal(s.volume, 55);
  assert.equal(s.sound, true, 'non-boolean ignored');
  assert.equal(s.autoFocus, true);
  assert.equal(s.chime, 'bell');
  assert.equal(s.theme, 'light');
  assert.equal(s.hotkey, 'Alt+Shift+KeyT');
  assert.deepEqual(s.excluded, ['example.com', 'a.b']);
  assert.ok(!('extra' in s));
  // Callers get their own list, never the shared default.
  loadSettings(null).excluded.push('x');
  assert.deepEqual(DEFAULT_SETTINGS.excluded, []);
});

test('loadStats sanitises, prunes and resists prototype keys', () => {
  const raw = JSON.parse(`{
    "2026-03-10": { "focus": 120.4, "rounds": "2", "tasks": { "constructor": 60, "__proto__": 30, "bad": "<img>", "neg": -5 } },
    "2026-03-09": "junk",
    "2025-01-01": { "focus": 50 },
    "not-a-date": { "focus": 50 },
    "__proto__": { "polluted": true }
  }`);
  const stats = loadStats(raw, NOON);
  assert.deepEqual(Object.keys(stats), ['2026-03-10']);
  const d = stats['2026-03-10'];
  assert.equal(d.focus, 120);
  assert.equal(d.rounds, 0, 'a string is not a count');
  assert.equal(Object.getPrototypeOf(d.tasks), null);
  assert.deepEqual(Object.keys(d.tasks).sort(), ['__proto__', 'constructor']);
  assert.equal(d.tasks.constructor, 60);
  assert.equal(d.tasks['__proto__'], 30);
  assert.equal({}.polluted, undefined);
  assert.deepEqual(loadStats(null, NOON), {});
  assert.deepEqual(loadStats([1, 2], NOON), {});
  // Retention boundary: the cutoff day is kept, the day before is not.
  const edge = loadStats({ '2025-12-10': { focus: 1 }, '2025-12-09': { focus: 1 } }, NOON, 90);
  assert.deepEqual(Object.keys(edge), ['2025-12-10']);
});

test('loadUi', () => {
  assert.deepEqual(loadUi(null), { v: 2, mode: 'card', hidden: false, pos: null });
  assert.deepEqual(loadUi({ v: 2, mode: 'pill', hidden: true, pos: { left: 5, top: 6, x: 1 } }), { v: 2, mode: 'pill', hidden: true, pos: { left: 5, top: 6 } });
  assert.deepEqual(loadUi({ mode: 'weird', hidden: 'yes', pos: { left: 'a', top: 1 } }), { v: 2, mode: 'card', hidden: false, pos: null });
  assert.equal(loadUi({ hidden: true }).hidden, false, 'hidden from the drawer-tab era is not honoured');
  assert.deepEqual(loadUi({ pos: { left: Infinity, top: NaN } }).pos, null);
});

test('loadState', () => {
  const settings = loadSettings(null);
  assert.deepEqual(loadState(null, settings, NOON), freshState(settings));
  assert.deepEqual(loadState({ phase: 'toString' }, settings, NOON), freshState(settings), 'inherited keys are not phases');

  const paused = loadState({ phase: 'short', round: 99, running: false, duration: 5 * MIN, remaining: 9e9, task: 'x'.repeat(200) }, settings, NOON);
  assert.equal(paused.round, 4);
  assert.equal(paused.remaining, 5 * MIN);
  assert.equal(paused.task.length, 80);
  assert.equal(paused.running, false);

  const running = loadState({ phase: 'focus', round: 1, running: true, duration: 25 * MIN, remaining: 25 * MIN, endsAt: NOON + 10 * MIN, lastTick: NOON - MIN }, settings, NOON);
  assert.equal(running.running, true);
  assert.equal(running.endsAt, NOON + 10 * MIN);
  assert.equal(running.lastTick, NOON - MIN);

  // Clock moved backwards: the phase must not become longer than its duration,
  // and lastTick may not sit in the future or before the phase began.
  const skewed = loadState({ phase: 'focus', running: true, duration: 25 * MIN, endsAt: NOON + 600 * MIN, lastTick: NOON + 5 * MIN }, settings, NOON);
  assert.equal(skewed.endsAt, NOON + 25 * MIN);
  assert.equal(skewed.lastTick, NOON);
  const ancient = loadState({ phase: 'focus', running: true, duration: 25 * MIN, endsAt: NOON - MIN, lastTick: 0 }, settings, NOON);
  assert.equal(ancient.lastTick, NOON - 26 * MIN, 'credit can never exceed the phase length');

  assert.equal(loadState({ phase: 'focus', duration: 9e12 }, settings, NOON).duration, MAX_PHASE_MS);
  assert.equal(loadState({ phase: 'long', duration: 'NaN' }, settings, NOON).duration, 15 * MIN);
  assert.equal(loadState({ phase: 'focus', running: true, endsAt: 'soon' }, settings, NOON).running, false);
});

test('phase order', () => {
  const settings = loadSettings({ rounds: 3 });
  assert.equal(durationFor(settings, 'long'), 15 * MIN);
  assert.deepEqual(nextPhase({ phase: 'focus', round: 1 }, settings), { phase: 'short', round: 1 });
  assert.deepEqual(nextPhase({ phase: 'short', round: 1 }, settings), { phase: 'focus', round: 2 });
  assert.deepEqual(nextPhase({ phase: 'focus', round: 3 }, settings), { phase: 'long', round: 3 });
  assert.deepEqual(nextPhase({ phase: 'long', round: 3 }, settings), { phase: 'focus', round: 1 });
  // A whole cycle visits rounds 1..3 and returns to the start.
  let s = { phase: 'focus', round: 1 };
  const seen = [];
  for (let i = 0; i < 6; i++) { seen.push(s.phase + s.round); s = nextPhase(s, settings); }
  assert.deepEqual(seen, ['focus1', 'short1', 'focus2', 'short2', 'focus3', 'long3']);
  assert.deepEqual(s, { phase: 'focus', round: 1 });
});

test('wake scheduling', () => {
  assert.equal(nextWakeDelay(-1, 'seconds'), 0, 'overdue → immediately');
  assert.equal(nextWakeDelay(0, 'none'), 0);
  assert.equal(nextWakeDelay(10 * MIN, 'seconds'), 1000, 'on a whole second → a full second');
  assert.equal(nextWakeDelay(10 * MIN + 400, 'seconds'), 400, 'when the displayed second changes');
  assert.equal(nextWakeDelay(300, 'seconds'), 300, 'never past the phase end');
  assert.equal(nextWakeDelay(10 * MIN + 5000, 'minutes'), 5000, 'next whole minute remaining');
  assert.equal(nextWakeDelay(10 * MIN, 'minutes'), MIN, 'exactly on a minute → a full minute');
  assert.equal(nextWakeDelay(20000, 'minutes'), 20000, 'last partial minute → the end');
  assert.equal(nextWakeDelay(10 * MIN, 'none'), 10 * MIN, 'nothing on screen → only the end');
});

test('loadToday', () => {
  assert.equal(loadToday(null, NOON), null);
  assert.equal(loadToday({ key: 5, day: {} }, NOON), null);
  assert.equal(loadToday({ key: '__proto__', day: { focus: 5 } }, NOON), null);
  assert.equal(loadToday({ key: 'not-a-date', day: { focus: 5 } }, NOON), null);
  assert.equal(loadToday({ key: '2026-03-10', day: 'junk' }, NOON), null);
  assert.equal(loadToday({ key: '2020-01-01', day: { focus: 5 } }, NOON), null, 'older than the retention window');
  const t = loadToday({ key: '2026-03-10', day: { focus: '9', rounds: 2.2, tasks: { a: 3, b: '<img>' } }, extra: 1 }, NOON);
  assert.equal(t.key, '2026-03-10');
  assert.equal(t.day.focus, 0);
  assert.equal(t.day.rounds, 2);
  assert.deepEqual(Object.keys(t.day.tasks), ['a']);
  assert.equal(Object.getPrototypeOf(t.day.tasks), null);
});

test('splitByDay cuts at local midnight', () => {
  assert.deepEqual(splitByDay(NOON, NOON + 5000), [{ key: '2026-03-10', ms: 5000 }]);
  assert.deepEqual(splitByDay(NOON, NOON), []);
  assert.deepEqual(splitByDay(NOON, NOON - 5), []);
  const segs = splitByDay(at(2026, 3, 10, 23, 50), at(2026, 3, 11, 0, 15));
  assert.deepEqual(segs, [{ key: '2026-03-10', ms: 10 * MIN }, { key: '2026-03-11', ms: 15 * MIN }]);
  const three = splitByDay(at(2026, 3, 10, 23), at(2026, 3, 12, 1));
  assert.deepEqual(three.map(s => s.key), ['2026-03-10', '2026-03-11', '2026-03-12']);
  assert.equal(three.reduce((a, s) => a + s.ms, 0), 26 * 60 * MIN);
});

test('creditFocus', async t => {
  await t.test('credits whole seconds and carries the remainder', () => {
    const stats = {};
    const from = NOON;
    let r = creditFocus(stats, ' Essay ', from, from + 1700);
    assert.deepEqual(r, { until: from + 1000, sec: 1 });
    r = creditFocus(stats, 'Essay', r.until, from + 2100);
    assert.deepEqual(r, { until: from + 2000, sec: 1 });
    assert.deepEqual(stats['2026-03-10'].tasks.Essay, 2);
    assert.equal(stats['2026-03-10'].focus, 2);
    // Many tiny flushes lose nothing overall.
    let until = NOON;
    const s2 = {};
    for (let now = NOON + 333; now <= NOON + 60000; now += 333) until = creditFocus(s2, '', until, now).until;
    assert.equal(s2['2026-03-10'].focus, 59);
    assert.equal(s2['2026-03-10'].tasks.Untracked, 59);
    // ...and the final credit of a phase rounds the tail instead of dropping it.
    assert.deepEqual(creditFocus(s2, '', until, NOON + 60000, true), { until: NOON + 60000, sec: 1 });
    assert.equal(s2['2026-03-10'].focus, 60);
  });

  await t.test('splits a round that straddles midnight', () => {
    const stats = {};
    const r = creditFocus(stats, 'Late', at(2026, 3, 10, 23, 50), at(2026, 3, 11, 0, 15));
    assert.equal(r.sec, 25 * 60);
    // Off the second boundary, a final credit still totals the phase length.
    const odd = {};
    assert.equal(creditFocus(odd, '', at(2026, 3, 10, 23, 50, 0, 600), at(2026, 3, 11, 0, 15, 0, 600), true).sec, 1500);
    assert.equal(r.until, at(2026, 3, 11, 0, 15));
    assert.equal(stats['2026-03-10'].focus, 600);
    assert.equal(stats['2026-03-11'].focus, 900);
    assert.equal(stats['2026-03-11'].tasks.Late, 900);
  });

  await t.test('a clock moved backwards credits nothing and resyncs', () => {
    const stats = {};
    assert.deepEqual(creditFocus(stats, 'x', NOON, NOON - 5000), { until: NOON - 5000, sec: 0 });
    assert.deepEqual(stats, {});
  });

  await t.test('prototype-named tasks are plain counters', () => {
    const stats = {};
    for (const name of ['constructor', '__proto__', 'toString']) creditFocus(stats, name, NOON, NOON + 5000);
    const tasks = stats['2026-03-10'].tasks;
    assert.equal(tasks.constructor, 5);
    assert.equal(tasks['__proto__'], 5);
    assert.equal(tasks.toString, 5);
    assert.equal(stats['2026-03-10'].focus, 15);
  });
});

test('recentTasks', () => {
  const stats = loadStats({
    '2026-03-10': { tasks: { Untracked: 500, Email: 60, Essay: 600 } },
    '2026-03-09': { tasks: { Essay: 10, Review: 30 } },
    '2026-03-08': { tasks: { Old: 30 } },
  }, NOON);
  assert.deepEqual(recentTasks(stats, 15), ['Essay', 'Email', 'Review', 'Old']);
  assert.deepEqual(recentTasks(stats, 2), ['Essay', 'Email']);
  assert.deepEqual(recentTasks({}, 5), []);
});

test('buildTitle', () => {
  assert.equal(buildTitle('focus', '25:00', '', 'Site'), '🍅 25:00 Focus — Site');
  assert.equal(buildTitle('short', '05:00', '  a   b ', ''), '☕ 05:00 Short Break · a b');
  const long = buildTitle('long', '15m', 'x'.repeat(60), 'S');
  assert.ok(long.includes('x'.repeat(39) + '…') && !long.includes('x'.repeat(40)));
});

test('CSV export is spreadsheet-safe', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("http://x")'), '"\'=HYPERLINK(""http://x"")"');
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('-1'), "'-1");
  assert.equal(csvCell('@cmd'), "'@cmd");
  const stats = loadStats({ '2026-03-09': { focus: 90, rounds: 1, tasks: { 'A, B': 90 } }, '2026-03-10': { rounds: 2 } }, NOON);
  assert.equal(statsToCsv(stats),
    'date,task,focus_seconds,focus_minutes,rounds_that_day\n' +
    '2026-03-09,"A, B",90,1.5,1\n' +
    '2026-03-10,,0,0,2\n');
});

test('backup export / import round trip', () => {
  const stats = loadStats({ '2026-03-09': { focus: 90, rounds: 1, tasks: { '__proto__': 30, Essay: 60 } } }, NOON);
  const json = statsToJson(stats, NOON);
  assert.equal(JSON.parse(json).app, 'pomodoro-focus-timer');
  const back = parseImport(json, NOON);
  assert.equal(JSON.stringify(back), JSON.stringify(stats));
  assert.equal(JSON.stringify(parseImport(JSON.stringify(stats), NOON)), JSON.stringify(stats), 'a bare stats map works too');
  assert.equal(parseImport('not json', NOON), null);
  assert.equal(parseImport('[]', NOON), null);
  assert.equal(parseImport('{"stats":{"nope":1}}', NOON), null);
  assert.equal(parseImport('null', NOON), null);

  const into = loadStats({ '2026-03-09': { focus: 5 }, '2026-03-10': { focus: 7 } }, NOON);
  assert.equal(mergeStats(into, back), 1);
  assert.equal(into['2026-03-09'].focus, 90, 'imported days replace');
  assert.equal(into['2026-03-10'].focus, 7, 'other days are kept');
});
