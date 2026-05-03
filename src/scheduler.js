import { checkHttp } from "./checker.js";

/**
 * Check every monitor now and then on its interval.
 * Returns a function that stops all timers.
 */
export function startScheduler(monitors, onResult, { check = checkHttp } = {}) {
  const timers = monitors.map((monitor) => {
    // a slow check must not overlap with the next one
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        onResult(monitor, await check(monitor));
      } finally {
        running = false;
      }
    };
    tick();
    return setInterval(tick, monitor.interval * 1000);
  });
  return () => timers.forEach(clearInterval);
}
