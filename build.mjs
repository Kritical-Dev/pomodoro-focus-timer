// Build: compile Tailwind (only used classes) and inline it into the userscript.
// Usage:  node build.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const TEMPLATE = 'src/pomodoro.template.js';
const CSS_OUT = 'src/tailwind.out.css';
const FINAL = 'pomodoro.user.js';

console.log('1/2  Compiling Tailwind CSS…');
execFileSync(
  'npx',
  ['--yes', 'tailwindcss@3.4.13', '-c', 'tailwind.config.js', '-i', 'src/input.css', '-o', CSS_OUT, '--minify'],
  { stdio: 'inherit' }
);

console.log('2/2  Inlining CSS into ' + FINAL + '…');
const css = fs.readFileSync(CSS_OUT, 'utf8');
let js = fs.readFileSync(TEMPLATE, 'utf8');
if (!js.includes('__TAILWIND_CSS__')) throw new Error('Placeholder __TAILWIND_CSS__ not found in template');
// Function replacer so "$" sequences in the CSS are never treated specially.
js = js.replace('__TAILWIND_CSS__', () => JSON.stringify(css));
fs.writeFileSync(FINAL, js);
console.log('Done → ' + FINAL + ' (' + (js.length / 1024).toFixed(1) + ' KB, CSS ' + (css.length / 1024).toFixed(1) + ' KB)');
