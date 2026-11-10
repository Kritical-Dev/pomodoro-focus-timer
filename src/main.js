/* ==================================================================== *
 * Main — storage, timer engine, UI and cross-tab leadership.
 * Inlined after core.js by build.mjs; STYLES is injected by the build.
 * ==================================================================== */

/* ------------------------------------------------------------------ *
 * Storage (GM_* with localStorage fallback)
 * Values read back are untrusted and always pass through core's load*().
 * ------------------------------------------------------------------ */
const store = {
  get(key) {
    try {
      const raw = typeof GM_getValue !== 'undefined' ? GM_getValue(key) : localStorage.getItem(key);
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return undefined;
    }
  },
  set(key, value) {
    try {
      const raw = JSON.stringify(value);
      if (typeof GM_setValue !== 'undefined') GM_setValue(key, raw);
      else localStorage.setItem(key, raw);
    } catch (e) { /* storage full / blocked — non-fatal */ }
  },
};

const KEYS = { state: 'pomodoro.state', settings: 'pomodoro.settings', stats: 'pomodoro.stats', today: 'pomodoro.today', ui: 'pomodoro.ui', leader: 'pomodoro.leader' };
const RING_LEN = 2 * Math.PI * 54; // r=54 viewBox circle
const FLUSH_MS = 15000; // credit focus time to stats at least this often (keeps "Today" live)

// [key, label, step]
const SETTING_ROWS = [
  ['focusMin', 'Focus duration (min)', 1],
  ['shortMin', 'Short break (min)', 1],
  ['longMin', 'Long break (min)', 1],
  ['rounds', 'Rounds per cycle', 1],
  ['goalMin', 'Daily goal (min)', 15], // 0 = off
];

const TOGGLES = [
  ['autoBreaks', 'Auto-start breaks'],
  ['autoFocus', 'Auto-start focus rounds'],
  ['notify', 'Notifications'],
  ['titleTimer', 'Show timer in tab title'],
  ['sound', 'Completion sound'],
];

const SELECTS = [
  ['chime', 'Chime', [['bell', 'Bell'], ['soft', 'Soft'], ['digital', 'Digital']]],
  ['theme', 'Theme', [['auto', 'Match system'], ['dark', 'Dark'], ['light', 'Light']]],
];

// Defaults only. Nothing is read from storage at load time — these are
// filled in by reloadSharedState() when (and only when) this tab becomes
// the leader, so a background tab performs zero storage reads and zero DOM
// work until it is looked at.
let settings = loadSettings(null);
let stats = {};
let ui = loadUi(null);
let S = freshState(settings);

function saveState() { store.set(KEYS.state, S); }
function saveSettings() { store.set(KEYS.settings, settings); }
function saveUi() { store.set(KEYS.ui, ui); }

/* ---- Stats storage ----
 * Two values, so the write that happens every few seconds stays tiny:
 *   pomodoro.today — { key, day } for the current day; written on every credit
 *   pomodoro.stats — the 90-day history; written about once a day (rollover),
 *                    and on import
 * The history is also *read* lazily — only when the stats view, an export or
 * the task autocomplete needs it — so a tab switch never parses 90 days.
 *
 * `stats` is the merged in-memory view. Until the history is loaded it holds
 * only the day from pomodoro.today (`memKey`); that record is authoritative
 * for its day (the history's copy of it may be stale), which is why
 * loadHistory() never overwrites a day already in memory, and why anything
 * that touches another day must call loadHistory() first. */
let historyLoaded = false;
let memKey = ''; // the one day held in memory while the history is not loaded

function loadHistory() {
  if (historyLoaded) return;
  historyLoaded = true;
  const h = loadStats(store.get(KEYS.stats), Date.now());
  for (const k of Object.keys(h)) if (!stats[k]) stats[k] = h[k];
}

// `full` when a day other than today changed (rollover, import).
function saveStats(full) {
  const today = dkey(Date.now());
  if (full || today !== memKey) {
    loadHistory();
    store.set(KEYS.stats, stats);
    memKey = today;
  }
  store.set(KEYS.today, { key: today, day: stats[today] || newDay() });
}

function loadStatsForLeader(now) {
  const today = dkey(now);
  const rec = loadToday(store.get(KEYS.today), now);
  stats = {};
  historyLoaded = false;
  memKey = rec ? rec.key : today;
  if (rec) stats[rec.key] = rec.day;
  // No record yet (first run, or first run after updating from the single-
  // value layout, where today still lives in the history), or the record is
  // from an earlier day: fold it into the history and start today's record.
  if (!rec || rec.key !== today) saveStats(true);
}

const HOST = normalizeHost(location.hostname);

// Settings as they are right now, without requiring this tab to lead. Read on
// every modifier key press (hotkey check), so a tab that does not lead keeps
// a copy and only re-reads storage after the stored value changed.
let cfgCache = null;
let cfgWatched = false; // true once a change listener keeps cfgCache honest
function liveSettings() {
  if (isLeader) return settings;
  if (!cfgWatched) return loadSettings(store.get(KEYS.settings));
  return cfgCache || (cfgCache = loadSettings(store.get(KEYS.settings)));
}
function excludedHere() { return hostExcluded(HOST, liveSettings().excluded); }

// Pages that enforce Trusted Types (YouTube, Gmail, …) reject plain strings
// assigned to innerHTML. Only static markup defined in this file is ever
// assigned (user data always goes through textContent), so an identity
// policy is safe; it is created on first use.
let ttPolicy;
function setHTML(node, html) {
  if (ttPolicy === undefined) {
    ttPolicy = null;
    try {
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        ttPolicy = window.trustedTypes.createPolicy('pomodoro-focus-timer', { createHTML: s => s });
      }
    } catch (e) { /* policy name not allow-listed — fall back to plain strings */ }
  }
  node.innerHTML = ttPolicy ? ttPolicy.createHTML(html) : html;
}

