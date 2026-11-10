/* ==================================================================== *
 * Core — pure logic. No DOM, no storage, no clock reads: every function
 * takes what it needs (including `now`) as arguments, so all of it is unit
 * tested directly in Node (test/core.test.mjs). build.mjs inlines this file
 * into the userscript, dropping everything below the strip marker.
 * ==================================================================== */

const DEFAULT_SETTINGS = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  rounds: 4,            // focus rounds before the long break
  goalMin: 0,           // daily focus goal in minutes (0 = off)
  autoBreaks: true,     // auto-start breaks after a focus round
  autoFocus: false,     // auto-start the next focus round after a break
  sound: true,
  volume: 70,           // chime volume, 0–100
  chime: 'bell',
  notify: true,
  titleTimer: true,     // show countdown in the tab title
  theme: 'auto',
  hotkey: 'Alt+Shift+KeyT',
  excluded: [],         // hostnames where the widget stays out of the way
};

const RANGES = {
  focusMin: [1, 180],
  shortMin: [1, 60],
  longMin: [1, 120],
  rounds: [1, 12],
  goalMin: [0, 720],
  volume: [0, 100],
};

const CHOICES = {
  chime: ['bell', 'soft', 'digital'],
  theme: ['auto', 'dark', 'light'],
};

const PHASES = {
  focus: { label: 'Focus', icon: '🍅', setting: 'focusMin' },
  short: { label: 'Short Break', icon: '☕', setting: 'shortMin' },
  long: { label: 'Long Break', icon: '🌴', setting: 'longMin' },
};

const STATS_KEEP_DAYS = 90;
const TASK_MAX = 80;
const MAX_PHASE_MS = 240 * 60000; // a phase can be extended up to this
const EXTEND_MS = 5 * 60000;
const UNTRACKED = 'Untracked';

/* ---- small helpers ---- */
const finite = Number.isFinite;
const isObj = v => v !== null && typeof v === 'object';
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const count = v => (finite(v) && v > 0 ? Math.round(v) : 0);
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
const pad2 = n => String(n).padStart(2, '0');

function dkey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return (h > 0 ? h + ':' : '') + pad2(m) + ':' + pad2(ss);
}

// Coarse countdown for a backgrounded tab's title, which is only refreshed
// once a minute ("25m" means "no more than 25 minutes left").
function fmtMinutes(ms) { return Math.max(1, Math.ceil(ms / 60000)) + 'm'; }

function fmtHuman(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return h + 'h ' + pad2(m) + 'm';
  if (m > 0) return m + 'm';
  return sec + 's';
}

/* ---- hotkey ----
 * Stored as "Ctrl+Alt+Shift+Meta+<KeyboardEvent.code>", modifiers in that
 * order. At least one of Ctrl/Alt/Meta is required so plain typing can never
 * be a hotkey. */
const HOTKEY_RE = /^(Ctrl\+)?(Alt\+)?(Shift\+)?(Meta\+)?([A-Z][A-Za-z0-9]{0,19})$/;
const MODIFIER_CODE_RE = /^(Control|Alt|Shift|Meta|OS)(Left|Right)?$/;

function validHotkey(str) {
  if (typeof str !== 'string') return false;
  const m = HOTKEY_RE.exec(str);
  return !!m && !!(m[1] || m[2] || m[4]) && !MODIFIER_CODE_RE.test(m[5]);
}

function hotkeyFromEvent(e) {
  if (!e.code || MODIFIER_CODE_RE.test(e.code)) return null;
  const str = (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.metaKey ? 'Meta+' : '') + e.code;
  return validHotkey(str) ? str : null;
}

function hotkeyLabel(str) { return str.replace(/\+(Key|Digit)(?=.$)/, '+'); }

/* ---- site exclusion ---- */
function normalizeHost(h) {
  if (typeof h !== 'string') return '';
  h = h.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  return /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/.test(h) ? h : '';
}

// A listed host also covers its subdomains.
function hostExcluded(host, list) {
  host = normalizeHost(host);
  return !!host && list.some(h => host === h || host.endsWith('.' + h));
}

/* ---- sanitised loading ----
 * Everything read back from storage is untrusted (older versions, manual
 * edits, imports, other scripts sharing localStorage). */
