# 🍅 Pomodoro Focus Timer (Tampermonkey)

A modern, fully self-contained Pomodoro userscript that floats on every website and tracks how long you spend on tasks each day. One file, no dependencies, no network requests; the UI lives in a Shadow DOM so page styles never leak in or out.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome / Edge / Firefox / Safari).
2. **[Install the script](https://raw.githubusercontent.com/Kritical-Dev/pomodoro-focus-timer/main/pomodoro.user.js)** — Tampermonkey intercepts the raw file and offers to install it. Installed this way it also checks for updates automatically (daily by default), because the script declares `@updateURL`/`@downloadURL`.
3. The widget appears in the bottom-right of every page.

Alternatively, import `pomodoro.user.js` by hand (drag the file into a tab, or
Tampermonkey → *Utilities → Import from file*). Be aware that manual installs
do not auto-update.

## Features

**Timer**
- **Customizable cycles** — focus length (1–180 min), short break, long break, and rounds per cycle (default 25/5/15 × 4).
- **Full control** — start/pause, skip, reset, and **+5 min** to extend the current phase. A progress ring, phase colours (rose = focus, green = short break, blue = long break) and one dot per round show where you are in the cycle.
- **Auto-start options** — independently toggle auto-starting breaks and focus rounds.
- **Completion alerts** — a WebAudio chime (three styles, adjustable volume) and a desktop notification; clicking the notification focuses the timer tab.
- **Tab-title countdown** — optional. Shows seconds while you look at the tab and whole minutes while it is in the background; restores the site's own title when off.

**Tracking**
- **Task tracking** — type what you're working on; focus time is attributed per task, and the field suggests recent task names.
- **Daily stats** — today's focus time and rounds, per-task breakdown, a 7-day chart, and an optional **daily goal** with progress. Kept for 90 days.
- **Export / import** — download everything as CSV (for spreadsheets) or as a JSON backup that can be imported again, e.g. on another machine.
- **Accurate by construction** — focus time is timestamp arithmetic capped at the phase end: a laptop that sleeps mid-round credits at most that round, a crashed tab loses nothing, a round across midnight is split between the two days, and a skipped round is not counted as completed.

**Widget**
- **Draggable & minimizable** — drag by the header (position persists), collapse to a tiny pill, or hide entirely.
- **Drawer tab** — a small tab docked at the bottom-left of the viewport shows/hides the widget.
- **Themes** — dark, light, or follow the system.
- **Per-site exclusion** — "Hide on this site" in settings keeps a site clear; undo it from the Tampermonkey menu on that site, or from the list in settings anywhere else.
- **Gets out of the way** — hidden while a page is fullscreen.
- **Single active instance** — the timer runs only in your most recently focused tab; the widget follows you across tabs. A phase that ran out while no tab was open completes on return, with a note in the widget.
- **Accessible** — labelled controls, a polite `role="status"` announcement for phase changes, visible keyboard focus rings, and `prefers-reduced-motion` support.

**Robustness**
- Works on sites that enforce Trusted Types (YouTube, Gmail) or forbid inline styles in their CSP.
- Immune to the page's stylesheet: sizes are `px` (not `rem`), the host element uses `all: initial`, and everything else is inside the shadow root.
- Typing in the widget is isolated from the page's single-key shortcuts.
- Everything read back from storage, and every imported file, is sanitised.
- Clamps an off-screen position back into view when the window shrinks, and re-attaches itself if a single-page app replaces `document.body`.

## Controls

| Action | How |
|---|---|
| Start / pause | Play button, or Tampermonkey menu |
| Skip / reset / +5 min | Buttons in the widget |
| Show / hide widget | Drawer tab (bottom-left), or the hotkey (default `Alt+Shift+T`) |
| Collapse to pill | `–` in the header |
| Hide to drawer only | `▾` in the header |
| Open stats / settings | Header icons, or Tampermonkey menu |
| Back to the timer | `Escape` |
| Hide / show on this site | Settings, or Tampermonkey menu |

The hotkey can be changed in settings: click the button and press the new
combination (it must include Ctrl, Alt or ⌘). A combination that types a
character — Alt-based ones on macOS — is left alone while you are typing in a
field on the page. The default avoids `Alt+Shift+P` / `Ctrl+Shift+P`, which
open a private window in some browsers.

## Privacy

The script makes **no network requests**: no `fetch`, `XMLHttpRequest`,
`WebSocket` or beacon calls, no analytics, and no external assets — the icon is
an inline data URI and the stylesheet is part of the file. (The absence of
these APIs is asserted by the test suite.)

Everything it records — settings, the current task, per-task focus time and
daily statistics — lives in Tampermonkey's local storage on your machine.
Exports are generated in the page and handed to the browser as a local
download. The only network activity in the project is GitHub's own update
check, which Tampermonkey performs, not the script.

## Performance model

The script runs on every page, so its cost when *not* in use matters more than
its cost while running.

**A background tab does nothing.** No storage reads, no DOM, no shadow root, no
stylesheet parse, no timers — just a few event listeners (`focus`,
`visibilitychange`, `keydown`, `resize`) and the cross-tab change listener. The
widget is constructed lazily by whichever tab becomes the leader.

**The leader builds its UI in an idle slot.** Construction is deferred with
`requestIdleCallback`, so it never competes with the page's own load work.

**The timer never polls.** One self-rescheduling `setTimeout` is armed *only*
while the timer runs (`setInterval` is used nowhere in the script), and only
for the moment the display is due to change:

| State | Wakeups | DOM work |
|---|---|---|
| Running, tab visible | one per second, exactly when the displayed second changes | only what changed |
| Running, tab hidden, title countdown on | one per minute | the tab title |
| Running, tab hidden, title countdown off | a single wake when the phase ends | none |
| Paused / ready | none | none |
| Not the leader | none | none |

**Countdown math is timestamp arithmetic.** Remaining time is always
`endsAt - Date.now()`, never a decrementing counter — so throttled, coalesced or
skipped wakeups cannot accumulate drift. Focus time is derived the same way.
This is also what makes cross-tab handoff free: a new leader reconstructs the
exact state from storage, and the old leader writes nothing on the way out.

**Rendering is change-cached.** Every DOM write is guarded by a comparison, so
in steady state a wakeup mutates nothing but the time. Only the visible surface
is updated (a minimized pill skips all card work, a hidden widget skips
everything but the tab title).

**Misc.** No `backdrop-filter`. Focus time is credited to stats at most every
15 s. There is no `unload`/`beforeunload` handler (those disable the
back/forward cache on every site): saved state is always self-consistent, so
there is nothing to write on the way out.

## Development

Requires Node 22 or newer (the test dependency jsdom 30 needs it). Nothing is
needed at runtime, and the build itself has no dependencies.

| Path | What |
|---|---|
| `src/core.js` | Pure logic — formatting, sanitisers, phase order, focus accounting, export/import. No DOM, no storage, no clock reads. |
| `src/main.js` | Storage, timer engine, UI, cross-tab leadership. |
| `src/styles.css` | The widget's stylesheet (hand-written, `px` only). |
| `src/meta.txt` | The userscript metadata block. |
| `build.mjs` | Assembles the above into `pomodoro.user.js`; `@version` comes from `package.json`. |

```sh
npm run build      # write pomodoro.user.js (deterministic, offline)
npm run lint       # ESLint over the sources, the tests and the built script
npm test           # unit tests + jsdom smoke suite
npm run test:e2e   # real-browser suite (uses your installed Chrome)
npm run test:all   # all of the above
```

### Tests

- **Unit** (`test/core.test.mjs`) — the pure logic in `src/core.js`: sanitisers, phase order, wake scheduling, midnight splitting, focus crediting, CSV/JSON export and import.
- **jsdom smoke suite** (`test/smoke.test.mjs`, ~150 checks) — boots real DOM windows with a shared Tampermonkey-like store (including cross-window change dispatch) and a fake clock: timer math, phase transitions, stats, tab-title handling, settings, cross-tab leadership and handoff, corrupt storage, Trusted Types, hotkeys, exclusions, export/import, and the privacy/update-metadata claims. A runaway mutation/render loop starves the event loop and can't be timed out from inside the same thread, so `test/run.mjs` runs the suite in a child process with a watchdog.
- **Real browser** (`test/e2e.test.mjs`) — what jsdom cannot see, in Chrome via Playwright: geometry, a deliberately hostile page stylesheet, Trusted Types and `style-src 'none'` enforcement, real typing and dragging, themes, file downloads, fullscreen, audio unlock, and cross-tab handoff over the `localStorage` fallback. Set `E2E_CHANNEL` to use another browser channel.

```sh
POMODORO_TEST_TIMEOUT=8000 npm test                          # custom watchdog budget
POMODORO_SCRIPT=/path/to/build.js node test/run.mjs          # smoke-test a specific build
```

The same checks run in GitHub Actions on every push and pull request. The
workflow also rebuilds the script and fails if the committed `pomodoro.user.js`
is stale, so remember to run `npm run build` before committing source changes.

### Releasing

1. Bump `version` in `package.json`, add a section to `CHANGELOG.md`, run `npm run build`, commit.
2. Push to `main` — installed copies update from the raw file there.
3. Optionally `git tag v<version> && git push --tags` — the release workflow checks the tag against `package.json`, runs every suite and publishes a GitHub release with the script attached.

## Troubleshooting

- **Widget or drawer tab missing in a tab** — expected unless that tab is the elected leader; switch to (or click) the tab and it claims the widget automatically. If it never appears on one site, check whether that site is in the "hidden on" list in settings (or use *Hide / show on this site* in the Tampermonkey menu).
- **The tab title stopped showing the countdown on one site** — that site rewrites its own title whenever it changes; rather than fight it in a loop, the script leaves the title alone there until the tab next takes over.
- **A particular letter won't type in the task box** — fixed in v1.3.2 (page shortcuts are now shielded from the widget's fields). A site that binds its hotkeys in the *capture* phase on `document` still runs before the event reaches the widget; that is inherent to Shadow DOM.
- **A page froze after typing a task with double spaces** — fixed in v1.4.0.
- **Widget tiny or huge on some sites / missing on YouTube or Gmail** — fixed in v1.4.0.

See [CHANGELOG.md](CHANGELOG.md) for the full history.

## Notes / limitations

- Timer state and settings are shared across all tabs via Tampermonkey storage; one tab (the last focused) is the elected "leader" that runs the engine, using `GM_addValueChangeListener` for instant handoff (`storage` events as fallback).
- While you are on a page where the script cannot run (the new-tab page, `chrome://` pages, an excluded site), the previous tab keeps leading in the background: it still completes phases and notifies, and its title counts down in minutes.
- If the browser is fully minimized for a long time, Chrome's intensive throttling may delay a completion chime by up to ~1 minute — the clock itself never drifts, since it's computed from timestamps. (This is inherent to userscripts; only a full extension with the `alarms` API can do better.)
- Importing a backup replaces the days it contains and keeps the rest; days older than 90 days are dropped.
- Excluded from iframes via `@noframes` (and a top-frame check as a second guard).