function make(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ------------------------------------------------------------------ *
 * Focus-time accounting (see the invariant in core.js)
 * ------------------------------------------------------------------ */
// Credit the focus time since lastTick, capped at the phase end so a phase
// that ran out while the machine slept credits only its own length.
// `final` is passed when the phase stops (pause, phase end).
function flushFocus(final) {
  if (!S.running || S.phase !== 'focus') return;
  const now = Date.now();
  const today = dkey(now);
  const crossesDays = dkey(S.lastTick) !== memKey || today !== memKey;
  if (crossesDays) loadHistory();
  const before = stats[today] ? stats[today].focus : 0;
  const r = creditFocus(stats, S.task, S.lastTick, Math.min(now, S.endsAt), final);
  if (r.until === S.lastTick) return;
  S.lastTick = r.until;
  if (r.sec > 0) saveStats(crossesDays);
  saveState(); // keeps the stored (stats, state) pair consistent

  const goal = settings.goalMin * 60;
  const after = stats[today] ? stats[today].focus : 0;
  if (goal && before < goal && after >= goal) {
    showNotice('🎉 Daily goal reached — ' + fmtHuman(goal) + ' focused.');
    notify('Daily goal reached 🎉', fmtHuman(goal) + ' of focus today.');
  }
}

/* ------------------------------------------------------------------ *
 * Sound & notifications
 * ------------------------------------------------------------------ */
const CHIMES = {
  bell: { type: 'sine', gain: 1, notes: [523.25, 659.25, 783.99] },
  soft: { type: 'triangle', gain: 1, notes: [392.0, 493.88, 587.33] },
  digital: { type: 'square', gain: 0.3, notes: [880.0, 880.0, 1174.66] },
};

let actx = null;
let audioRest = null;
// The context is created from a click inside the widget so autoplay policies
// let the completion chime play later, even from a background tab. A running
// AudioContext keeps an audio thread awake, so it is suspended again as soon
// as nothing is sounding and only resumed for the second a chime lasts.
function audio(busyMs) {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (busyMs && actx.state === 'suspended') Promise.resolve(actx.resume()).catch(() => {});
    clearTimeout(audioRest);
    audioRest = setTimeout(() => {
      if (actx.state === 'running') Promise.resolve(actx.suspend()).catch(() => {});
    }, busyMs + 250);
    return actx;
  } catch (e) {
    return null;
  }
}

function tone(ctx, type, freq, at, dur, peak) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = ctx.currentTime + at;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// Rising notes when focus ends, falling when a break ends.
function chime(kind) {
  if (!settings.sound || !settings.volume) return;
  const ctx = audio(1200); // the three notes last ~0.75 s
  if (!ctx) return;
  try {
    const c = CHIMES[settings.chime];
    const notes = kind === 'focusDone' ? c.notes : c.notes.slice().reverse();
    const peak = Math.max(0.0002, 0.35 * c.gain * settings.volume / 100);
    notes.forEach((f, i) => tone(ctx, c.type, f, i * 0.18, i === 2 ? 0.35 : 0.18, peak));
  } catch (e) { /* audio blocked */ }
}

function notify(title, text) {
  if (!settings.notify) return;
  const focusTab = () => { try { window.focus(); } catch (e) { /* not allowed */ } };
  try {
    if (typeof GM_notification !== 'undefined') {
      GM_notification({ title, text, timeout: 6000, onclick: focusTab });
    } else if ('Notification' in window) {
      const show = () => { new Notification(title, { body: text }).onclick = focusTab; };
      if (Notification.permission === 'granted') show();
      else if (Notification.permission !== 'denied') {
        Promise.resolve(Notification.requestPermission()).then(p => { if (p === 'granted') show(); }, () => {});
      }
    }
  } catch (e) { /* notifications unavailable */ }
}

/* ------------------------------------------------------------------ *
 * Timer engine
 *
 * The script never polls. One self-rescheduling timeout is armed only
 * while the timer runs, and only as often as it buys something (see
 * nextWakeDelay in core.js): once a second while a clock is visible, once
 * a minute for a backgrounded tab's title, and only at the phase end when
 * nothing is on screen (widget hidden and title countdown off).
 * Paused, or not the leader → no timers at all.
 * Countdown math is pure timestamp arithmetic (endsAt vs Date.now()), so
 * throttled or coalesced wakeups introduce no drift.
 * ------------------------------------------------------------------ */
let wakeTimer = null;

function stopTicker() { if (wakeTimer !== null) { clearTimeout(wakeTimer); wakeTimer = null; } }

// How finely the remaining time is currently being shown to anyone.
function displayGrain() {
  if (document.hidden) return settings.titleTimer && !titleYielded ? 'minutes' : 'none';
  const widgetShown = built && !ui.hidden && !document.fullscreenElement;
  return widgetShown || (settings.titleTimer && !titleYielded) ? 'seconds' : 'none';
}

function scheduleTick() {
  stopTicker();
  if (!isLeader || !S.running) return;
  wakeTimer = setTimeout(tick, nextWakeDelay(S.endsAt - Date.now(), displayGrain()));
}

function syncRemaining() { if (S.running) S.remaining = Math.max(0, S.endsAt - Date.now()); }

function start() {
  if (!isLeader || S.running) return;
  const now = Date.now();
  S.running = true;
  S.endsAt = now + S.remaining;
  S.lastTick = now;
  saveState();
  scheduleTick();
  render();
}

function pause() {
  if (!S.running) return;
  flushFocus(true); // while still running, so the time since the last wake counts
  syncRemaining();
  S.running = false;
  S.endsAt = 0;
  stopTicker();
  saveState();
  render();
}

function toggle() { ensureLeader(); S.running ? pause() : start(); }

function reset() {
  ensureLeader();
  pause();
  S.phase = 'focus';
  S.round = 1;
  S.duration = S.remaining = durationFor(settings, 'focus');
  saveState();
  render();
}

// "+5 min" on the current phase, running or not.
function extend() {
  ensureLeader();
  const add = Math.min(EXTEND_MS, MAX_PHASE_MS - S.duration);
  if (add <= 0) return;
  S.duration += add;
  S.remaining += add;
  if (S.running) S.endsAt += add;
  saveState();
  scheduleTick();
  render();
}

// Move to the next phase. `completed` is false for a manual skip (no round
// is credited); `announce` controls the chime and notification.
function advancePhase(completed, announce) {
  flushFocus(true);
  const finished = S.phase;
  if (finished === 'focus' && completed) {
    // Credited to the day the round ended on.
    const day = dkey(S.running ? Math.min(Date.now(), S.endsAt) : Date.now());
    if (day !== memKey) loadHistory();
    dayEntry(stats, day).rounds += 1;
    saveStats(day !== memKey);
  }
  Object.assign(S, nextPhase(S, settings));
  S.duration = S.remaining = durationFor(settings, S.phase);
  S.running = false;
  S.endsAt = 0;

  if (announce) {
    chime(finished === 'focus' ? 'focusDone' : 'breakDone');
    notify(
      finished === 'focus' ? 'Focus round complete!' : 'Break over!',
      finished === 'focus'
        ? 'Time for your ' + PHASES[S.phase].label.toLowerCase() + ' (' + Math.round(S.duration / 60000) + ' min).'
        : 'Back to focus — round ' + S.round + ' of ' + settings.rounds + '.'
    );
  }

  // The next phase always starts from *now* (never back-dated to when the
  // previous one ended), so phases cannot chain-complete in a burst.
  if (S.phase === 'focus' ? settings.autoFocus : settings.autoBreaks) start();
  else { stopTicker(); saveState(); render(); }
}

