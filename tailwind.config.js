/** Tailwind build config for the Pomodoro userscript.
 *  Scans the userscript template for class names and emits only the CSS we use,
 *  which then gets inlined into the final pomodoro.user.js (Shadow DOM isolated). */
module.exports = {
  content: ['./src/pomodoro.template.js'],
  theme: { extend: {} },
  // Tailwind's extractor pulls bare words out of code, so identifiers such as
  // `const shadow`, `const container` or `RING_LEN` generate utilities we never
  // use. Dropping them shrinks the inlined stylesheet (~1 KB including
  // container's five media queries).
  blocklist: ['container', 'ring', 'shadow', 'visible'],
  plugins: [],
};
