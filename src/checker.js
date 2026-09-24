import { connect } from "node:net";

/** Run the right kind of check for the monitor. */
export function runCheck(monitor) {
  return monitor.type === "tcp" ? checkTcp(monitor) : checkHttp(monitor);
}

/**
 * Can we open a TCP connection to host:port? For databases, SSH, mail servers.
 * @returns {Promise<{ok: boolean, status: null, ms: number, error: string|null}>}
 */
export function checkTcp(monitor) {
  const started = performance.now();
  return new Promise((resolve) => {
    const socket = connect({ host: monitor.host, port: monitor.port });
    const done = (error) => {
      socket.destroy();
      resolve({ ok: !error, status: null, ms: Math.round(performance.now() - started), error });
    };
    socket.setTimeout(monitor.timeout * 1000, () => done(`timeout after ${monitor.timeout}s`));
    socket.once("connect", () => done(null));
    socket.once("error", (err) => done(err.code ?? err.message));
  });
}

/**
 * Is this status code what the monitor expects?
 * expectStatus can be a number (204), a list ([200, 301]) or a range ("200-299").
 * Without it, any 2xx or 3xx counts as up.
 */
export function statusMatches(status, expect) {
  if (expect == null) return status >= 200 && status < 400;
  return [expect].flat().some((e) => {
    if (typeof e === "number") return status === e;
    const [lo, hi] = String(e).split("-").map(Number);
    return hi === undefined ? status === lo : status >= lo && status <= hi;
  });
}

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
      // with an explicit expectStatus you may want to see the redirect itself
      redirect: monitor.expectStatus == null ? "follow" : "manual",
      headers: { "user-agent": "pulsewatch", ...monitor.headers },
    });
    const body = await res.text();
    const ms = elapsed();
    if (!statusMatches(res.status, monitor.expectStatus)) {
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
