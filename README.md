# 🍅 Pomodoro Focus Timer (Tampermonkey)

A modern, fully self-contained Pomodoro userscript that floats on every website and tracks how long you spend on tasks each day. UI is built with Tailwind CSS, compiled and inlined into the script, and rendered inside a Shadow DOM so page styles never leak in or out.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome / Edge / Firefox / Safari).
2. Open `pomodoro.user.js` in your browser (drag the file into a tab, or Tampermonkey → *Utilities → Import from file*).
3. Tampermonkey will offer to install it — confirm. The widget appears in the bottom-right of every page.

## Features

- **Customizable cycles** — focus length (1–180 min), short break, long break, and rounds per cycle (default 25/5/15 × 4).
- **Full timer control** — start/pause, skip phase, reset; progress ring + phase colors (rose = focus, green = short break, blue = long break).
- **Task tracking** — type what you're working on; focus time is attributed per task.
- **Daily stats** — today's focus time & rounds, per-task breakdown, and a 7-day bar chart. Data persists across sessions (GM storage, 14-day retention).
- **Auto-start options** — independently toggle auto-starting breaks and focus rounds.
- **Completion alerts** — WebAudio chime + desktop notification (GM_notification with browser fallback).
- **Tab-title countdown** — optional, toggleable; restores the site's original title when off.
- **Draggable & minimizable** — drag by the header to any corner (position persists), collapse to a tiny pill, or hide entirely.
- **Drawer tab** — a small rectangular tab with an up arrow stays docked at the bottom-left of the viewport; click it to show/hide the widget (arrow flips down while the widget is open).
- **Survives reloads** — a running timer fast-forwards through any phases that expired while the page was closed.
- **Single active instance** — the timer runs only in your most recently focused tab; the widget (and drawer tab) follows you across tabs. Handoff is seamless because all countdown math is timestamp-based: the newly active tab reconstructs the exact remaining time from `endsAt` instead of keeping a live count.
- **Performance-friendly** — see [Performance model](#performance-model) below: non-leader tabs do essentially nothing, and the leader wakes once per second only while a visible timer is running.
- **Keyboard shortcut** — `Alt+Shift+T` shows/hides the widget (chosen to avoid the browser's private-window shortcut). Tampermonkey menu commands: Start/Pause, Skip, Show/Hide.

## Performance model

The script runs on every page, so its cost when *not* in use matters more than
its cost while running.

**A tab that isn't the leader does nothing.** No storage reads, no DOM, no
shadow root, no stylesheet parse, no timers, no listeners on page elements —
just a couple of event listeners (`focus`, `visibilitychange`) and the
cross-tab change listener. The widget is constructed lazily by whichever tab
becomes the leader.

**The leader builds its UI in an idle slot.** Construction (including parsing
the ~16 KB inlined stylesheet) is deferred with `requestIdleCallback`, so it
never competes with the page's own load work. It happens once per session, in
one tab.

**The timer never polls.** One self-rescheduling `setTimeout` is armed *only*
while the timer runs (`setInterval` is used nowhere in the script):

| State | Wakeups | DOM work |
|---|---|---|
| Running, tab visible | one per second, aligned to the second boundary | only what changed |
| Running, tab hidden | a single wake at the exact moment the phase ends | none |
| Paused / ready | none | none |
| Not the leader | none | none |

**Countdown math is timestamp arithmetic.** Remaining time is always
`endsAt - Date.now()`, never a decrementing counter — so throttled, coalesced or
skipped wakeups cannot accumulate drift. This is also what makes cross-tab
handoff free: a new leader reconstructs the exact state from storage.

**Rendering is change-cached.** Every DOM write is guarded by a comparison, so
in steady state a wakeup mutates nothing. Only the visible surface is updated
(a minimized pill skips all card work, a hidden widget skips everything but the
tab title), timer text is written once per second, ring geometry is quantized
to 0.5 px, and footer statistics compare integers before building strings.

**Misc.** No `backdrop-filter` (it forces backdrop readback and can cost real
scroll performance) — the panels use a solid background instead. Focus time is
flushed to storage at most every 15 s. A safety valve suppresses the chime and
desktop notification for phases that complete back-to-back while catching up
after the browser was frozen, and parks the timer after 20 such steps. The
Tailwind config blocklists `container`/`ring`/`shadow`/`visible`, which would
otherwise be emitted from bare identifiers in the script.

## Development

The source template is `src/pomodoro.template.js` with a `__TAILWIND_CSS__` placeholder.

```sh
npm run build   # compile Tailwind, inline it, write pomodoro.user.js
npm test        # smoke-test the built script in jsdom
```

`npm run build` runs the Tailwind v3 CLI (via npx), scans the template for class names, minifies the result, and writes the final `pomodoro.user.js`.

### Tests

The suite (`test/smoke.test.mjs`, 43 checks) boots real DOM windows in jsdom with a shared Tampermonkey-like store (including cross-window change dispatch) and a fake clock, so it covers timer math, phase transitions, stats crediting, tab-title handling, the drawer tab, cross-tab leadership, and the lazy-build/idle-tab behaviour — without waiting for real minutes to pass.

Because a runaway mutation/render loop starves the event loop (timers never fire), such a failure can't be timed out from inside the same thread; `test/run.mjs` therefore runs the suite in a child process with a watchdog, so a freeze reports as a failure instead of hanging.

```sh
POMODORO_TEST_TIMEOUT=8000 npm test                          # custom watchdog budget
POMODORO_SCRIPT=/path/to/build.js npm test                   # test a specific build
```

## Troubleshooting

- **Pages hang / don't load, and the title bar shows the countdown repeated many times** — fixed in v1.1.0. The cause was a tab-title feedback loop: `MutationObserver` callbacks are microtasks, so a "currently writing the title" boolean was already cleared by the time the observer fired, and the script mistook its own title write for a site change and reappended it forever. The fix compares the live title against the exact string last written (`writtenTitle`). Regression-tested in `test/smoke.test.mjs`.
- **Widget or drawer tab missing in a tab** — expected unless that tab is the elected leader; switch to (or click) the tab and it claims the widget automatically. See the notes below.

## Notes / limitations

- Timer state and settings are shared across all tabs via Tampermonkey storage; one tab (the last focused) is the elected "leader" that runs the engine, using `GM_addValueChangeListener` for instant handoff (`storage` events as fallback).
- Focus time is persisted on a 15 s cadence (and on pause, phase change and page unload), so a hard crash or force-kill can lose at most the last ~15 seconds of unsaved focus time.
- If the browser is fully minimized for a long time, Chrome's intensive throttling may delay a completion chime by up to ~1 minute — the clock itself never drifts, since it's computed from timestamps. (This is inherent to userscripts; only a full extension with the `alarms` API can do better.)
- Sites with a very strict Content-Security-Policy (no `unsafe-inline` in `style-src`) may block the widget's styles — rare, but possible.
- Excluded from iframes; runs only in the top frame.
