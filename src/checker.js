/**
 * Run one HTTP check.
 * @returns {Promise<{ok: boolean, status: number|null, ms: number, error: string|null}>}
 */
export async function checkHttp(monitor) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), monitor.timeout * 1000);
  const elapsed = () => Math.round(performance.now() - started);

  try {
    const res = await fetch(monitor.url, {
      method: monitor.method,
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "pulsewatch" },
    });
    const body = await res.text();
    const ms = elapsed();
    if (res.status < 200 || res.status >= 400) {
      return { ok: false, status: res.status, ms, error: `HTTP ${res.status}` };
    }
    // a 200 with an error page is still down if the expected text is missing
    if (monitor.keyword && !body.includes(monitor.keyword)) {
      return { ok: false, status: res.status, ms, error: `"${monitor.keyword}" not found in response` };
    }
    return { ok: true, status: res.status, ms, error: null };
  } catch (err) {
    const error = controller.signal.aborted
      ? `timeout after ${monitor.timeout}s`
      : (err.cause?.code ?? err.message);
    return { ok: false, status: null, ms: elapsed(), error };
  } finally {
    // otherwise every check leaves a timer behind for `timeout` seconds
    clearTimeout(timer);
  }
}
