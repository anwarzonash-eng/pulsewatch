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
    await res.arrayBuffer();
    const ok = res.status >= 200 && res.status < 400;
    return { ok, status: res.status, ms: elapsed(), error: ok ? null : `HTTP ${res.status}` };
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