function skip() { ensureLeader(); advancePhase(false, false); }

function tick() {
  wakeTimer = null;
  if (!isLeader || !S.running) return;
  syncRemaining();
  if (S.remaining === 0) { advancePhase(true, true); return; }
  if (S.phase === 'focus' && Date.now() - S.lastTick >= FLUSH_MS) flushFocus();
  render(); // change-cached: a hidden tab only ends up touching its title
  scheduleTick();
}

/* ------------------------------------------------------------------ *
 * UI — markup (static strings only; user data is never interpolated)
 * ------------------------------------------------------------------ */
const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  skip: '<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.08a6 6 0 1 1-1.41-6.24L13 11h7V4z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zM16.2 13h2.8v6h-2.8z"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 11h14v2H5z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
  sub: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  chevUp: '<svg viewBox="0 0 24 24"><path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
  chevDown: '<svg viewBox="0 0 24 24"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
};

// A typable number field flanked by +/- steppers. The field is the single
// source of truth so clicking and typing can't drift apart.
function stepperRow([key, label, step]) {
  const name = label.replace(/ \(.*\)/, '').toLowerCase();
  return (
    '<div class="pw-row">' +
      '<span class="pw-setlabel"' + (key === 'goalMin' ? ' title="0 turns the goal off"' : '') + '>' + label + '</span>' +
      '<div class="pw-stepper">' +
        '<button class="pw-stepbtn" data-step="' + key + ':-' + step + '" title="Decrease" aria-label="Decrease ' + name + '">' + ICONS.sub + '</button>' +
        '<input id="pw-set-' + key + '" class="pw-num" type="number" inputmode="numeric" min="' + RANGES[key][0] + '" max="' + RANGES[key][1] + '" aria-label="' + name + '"/>' +
        '<button class="pw-stepbtn" data-step="' + key + ':' + step + '" title="Increase" aria-label="Increase ' + name + '">' + ICONS.plus + '</button>' +
      '</div>' +
    '</div>'
  );
}

function toggleRow([key, label]) {
  return (
    '<label class="pw-row pw-toggle">' +
      '<span class="pw-setlabel">' + label + '</span>' +
      '<input type="checkbox" id="pw-tgl-' + key + '">' +
      '<span class="pw-switch"></span>' +
    '</label>'
  );
}

function selectRow([key, label, options]) {
  return (
    '<label class="pw-row">' +
      '<span class="pw-setlabel">' + label + '</span>' +
      '<select id="pw-sel-' + key + '" class="pw-select">' +
        options.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') +
      '</select>' +
    '</label>'
  );
}

// Built on demand (leader only) rather than at load time on every page.
function markup() {
  return (
    '<div id="pw-wrap" data-phase="focus" data-theme="auto">' +
      '<div id="pw-card">' +

        // Header (drag handle)
        '<div id="pw-header">' +
          '<span class="pw-logo">🍅</span>' +
          '<span class="pw-title">Pomodoro</span>' +
          '<button data-act="stats" title="Stats" aria-label="Stats" class="pw-iconbtn">' + ICONS.chart + '</button>' +
          '<button data-act="settings" title="Settings" aria-label="Settings" class="pw-iconbtn">' + ICONS.gear + '</button>' +
          '<button data-act="min" title="Minimize to pill" aria-label="Minimize to pill" class="pw-iconbtn">' + ICONS.minus + '</button>' +
          '<button data-act="hide" title="Hide (reopen from the drawer tab, bottom-left)" aria-label="Hide widget" class="pw-iconbtn">' + ICONS.chevDown + '</button>' +
        '</div>' +

        // Timer view
        '<div id="pw-view-timer" class="pw-view">' +
          '<div class="pw-row">' +
            '<span id="pw-phase">Focus</span>' +
            '<span class="pw-rounds"><span id="pw-dots" aria-hidden="true"></span><span id="pw-rounds">Round 1/4</span></span>' +
          '</div>' +
          '<div class="pw-dial">' +
            '<svg viewBox="0 0 120 120" aria-hidden="true">' +
              '<circle cx="60" cy="60" r="54"/>' +
              '<circle id="pw-ring" cx="60" cy="60" r="54" stroke-dasharray="' + RING_LEN.toFixed(3) + '" stroke-dashoffset="0"/>' +
            '</svg>' +
            '<div class="pw-dial-text">' +
              '<div id="pw-time" role="timer">25:00</div>' +
              '<div id="pw-state" role="status" aria-live="polite">Ready</div>' +
            '</div>' +
          '</div>' +
          '<input id="pw-task" class="pw-field" type="text" list="pw-tasklist" autocomplete="off" placeholder="What are you working on?" maxlength="' + TASK_MAX + '" aria-label="Current task"/>' +
          '<datalist id="pw-tasklist"></datalist>' +
          '<div class="pw-controls">' +
            '<button data-act="reset" title="Reset to round 1" aria-label="Reset to round 1" class="pw-ctl">' + ICONS.reset + '</button>' +
            '<button data-act="toggle" id="pw-play" title="Start / Pause" aria-label="Start or pause">' + ICONS.play + '</button>' +
            '<button data-act="skip" title="Skip to next phase" aria-label="Skip to next phase" class="pw-ctl">' + ICONS.skip + '</button>' +
          '</div>' +
          '<button data-act="extend" id="pw-extend" class="pw-link" title="Add 5 minutes to this phase">+5 min</button>' +
          '<div id="pw-notice" class="pw-notice hidden" role="status"></div>' +
          '<div id="pw-today">Today: 0s focused · 0 rounds</div>' +
        '</div>' +

        // Settings view
        '<div id="pw-view-settings" class="pw-view hidden">' +
          '<div class="pw-viewhead">' +
            '<button data-act="back" title="Back" aria-label="Back" class="pw-iconbtn">' + ICONS.back + '</button>' +
            '<span>Settings</span>' +
          '</div>' +
          '<div class="pw-scroll">' +
            '<div class="pw-stack">' + SETTING_ROWS.map(stepperRow).join('') + '</div>' +
            '<div class="pw-section pw-stack">' +
              TOGGLES.map(toggleRow).join('') +
              '<label class="pw-row"><span class="pw-setlabel">Volume</span><input id="pw-volume" class="pw-range" type="range" min="0" max="100" step="5" aria-label="Chime volume"/></label>' +
              SELECTS.map(selectRow).join('') +
              '<div class="pw-row"><span class="pw-setlabel">Show / hide hotkey</span><button id="pw-hotkey" data-act="hotkey" class="pw-btn pw-kbd" title="Click, then press the new key combination"></button></div>' +
            '</div>' +
            '<div class="pw-section pw-stack">' +
              '<button id="pw-exclude" data-act="exclude" class="pw-btn" title="Re-enable from the Tampermonkey menu, or from this list on another site"></button>' +
              '<div id="pw-excluded" class="pw-chips"></div>' +
              '<button id="pw-reset-settings" data-act="defaults" class="pw-btn" title="Restore the default 25/5/15 x 4 configuration">Reset settings to defaults</button>' +
            '</div>' +
            '<p class="pw-help">Changes apply immediately. A running phase keeps its current duration; new durations apply to the next phase.</p>' +
          '</div>' +
        '</div>' +

        // Stats view
        '<div id="pw-view-stats" class="pw-view hidden">' +
          '<div class="pw-viewhead">' +
            '<button data-act="back" title="Back" aria-label="Back" class="pw-iconbtn">' + ICONS.back + '</button>' +
            '<span>Stats</span>' +
            '<button data-act="clearstats" id="pw-clear" title="Clear today\'s stats" aria-label="Clear today\'s stats" class="pw-iconbtn">' + ICONS.trash + '</button>' +
          '</div>' +
          '<div class="pw-scroll">' +
          '<div class="pw-tiles">' +
            '<div class="pw-tile"><b id="pw-stat-focus">0s</b><span class="pw-label">Focused today</span></div>' +
            '<div class="pw-tile"><b id="pw-stat-rounds">0</b><span class="pw-label">Rounds today</span></div>' +
          '</div>' +
          '<div id="pw-goal" class="hidden"><div class="pw-goalbar"><i id="pw-goal-bar"></i></div><div id="pw-goal-text"></div></div>' +
          '<div class="pw-label pw-section">Last 7 days</div>' +
          '<div id="pw-chart"></div>' +
          '<div id="pw-week-total">This week: 0s</div>' +
          '<div class="pw-label pw-section">Tasks today</div>' +
          '<div id="pw-tasks"></div>' +
          '<div class="pw-section pw-btnrow">' +
            '<button data-act="exportcsv" class="pw-btn" title="Download all stats as a spreadsheet">CSV</button>' +
            '<button data-act="exportjson" class="pw-btn" title="Download all stats as a backup file">Backup</button>' +
            '<button data-act="import" class="pw-btn" title="Restore stats from a backup file">Import</button>' +
          '</div>' +
          '<input id="pw-import-file" type="file" accept=".json,application/json" class="hidden" aria-hidden="true" tabindex="-1"/>' +
          '<div id="pw-stats-msg" class="pw-notice hidden" role="status"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Minimized pill
      '<button id="pw-pill" class="hidden" title="Expand">' +
        '<span id="pw-pill-dot"></span>' +
        '<span id="pw-pill-time">25:00</span>' +
      '</button>' +

      // Drawer tab — fixed at the bottom-left of the viewport; toggles the widget.
      '<button id="pw-tab" class="hidden" title="Show Pomodoro">' +
        '<span id="pw-tab-icon">' + ICONS.chevUp + '</span>' +
        '<span>Pomodoro</span>' +
      '</button>' +
    '</div>'
  );
}