function loadSettings(raw) {
  const s = Object.assign({}, DEFAULT_SETTINGS, { excluded: [] });
  if (!isObj(raw)) return s;
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    const v = raw[k];
    if (RANGES[k]) { if (finite(v)) s[k] = clamp(Math.round(v), RANGES[k][0], RANGES[k][1]); }
    else if (CHOICES[k]) { if (CHOICES[k].includes(v)) s[k] = v; }
    else if (k === 'hotkey') { if (validHotkey(v)) s[k] = v; }
    else if (k === 'excluded') { if (Array.isArray(v)) s[k] = [...new Set(v.map(normalizeHost).filter(Boolean))].slice(0, 200); }
    else if (typeof v === 'boolean') s[k] = v;
  }
  return s;
}

function newDay() { return { focus: 0, rounds: 0, tasks: Object.create(null) }; }

function dayEntry(stats, key) {
  if (!stats[key]) stats[key] = newDay();
  return stats[key];
}

// Task maps are null-prototype objects, so task names such as "constructor"
// or "__proto__" are ordinary keys instead of inherited members.
function loadStats(raw, now, keepDays) {
  const out = {};
  if (!isObj(raw)) return out;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (keepDays || STATS_KEEP_DAYS));
  const cKey = dkey(cutoff.getTime());
  for (const k of Object.keys(raw)) {
    const d = raw[k];
    if (!/^\d{4}-\d\d-\d\d$/.test(k) || k < cKey || !isObj(d)) continue;
    const day = newDay();
    day.focus = count(d.focus);
    day.rounds = count(d.rounds);
    if (isObj(d.tasks)) {
      for (const name of Object.keys(d.tasks)) {
        const sec = count(d.tasks[name]);
        if (sec) day.tasks[name.slice(0, TASK_MAX)] = sec;
      }
    }
    out[k] = day;
  }
  return out;
}

function loadUi(raw) {
  const r = isObj(raw) ? raw : {};
  const p = r.pos;
  return {
    mode: r.mode === 'pill' ? 'pill' : 'card',
    hidden: r.hidden === true,
    pos: isObj(p) && finite(p.left) && finite(p.top) ? { left: p.left, top: p.top } : null,
  };
}

/* ---- timer state ----
 * Invariant: while a focus phase runs, the focus time not yet credited to
 * stats is exactly min(now, endsAt) - lastTick. That is pure timestamp
 * arithmetic, so any saved copy of the state is self-consistent: a tab that
 * is closed, frozen or loses leadership never has to write anything on the
 * way out, and whoever loads the state next credits exactly the right
 * amount — no loss, no double counting. */
function durationFor(settings, phase) { return settings[PHASES[phase].setting] * 60000; }

function freshState(settings) {
  const d = durationFor(settings, 'focus');
  return { phase: 'focus', round: 1, running: false, duration: d, remaining: d, endsAt: 0, task: '', lastTick: 0 };
}

function loadState(raw, settings, now) {
  const s = freshState(settings);
  if (!isObj(raw) || !own(PHASES, raw.phase)) return s;
  s.phase = raw.phase;
  s.round = finite(raw.round) ? clamp(Math.round(raw.round), 1, settings.rounds) : 1;
  s.duration = finite(raw.duration) && raw.duration > 0 ? Math.min(raw.duration, MAX_PHASE_MS) : durationFor(settings, s.phase);
  s.remaining = finite(raw.remaining) ? clamp(raw.remaining, 0, s.duration) : s.duration;
  s.task = typeof raw.task === 'string' ? raw.task.slice(0, TASK_MAX) : '';
  if (raw.running === true && finite(raw.endsAt)) {
    s.running = true;
    // A clock that was moved backwards must not stretch the phase.
    s.endsAt = Math.min(raw.endsAt, now + s.duration);
    s.lastTick = finite(raw.lastTick) ? clamp(raw.lastTick, s.endsAt - s.duration, now) : now;
  }
  return s;
}

// What follows the current phase: { phase, round }.
function nextPhase(state, settings) {
  if (state.phase === 'focus') return { phase: state.round >= settings.rounds ? 'long' : 'short', round: state.round };
  return { phase: 'focus', round: state.phase === 'long' ? 1 : Math.min(state.round + 1, settings.rounds) };
}

// When the engine should wake next (ms from now) — exactly when what is
// displayed is due to change, so the readout is never late:
//   visible            → the next whole second of remaining time
//   hidden, title on   → the next whole minute of remaining time (tab title)
//   hidden, title off  → the moment the phase ends
function nextWakeDelay(now, endsAt, hidden, titleTimer) {
  const remaining = endsAt - now;
  if (remaining <= 0) return 0;
  if (!hidden) return (remaining % 1000) || 1000;
  return titleTimer ? (remaining % 60000) || 60000 : remaining;
}

