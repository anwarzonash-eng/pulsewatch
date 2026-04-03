import { checkHttp } from "./checker.js";

/**
 * Check every monitor now and then on its interval.
 * Returns a function that stops all timers.
 */
export function startScheduler(monitors, onResult, { check = checkHttp } = {}) {
  const timers = monitors.map((monitor) => {
    const tick = async () => onResult(monitor, await check(monitor));
    tick();
    return setInterval(tick, monitor.interval * 1000);
  });
  return () => timers.forEach(clearInterval);
}