/* ------------------------------------------------------------------ *
 * UI — lazy construction
 *
 * Nothing is created until this tab actually becomes the leader, so a tab
 * showing a page the user never looks at pays nothing: no shadow root, no
 * stylesheet parse, no markup parse, no element listeners.
 * ------------------------------------------------------------------ */
let host = null, shadow = null, el = null, $ = null;
let built = false, buildTried = false;

function buildUI() {
  if (buildTried) return;
  buildTried = true;
  try {
    host = document.createElement('div');
    host.id = 'pomodoro-focus-timer-host';
    // `all: initial` stops the page's inherited styles (text-transform,
    // letter-spacing, visibility, …) from leaking into the shadow tree.
    // Inline !important beats any page stylesheet rule on the host.
    host.style.setProperty('all', 'initial', 'important');
    host.style.setProperty('position', 'fixed', 'important');
    host.style.setProperty('z-index', '2147483647', 'important');
    shadow = host.attachShadow({ mode: 'open' });

    // A constructed stylesheet is not subject to the page's style-src CSP,
    // so the widget is styled even on sites that forbid inline <style>.
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(STYLES);
      shadow.adoptedStyleSheets = [sheet];
    } catch (e) {
      shadow.appendChild(make('style', '', STYLES));
    }

    const container = document.createElement('div');
    setHTML(container, markup());
    shadow.appendChild(container);

    $ = sel => shadow.querySelector(sel);
    el = {};
    for (const id of ['wrap', 'card', 'pill', 'phase', 'rounds', 'dots', 'ring', 'time', 'state', 'task', 'tasklist',
      'play', 'today', 'notice', 'pill-time', 'view-timer', 'view-settings', 'view-stats', 'volume', 'hotkey',
      'exclude', 'excluded', 'clear', 'stat-focus', 'stat-rounds', 'goal', 'goal-bar', 'goal-text', 'chart',
      'week-total', 'tasks', 'import-file', 'stats-msg', 'tab', 'tab-icon']) {
      el[id.replace(/-(.)/g, (m, c) => c.toUpperCase())] = $('#pw-' + id);
    }
    bindEvents();
    watchSiteTitle();
    (document.body || document.documentElement).appendChild(host);
    built = true;
  } catch (e) {
    // The timer, tab title and notifications keep working without a widget.
    if (host) host.remove();
    host = shadow = el = null;
  }
}

// A few SPAs replace document.body wholesale, which would take the widget
// with it. Re-attaching is a cheap isConnected check on each render.
function ensureMounted() {
  if (!host.isConnected) (document.body || document.documentElement).appendChild(host);
}

// Single place that positions the host: clamps into the viewport so a
// position saved in a larger window (or another tab) is always reachable.
// The saved position itself is left untouched.
function place(pos, size) {
  const set = (prop, v) => host.style.setProperty(prop, v, 'important');
  if (!pos) { set('left', 'auto'); set('top', 'auto'); set('right', '20px'); set('bottom', '20px'); return; }
  const r = size || host.getBoundingClientRect();
  set('left', clamp(pos.left, 4, Math.max(4, window.innerWidth - r.width - 4)) + 'px');
  set('top', clamp(pos.top, 4, Math.max(4, window.innerHeight - r.height - 4)) + 'px');
  set('right', 'auto');
  set('bottom', 'auto');
}

// Stay out of the way of fullscreen video and presentations.
function syncFullscreen() {
  host.style.setProperty('display', document.fullscreenElement ? 'none' : 'block', 'important');
  scheduleTick();
}

