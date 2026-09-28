// Test runner with a watchdog: runs the smoke suite in a child process so that
// a frozen/killed main thread (e.g. an unbounded mutation-or-render loop, which
// starves microtasks and cannot be timed out from within the same thread) is
// reported as a failure instead of hanging forever.
import { spawn } from 'node:child_process';

const BUDGET_MS = Number(process.env.POMODORO_TEST_TIMEOUT || 30000);

const child = spawn(process.execPath, ['test/smoke.test.mjs'], { stdio: 'inherit' });
const watchdog = setTimeout(() => {
  console.error(
    '\n\u2717 TIMEOUT after ' + BUDGET_MS + 'ms — the script appears to have frozen the main thread' +
    '\n  (an unbounded loop starving the event loop, e.g. a title/render feedback loop).'
  );
  child.kill('SIGKILL');
  process.exitCode = 1;
}, BUDGET_MS);

child.on('exit', code => {
  clearTimeout(watchdog);
  process.exitCode = code === null ? 1 : code;
});
