# Changelog

All notable changes to the userscript. Versions follow [semantic versioning](https://semver.org/).

## [2.0.0]

### Added
- **Daily focus goal** — optional; progress in the footer and stats, announced once when reached.
- **+5 min** — extend the current phase, running or not.
- **Round dots** — one dot per round until the long break.
- **Task autocomplete** — the task field suggests recently tracked task names.
- **Stats export / import** — CSV for spreadsheets (formula-injection safe) and a JSON backup that can be imported again.
- **Light theme** — follows the system by default, or force dark/light.
- **Chime choice and volume** — three chimes and a volume slider.
- **Configurable hotkey** — record any combination that includes Ctrl, Alt or Meta.
- **Per-site exclusion** — hide the widget on a site from settings; re-enable from the Tampermonkey menu or the list in settings.
- **Clickable notifications** — clicking one focuses the timer tab.
- **"Finished while you were away" note** when a phase ran out with no tab open.

### Changed
- **Tailwind is gone.** The stylesheet is hand-written (`src/styles.css`), the build has no dependencies and no network access, and the script is assembled from `src/core.js` (pure logic) and `src/main.js`.
- Stats are kept for 90 days (was 14).
- The countdown wakes exactly when the displayed second changes (it could lag by up to a second).
- A backgrounded tab's title shows whole minutes, refreshed once a minute, instead of a frozen seconds display.
- The widget hides while the page is fullscreen.
- Clearing today's stats takes two clicks on the button instead of a native `confirm()` dialog.
- The hotkey is ignored while typing in a page field if it would type a character (Alt combos on macOS).
- Styles are applied through a constructed stylesheet, so the widget also works on sites whose CSP forbids inline styles.

### Fixed
- Focus time for a round that straddles midnight is split between the two days.
- A site that rewrites its title whenever it changes no longer ping-pongs with the countdown; the script backs off.
- The settings and stats panels scroll instead of overflowing a short window.

### Development
- Unit tests for the pure logic, a real-browser suite (Playwright driving the installed Chrome), ESLint, and a tag-triggered release workflow.
- The userscript's `@version` is injected from `package.json`.

## [1.4.0]
- Fixed a page freeze caused by a task containing repeated spaces (tab-title feedback loop).
- Focus accounting: pausing no longer loses time, a sleep mid-round credits only the phase length, skipping a focus round does not count it as completed.
- Task names such as `constructor` no longer corrupt stats.
- Works on Trusted Types sites; immune to the page's root font-size and inherited styles.
- Everything read from storage is sanitised. No unload handlers (keeps the back/forward cache).

## [1.3.2]
- Fixed a page shortcut swallowing a letter typed in the widget.

## [1.3.1]
- Update URLs and privacy statement made explicit.

## [1.3.0]
- Typable duration fields, reset-to-defaults, drawer tab, accessibility and reduced-motion support.

## [1.1.0]
- Fixed a runaway tab-title loop that could hang pages.