/* ------------------------------------------------------------------ *
 * UI — rendering
 * ------------------------------------------------------------------ */
/* render() is called on every tick, so every DOM write is guarded by a
 * change cache — a steady-state tick performs zero DOM mutations. */
let painted = {};
function changed(key, value) {
  if (painted[key] === value) return false;
  painted[key] = value;
  return true;
}

// A backgrounded tab's title is only refreshed once a minute, so it shows
// whole minutes instead of a seconds display that would sit there frozen.
function titleTime() { return S.running && document.hidden ? fmtMinutes(S.remaining) : fmtClock(S.remaining); }

function render() {
  if (!isLeader || !built) return;
  ensureMounted();

  // The tab-title countdown is independent of widget visibility, so it is
  // refreshed before any early return for a hidden widget.
  if (changed('title', titleTime() + '|' + S.phase + '|' + S.task + '|' + settings.titleTimer)) renderTitle();

  const surface = ui.hidden ? 'none' : ui.mode; // 'card' | 'pill' | 'none'
  if (surface === 'none') return;

  if (changed('theme', settings.theme)) el.wrap.setAttribute('data-theme', settings.theme);
  if (changed('phase', S.phase)) {
    el.wrap.setAttribute('data-phase', S.phase); // drives every accent colour
    el.phase.textContent = PHASES[S.phase].label;
  }

  // A minimized pill only shows the time.
  const timeStr = fmtClock(S.remaining);
  if (surface === 'pill') {
    if (changed('time', timeStr)) el.pillTime.textContent = timeStr;
    return;
  }
  if (changed('time', timeStr)) el.time.textContent = timeStr;

  const roundsText = 'Round ' + S.round + '/' + settings.rounds;
  if (changed('rounds', roundsText + S.phase)) {
    el.rounds.textContent = roundsText;
    // One dot per round until the long break.
    el.dots.textContent = '';
    for (let i = 1; i <= settings.rounds; i++) {
      const done = i < S.round || (i === S.round && S.phase !== 'focus');
      el.dots.appendChild(make('i', done ? 'done' : i === S.round ? 'now' : ''));
    }
  }

  const off = Math.round(RING_LEN * (1 - (S.duration ? S.remaining / S.duration : 0)) * 2) / 2;
  if (changed('ring', off)) el.ring.setAttribute('stroke-dashoffset', off.toFixed(1));

  const stateText = S.running ? (S.phase === 'focus' ? 'Focusing…' : 'Resting…') : (S.remaining === S.duration ? 'Ready' : 'Paused');
  if (changed('state', stateText)) el.state.textContent = stateText;

  if (changed('play', S.running)) setHTML(el.play, S.running ? ICONS.pause : ICONS.play);

  const d = stats[dkey(Date.now())];
  const focus = d ? d.focus : 0, rounds = d ? d.rounds : 0, goal = settings.goalMin * 60;
  if (changed('today', focus + '|' + rounds + '|' + goal)) {
    el.today.textContent = 'Today: ' + fmtHuman(focus) + (goal ? ' / ' + fmtHuman(goal) : ' focused') + ' · ' + rounds + ' rounds';
  }
}

// A one-line message under the controls (goal reached, "finished while you
// were away", …). Cleared by the next button press.
let noticeText = '';
function showNotice(text) {
  noticeText = text;
  if (!built) return;
  el.notice.textContent = text;
  el.notice.classList.toggle('hidden', !text);
}

function showStatsMsg(text) {
  el.statsMsg.textContent = text;
  el.statsMsg.classList.toggle('hidden', !text);
}

/* ---- Tab title ----
 * `writtenTitle` is the title exactly as the browser reports it after our
 * last write. Anything else in document.title is the site's own title.
 *
 * It is read back rather than remembered because the document.title getter
 * collapses whitespace: a task like "a  b" would otherwise never compare
 * equal, be mistaken for a site change and reappended forever (the
 * MutationObserver below would spin and freeze the page). */
let origTitle = '';
let writtenTitle = null;
let titleYielded = false; // the site keeps overwriting us — it wins on this page
let fightCount = 0, fightSince = 0;

function renderTitle() {
  if (!isLeader) return; // only the leader owns the tab title
  const live = document.title;
  if (live !== writtenTitle) origTitle = live; // the site set (or changed) its own title
  if (!settings.titleTimer || titleYielded) { restoreTitle(); return; }
  const t = buildTitle(S.phase, titleTime(), S.task, origTitle);
  if (live !== t) document.title = t;
  writtenTitle = document.title;
}

function restoreTitle() {
  if (writtenTitle !== null && document.title === writtenTitle) document.title = origTitle;
  writtenTitle = null;
}

// Re-render when the site (or an SPA) changes its title. Our own writes
// read back equal to writtenTitle, so the observer ignores them — no
// feedback loop. Watching <head> also survives a replaced <title> element.
// A site that rewrites its title every time we touch it would ping-pong
// with us forever, so after a handful of rounds in quick succession we
// leave the title to the site until this tab next takes over.
function watchSiteTitle() {
  const target = document.head || document.querySelector('title');
  if (!target) return;
  new MutationObserver(() => {
    if (!isLeader || titleYielded || document.title === writtenTitle) return;
    const now = Date.now();
    if (now - fightSince > 2000) { fightSince = now; fightCount = 0; }
    if (++fightCount > 5) { titleYielded = true; writtenTitle = null; return; }
    renderTitle();
  }).observe(target, { childList: true, characterData: true, subtree: true });
}

/* ---- Settings view ---- */
let capturing = false; // waiting for the user to press a new hotkey

function syncSettingsView() {
  if (!built) return;
  for (const [key] of SETTING_ROWS) {
    const input = $('#pw-set-' + key);
    // Never clobber what the user is currently typing into.
    if (input !== shadow.activeElement) input.value = settings[key];
  }
  for (const [key] of TOGGLES) $('#pw-tgl-' + key).checked = settings[key];
  for (const [key] of SELECTS) $('#pw-sel-' + key).value = settings[key];
  el.volume.value = settings.volume;
  el.hotkey.textContent = capturing ? 'Press keys…' : hotkeyLabel(settings.hotkey);

  el.exclude.classList.toggle('hidden', !HOST);
  el.exclude.textContent = 'Hide on ' + HOST;
  el.excluded.textContent = '';
  for (const h of settings.excluded) {
    const chip = make('span', 'pw-chip');
    chip.appendChild(make('span', '', h));
    const x = make('button', '', '✕');
    x.setAttribute('data-unexclude', h);
    x.setAttribute('aria-label', 'Show on ' + h + ' again');
    x.title = 'Show on this site again';
    chip.appendChild(x);
    el.excluded.appendChild(chip);
  }
}