/* ---- focus-time accounting ---- */
// [from, to) cut at local midnights: [{ key, ms }, …]
function splitByDay(from, to) {
  const segs = [];
  for (let start = from, guard = 0; start < to && guard < 400; guard++) {
    const d = new Date(start);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const end = Math.min(to, midnight);
    segs.push({ key: dkey(start), ms: end - start });
    start = end;
  }
  return segs;
}

// Credit the focus time in [from, to) to `task`, each part on the day it
// happened. Whole seconds only: returns { until, sec } where `until` is how
// far crediting got. Mid-phase the sub-second tail is left for the next
// call; a `final` credit (pause, phase end) rounds it instead, so a 25-minute
// round is 1500 s, not 1499. A clock that moved backwards credits nothing.
function creditFocus(stats, task, from, to, final) {
  if (to <= from) return { until: to, sec: 0 };
  const name = (task || '').trim() || UNTRACKED;
  // Seconds are counted cumulatively from `from`, so a midnight in the
  // middle shifts at most a fraction of a second between the two days and
  // never changes the total.
  let ms = 0, total = 0;
  for (const seg of splitByDay(from, to)) {
    ms += seg.ms;
    const sec = (final ? Math.round(ms / 1000) : Math.floor(ms / 1000)) - total;
    if (sec > 0) {
      const d = dayEntry(stats, seg.key);
      d.focus += sec;
      d.tasks[name] = (d.tasks[name] || 0) + sec;
      total += sec;
    }
  }
  return { until: final ? to : from + total * 1000, sec: total };
}

// Most recently used task names, newest day first, for autocomplete.
function recentTasks(stats, limit) {
  const seen = new Set();
  for (const k of Object.keys(stats).sort().reverse()) {
    const names = Object.entries(stats[k].tasks).sort((a, b) => b[1] - a[1]);
    for (const [name] of names) {
      if (name !== UNTRACKED) seen.add(name);
      if (seen.size >= limit) return [...seen];
    }
  }
  return [...seen];
}

/* ---- tab title ---- */
function buildTitle(phase, timeStr, task, siteTitle) {
  const p = PHASES[phase];
  const t = (task || '').replace(/\s+/g, ' ').trim();
  const shown = t.length > 40 ? t.slice(0, 39) + '…' : t; // keep the tab title readable
  return p.icon + ' ' + timeStr + ' ' + p.label + (shown ? ' · ' + shown : '') + (siteTitle ? ' — ' + siteTitle : '');
}

/* ---- export / import ---- */
// Spreadsheet-safe: quotes are doubled, and a cell that would be read as a
// formula (=, +, -, @ …) is prefixed with an apostrophe.
function csvCell(v) {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function statsToCsv(stats) {
  const rows = ['date,task,focus_seconds,focus_minutes,rounds_that_day'];
  for (const k of Object.keys(stats).sort()) {
    const d = stats[k];
    const tasks = Object.entries(d.tasks);
    if (!tasks.length) rows.push([k, '', 0, 0, d.rounds].join(','));
    for (const [name, sec] of tasks) rows.push([k, csvCell(name), sec, (sec / 60).toFixed(1), d.rounds].join(','));
  }
  return rows.join('\n') + '\n';
}

function statsToJson(stats, now) {
  return JSON.stringify({ app: 'pomodoro-focus-timer', exported: new Date(now).toISOString(), stats }, null, 2);
}

// Accepts our JSON export (or a bare stats map). Returns sanitised stats, or
// null when the text is not usable.
function parseImport(text, now) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (isObj(data) && isObj(data.stats)) data = data.stats;
  const stats = loadStats(data, now);
  return Object.keys(stats).length ? stats : null;
}

// Imported days replace the same days already present; returns the day count.
function mergeStats(into, from) {
  const keys = Object.keys(from);
  for (const k of keys) into[k] = from[k];
  return keys.length;
}

// @build:strip-below — Node-only export for the unit tests.
module.exports = {
  DEFAULT_SETTINGS, RANGES, CHOICES, PHASES, STATS_KEEP_DAYS, TASK_MAX, MAX_PHASE_MS, EXTEND_MS, UNTRACKED,
  clamp, dkey, fmtClock, fmtMinutes, fmtHuman,
  validHotkey, hotkeyFromEvent, hotkeyLabel, normalizeHost, hostExcluded,
  loadSettings, loadStats, loadUi, loadState, dayEntry,
  durationFor, freshState, nextPhase, nextWakeDelay,
  splitByDay, creditFocus, recentTasks, buildTitle,
  csvCell, statsToCsv, statsToJson, parseImport, mergeStats,
};