// Single funnel for every settings change — typed fields, +/- steppers,
// switches, selects and "reset to defaults" all land here.
function applySettings(patch) {
  settings = loadSettings(Object.assign({}, settings, patch));
  // Rounds can shrink below the round already in flight; keep the readout
  // coherent ("Round 1/1", never "Round 5/3").
  S.round = Math.min(S.round, settings.rounds);
  // A phase that hasn't started yet adopts a new duration straight away.
  if (!S.running && S.remaining === S.duration) S.duration = S.remaining = durationFor(settings, S.phase);
  saveSettings();
  saveState();
  syncSettingsView();
  scheduleTick(); // the hidden-tab wake cadence depends on titleTimer
  render();
}

/* ---- Site exclusion ---- */
// On an excluded site the script stays inert: no widget, no leadership, no
// hotkey. The timer itself is shared, so it keeps counting and resumes in
// the next tab that takes over.
function setSiteExcluded(on) {
  if (!HOST) return;
  const cfg = liveSettings();
  const list = cfg.excluded.filter(h => !hostExcluded(HOST, [h]));
  if (on) list.push(HOST);
  if (isLeader) applySettings({ excluded: list });
  else { store.set(KEYS.settings, Object.assign({}, cfg, { excluded: list })); cfgCache = null; }
  if (!on) claimLeadership();
  else if (isLeader) {
    store.set(KEYS.leader, { id: '', ts: Date.now() }); // nobody leads until another tab is focused
    yieldLeadership();
  }
}

/* ---- Stats view ---- */
function renderStats() {
  const now = Date.now();
  const today = dkey(now);
  const d = stats[today] || { focus: 0, rounds: 0, tasks: {} };
  el.statFocus.textContent = fmtHuman(d.focus);
  el.statRounds.textContent = d.rounds;

  const goal = settings.goalMin * 60;
  el.goal.classList.toggle('hidden', !goal);
  if (goal) {
    el.goalBar.style.width = Math.min(100, Math.round(d.focus / goal * 100)) + '%';
    el.goalText.textContent = fmtHuman(d.focus) + ' of ' + fmtHuman(goal) + ' goal';
  }

  // 7-day chart (heights are set through the CSSOM, never a style attribute,
  // so a strict style-src CSP has nothing to object to)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    const k = dkey(dt.getTime());
    days.push({ today: k === today, label: 'SMTWTFS'[dt.getDay()], val: stats[k] ? stats[k].focus : 0 });
  }
  const max = Math.max(60, ...days.map(x => x.val));
  el.chart.textContent = '';
  for (const x of days) {
    const col = make('div', 'pw-col' + (x.today ? ' today' : ''));
    const bar = make('div', 'pw-bar');
    bar.style.height = Math.max(2, Math.round((x.val / max) * 56)) + 'px';
    bar.title = fmtHuman(x.val);
    col.appendChild(bar);
    col.appendChild(make('span', '', x.label));
    el.chart.appendChild(col);
  }
  el.weekTotal.textContent = 'This week: ' + fmtHuman(days.reduce((a, x) => a + x.val, 0));

  // Tasks today
  const entries = Object.entries(d.tasks).sort((a, b) => b[1] - a[1]).slice(0, 20);
  el.tasks.textContent = '';
  for (const [name, sec] of entries) {
    const row = make('div', 'pw-task');
    row.appendChild(make('span', '', name));
    row.appendChild(make('b', '', fmtHuman(sec)));
    el.tasks.appendChild(row);
  }
  if (!entries.length) el.tasks.appendChild(make('div', 'pw-empty', 'No focus time logged yet today.'));
}

// Autocomplete for the task field, from recently tracked task names.
function refreshTaskList() {
  el.tasklist.textContent = '';
  for (const name of recentTasks(stats, 15)) el.tasklist.appendChild(make('option')).value = name;
}

// Hand a generated file to the browser. A blob: URL — nothing leaves the machine.
function download(name, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = make('a');
  a.href = url;
  a.download = name;
  shadow.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function exportStats(format) {
  flushFocus();
  loadHistory();
  const now = Date.now();
  const name = 'pomodoro-stats-' + dkey(now) + '.' + format;
  try {
    if (format === 'csv') download(name, 'text/csv', statsToCsv(stats));
    else download(name, 'application/json', statsToJson(stats, now));
    showStatsMsg('Saved ' + name);
  } catch (e) {
    showStatsMsg('This page blocked the download.');
  }
}

function importStats(file) {
  if (!file) return;
  if (file.size > 2e6) { showStatsMsg('That file is too large.'); return; }
  const reader = new FileReader();
  reader.onerror = () => showStatsMsg('Could not read that file.');
  reader.onload = () => {
    if (!isLeader) return;
    const imported = parseImport(String(reader.result), Date.now());
    if (!imported) { showStatsMsg('No usable stats in that file.'); return; }
    flushFocus();
    loadHistory();
    const n = mergeStats(stats, imported);
    saveStats(true);
    renderStats();
    refreshTaskList();
    render();
    showStatsMsg('Imported ' + n + (n === 1 ? ' day.' : ' days.'));
  };
  reader.readAsText(file);
}

/* ---- View switching ---- */
function showView(name) {
  if (!built) return;
  el.viewTimer.classList.toggle('hidden', name !== 'timer');
  el.viewSettings.classList.toggle('hidden', name !== 'settings');
  el.viewStats.classList.toggle('hidden', name !== 'stats');
  if (name === 'settings') syncSettingsView();
  if (name === 'stats') { showStatsMsg(''); loadHistory(); renderStats(); }
}

// The drawer tab is position:fixed (viewport-relative) inside the shadow root,
// so it stays docked at the bottom-left even when the widget host is dragged
// elsewhere — and stays visible while the widget itself is hidden. It follows
// the leader, so there's always a handle in whichever tab you last focused.
function applyVisibility() {
  if (!built) return;
  const surface = isLeader && !ui.hidden ? ui.mode : 'none';
  el.card.classList.toggle('hidden', surface !== 'card');
  el.pill.classList.toggle('hidden', surface !== 'pill');
  el.tab.classList.toggle('hidden', !isLeader);
  setHTML(el.tabIcon, ui.hidden ? ICONS.chevUp : ICONS.chevDown);
  el.tab.setAttribute('title', ui.hidden ? 'Show Pomodoro' : 'Hide Pomodoro');
  if (isLeader) place(ui.pos); // the surface (and so its size) may have changed
  // The visible surface just changed, so the render cache is stale.
  painted = {};
  render();
  scheduleTick(); // a hidden widget may need no wakes at all
}

function setUi(patch) {
  Object.assign(ui, patch);
  saveUi();
  applyVisibility();
}

/* ------------------------------------------------------------------ *
 * Cross-tab leadership — the timer runs in ONE tab only
 *
 * Storage is shared across tabs, so the tab you last focused "claims"
 * leadership by writing its id. Because all countdown and focus math is
 * based on absolute timestamps, the new leader reconstructs the exact
 * state from storage at handoff; the old leader just stops — it writes
 * nothing, so a late write from it can never clobber the new leader.
 * ------------------------------------------------------------------ */
const MY_ID = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
let isLeader = false;

function reloadSharedState() {
  const now = Date.now();
  settings = loadSettings(store.get(KEYS.settings));
  loadStatsForLeader(now);
  ui = loadUi(store.get(KEYS.ui));
  S = loadState(store.get(KEYS.state), settings, now);
  noticeText = '';
  // A phase that ran out while no tab was leading completes silently (no
  // chime for something nobody witnessed) but leaves a note in the widget;
  // the next phase starts from now if auto-start is on.
  if (S.running && S.endsAt <= now) {
    noticeText = (S.phase === 'focus' ? 'A focus round' : 'A break') + ' finished while you were away.';
    advancePhase(true, false);
  }
}

function becomeLeader() {
  if (isLeader) return;
  isLeader = true;
  titleYielded = false;
  reloadSharedState();
  buildUI();
  if (built) {
    el.task.value = S.task;
    refreshTaskList();
    syncSettingsView();
    showNotice(noticeText);
    applyVisibility(); // toggles the surfaces, positions, then repaints
  }
  scheduleTick();
}

function yieldLeadership() {
  if (!isLeader) return;
  isLeader = false;
  cfgCache = null;
  stopTicker();
  restoreTitle(); // hand the tab title back
  applyVisibility();
}

function checkLeadership() {
  const rec = store.get(KEYS.leader);
  if (isObj(rec) && rec.id === MY_ID) becomeLeader();
  else yieldLeadership();
}

function claimLeadership() {
  const rec = store.get(KEYS.leader);
  if (!isObj(rec) || rec.id !== MY_ID) store.set(KEYS.leader, { id: MY_ID, ts: Date.now() });
  becomeLeader();
}

function ensureLeader() { if (!isLeader) claimLeadership(); }

// What focus/visibility do: take over, unless this site is excluded.
function autoClaim() { if (!excludedHere()) claimLeadership(); }

// Cross-tab handoff — GM listeners, or the localStorage 'storage' event as
// fallback (fires in every tab except the writer).
if (typeof GM_addValueChangeListener !== 'undefined') {
  try {
    GM_addValueChangeListener(KEYS.leader, (k, o, v, remote) => { if (remote) checkLeadership(); });
    GM_addValueChangeListener(KEYS.settings, () => { cfgCache = null; });
    cfgWatched = true;
  } catch (e) { /* older managers */ }
} else {
  window.addEventListener('storage', e => {
    if (e.key === KEYS.leader) checkLeadership();
    else if (e.key === KEYS.settings || e.key === null) cfgCache = null;
  });
  cfgWatched = true;
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) autoClaim();
  // Visible: repaint what was skipped and resume per-second wakes.
  // Hidden: switch the title to whole minutes and slow the wakes down.
  if (isLeader) { syncRemaining(); render(); scheduleTick(); }
});
window.addEventListener('focus', autoClaim);

/* ------------------------------------------------------------------ *
 * Events — bound once, when the UI is built (leader only)
 * ------------------------------------------------------------------ */
let pillDragged = false;
let clearArmed = null; // timeout id while the clear-stats button awaits a second click

function disarmClear() {
  clearTimeout(clearArmed);
  clearArmed = null;
  el.clear.classList.remove('armed');
  el.clear.title = "Clear today's stats";
}

function bindEvents() {
  // Recording a new hotkey swallows the next key combination entirely.
  shadow.addEventListener('keydown', e => {
    if (!capturing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const hk = e.key === 'Escape' ? null : hotkeyFromEvent(e);
    if (hk || e.key === 'Escape') {
      capturing = false;
      if (hk) applySettings({ hotkey: hk }); else syncSettingsView();
    }
  });
  el.hotkey.addEventListener('blur', () => { if (capturing) { capturing = false; syncSettingsView(); } });

  // Keystrokes typed in the widget must not escape to the page.
  //
  // Shadow DOM retargets events to the host element, so a page's guard such
  // as `if (e.target.tagName === 'INPUT') return` never matches a field
  // inside our shadow root. The page then treats your typing as its own
  // single-key shortcut and calls preventDefault(), which swallows the
  // character — typically one specific letter, e.g. 'k' on Gmail (previous
  // conversation), YouTube (play/pause) or GitHub. Stopping propagation at
  // the shadow root keeps plain typing inside; genuine modifier combos
  // (copy/paste, undo, our own hotkey) are left to propagate.
  const shieldKeys = e => { if (!e.ctrlKey && !e.metaKey && !e.altKey) e.stopPropagation(); };
  for (const type of ['keydown', 'keypress', 'keyup']) shadow.addEventListener(type, shieldKeys);

  shadow.addEventListener('click', e => {
    if (settings.sound && !actx) audio(0); // create the context inside a user gesture (autoplay policies)

    const chip = e.target.closest('[data-unexclude]');
    if (chip) {
      applySettings({ excluded: settings.excluded.filter(h => h !== chip.getAttribute('data-unexclude')) });
      return;
    }

    const stepBtn = e.target.closest('[data-step]');
    if (stepBtn) {
      const [key, delta] = stepBtn.getAttribute('data-step').split(':');
      applySettings({ [key]: settings[key] + Number(delta) }); // clamped by loadSettings
      return;
    }

    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    showNotice('');
    if (clearArmed && act !== 'clearstats') disarmClear();
    switch (act) {
      case 'toggle': toggle(); break;
      case 'reset': reset(); break;
      case 'skip': skip(); break;
      case 'extend': extend(); break;
      case 'min': setUi({ mode: 'pill' }); break;
      case 'hide': setUi({ hidden: true }); break;
      case 'settings': showView('settings'); break;
      case 'stats': showView('stats'); break;
      case 'back': showView('timer'); break;
      case 'defaults': applySettings(Object.assign({}, DEFAULT_SETTINGS, { excluded: settings.excluded })); break;
      case 'hotkey': capturing = !capturing; syncSettingsView(); break;
      case 'exclude': setSiteExcluded(true); break;
      case 'exportcsv': exportStats('csv'); break;
      case 'exportjson': exportStats('json'); break;
      case 'import': el.importFile.click(); break;
      case 'clearstats':
        // Two clicks instead of a native confirm dialog: a page can override or block
        // those, and they freeze the timer while open.
        if (!clearArmed) {
          el.clear.classList.add('armed');
          el.clear.title = 'Click again to clear today';
          clearArmed = setTimeout(disarmClear, 4000);
        } else {
          disarmClear();
          flushFocus();
          delete stats[dkey(Date.now())];
          saveStats(false);
          renderStats();
          render();
        }
        break;
    }
  });

  // Autocomplete draws on the whole history; fetch it the first time the
  // field is used rather than on every tab switch.
  el.task.addEventListener('focus', () => {
    if (!historyLoaded) { loadHistory(); refreshTaskList(); }
  });

  // Task input — credit focus time to the previous task before switching.
  el.task.addEventListener('change', () => {
    flushFocus();
    S.task = el.task.value.slice(0, TASK_MAX);
    saveState();
    refreshTaskList();
    render();
  });

  // Switches, selects and the volume slider
  for (const [key] of TOGGLES) {
    const t = $('#pw-tgl-' + key);
    t.addEventListener('change', () => {
      applySettings({ [key]: t.checked });
      if (key === 'sound' && t.checked) chime('focusDone'); // audible preview
    });
  }
  for (const [key] of SELECTS) {
    const s = $('#pw-sel-' + key);
    s.addEventListener('change', () => {
      applySettings({ [key]: s.value });
      if (key === 'chime') chime('focusDone');
    });
  }
  el.volume.addEventListener('change', () => {
    applySettings({ volume: Number(el.volume.value) });
    chime('focusDone');
  });

  // Number fields — typing commits on Enter or blur.
  for (const [key] of SETTING_ROWS) {
    const input = $('#pw-set-' + key);
    input.addEventListener('change', () => {
      const typed = Math.round(Number(input.value));
      const v = clamp(input.value !== '' && finite(typed) ? typed : settings[key], RANGES[key][0], RANGES[key][1]);
      input.value = v; // show the clamped value back to the user
      if (v !== settings[key]) applySettings({ [key]: v });
    });
  }

  el.importFile.addEventListener('change', () => {
    const file = el.importFile.files && el.importFile.files[0];
    importStats(file);
    el.importFile.value = ''; // so picking the same file again fires `change`
  });

  // Enter commits a text/number field (blur then fires `change`); Escape
  // leaves a field and backs out of a panel.
  shadow.addEventListener('keydown', e => {
    const field = e.target.tagName === 'INPUT' && /^(text|number)$/.test(e.target.type) ? e.target : null;
    if (e.key === 'Enter' && field) { e.preventDefault(); field.blur(); }
    else if (e.key === 'Escape') {
      if (field) field.blur();
      if (el.viewTimer.classList.contains('hidden')) showView('timer');
    }
  });

  // Pill click → expand (ignored right after a drag)
  el.pill.addEventListener('click', () => {
    if (pillDragged) { pillDragged = false; return; }
    setUi({ mode: 'card' });
  });

  // Drawer tab → show/hide the widget
  el.tab.addEventListener('click', () => setUi({ hidden: !ui.hidden }));

  document.addEventListener('fullscreenchange', syncFullscreen);

  makeDraggable($('#pw-header'), false);
  makeDraggable(el.pill, true);
}

/* ---- Dragging ---- */
function makeDraggable(handle, isPill) {
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (!isPill && e.target.closest('button, input, label')) return;
    e.preventDefault();
    const rect = host.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    let moved = false;

    const onMove = ev => {
      if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 6) moved = true;
      place({ left: ev.clientX - offX, top: ev.clientY - offY }, rect);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      if (!moved) return;
      const r = host.getBoundingClientRect();
      ui.pos = { left: Math.round(r.left), top: Math.round(r.top) };
      saveUi();
      if (isPill) pillDragged = true;
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
  });
}

/* ---- Hotkey & menu commands ---- */
// Opening anything from outside the widget means the user is in this tab,
// so it takes over first.
function showWidget(view) {
  claimLeadership();
  setUi({ hidden: false, mode: 'card' });
  showView(view);
}

function toggleWidget() {
  claimLeadership();
  setUi({ hidden: !ui.hidden });
}

function inPageField(e) {
  const t = e.composedPath ? e.composedPath()[0] : e.target;
  if (!t || !t.tagName || (shadow && shadow.contains(t))) return false;
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
}

// Show/hide hotkey (configurable; default Alt+Shift+T, which avoids the
// browser's private-window shortcut Ctrl/Alt+Shift+P).
window.addEventListener('keydown', e => {
  if (e.repeat || capturing || !(e.altKey || e.ctrlKey || e.metaKey)) return;
  const hk = hotkeyFromEvent(e);
  if (!hk) return;
  const cfg = liveSettings();
  if (hk !== cfg.hotkey || hostExcluded(HOST, cfg.excluded)) return;
  // Alt(+Shift) combos type a character on macOS — don't steal it from a
  // field on the page the user is typing in.
  if (!e.ctrlKey && !e.metaKey && inPageField(e)) return;
  e.preventDefault();
  toggleWidget();
});

if (typeof GM_registerMenuCommand !== 'undefined') {
  // Everything but the per-site switch is inert on an excluded site.
  const unlessExcluded = fn => () => { if (!excludedHere()) fn(); };
  try {
    GM_registerMenuCommand('▶ / ⏸  Start / Pause', unlessExcluded(toggle));
    GM_registerMenuCommand('👁  Show / Hide widget', unlessExcluded(toggleWidget));
    GM_registerMenuCommand('⏭  Skip phase', unlessExcluded(skip));
    GM_registerMenuCommand('📊  Open stats', unlessExcluded(() => showWidget('stats')));
    GM_registerMenuCommand('⚙  Open settings', unlessExcluded(() => showWidget('settings')));
    GM_registerMenuCommand('🚫  Hide / show on this site', () => setSiteExcluded(!excludedHere()));
  } catch (e) { /* older managers */ }
}

// Keep a dragged widget reachable when the window shrinks (the saved
// position is kept, so it returns there when the window grows again).
window.addEventListener('resize', () => { if (isLeader && built && ui.pos) place(ui.pos); });

/* ------------------------------------------------------------------ *
 * Startup
 * ------------------------------------------------------------------ */
// Startup builds no DOM and arms no timers; a background-loaded tab does not
// even read storage until it is focused. The widget is created lazily by
// whichever tab becomes the leader, and even then only in an idle slot, so
// it never competes with the page's own load work.
// There is deliberately no unload handler: saved state is always
// self-consistent, and unload listeners would disable the back/forward cache.
const idle = window.requestIdleCallback
  ? cb => window.requestIdleCallback(cb, { timeout: 300 })
  : cb => setTimeout(cb, 0);

if (document.visibilityState === 'visible') idle(autoClaim);
